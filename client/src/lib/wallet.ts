"use client";

import {
  StellarWalletsKit,
  Networks,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { NETWORK, NETWORK_PASSPHRASE } from "@/lib/config";
import { useWalletStore } from "@/stores/wallet-store";

/**
 * Wallet layer — the ONLY module that talks to StellarWalletsKit.
 * UI components never import the kit directly.
 */

let initialized = false;

export function initKit() {
  if (initialized || typeof window === "undefined") return;
  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new xBullModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
    ],
    network: NETWORK === "TESTNET" ? Networks.TESTNET : Networks.PUBLIC,
  });
  initialized = true;

  // Restore the active module after a page refresh so signing keeps working
  // with the persisted session.
  const saved = useWalletStore.getState().connection;
  if (saved?.walletId) {
    try {
      StellarWalletsKit.setWallet(saved.walletId);
    } catch {
      // Module no longer available (e.g. extension uninstalled) — the user
      // will simply reconnect.
    }
  }
}

/** Every wallet the kit can offer right now (installed or not). */
export async function supportedWallets(): Promise<ISupportedWallet[]> {
  initKit();
  return StellarWalletsKit.refreshSupportedWallets();
}

/**
 * Opens nothing by itself: selects `walletId` and asks it for an address.
 * Throws if the user rejects access or the wallet is locked/unavailable.
 */
export async function connectWallet(walletId: string): Promise<string> {
  initKit();
  StellarWalletsKit.setWallet(walletId);
  // fetchAddress (unlike getAddress) actually queries the wallet extension
  // and stores the result in the kit's memory.
  const { address } = await StellarWalletsKit.fetchAddress();
  return address;
}

export interface SignedTx {
  signedTxXdr: string;
}

/** Signs a transaction XDR with whichever wallet is active. */
export async function signTransaction(txXdr: string, address: string): Promise<SignedTx> {
  initKit();
  return StellarWalletsKit.signTransaction(txXdr, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}

/** Clears the kit's active session (used on explicit disconnect). */
export async function disconnectWallet(): Promise<void> {
  if (!initialized) return;
  try {
    await StellarWalletsKit.disconnect();
  } catch {
    // Best-effort: some modules (albedo, freighter) have no session to clear.
  }
}
