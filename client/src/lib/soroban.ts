import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";

export type ScVal = xdr.ScVal;
type TransactionResult = xdr.TransactionResult;
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "@/lib/config";

/* ------------------------------------------------------------------ */
/* Clients (singletons — safe to reuse across requests)                */
/* ------------------------------------------------------------------ */

let _server: rpc.Server | null = null;

export function server(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(RPC_URL, { allowHttp: false });
  }
  return _server;
}

let _contract: Contract | null = null;

/** Lazy so a placeholder CONTRACT_ID doesn't crash prerendering. */
export function getContract(): Contract {
  if (!_contract) {
    _contract = new Contract(CONTRACT_ID);
  }
  return _contract;
}

/* ------------------------------------------------------------------ */
/* Argument converters                                                 */
/* ------------------------------------------------------------------ */

export function toScValString(v: string): ScVal {
  return nativeToScVal(v, { type: "string" });
}
export function toScValAddress(v: string): ScVal {
  return new Address(v).toScVal();
}
export function toScValI128(v: number | bigint | string): ScVal {
  return nativeToScVal(v, { type: "i128" });
}
export function toScValU64(v: number | bigint | string): ScVal {
  return nativeToScVal(v, { type: "u64" });
}
export function toScValU32(v: number): ScVal {
  return nativeToScVal(v, { type: "u32" });
}

/** Convert any supported primitive into a correctly-typed ScVal. */
export function autoScVal(
  v: string | number | bigint | boolean
): ScVal {
  if (typeof v === "boolean") return nativeToScVal(v, { type: "bool" });
  if (typeof v === "number" || typeof v === "bigint") {
    // Heuristic: ids/counters are u64; energy & prices fit i128 either way.
    return nativeToScVal(v, { type: "u64" });
  }
  // Strings that look like Stellar addresses become Address scVals.
  if (/^[GC][A-Z2-7]{55}$/.test(v)) return toScValAddress(v);
  return toScValString(v);
}

/* ------------------------------------------------------------------ */
/* Read-only calls (simulate + decode, no signature needed)            */
/* ------------------------------------------------------------------ */

/**
 * Calls a read-only contract method and returns the decoded native value.
 * Uses the official simulate → assemble → results pipeline.
 */
export async function readContract<T = unknown>(
  method: string,
  args: ScVal[] = [],
  caller?: string
): Promise<T> {
  const source =
    caller ?? "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const account = await fakeAccount(source);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server().simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error(describeSimulationError(sim));
  }

  if (!sim.result) {
    throw new Error(`Contract method "${method}" returned no result.`);
  }
  return scValToNative(sim.result.retval) as T;
}

async function fakeAccount(address: string) {
  try {
    return await server().getAccount(address);
  } catch {
    return scratchAccount(address);
  }
}

/** Minimal Account stand-in so simulation-only reads work pre-funding. */
function scratchAccount(address: string) {
  let seq = "0";
  return {
    accountId: () => address,
    sequenceNumber: () => seq,
    incrementSequenceNumber: () => {
      seq = (BigInt(seq) + 1n).toString();
    },
  };
}

function describeSimulationError(
  sim: rpc.Api.SimulateTransactionErrorResponse
): string {
  const diag = (sim.events ?? [])
    .map((e) => JSON.stringify(e))
    .join("; ");
  const errText =
    typeof sim.error === "string"
      ? sim.error
      : JSON.stringify(sim.error ?? {});
  return diag.length > 0 ? `${errText} ${diag}` : errText;
}

/* ------------------------------------------------------------------ */
/* State-changing calls                                                */
/* ------------------------------------------------------------------ */

/** Builds an unsigned invocation transaction for `method`. */
export async function buildInvokeTx(
  method: string,
  args: ScVal[],
  caller: string
): Promise<Transaction> {
  const account = await server().getAccount(caller);
  return new TransactionBuilder(account, {
    fee: (Number(BASE_FEE) * 100).toString(), // headroom for Soroban resources
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(getContract().call(method, ...args))
    .setTimeout(120)
    .build();
}

export interface SubmitOutcome {
  hash: string;
  /** Decoded contract return value when the call succeeded. */
  result?: unknown;
}

/**
 * Submits a signed XDR envelope and returns its hash immediately
 * (the tx is usually still pending at this point).
 */
export async function submitTransaction(signedTxXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXdr(signedTxXdr, NETWORK_PASSPHRASE);
  const send = await server().sendTransaction(tx);
  if (send.errorResult) {
    throw new Error(`Submission failed: ${resultToString(send.errorResult)}`);
  }
  return send.hash;
}

/**
 * Polls the RPC until the transaction is confirmed.
 * Resolves with the decoded return value on SUCCESS,
 * throws (with contract diagnostics) on FAILED or timeout.
 */
export async function pollTransaction(
  hash: string,
  maxAttempts = 30
): Promise<SubmitOutcome> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(2_000);
    const status = await server().getTransaction(hash);
    switch (status.status) {
      case rpc.Api.GetTransactionStatus.SUCCESS:
        return {
          hash,
          result: status.returnValue
            ? scValToNative(status.returnValue)
            : undefined,
        };
      case rpc.Api.GetTransactionStatus.FAILED:
        throw new Error(
          `Transaction failed on-chain: ${describeResultXdr(status.resultXdr)}`
        );
      default:
        break; // still NOT_FOUND / pending — keep polling
    }
  }
  throw Object.assign(
    new Error("Timed out waiting for confirmation — check the explorer later."),
    { hash }
  );
}

/** Extracts a human-readable reason from a TransactionResult (string or xdr). */
function describeResultXdr(resultXdr: string | { toString(): string }): string {
  try {
    const text =
      typeof resultXdr === "string" ? resultXdr : resultXdr.toString();
    const match = text.match(/#(\d+)/);
    if (match) return `contract error #${match[1]}`;
    return text.slice(0, 160) || "unknown error";
  } catch {
    return "unknown error";
  }
}

function resultToString(r: TransactionResult): string {
  try {
    return r.result?.toString() ?? JSON.stringify(r);
  } catch {
    return "submission rejected by RPC";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
