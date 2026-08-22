"use client";

import { toast } from "sonner";
import { rpc } from "@stellar/stellar-sdk";
import { EXPLORER_TX_URL } from "@/lib/config";
import { friendlyError } from "@/lib/errors";
import { CONTRACT_ROOT_KEY, queryClient } from "@/lib/query-client";
import {
  buildInvokeTx,
  pollTransaction,
  readContract,
  server,
  submitTransaction,
  type ScVal,
  toScValAddress,
  toScValI128,
  toScValString,
  toScValU32,
  toScValU64,
} from "@/lib/soroban";
import { signTransaction } from "@/lib/wallet";
import { useTxStore } from "@/stores/tx-store";
import type { Auction, Listing, Nft, Offer, Sale } from "@/types";

/* ================================================================== */
/* READS                                                              */
/* ================================================================== */

export async function fetchNfts(): Promise<Nft[]> {
  const raw = await readContract<Nft[]>("list_nfts");
  return [...raw].sort((a, b) => Number(b.id) - Number(a.id));
}

export async function fetchListings(): Promise<Listing[]> {
  return readContract<Listing[]>("list_listings");
}

/** Newest lots first. */
export async function fetchAuctions(): Promise<Auction[]> {
  const raw = await readContract<Auction[]>("list_auctions");
  return [...raw].sort((a, b) => Number(b.id) - Number(a.id));
}

export async function fetchOffers(tokenId: number | bigint): Promise<Offer[]> {
  return readContract<Offer[]>("get_offers", [toScValU64(tokenId)]);
}

/** Newest sales first. */
export async function fetchSales(): Promise<Sale[]> {
  const raw = await readContract<Sale[]>("get_sales");
  return [...raw].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
}

export async function fetchTokenCount(): Promise<bigint> {
  return readContract<bigint>("token_count");
}

/* ================================================================== */
/* WRITES — build → simulate → assemble → sign → submit → poll        */
/* ================================================================== */

/**
 * Full lifecycle for a state-changing call:
 *  1. build unsigned invocation
 *  2. pre-flight simulation (catches contract errors before wallet popup)
 *  3. assemble with simulation (Soroban resources + auth) and sign
 *  4. submission → tx enters the tracker as PENDING (toast with explorer link)
 *  5. polling until SUCCESS / FAILED, tracker + toast updated automatically
 */
async function runTracked(
  method: string,
  args: ScVal[],
  caller: string,
  label: string
): Promise<void> {
  const { track, setStatus } = useTxStore.getState();

  let hash: string | undefined;
  try {
    // 1–2: build & pre-flight
    const unsigned = await buildInvokeTx(method, args, caller);

    const sim = await server().simulateTransaction(unsigned);
    if (!rpc.Api.isSimulationSuccess(sim)) {
      throw new Error(describeSim(sim));
    }

    // 3: assemble (adds Soroban data, resource fee and auth) & sign
    const assembled = rpc.assembleTransaction(unsigned, sim).build();
    const signed = await signTransaction(assembled.toXdr(), caller);

    // 4: submit & start tracking immediately
    hash = await submitTransaction(signed.signedTxXdr);
    track({
      hash,
      method,
      status: "PENDING",
      createdAt: Date.now(),
      label,
    });
    toast.loading(`${label} — pending…`, {
      id: hash,
      action: {
        label: "Explorer ↗",
        onClick: () => window.open(EXPLORER_TX_URL(hash!), "_blank")?.focus(),
      },
    });

    // 5: wait for confirmation
    await pollTransaction(hash);
    setStatus(hash, "SUCCESS");
    toast.success(`${label} confirmed`, {
      id: hash,
      description: `Ledger confirmed · ${hash.slice(0, 12)}…`,
      action: {
        label: "Explorer ↗",
        onClick: () => window.open(EXPLORER_TX_URL(hash!), "_blank")?.focus(),
      },
    });
    // Real-time consistency: refresh every cached read immediately.
    queryClient.invalidateQueries({ queryKey: [CONTRACT_ROOT_KEY] });
  } catch (err) {
    const message = friendlyError(err);
    if (hash) setStatus(hash, "FAILED", message);
    toast.error(`${label} failed`, {
      id: hash,
      description: message,
    });
    throw new Error(message);
  }
}

