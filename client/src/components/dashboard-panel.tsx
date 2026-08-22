"use client";

import { toast } from "sonner";
import { Copy, ExternalLink, ImageIcon, Wallet } from "lucide-react";
import { useWalletBalances } from "@/hooks/useBalances";
import { useNfts } from "@/hooks/useContractData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORER_ACCOUNT_URL } from "@/lib/config";
import { shortAddress } from "@/lib/utils";

export function DashboardPanel({ address }: { address: string | null }) {
  const { data: balances, isLoading: balancesLoading } =
    useWalletBalances(address);
  const { data: nfts } = useNfts();

  if (!address) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <Wallet className="size-8 text-primary" />
          <p className="font-medium">Connect a wallet to get started</p>
          <p className="text-sm text-muted-foreground">
            Mint NFTs, list them for sale, run auctions, and negotiate offers —
            all on Stellar testnet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const native = balances?.find((b) => b.asset_type === "native");
  const others = (balances ?? []).filter((b) => b.asset_type !== "native");
  const ownedCount = (nfts ?? []).filter((n) => n.owner === address).length;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          Wallet
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-1">
          <span className="font-mono">{shortAddress(address, 8)}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={copyAddress}
            aria-label="Copy address"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            asChild
            aria-label="View on explorer"
          >
            <a
              href={EXPLORER_ACCOUNT_URL(address)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
          <Badge variant="outline">Testnet</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">XLM balance</p>
            {balancesLoading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className="text-2xl font-semibold tabular-nums">
                {native
                  ? parseFloat(native.balance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  : "0"}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  XLM
                </span>
              </p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ImageIcon className="size-3" />
              NFTs owned
            </p>
            <p className="text-2xl font-semibold tabular-nums">{ownedCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Other assets</p>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <div className="flex flex-col gap-0.5 text-sm">
                {others.map((b, i) => (
                  <p key={`${b.asset_code ?? b.asset_type}-${i}`} className="tabular-nums">
                    {parseFloat(b.balance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-muted-foreground">
                      {b.asset_code ?? b.asset_type}
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
