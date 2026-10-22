// Typechecked example (npm run typecheck). Run: SOLANA_KEYPAIR_FILE=... TX_BASE64=... RPC_URL=... node examples/basic.js after tsc.
import { readFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { KeypairWallet, SolanaAgentKit } from "solana-agent-kit";
import { createTxPreviewPlugin } from "../src/index.js";

const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Use a dedicated, low-balance payer key, not your main wallet.
const secret = Uint8Array.from(JSON.parse(readFileSync(process.env.SOLANA_KEYPAIR_FILE!, "utf8")) as number[]);
const payer = await createKeyPairSignerFromBytes(secret);

const client = new x402Client();
// Spend cap: only pay exact-scheme USDC on Solana mainnet, at most 0.01 USDC (10000 atomic units) per call.
client.registerPolicy((_version, offers) =>
  offers.filter((o) => o.scheme === "exact" && o.network === SOLANA_MAINNET && o.asset === USDC && BigInt(o.amount) <= 10_000n),
);
client.register("solana:*", new ExactSvmScheme(payer));

const agent = new SolanaAgentKit(new KeypairWallet(Keypair.fromSecretKey(secret), process.env.RPC_URL!), process.env.RPC_URL!, {}).use(
  createTxPreviewPlugin({ fetchWithPayment: wrapFetchWithPayment(fetch, client) }),
);

const result = await agent.methods.previewTransaction(agent, {
  transaction: process.env.TX_BASE64!,
  intent: process.env.INTENT,
});
console.log(JSON.stringify(result, null, 2));
