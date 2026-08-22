"use client";

import { useWallet } from "@/hooks/useWallet";
import { AuctionsPanel } from "@/components/auctions-panel";

export default function AuctionsPage() {
  const { address } = useWallet();

  return (
    <div className="flex flex-col gap-6">
      <AuctionsPanel address={address} />
      {!address && (
        <p className="text-center text-sm text-muted-foreground">
          Connect a wallet to place bids and settle ended auctions.
        </p>
      )}
    </div>
  );
}
