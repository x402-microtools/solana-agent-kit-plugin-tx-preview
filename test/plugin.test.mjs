import assert from "node:assert/strict";
import { test } from "node:test";
import { TX_PREVIEW_URL, createTxPreviewPlugin, previewTransaction } from "../dist/index.js";

const TX = "AQAAAA==";
const mock = (status, body) => {
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  };
  return { f, calls };
};

test("402 -> payment_required, nothing paid", async () => {
  const { f, calls } = mock(402, {});
  const r = await previewTransaction({ transaction: TX }, { fetchWithPayment: f });
  assert.equal(r.status, "payment_required");
  assert.match(r.message, /\$0\.01 USDC/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, TX_PREVIEW_URL);
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), { transaction: TX });
});

test("200 -> success with preview body; sends intent/context", async () => {
  const preview = { verdict: "clear", reasons: [], intent_match: { matched: true } };
  const { f, calls } = mock(200, preview);
  const plugin = createTxPreviewPlugin({ fetchWithPayment: f, url: "https://example.test/api/tx-preview" });
  const input = { transaction: TX, intent: "swap 0.002 SOL for USDC", context: { type: "memecoin", ticker: "BONK" } };
  const r = await plugin.actions[0].handler({}, input);
  assert.deepEqual(r, { status: "success", preview });
  assert.equal(calls[0].url, "https://example.test/api/tx-preview");
  assert.deepEqual(JSON.parse(calls[0].init.body), input);
});

test("400 -> error with server message", async () => {
  const { f } = mock(400, { error: "transaction is not valid base64" });
  const r = await previewTransaction({ transaction: TX }, { fetchWithPayment: f });
  assert.deepEqual(r, { status: "error", http_status: 400, error: "transaction is not valid base64" });
});

test("network failure -> error, no throw", async () => {
  const r = await previewTransaction({ transaction: TX }, { fetchWithPayment: async () => { throw new Error("offline"); } });
  assert.deepEqual(r, { status: "error", error: "offline" });
});

test("plugin shape matches SAK v2 and schema rejects bad input", () => {
  const p = createTxPreviewPlugin();
  assert.equal(p.name, "tx-preview");
  assert.equal(typeof p.methods.previewTransaction, "function");
  assert.equal(p.actions[0].name, "PREVIEW_TRANSACTION_BEFORE_SIGNING");
  assert.match(p.actions[0].description, /\$0\.01 USDC/);
  assert.equal(p.actions[0].schema.safeParse({ transaction: TX, context: { foo: 1 } }).success, false);
  assert.equal(p.actions[0].schema.safeParse({}).success, false);
});
