"use client";

import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "@/lib/config";
import { fetchAllBalances } from "@/lib/horizon";

/** Classic XLM (and any other asset) balances via Horizon. */
export function useWalletBalances(address?: string | null) {
  return useQuery({
    queryKey: ["horizon-balances", address],
    queryFn: () => fetchAllBalances(address!),
    enabled: Boolean(address),
    refetchInterval: POLL_INTERVAL_MS,
  });
}
