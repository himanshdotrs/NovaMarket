/** Mirrors the Soroban contract types (see contract/src/lib.rs). */

export interface Nft {
  id: bigint;
  owner: string;
  creator: string;
  royalty_bps: number;
  name: string;
  uri: string;
}

export interface Listing {
  token_id: bigint;
  seller: string;
  price: bigint; // stroops
}

export interface Auction {
  id: bigint;
  token_id: bigint;
  seller: string;
  reserve_price: bigint;
  end_time: bigint; // unix seconds
  highest_bidder: string | undefined;
  highest_bid: bigint;
  settled: boolean;
}

export interface Offer {
  token_id: bigint;
  buyer: string;
  amount: bigint;
}

export interface Sale {
  token_id: bigint;
  seller: string;
  buyer: string;
  price: bigint;
  royalty_paid: bigint;
  kind: "direct" | "auction" | "offer";
  timestamp: bigint;
}

/* ----------------------------- wallet ----------------------------- */

export interface WalletConnection {
  address: string;
  walletId: string;
  walletName: string;
}

/* --------------------------- transactions -------------------------- */

export type TxStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface TrackedTx {
  hash: string;
  method: string;
  label: string;
  status: TxStatus;
  createdAt: number;
  error?: string;
}

/* ----------------------------- events ------------------------------ */

export type MarketEventType =
  | "minted"
  | "listed"
  | "unlisted"
  | "purchase"
  | "auction_created"
  | "bid_placed"
  | "auction_settled"
  | "auction_cancelled"
  | "offer_made"
  | "offer_cancelled"
  | "offer_accepted";

export interface MarketEvent {
  id: string;
  txHash: string;
  ledgerClosedAt: string;
  type: MarketEventType;
  /** The wallet that performed the action (when derivable from the event). */
  address?: string;
  /** Human-readable description of what happened. */
  action: string;
  data: Record<string, unknown>;
}
