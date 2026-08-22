"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ISupportedWallet } from "@creit.tech/stellar-wallets-kit";
import { friendlyError } from "@/lib/errors";
import { connectWallet, disconnectWallet } from "@/lib/wallet";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Wallet state hook — the only wallet API UI components need.
 * Handles connect (with per-wallet loading), disconnect, and
 * persisted sessions across refreshes.
 */
export function useWallet() {
  const { connection, setConnection, clear } = useWalletStore();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const address = connection?.address ?? null;
  const isConnected = Boolean(address);

  const connect = useCallback(
    async (wallet: ISupportedWallet) => {
      setConnectingId(wallet.id);
      try {
        const addr = await connectWallet(wallet.id);
        setConnection({
          address: addr,
          walletId: wallet.id,
          walletName: wallet.name,
        });
        toast.success(`Connected via ${wallet.name}`, {
          description: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
        });
        return addr;
      } catch (err) {
        toast.error("Connection failed", {
          description: friendlyError(err),
        });
        throw err;
      } finally {
        setConnectingId(null);
      }
    },
    [setConnection]
  );

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    clear();
    toast("Wallet disconnected");
  }, [clear]);

  return {
    address,
    connection,
    isConnected,
    connectingId,
    isConnecting: connectingId !== null,
    connect,
    disconnect,
  };
}
