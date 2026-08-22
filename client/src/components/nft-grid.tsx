"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ExternalLink,
  Gavel,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import {
  useAuctions,
  useListings,
  useNfts,
  useOffers,
} from "@/hooks/useContractData";
import {
  acceptOffer,
  buyNft,
  cancelAuction,
  cancelListing,
  cancelOffer,
  createAuction,
  listFixed,
  makeOffer,
  mintNft,
  settleAuction,
} from "@/hooks/contract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPLORER_ACCOUNT_URL } from "@/lib/config";
import {
  formatRoyalty,
  fromStroops,
  secondsUntil,
  shortAddress,
  toStroops,
} from "@/lib/utils";
import type { Auction, Listing, Nft } from "@/types";

export function NftGrid({ address }: { address: string | null }) {
  const { data: nfts, isLoading } = useNfts();
  const { data: listings } = useListings();
  const { data: auctions } = useAuctions();

  const listingByToken = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const l of listings ?? []) map.set(l.token_id.toString(), l);
    return map;
  }, [listings]);

  // token_id -> its unsettled auction (the contract allows at most one).
  const auctionByToken = useMemo(() => {
    const map = new Map<string, Auction>();
    for (const a of auctions ?? []) {
      if (!a.settled) map.set(a.token_id.toString(), a);
    }
    return map;
  }, [auctions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          Marketplace
        </CardTitle>
        <CardDescription>
          Browse, mint, list, and trade NFTs — royalties enforced on-chain
        </CardDescription>
        <CardAction>
          <MintDialog address={address} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : !nfts || nfts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <Sparkles className="size-8 text-primary" />
            <div>
              <p className="font-medium">No NFTs yet</p>
              <p className="text-sm text-muted-foreground">
                Mint the first NFT and kick off the marketplace.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nfts.map((nft) => (
              <NftCard
                key={nft.id.toString()}
                nft={nft}
                listing={listingByToken.get(nft.id.toString())}
                auction={auctionByToken.get(nft.id.toString())}
                address={address}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- card ------------------------------ */

function NftCard({
  nft,
  listing,
  auction,
  address,
}: {
  nft: Nft;
  listing?: Listing;
  auction?: Auction;
  address: string | null;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const isOwner = address != null && address === nft.owner;
  const auctionEnded = auction != null && secondsUntil(auction.end_time) <= 0;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setDetailOpen(true);
        }}
        className="group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:bg-accent/50"
      >
        <NftImage uri={nft.uri} name={nft.name} />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{nft.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                #{nft.id.toString()}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="outline">{formatRoyalty(nft.royalty_bps)}</Badge>
              {isOwner && <Badge variant="secondary">You</Badge>}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Creator{" "}
            <a
              href={EXPLORER_ACCOUNT_URL(nft.creator)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="font-mono underline-offset-2 hover:underline"
            >
              {shortAddress(nft.creator)}
            </a>
          </p>

          <div className="flex flex-wrap gap-1">
            {listing && (
              <Badge className="border-transparent bg-primary/15 text-primary">
                <Tag className="size-3" />
                Listed — {fromStroops(listing.price)} XLM
              </Badge>
            )}
            {auction && !auctionEnded && (
              <Badge variant="outline">
                <Gavel className="size-3" />
                In auction
              </Badge>
            )}
            {auction && auctionEnded && (
              <Badge variant="outline" className="text-amber-500">
                <Gavel className="size-3" />
                Awaiting settlement
              </Badge>
            )}
          </div>

          <div
            className="mt-auto flex flex-wrap gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CardActions
              nft={nft}
              listing={listing}
              auction={auction}
              auctionEnded={auctionEnded}
              address={address}
            />
          </div>
        </div>
      </div>

      <NftDetailDialog
        nft={nft}
        listing={listing}
        auction={auction}
        auctionEnded={auctionEnded}
        address={address}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

function CardActions({
  nft,
  listing,
  auction,
  auctionEnded,
  address,
}: {
  nft: Nft;
  listing?: Listing;
  auction?: Auction;
  auctionEnded: boolean;
  address: string | null;
}) {
  const isOwner = address != null && address === nft.owner;

  if (!address) return null;

  // An ended-but-unsettled auction locks the token on-chain. Settlement is
  // permissionless, so surface it right on the card for everyone — without
  // this the owner's sell actions would look "gone" forever.
  if (auction && auctionEnded) {
    return <SettleAuctionButton auctionId={auction.id} address={address} />;
  }

  if (isOwner) {
    if (listing) {
      return <CancelListingButton address={address} tokenId={nft.id} />;
    }
    if (auction) {
      // Live auction: the seller can back out while there are no bids.
      return auction.highest_bidder == null ? (
        <CancelAuctionButton auctionId={auction.id} address={address} />
      ) : null;
    }
    return (
      <>
        <ListDialog address={address} tokenId={nft.id} />
        <AuctionDialog address={address} tokenId={nft.id} />
      </>
    );
  }

  return (
    <>
      {listing && (
        <BuyButton address={address} listing={listing} />
      )}
      <OfferDialog address={address} tokenId={nft.id} />
    </>
  );
}

function CancelAuctionButton({
  auctionId,
  address,
}: {
  auctionId: bigint;
  address: string;
}) {
  const [pending, setPending] = useState(false);

  const cancel = async () => {
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
    <Button size="sm" variant="outline" onClick={cancel} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
      Cancel auction
    </Button>
  );
}

function SettleAuctionButton({
  auctionId,
  address,
}: {
  auctionId: bigint;
  address: string;
}) {
  const [pending, setPending] = useState(false);

  const settle = async () => {
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
    <Button size="sm" variant="secondary" onClick={settle} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Gavel className="size-4" />
      )}
      Settle auction
    </Button>
  );
}

function NftImage({ uri, name }: { uri: string; name: string }) {
  const [broken, setBroken] = useState(false);

  if (!uri || broken) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-linear-to-br from-primary/20 via-muted to-primary/5">
        <ImageIcon className="size-10 text-muted-foreground" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt={name}
      className="aspect-square w-full object-cover"
      onError={() => setBroken(true)}
    />
  );
}

/* --------------------------- detail dialog ------------------------- */

function NftDetailDialog({
  nft,
  listing,
  auction,
  auctionEnded,
  address,
  open,
  onOpenChange,
}: {
  nft: Nft;
  listing?: Listing;
  auction?: Auction;
  auctionEnded: boolean;
  address: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: offers, isLoading } = useOffers(open ? nft.id : null);
  const isOwner = address != null && address === nft.owner;
  // The contract rejects accept_offer while the token is locked in an
  // auction (until it's settled).
  const acceptLocked = auction != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {nft.name}
            <span className="font-mono text-sm text-muted-foreground">
              #{nft.id.toString()}
            </span>
          </DialogTitle>
          <DialogDescription>
            {listing
              ? `Listed for ${fromStroops(listing.price)} XLM`
              : auction && !auctionEnded
                ? "Currently in a live auction"
                : auction && auctionEnded
                  ? "Auction ended — waiting to be settled"
                  : "Not listed for sale"}
          </DialogDescription>
        </DialogHeader>

        <NftImage uri={nft.uri} name={nft.name} />

        <div className="grid gap-2 text-sm">
          <DetailRow label="Owner">
            <ExplorerAddress address={nft.owner} />
            {isOwner && <Badge variant="secondary">You</Badge>}
          </DetailRow>
          <DetailRow label="Creator">
            <ExplorerAddress address={nft.creator} />
          </DetailRow>
          <DetailRow label="Royalty">
            <span>{formatRoyalty(nft.royalty_bps)} to the creator on every sale</span>
          </DetailRow>
          <DetailRow label="URI">
            <span className="break-all font-mono text-xs text-muted-foreground">
              {nft.uri || "—"}
            </span>
          </DetailRow>
        </div>

        <Separator />

        <div className="grid gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="size-4 text-primary" />
            Offers
          </p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : !offers || offers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open offers on this NFT.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {isOwner && acceptLocked && (
                <p className="text-xs text-muted-foreground">
                  Offers can be accepted after the auction is settled.
                </p>
              )}
              {offers.map((offer) => (
                <OfferRow
                  key={offer.buyer}
                  tokenId={nft.id}
                  buyer={offer.buyer}
                  amount={offer.amount}
                  isOwner={isOwner}
                  acceptLocked={acceptLocked}
                  address={address}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-right">
        {children}
      </span>
    </div>
  );
}

function ExplorerAddress({ address }: { address: string }) {
  return (
    <a
      href={EXPLORER_ACCOUNT_URL(address)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono underline-offset-2 hover:underline"
    >
      {shortAddress(address)}
      <ExternalLink className="size-3 text-muted-foreground" />
    </a>
  );
}

function OfferRow({
  tokenId,
  buyer,
  amount,
  isOwner,
  acceptLocked,
  address,
}: {
  tokenId: bigint;
  buyer: string;
  amount: bigint;
  isOwner: boolean;
  acceptLocked: boolean;
  address: string | null;
}) {
  const [pending, setPending] = useState(false);
  const isBuyer = address != null && address === buyer;

  const accept = async () => {
    if (!address) return;
    setPending(true);
    try {
      await acceptOffer(address, tokenId, buyer);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  const withdraw = async () => {
    if (!address) return;
    setPending(true);
    try {
      await cancelOffer(address, tokenId);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{fromStroops(amount)} XLM</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {shortAddress(buyer)}
          {isBuyer ? " (you)" : ""}
        </p>
      </div>
      {isOwner && (
        <Button size="sm" onClick={accept} disabled={pending || acceptLocked}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          Accept
        </Button>
      )}
      {isBuyer && (
        <Button size="sm" variant="outline" onClick={withdraw} disabled={pending}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
          Withdraw
        </Button>
      )}
    </div>
  );
}

/* ----------------------------- actions ----------------------------- */

function BuyButton({
  address,
  listing,
}: {
  address: string;
  listing: Listing;
}) {
  const [pending, setPending] = useState(false);

  const buy = async () => {
    setPending(true);
    try {
      await buyNft(address, listing.token_id);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" onClick={buy} disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      Buy for {fromStroops(listing.price)} XLM
    </Button>
  );
}

function CancelListingButton({
  address,
  tokenId,
}: {
  address: string;
  tokenId: bigint;
}) {
  const [pending, setPending] = useState(false);

  const cancel = async () => {
    setPending(true);
    try {
      await cancelListing(address, tokenId);
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={cancel} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <X className="size-4" />
      )}
      Cancel listing
    </Button>
  );
}

function ListDialog({
  address,
  tokenId,
}: {
  address: string;
  tokenId: bigint;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [pending, setPending] = useState(false);

  const stroops = toStroops(price);
  const valid = stroops > 0n;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    try {
      await listFixed(address, tokenId, stroops);
      setOpen(false);
      setPrice("");
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Tag className="size-4" />
          List
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>List NFT #{tokenId.toString()}</DialogTitle>
          <DialogDescription>
            Put this NFT up for sale at a fixed price. Creator royalty is
            deducted automatically on purchase.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`list-price-${tokenId}`}>Price (XLM)</Label>
          <Input
            id={`list-price-${tokenId}`}
            type="number"
            min={0}
            step="any"
            placeholder="10"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            List for sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DURATIONS = [
  { label: "5 minutes", secs: 5 * 60 },
  { label: "1 hour", secs: 60 * 60 },
  { label: "6 hours", secs: 6 * 60 * 60 },
  { label: "24 hours", secs: 24 * 60 * 60 },
];

function AuctionDialog({
  address,
  tokenId,
}: {
  address: string;
  tokenId: bigint;
}) {
  const [open, setOpen] = useState(false);
  const [reserve, setReserve] = useState("");
  const [duration, setDuration] = useState(String(DURATIONS[1].secs));
  const [pending, setPending] = useState(false);

  const stroops = toStroops(reserve);
  const valid = stroops > 0n;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    try {
      await createAuction(address, tokenId, stroops, Number(duration));
      setOpen(false);
      setReserve("");
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Gavel className="size-4" />
          Auction
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auction NFT #{tokenId.toString()}</DialogTitle>
          <DialogDescription>
            Start a time-boxed ascending auction. Bids must meet the reserve
            price.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`auction-reserve-${tokenId}`}>
              Reserve price (XLM)
            </Label>
            <Input
              id={`auction-reserve-${tokenId}`}
              type="number"
              min={0}
              step="any"
              placeholder="5"
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.secs} value={String(d.secs)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Start auction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferDialog({
  address,
  tokenId,
}: {
  address: string;
  tokenId: bigint;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  const stroops = toStroops(amount);
  const valid = stroops > 0n;

  const submit = async () => {
    if (!valid) return;
    setPending(true);
    try {
      await makeOffer(address, tokenId, stroops);
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
        <Button size="sm" variant="outline">
          <TrendingUp className="size-4" />
          Make offer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offer on NFT #{tokenId.toString()}</DialogTitle>
          <DialogDescription>
            Propose a price to the owner. You can withdraw the offer at any
            time before it is accepted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={`offer-amount-${tokenId}`}>Amount (XLM)</Label>
          <Input
            id={`offer-amount-${tokenId}`}
            type="number"
            min={0}
            step="any"
            placeholder="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Submit offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- mint ------------------------------ */

function MintDialog({ address }: { address: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [uri, setUri] = useState("");
  const [royalty, setRoyalty] = useState("5");
  const [pending, setPending] = useState(false);

  const royaltyPct = Number(royalty);
  const royaltyValid =
    Number.isFinite(royaltyPct) && royaltyPct >= 0 && royaltyPct <= 50;
  const valid = name.trim().length > 0 && uri.trim().length > 0 && royaltyValid;

  const submit = async () => {
    if (!address) return;
    if (!valid) {
      toast.error("Check the form", {
        description: "Name, image URL, and a royalty between 0–50% are required.",
      });
      return;
    }
    setPending(true);
    try {
      await mintNft(
        address,
        name.trim(),
        uri.trim(),
        Math.round(royaltyPct * 100)
      );
      setOpen(false);
      setName("");
      setUri("");
      setRoyalty("5");
    } catch {
      // contract layer already toasts errors
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!address}>
          <Plus className="size-4" />
          Mint NFT
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint a new NFT</DialogTitle>
          <DialogDescription>
            Creates the token on-chain with you as creator. The royalty applies
            to every future sale.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="mint-name">Name</Label>
            <Input
              id="mint-name"
              placeholder="Nebula #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mint-uri">Image URL</Label>
            <Input
              id="mint-uri"
              placeholder="https://example.com/image.png"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mint-royalty">Royalty (%)</Label>
            <Input
              id="mint-royalty"
              type="number"
              min={0}
              max={50}
              step="any"
              value={royalty}
              onChange={(e) => setRoyalty(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              0–50%. Paid to you as the creator on every sale.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !valid}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Mint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
