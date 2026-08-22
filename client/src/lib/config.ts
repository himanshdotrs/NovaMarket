/**
 * Central configuration for the Stellar NFT Marketplace frontend.
 * The deployed contract ID lives in NEXT_PUBLIC_CONTRACT_ID (.env.local);
 * the fallback below is the current testnet deployment.
 */

export const CONTRACT_ID =
  process.env.NEXT_PUBLIC_CONTRACT_ID ??
  "CAPTI5FMEUCVNH44T7UVRQDLMLA44FVXY4R36IZRAWQU6VLLGRQUVKTP";

export const NETWORK = "TESTNET" as const;

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/** Native XLM Stellar Asset Contract on testnet (payment token). */
export const NATIVE_TOKEN_CONTRACT =
  process.env.NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT ??
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** Project repository — shown in the footer and on the landing page. */
export const GITHUB_URL =
  process.env.NEXT_PUBLIC_GITHUB_URL ??
  "https://github.com/yourusername/nova-market";

export const EXPLORER_TX_URL = (hash: string) =>
  `https://stellar.expert/explorer/testnet/tx/${hash}`;

export const EXPLORER_ACCOUNT_URL = (address: string) =>
  `https://stellar.expert/explorer/testnet/account/${address}`;

export const EXPLORER_CONTRACT_URL = (id: string) =>
  `https://stellar.expert/explorer/testnet/contract/${id}`;

/** How often background polls run (ms). */
export const POLL_INTERVAL_MS = 6_000;
export const EVENT_POLL_INTERVAL_MS = 5_000;

/** 1 XLM = 10^7 stroops. */
export const STROOPS_PER_XLM = 10_000_000;

/** Contract error codes → user-friendly messages (matches lib.rs Error enum). */
export const CONTRACT_ERRORS: Record<number, string> = {
  1: "That NFT does not exist.",
  2: "Only the owner can do that.",
  3: "Amount must be greater than zero.",
  4: "Royalty cannot exceed 50%.",
  5: "This NFT is already listed.",
  6: "This NFT is not listed for sale.",
  7: "You already own this NFT.",
  8: "That auction does not exist.",
  9: "Bidding is still open — settlement unlocks after the deadline.",
  10: "The auction deadline has passed.",
  11: "This auction is already settled.",
  12: "Bid too low — it must meet the reserve and beat the current bid.",
  13: "You cannot bid on your own auction.",
  14: "Offer not found.",
  15: "This NFT is locked in an active auction.",
  16: "This auction already has bids — it must run to its deadline.",
};
