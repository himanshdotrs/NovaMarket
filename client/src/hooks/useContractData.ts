"use client";

import { useQuery } from "@tanstack/react-query";
import { POLL_INTERVAL_MS } from "@/lib/config";
import { CONTRACT_ROOT_KEY } from "@/lib/query-client";
import {
  fetchAuctions,
  fetchListings,
  fetchNfts,
  fetchOffers,
  fetchSales,
  fetchTokenCount,
} from "@/hooks/contract";

/**
 * Read-side contract hooks. All share the "contract" key prefix and poll
 * on an interval so market data stays fresh without manual refreshes.
 */

export function useNfts() {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "nfts"],
    queryFn: fetchNfts,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useListings() {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "listings"],
    queryFn: fetchListings,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useAuctions() {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "auctions"],
    queryFn: fetchAuctions,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useOffers(tokenId?: number | bigint | null) {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "offers", tokenId?.toString()],
    queryFn: () => fetchOffers(tokenId!),
    enabled: tokenId != null,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useSales() {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "sales"],
    queryFn: fetchSales,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useTokenCount() {
  return useQuery({
    queryKey: [CONTRACT_ROOT_KEY, "token-count"],
    queryFn: fetchTokenCount,
    refetchInterval: POLL_INTERVAL_MS,
  });
}
