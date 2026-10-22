import type { Plugin } from "solana-agent-kit";
import { z } from "zod";
/**
 * Opt-in pre-sign check for Solana Agent Kit v2.
 *
 * Calls a THIRD-PARTY paid API (POST /api/tx-preview, $0.01 USDC per successful call, paid via x402 on Solana).
 * It only simulates; it never signs, sends or blocks a transaction. What to do with the verdict is up to the caller.
 * Payment: pass a fetch that can pay x402 (e.g. `wrapFetchWithPayment` from `@x402/fetch` with a spend-capped policy).
 * Without one, the API answers HTTP 402 and this returns `{ status: "payment_required" }` without paying anything.
 */
export declare const TX_PREVIEW_URL = "https://solana-x402-microtools-mainnet.valecity.workers.dev/api/tx-preview";
export interface TxPreviewOptions {
    /** fetch with x402 payment support. Defaults to the global (unpaid) fetch. */
    fetchWithPayment?: (input: string, init?: RequestInit) => Promise<Response>;
    /** Override the endpoint URL. */
    url?: string;
    /** Request timeout in ms (default 20000). */
    timeoutMs?: number;
}
export declare const txPreviewInputSchema: z.ZodObject<{
    transaction: z.ZodString;
    wallet: z.ZodOptional<z.ZodString>;
    intent: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<["memecoin", "tokenized_equity"]>>;
        ticker: z.ZodOptional<z.ZodString>;
        mint: z.ZodOptional<z.ZodString>;
    }, "strict", z.ZodTypeAny, {
        type?: "memecoin" | "tokenized_equity" | undefined;
        ticker?: string | undefined;
        mint?: string | undefined;
    }, {
        type?: "memecoin" | "tokenized_equity" | undefined;
        ticker?: string | undefined;
        mint?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    transaction: string;
    wallet?: string | undefined;
    intent?: string | undefined;
    context?: {
        type?: "memecoin" | "tokenized_equity" | undefined;
        ticker?: string | undefined;
        mint?: string | undefined;
    } | undefined;
}, {
    transaction: string;
    wallet?: string | undefined;
    intent?: string | undefined;
    context?: {
        type?: "memecoin" | "tokenized_equity" | undefined;
        ticker?: string | undefined;
        mint?: string | undefined;
    } | undefined;
}>;
export type TxPreviewInput = z.infer<typeof txPreviewInputSchema>;
export type TxPreviewResult = {
    status: "success";
    preview: Record<string, unknown>;
} | {
    status: "payment_required";
    message: string;
} | {
    status: "error";
    http_status?: number;
    error: string;
};
export declare function previewTransaction(input: TxPreviewInput, opts?: TxPreviewOptions): Promise<TxPreviewResult>;
export type TxPreviewPlugin = Plugin & {
    methods: {
        previewTransaction: (agent: unknown, input: TxPreviewInput) => Promise<TxPreviewResult>;
    };
};
export declare function createTxPreviewPlugin(opts?: TxPreviewOptions): TxPreviewPlugin;
export default createTxPreviewPlugin;
