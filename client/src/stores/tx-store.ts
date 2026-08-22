"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TrackedTx, TxStatus } from "@/types";

interface TxState {
  txs: TrackedTx[];
  track: (tx: TrackedTx) => void;
  update: (hash: string, patch: Partial<TrackedTx>) => void;
  setStatus: (hash: string, status: TxStatus, error?: string) => void;
}

const MAX_TRACKED = 50;

/**
 * Client-side ledger of transactions initiated from this browser,
 * newest first. Persisted so Transaction History survives refreshes.
 */
export const useTxStore = create<TxState>()(
  persist(
    (set) => ({
      txs: [],
      track: (tx) =>
        set((s) => ({
          txs: [tx, ...s.txs.filter((t) => t.hash !== tx.hash)].slice(
            0,
            MAX_TRACKED
          ),
        })),
      update: (hash, patch) =>
        set((s) => ({
          txs: s.txs.map((t) => (t.hash === hash ? { ...t, ...patch } : t)),
        })),
      setStatus: (hash, status, error) =>
        set((s) => ({
          txs: s.txs.map((t) =>
            t.hash === hash ? { ...t, status, error } : t
          ),
        })),
    }),
    { name: "novamarket.txs" }
  )
);

let reconciled = false;

/**
 * Resolves transactions left PENDING by a previous session (e.g. the page
 * was closed mid-poll). Runs once per session; safe to call repeatedly.
 */
export async function reconcilePendingTxs(): Promise<void> {
  if (reconciled || typeof window === "undefined") return;
  reconciled = true;

  const { txs, setStatus } = useTxStore.getState();
  const pending = txs.filter((t) => t.status === "PENDING");
  if (pending.length === 0) return;

  const [{ server }, { rpc }] = await Promise.all([
    import("@/lib/soroban"),
    import("@stellar/stellar-sdk"),
  ]);

  await Promise.allSettled(
    pending.map(async (t) => {
      try {
        const res = await server().getTransaction(t.hash);
        if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
          setStatus(t.hash, "SUCCESS");
        } else if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
          setStatus(t.hash, "FAILED", "Transaction failed on-chain.");
        } else {
          // NOT_FOUND after a session restart means it never made it in.
          setStatus(t.hash, "FAILED", "Transaction was not confirmed.");
        }
      } catch {
        // Leave it pending; we'll retry on the next session.
        reconciled = false;
      }
    })
  );
}
