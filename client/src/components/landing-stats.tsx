"use client";

import { useAuctions, useNfts, useSales } from "@/hooks/useContractData";
import { Skeleton } from "@/components/ui/skeleton";
import { fromStroops } from "@/lib/utils";

/** Live marketplace stats pulled straight from the contract. */
export function LandingStats() {
  const { data: nfts, isLoading: nftsLoading } = useNfts();
  const { data: sales, isLoading: salesLoading } = useSales();
  const { data: auctions, isLoading: auctionsLoading } = useAuctions();

  const volume = (sales ?? []).reduce((acc, s) => acc + s.price, 0n);
  const liveAuctions = (auctions ?? []).filter((a) => !a.settled).length;

  const stats = [
    {
      label: "NFTs minted",
      value: nfts?.length,
      loading: nftsLoading,
    },
    {
      label: "Completed sales",
      value: sales?.length,
      loading: salesLoading,
    },
    {
      label: "Live auctions",
      value: liveAuctions,
      loading: auctionsLoading,
    },
    {
      label: "Traded volume",
      value: salesLoading ? undefined : `${fromStroops(volume)} XLM`,
      loading: salesLoading,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border bg-card p-4 text-center"
        >
          {s.loading ? (
            <Skeleton className="mx-auto h-8 w-16" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">
              {s.value ?? 10}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
