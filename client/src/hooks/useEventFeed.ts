"use client";

import { useQuery } from "@tanstack/react-query";
import { EVENT_POLL_INTERVAL_MS } from "@/lib/config";
import { fetchRecentEvents } from "@/lib/events";

/**
 * Live event feed — polls Soroban RPC getEvents for our contract.
 * Each item originates from an on-chain contract interaction.
 */
export function useEventFeed(limit = 50) {
  return useQuery({
    queryKey: ["contract-events", limit],
    queryFn: () => fetchRecentEvents(limit),
    refetchInterval: EVENT_POLL_INTERVAL_MS,
  });
}
