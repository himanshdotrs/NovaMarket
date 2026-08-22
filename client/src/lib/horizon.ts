import { Horizon } from "@stellar/stellar-sdk";
import { HORIZON_URL } from "@/lib/config";

/**
 * Horizon layer — classic-network data the Soroban RPC doesn't serve:
 * native XLM balances for the Wallet Dashboard.
 */

export interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  balance: string;
}

export async function fetchXlmBalance(address: string): Promise<number> {
  const account = await horizon().accounts().accountId(address).call();
  const native = account.balances.find(
    (b) => (b as HorizonBalance).asset_type === "native"
  );
  return native ? parseFloat((native as HorizonBalance).balance) : 0;
}

export async function fetchAllBalances(
  address: string
): Promise<HorizonBalance[]> {
  try {
    const account = await horizon().accounts().accountId(address).call();
    return account.balances.map((b) => b as HorizonBalance);
  } catch (err) {
    // Unfunded accounts 404 on Horizon — treat as zero balances instead of
    // surfacing an error state (common right after creating a wallet).
    if (isNotFound(err)) return [];
    throw err;
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { response?: { status?: number }; message?: string };
  return (
    e?.response?.status === 404 ||
    (typeof e?.message === "string" && e.message.includes("Not Found"))
  );
}

function horizon() {
  return new Horizon.Server(HORIZON_URL, { allowHttp: false });
}
