import { scValToNative } from "@stellar/stellar-sdk";
import { CONTRACT_ID } from "@/lib/config";
import { server } from "@/lib/soroban";
import { fromStroops } from "@/lib/utils";
import type { MarketEvent } from "@/types";

/**
 * Real-time contract event stream.
 *
 * Uses Soroban RPC `getEvents` filtered to our contract ID — every entry in
 * the Activity Feed therefore originates directly from an on-chain contract
 * interaction (mints, listings, purchases, bids, offers, settlements).
 */

/** How far back the initial load reaches (~14h of testnet ledgers). */
const INITIAL_LEDGER_WINDOW = 10_000;

/** Maximum events kept in the feed. */
const FEED_CAP = 100;

/** Scoped per contract so a redeploy never shows stale foreign events. */
const STORAGE_KEY = `novamarket.events.${CONTRACT_ID}`;

/** Highest ledger we've already ingested. */
let lastLedger: number | null = null;

/**
 * Accumulated feed. `getEvents` is polled with an advancing cursor (each
 * call only returns NEW events), so we must merge results here — otherwise
 * a poll with no fresh events would wipe the visible feed.
 */
let feed: MarketEvent[] = [];

/**
 * Both the feed and the cursor are persisted to localStorage so a page
 * refresh keeps the full activity history instead of erasing it.
 */
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      lastLedger?: number | null;
      feed?: MarketEvent[];
    };
    if (typeof parsed.lastLedger === "number") lastLedger = parsed.lastLedger;
    if (Array.isArray(parsed.feed)) feed = parsed.feed.slice(0, FEED_CAP);
  } catch {
    // Corrupted cache — start fresh.
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function save() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ lastLedger, feed })
    );
  } catch {
    // Storage full or unavailable — the feed still works in-memory.
  }
}