function describeSim(sim: rpc.Api.SimulateTransactionErrorResponse): string {
  const text =
    typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error ?? {});
  return text.length ? text : "Simulation failed.";
}

/* -------------------- concrete write operations ------------------- */

export async function mintNft(
  caller: string,
  name: string,
  uri: string,
  royaltyBps: number
) {
  return runTracked(
    "mint",
    [
      toScValAddress(caller),
      toScValString(name),
      toScValString(uri),
      toScValU32(royaltyBps),
    ],
    caller,
    `Mint “${name}”`
  );
}

export async function listFixed(
  caller: string,
  tokenId: number | bigint,
  priceStroops: bigint
) {
  return runTracked(
    "list_fixed",
    [toScValAddress(caller), toScValU64(tokenId), toScValI128(priceStroops)],
    caller,
    `List NFT #${tokenId}`
  );
}

export async function cancelListing(caller: string, tokenId: number | bigint) {
  return runTracked(
    "cancel_listing",
    [toScValAddress(caller), toScValU64(tokenId)],
    caller,
    `Cancel listing of NFT #${tokenId}`
  );
}

export async function buyNft(caller: string, tokenId: number | bigint) {
  return runTracked(
    "buy",
    [toScValAddress(caller), toScValU64(tokenId)],
    caller,
    `Buy NFT #${tokenId}`
  );
}

export async function createAuction(
  caller: string,
  tokenId: number | bigint,
  reserveStroops: bigint,
  durationSecs: number | bigint
) {
  return runTracked(
    "create_auction",
    [
      toScValAddress(caller),
      toScValU64(tokenId),
      toScValI128(reserveStroops),
      toScValU64(durationSecs),
    ],
    caller,
    `Auction NFT #${tokenId}`
  );
}

export async function placeBid(
  caller: string,
  auctionId: number | bigint,
  amountStroops: bigint
) {
  return runTracked(
    "place_bid",
    [toScValAddress(caller), toScValU64(auctionId), toScValI128(amountStroops)],
    caller,
    `Bid on auction #${auctionId}`
  );
}

/** Seller-only: cancel an auction that has no bids yet. */
export async function cancelAuction(
  caller: string,
  auctionId: number | bigint
) {
  return runTracked(
    "cancel_auction",
    [toScValAddress(caller), toScValU64(auctionId)],
    caller,
    `Cancel auction #${auctionId}`
  );
}

/** Permissionless on-chain — anyone may settle an expired auction. */
export async function settleAuction(
  auctionId: number | bigint,
  caller: string
) {
  return runTracked(
    "settle_auction",
    [toScValU64(auctionId)],
    caller,
    `Settle auction #${auctionId}`
  );
}

export async function makeOffer(
  caller: string,
  tokenId: number | bigint,
  amountStroops: bigint
) {
  return runTracked(
    "make_offer",
    [toScValAddress(caller), toScValU64(tokenId), toScValI128(amountStroops)],
    caller,
    `Offer on NFT #${tokenId}`
  );
}

export async function cancelOffer(caller: string, tokenId: number | bigint) {
  return runTracked(
    "cancel_offer",
    [toScValAddress(caller), toScValU64(tokenId)],
    caller,
    `Withdraw offer on NFT #${tokenId}`
  );
}

export async function acceptOffer(
  caller: string,
  tokenId: number | bigint,
  buyer: string
) {
  return runTracked(
    "accept_offer",
    [toScValAddress(caller), toScValU64(tokenId), toScValAddress(buyer)],
    caller,
    `Accept offer on NFT #${tokenId}`
  );
}
