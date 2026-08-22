"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletConnection } from "@/types";

interface WalletState {
  connection: WalletConnection | null;
  setConnection: (c: WalletConnection) => void;
  clear: () => void;
}

/** Persisted so a page refresh keeps you connected. */
export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      connection: null,
      setConnection: (connection) => set({ connection }),
      clear: () => set({ connection: null }),
    }),
    { name: "tracklink.wallet" }
  )
);
