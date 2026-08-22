"use client";

import { useWallet } from "@/hooks/useWallet";
import { NftGrid } from "@/components/nft-grid";

export default function MarketplacePage() {
  const { address } = useWallet();

  return (
    <div className="flex flex-col gap-6">
      <NftGrid address={address} />
      {!address && (
        <p className="text-center text-sm text-muted-foreground">
          Connect a wallet to mint, list, buy, and make offers.
        </p>
      )}
    </div>
  );
}
