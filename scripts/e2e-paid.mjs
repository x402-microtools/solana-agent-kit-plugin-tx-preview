// One real paid call through the plugin (spends exactly 0.01 USDC from YOUR payer key). Needs `npm run build` first.
// SOLANA_KEYPAIR_FILE=payer.json TX_BASE64=<unsigned tx> [INTENT="..."] node scripts/e2e-paid.mjs
import { readFileSync } from "node:fs";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { createTxPreviewPlugin } from "../dist/index.js";

const PAY_TO = "Aqgp4nKbk3WV1e7fLHepkcdwLLz3j8DwHqLTLHVEa6GK";
const secret = Uint8Array.from(JSON.parse(readFileSync(process.env.SOLANA_KEYPAIR_FILE, "utf8")));
const client = new x402Client();
client.registerPolicy((_v, offers) => offers.filter((o) =>
  o.scheme === "exact" && o.network === "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" &&
  o.asset === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && o.payTo === PAY_TO && BigInt(o.amount) === 10_000n));
client.register("solana:*", new ExactSvmScheme(await createKeyPairSignerFromBytes(secret)));
let paymentResponse = null;
const paidFetch = wrapFetchWithPayment(fetch, client);
const fetchWithPayment = async (u, i) => { const r = await paidFetch(u, i); paymentResponse = r.headers.get("PAYMENT-RESPONSE"); return r; };
const plugin = createTxPreviewPlugin({ fetchWithPayment });
const result = await plugin.actions[0].handler({}, { transaction: process.env.TX_BASE64, intent: process.env.INTENT });
console.log("PAYMENT-RESPONSE:", paymentResponse ? Buffer.from(paymentResponse, "base64").toString() : "absent");
console.log(JSON.stringify(result, null, 2).slice(0, 3000));
