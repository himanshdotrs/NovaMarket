import { CONTRACT_ERRORS } from "@/lib/config";

/**
 * Maps low-level wallet / RPC / contract failures to user-friendly messages.
 * Handles: user rejection, wallet not found, insufficient balance,
 * network mismatch and every custom contract error code.
 */
export function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const msg = raw.toLowerCase();

  // ---- Wallet rejections -------------------------------------------------
  if (
    msg.includes("reject") ||
    msg.includes("declined") ||
    msg.includes("denied") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled")
  ) {
    return "Request rejected — you declined the transaction in your wallet.";
  }

  // ---- Wallet not installed / locked ------------------------------------
  if (msg.includes("not installed") || msg.includes("no wallet") || msg.includes("wallet not found")) {
    return "Wallet not found — please install it or pick another one.";
  }
  if (msg.includes("locked")) {
    return "Your wallet is locked — unlock it and try again.";
  }
  if (msg.includes("not connected")) {
    return "No wallet connected — connect a wallet first.";
  }

  // ---- Balances / fees ----------------------------------------------------
  if (msg.includes("insufficient_balance") || msg.includes("insufficient balance") || msg.includes("underfunded")) {
    return "Insufficient balance — this account cannot cover the amount plus fees.";
  }

  // ---- Network mismatch ---------------------------------------------------
  if (msg.includes("network") && (msg.includes("mismatch") || msg.includes("passphrase"))) {
    return "Network mismatch — switch your wallet to the Stellar Testnet.";
  }

  // ---- Simulation failures -------------------------------------------------
  if (msg.includes("expiredtransaction") || msg.includes("expired transaction")) {
    return "The transaction expired before confirmation — try again.";
  }

  // ---- Custom contract errors: HostError: Error(Contract, #N) --------------
  const codeMatch = raw.match(/error\(contract,\s*#(\d+)\)/i);
  if (codeMatch) {
    const code = Number(codeMatch[1]);
    if (CONTRACT_ERRORS[code]) return CONTRACT_ERRORS[code];
    return `Contract error #${code}.`;
  }

  // ---- Raw diagnostics from simulation -------------------------------------
  if (msg.includes("invoke host function failed") || msg.includes("simulation failed")) {
    const contractErr = friendlyContractDiagnostic(raw);
    if (contractErr) return contractErr;
    return "The contract rejected this operation.";
  }

  if (msg.includes("timeout") || msg.includes("network error") || msg.includes("failed to fetch")) {
    return "Network issue reaching Stellar — check your connection and retry.";
  }

  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
}

/** Pulls an `Error(Contract, #N)` fragment out of verbose RPC diagnostics. */
function friendlyContractDiagnostic(raw: string): string | null {
  const m = raw.match(/#(\d+)/);
  if (m && CONTRACT_ERRORS[Number(m[1])]) {
    return CONTRACT_ERRORS[Number(m[1])];
  }
  return null;
}
