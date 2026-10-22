# solana-agent-kit-plugin-tx-preview

An opt-in [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) v2 plugin that previews a Solana transaction **before your agent signs it**.

> **This plugin calls a third-party paid service.** Each successful call costs **$0.01 USDC**, paid over [x402](https://x402.org) on Solana mainnet to the service operator (`Aqgp4nKbk3WV1e7fLHepkcdwLLz3j8DwHqLTLHVEa6GK`). Payment is only settled when the response succeeds (2xx); invalid input gets a free 400. The plugin itself is free and MIT-licensed. It is not affiliated with SendAI.

- **Service:** `POST https://solana-x402-microtools-mainnet.valecity.workers.dev/api/tx-preview`
- **Service source and docs:** https://github.com/x402-microtools/solana-x402-microtools

## What it does and doesn't do
- It sends the serialized transaction (base64; unsigned is fine) and your optional `wallet`, `intent` and `context` to the service. The service simulates the transaction once against mainnet and returns:
  - SOL and token balance changes
  - the programs invoked
  - the fee estimate
  - red flags
  - an `intent_match`
  - a `verdict` (`clear` / `caution` / `avoid`) with `reasons`
- **It never signs, sends or blocks anything.** It returns data, and your code decides what to do with it. Nothing is wired into signing automatically.
- **A simulation is not a guarantee.** On-chain state can change between the preview and your signature. `clear` means only that these rules found nothing; it does not mean the transaction is safe.
- The transaction you submit is sent to a third party. Don't use the plugin if that's unacceptable to you.

## Install
Not published to npm. Install from GitHub:
```sh
npm i github:x402-microtools/solana-agent-kit-plugin-tx-preview zod@^3.24.1
# for paying: npm i @x402/fetch @x402/svm @solana/kit
```

## Usage
The plugin has no payment dependency. You pass in a `fetch` that can pay x402. Without one, calls return `{ status: "payment_required" }` and nothing is paid.

```ts
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { SolanaAgentKit } from "solana-agent-kit";
import { createTxPreviewPlugin } from "solana-agent-kit-plugin-tx-preview";

const payer = await createKeyPairSignerFromBytes(secretKeyBytes); // use a dedicated low-balance payer key
const client = new x402Client();
client.registerPolicy((_v, offers) => offers.filter((o) =>            // spend cap: ≤ 0.01 USDC per call
  o.scheme === "exact" && o.network === "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" &&
  o.asset === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" && BigInt(o.amount) <= 10_000n));
client.register("solana:*", new ExactSvmScheme(payer));

const agent = new SolanaAgentKit(wallet, rpcUrl, {})
  .use(createTxPreviewPlugin({ fetchWithPayment: wrapFetchWithPayment(fetch, client) }));

const r = await agent.methods.previewTransaction(agent, { transaction: base64Tx, intent: "swap 0.002 SOL for USDC" });
if (r.status === "success" && r.preview.verdict !== "clear") { /* your policy: ask a human, skip, … */ }
```

The full example is in [`examples/basic.ts`](examples/basic.ts) and is typechecked against `@x402/fetch` 2.28.0, `@x402/svm` 2.28.0 and `solana-agent-kit` 2.0.10. For LLM tool use, the plugin also adds the action `PREVIEW_TRANSACTION_BEFORE_SIGNING`.

Results: `{ status: "success", preview }`, `{ status: "payment_required", message }` or `{ status: "error", http_status?, error }`. The handler never throws on HTTP or network errors.

## Development
```sh
npm install
npm run typecheck   # src + examples
npm test            # build + node:test with a mocked fetch (402 / 200 / 400 / network error)
```
`scripts/e2e-paid.mjs` makes one real paid call (exactly 0.01 USDC) from a payer key that you supply.

## License
MIT