export function resetEventCursor() {
  lastLedger = null;
  feed = [];
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

interface RawEvent {
  id: string;
  type: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
  topic: unknown[];
  value: unknown;
}

export async function fetchRecentEvents(limit = 50): Promise<MarketEvent[]> {
  hydrate();
  const srv = server();
  if (lastLedger === null) {
    const { sequence } = await srv.getLatestLedger();
    lastLedger = Math.max(1, sequence - INITIAL_LEDGER_WINDOW);
  }

  let res;
  try {
    res = await srv.getEvents({
      startLedger: lastLedger,
      filters: [
        {
          type: "contract",
          contractIds: [CONTRACT_ID],
        },
      ],
      limit,
    });
  } catch (err) {
    // A rejected cursor (e.g. outside the RPC retention window after days
    // away) would otherwise fail every poll — re-anchor to the latest
    // ledger instead. The persisted feed is kept.
    lastLedger = null;
    save();
    throw err;
  }

  const raws = res.events as unknown as RawEvent[];
  if (raws.length > 0) {
    lastLedger = Math.max(...raws.map((e) => e.ledger)) + 1;
  }

  const fresh = raws
    .map(parseEvent)
    .filter((e): e is MarketEvent => e !== null)
    .reverse(); // newest first

  if (fresh.length > 0) {
    const seen = new Set(feed.map((e) => e.id));
    feed = [...fresh.filter((e) => !seen.has(e.id)), ...feed].slice(0, FEED_CAP);
  }
  save();

  return [...feed].slice(0, limit);
}

/* ------------------------------ parsing ------------------------------ */

function parseEvent(raw: RawEvent): MarketEvent | null {
  try {
    // Topic[0] carries our event name as a Symbol scVal.
    const name = String(scValToNative(raw.topic[0] as never));
    // Value is a Vec scVal of the published tuple.
    const v = scValToNative(raw.value as never) as unknown[];
    const base = {
      id: raw.id,
      txHash: raw.txHash,
      ledgerClosedAt: raw.ledgerClosedAt,
    };

    switch (name) {
      case "minted": {
        const [id, creator, nftName, royaltyBps] = v as [
          bigint,
          string,
          string,
          number
        ];
        return {
          ...base,
          type: "minted",
          address: String(creator),
          action: `Minted “${nftName}” (#${id}) with ${Number(royaltyBps) / 100}% royalty`,
          data: { tokenId: Number(id), name: nftName, royaltyBps: Number(royaltyBps) },
        };
      }
      case "listed": {
        const [tokenId, seller, price] = v as [bigint, string, bigint];
        return {
          ...base,
          type: "listed",
          address: String(seller),
          action: `Listed NFT #${tokenId} for ${fromStroops(price)} XLM`,
          data: { tokenId: Number(tokenId), price: price.toString() },
        };
      }
      case "unlisted": {
        const [tokenId, seller] = v as [bigint, string];
        return {
          ...base,
          type: "unlisted",
          address: String(seller),
          action: `Cancelled listing of NFT #${tokenId}`,
          data: { tokenId: Number(tokenId) },
        };
      }
      case "purchase": {
        const [tokenId, seller, buyer, price, royalty] = v as [
          bigint,
          string,
          string,
          bigint,
          bigint
        ];
        return {
          ...base,
          type: "purchase",
          address: String(buyer),
          action: `Bought NFT #${tokenId} for ${fromStroops(price)} XLM (royalty ${fromStroops(royalty)} XLM)`,
          data: {
            tokenId: Number(tokenId),
            seller: String(seller),
            price: price.toString(),
            royalty: royalty.toString(),
          },
        };
      }
      case "auction_created": {
        const [id, tokenId, seller, reserve] = v as [
          bigint,
          bigint,
          string,
          bigint
        ];
        return {
          ...base,
          type: "auction_created",
          address: String(seller),
          action: `Started auction #${id} for NFT #${tokenId} (reserve ${fromStroops(reserve)} XLM)`,
          data: {
            auctionId: Number(id),
            tokenId: Number(tokenId),
            reserve: reserve.toString(),
          },
        };
      }
      case "bid_placed": {
        const [id, bidder, amount] = v as [bigint, string, bigint];
        return {
          ...base,
          type: "bid_placed",
          address: String(bidder),
          action: `Bid ${fromStroops(amount)} XLM on auction #${id}`,
          data: { auctionId: Number(id), amount: amount.toString() },
        };
      }
      case "auction_settled": {
        const [id, tokenId, winner, amount] = v as [
          bigint,
          bigint,
          string | null,
          bigint
        ];
        const sold = winner != null;
        return {
          ...base,
          type: "auction_settled",
          address: winner ? String(winner) : undefined,
          action: sold
            ? `Auction #${id} settled — NFT #${tokenId} sold to ${short(winner)} for ${fromStroops(amount)} XLM`
            : `Auction #${id} ended with no bids — NFT #${tokenId} unlocked`,
          data: {
            auctionId: Number(id),
            tokenId: Number(tokenId),
            winner: winner ? String(winner) : null,
            amount: amount.toString(),
          },
        };
      }
      case "auction_cancelled": {
        const [id, tokenId, seller] = v as [bigint, bigint, string];
        return {
          ...base,
          type: "auction_cancelled",
          address: String(seller),
          action: `Cancelled auction #${id} — NFT #${tokenId} unlocked`,
          data: { auctionId: Number(id), tokenId: Number(tokenId) },
        };
      }
      case "offer_made": {
        const [tokenId, buyer, amount] = v as [bigint, string, bigint];
        return {
          ...base,
          type: "offer_made",
          address: String(buyer),
          action: `Offered ${fromStroops(amount)} XLM for NFT #${tokenId}`,
          data: { tokenId: Number(tokenId), amount: amount.toString() },
        };
      }
      case "offer_cancelled": {
        const [tokenId, buyer] = v as [bigint, string];
        return {
          ...base,
          type: "offer_cancelled",
          address: String(buyer),
          action: `Withdrew offer on NFT #${tokenId}`,
          data: { tokenId: Number(tokenId) },
        };
      }
      case "offer_accepted": {
        const [tokenId, owner, buyer, amount] = v as [
          bigint,
          string,
          string,
          bigint
        ];
        return {
          ...base,
          type: "offer_accepted",
          address: String(owner),
          action: `Accepted ${short(String(buyer))}'s offer of ${fromStroops(amount)} XLM for NFT #${tokenId}`,
          data: {
            tokenId: Number(tokenId),
            buyer: String(buyer),
            amount: amount.toString(),
          },
        };
      }
      default:
        return null;
    }
  } catch {
    return null; // skip undecodable diagnostics events
  }
}

function short(addr: string): string {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "?";
}
