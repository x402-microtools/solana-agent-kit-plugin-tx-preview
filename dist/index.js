import { z } from "zod";
/**
 * Opt-in pre-sign check for Solana Agent Kit v2.
 *
 * Calls a THIRD-PARTY paid API (POST /api/tx-preview, $0.01 USDC per successful call, paid via x402 on Solana).
 * It only simulates; it never signs, sends or blocks a transaction. What to do with the verdict is up to the caller.
 * Payment: pass a fetch that can pay x402 (e.g. `wrapFetchWithPayment` from `@x402/fetch` with a spend-capped policy).
 * Without one, the API answers HTTP 402 and this returns `{ status: "payment_required" }` without paying anything.
 */
export const TX_PREVIEW_URL = "https://solana-x402-microtools-mainnet.valecity.workers.dev/api/tx-preview";
export const txPreviewInputSchema = z.object({
    transaction: z.string().min(1).max(2200).describe("Serialized Solana transaction, base64. Unsigned is fine."),
    wallet: z.string().min(32).max(44).optional().describe("Your wallet address, to report its balance changes"),
    intent: z
        .string()
        .max(200)
        .optional()
        .describe("What you expect, e.g. 'swap 0.002 SOL for USDC' or 'send 0.001 SOL to <address>'"),
    context: z
        .object({
        type: z.enum(["memecoin", "tokenized_equity"]).optional(),
        ticker: z.string().max(12).optional(),
        mint: z.string().optional(),
    })
        .strict()
        .optional(),
});
export async function previewTransaction(input, opts = {}) {
    const doFetch = opts.fetchWithPayment ?? ((u, i) => fetch(u, i));
    let res;
    try {
        res = await doFetch(opts.url ?? TX_PREVIEW_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(txPreviewInputSchema.parse(input)),
            signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
        });
    }
    catch (e) {
        return { status: "error", error: e instanceof Error ? e.message : String(e) };
    }
    if (res.status === 402) {
        return {
            status: "payment_required",
            message: "This third-party service costs $0.01 USDC per call via x402. Pass an x402-capable fetchWithPayment to use it.",
        };
    }
    const body = (await res.json().catch(() => ({})));
    if (!res.ok) {
        return { status: "error", http_status: res.status, error: typeof body.error === "string" ? body.error : `HTTP ${res.status}` };
    }
    return { status: "success", preview: body };
}
export function createTxPreviewPlugin(opts = {}) {
    const action = {
        name: "PREVIEW_TRANSACTION_BEFORE_SIGNING",
        similes: ["preview transaction", "simulate before signing", "pre-sign check", "what will this transaction do"],
        description: "OPTIONAL third-party paid check ($0.01 USDC per call via x402 on Solana). Simulates a Solana transaction BEFORE signing and returns balance changes, programs, fee, red flags, intent match and a verdict (clear/caution/avoid). A simulation is not a guarantee. This tool never signs, sends or blocks anything.",
        examples: [
            [
                {
                    input: { transaction: "<base64 unsigned transaction>", intent: "swap 0.002 SOL for USDC" },
                    output: {
                        status: "success",
                        preview: { verdict: "clear", reasons: [], summary: "Would succeed. You send 0.002 SOL. You receive 0.206176 USDC." },
                    },
                    explanation: "Checks a Jupiter swap against the stated intent before the agent signs it.",
                },
            ],
        ],
        schema: txPreviewInputSchema,
        handler: async (_agent, input) => previewTransaction(txPreviewInputSchema.parse(input), opts),
    };
    return {
        name: "tx-preview",
        methods: { previewTransaction: (_agent, input) => previewTransaction(input, opts) },
        actions: [action],
        initialize() { },
    };
}
export default createTxPreviewPlugin;
