"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Gavel, Loader2 } from "lucide-react";
import { useAuctions, useNfts } from "@/hooks/useContractData";
import { cancelAuction, placeBid, settleAuction } from "@/hooks/contract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatDuration,
  fromStroops,
  secondsUntil,
  shortAddress,
  toStroops,
} from "@/lib/utils";
import type { Auction, Nft } from "@/types";

export function AuctionsPanel({ address }: { address: string | null }) {
  const { data: auctions, isLoading } = useAuctions();
  const { data: nfts } = useNfts();
  const [showPast, setShowPast] = useState(false);

  const nftById = useMemo(() => {
    const map = new Map<string, Nft>();
    for (const n of nfts ?? []) map.set(n.id.toString(), n);
    return map;
  }, [nfts]);

  const live = (auctions ?? []).filter((a) => !a.settled);
  const past = (auctions ?? []).filter((a) => a.settled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="size-4 text-primary" />
          Live Auctions
        </CardTitle>
        <CardDescription>
          Bid on open lots — highest bid at the deadline wins
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : live.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <Gavel className="size-8 text-primary" />
            <p className="font-medium">No live auctions</p>
            <p className="text-sm text-muted-foreground">
              Start one from any NFT you own in the Marketplace tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {live.map((a) => (
              <AuctionRow
                key={a.id.toString()}
                auction={a}
                nft={nftById.get(a.token_id.toString())}
                address={address}
              />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              onClick={() => setShowPast((v) => !v)}
            >
              <Clock className="size-4" />
              Past auctions ({past.length}) {showPast ? "▴" : "▾"}
            </Button>
            {showPast && (
              <div className="flex flex-col gap-2">
                {past.map((a) => (
                  <PastAuctionRow
                    key={a.id.toString()}
                    auction={a}
                    nft={nftById.get(a.token_id.toString())}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------- live rows ---------------------------- */

function AuctionRow({
  auction,
  nft,
  address,
}: {
  auction: Auction;
  nft?: Nft;
  address: string | null;
}) {
  const [remaining, setRemaining] = useState(() =>
    secondsUntil(auction.end_time)
  );

  useEffect(() => {
    const id = setInterval(
      () => setRemaining(secondsUntil(auction.end_time)),
      1_000
    );
    return () => clearInterval(id);
  }, [auction.end_time]);

  const ended = remaining <= 0;
  const isSeller = address != null && address === auction.seller;
  const canBid = !ended && !isSeller && address != null;
  const canSettle = ended && address != null;
  const canCancel =
    !ended && isSeller && auction.highest_bidder == null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium leading-tight">
          {nft ? nft.name : "NFT"}{" "}
          <span className="font-mono text-xs text-muted-foreground">
            #{auction.token_id.toString()} · auction #{auction.id.toString()}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Seller <span className="font-mono">{shortAddress(auction.seller)}</span>
          {isSeller ? " (you)" : ""} · Reserve {fromStroops(auction.reserve_price)}{" "}
          XLM
        </p>
        <p className="text-xs text-muted-foreground">
          {auction.highest_bidder ? (
            <>
              Highest bid {fromStroops(auction.highest_bid)} XLM by{" "}
              <span className="font-mono">
                {shortAddress(auction.highest_bidder)}
              </span>
            </>
          ) : (
            "No bids yet"
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {ended ? (
          <Badge variant="outline">Ended</Badge>
        ) : (
          <Badge className="border-transparent bg-primary/15 text-primary">
            <Clock className="size-3" />
            {formatDuration(remaining)}
          </Badge>
        )}
        {canBid && <BidDialog auction={auction} nft={nft} address={address!} />}
        {canSettle && (
          <SettleButton auctionId={auction.id} address={address!} />
        )}
        {canCancel && (
          <CancelButton auctionId={auction.id} address={address!} />
        )}
      </div>
    </div>
  );
}

function PastAuctionRow({ auction, nft }: { auction: Auction; nft?: Nft }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="min-w-0">
        <p className="leading-tight">
          {nft ? nft.name : "NFT"}{" "}
          <span className="font-mono text-xs text-muted-foreground">
            #{auction.token_id.toString()} · auction #{auction.id.toString()}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {auction.highest_bidder ? (
            <>
              Sold to{" "}
              <span className="font-mono">
                {shortAddress(auction.highest_bidder)}
              </span>{" "}
              for {fromStroops(auction.highest_bid)} XLM
            </>
          ) : (
            "No bids — returned to seller"
          )}
        </p>
      </div>
      <Badge variant="secondary">Settled</Badge>
    </div>
  );
}

/* ------------------------------ actions ---------------------------- */

function BidDialog({
  auction,
  nft,
  address,
}: {
  auction: Auction;
  nft?: Nft;
  address: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  // Contract rule: bid must meet the reserve and beat the current bid.
  const minStroops = auction.highest_bidder
    ? auction.highest_bid + 1n
    : auction.reserve_price;
  const stroops = toStroops(amount);
  const valid = stroops >= minStroops;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    try {
      await placeBid(address, auction.id, stroops);
      setOpen(false);
      setAmount("");
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Gavel className="size-4" />
          Bid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Bid on {nft ? nft.name : `NFT #${auction.token_id.toString()}`}
          </DialogTitle>
          <DialogDescription>
            {auction.highest_bidder
              ? `Must beat the current bid of ${fromStroops(auction.highest_bid)} XLM.`
              : `Must be at least the reserve of ${fromStroops(auction.reserve_price)} XLM.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`bid-${auction.id}`}>Bid amount (XLM)</Label>
          <Input
            id={`bid-${auction.id}`}
            type="number"
            min={0}
            step="any"
            placeholder={fromStroops(minStroops)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Place bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelButton({
  auctionId,
  address,
}: {
  auctionId: bigint;
  address: string;
}) {
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      await cancelAuction(address, auctionId);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={submit} disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Cancel
    </Button>
  );
}

function SettleButton({
  auctionId,
  address,
}: {
  auctionId: bigint;
  address: string;
}) {
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    try {
      await settleAuction(auctionId, address);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant="secondary" onClick={submit} disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Settle
    </Button>
  );
}
