import { positionScope } from "./actionJournal";
import { getAddress, type Eip1193Provider } from "ethers";
import type { FarmReadRpc } from "./farmTransactions";
import type { PositionPreview } from "./positionPreviews";
import {
  assertNoPendingPosition, positionLock,
  preparePositionTransaction, requestPositionTransaction, writePositionJournal,
  type PositionJournal, type PositionRequest, type PositionReview,
} from "./positionTransactions";

export type MinerDirectStage = "checking" | "wallet" | "pending" | "rejected" | "uncertain";
export type MinerDirectOptions = {
  request: PositionRequest;
  displayedQuote: PositionPreview;
  provider: Eip1193Provider;
  rpc: FarmReadRpc;
  current: () => boolean;
  onStage: (stage: MinerDirectStage, message?: string, hash?: string) => void;
};
export type MinerDirectFlowDependencies = {
  withLock: (account: string, run: () => Promise<PositionJournal>, scope?:string) => Promise<PositionJournal>;
  assertNoPendingPosition: typeof assertNoPendingPosition;
  prepare: typeof preparePositionTransaction;
  send: (review: PositionReview, provider: Eip1193Provider, rpc: FarmReadRpc, current: () => boolean, onWalletRequest?: () => void) => Promise<string>;
  write: typeof writePositionJournal;
};
const defaults: MinerDirectFlowDependencies = {
  async withLock(account, run, scope) {
    if (typeof navigator === "undefined" || !navigator.locks) throw Error("This browser cannot coordinate wallet requests safely. Use a current wallet-enabled browser.");
    return navigator.locks.request(positionLock(account) + ":" + scope, { ifAvailable: true }, async (lock) => {
      if (!lock) throw Error("Another wallet request is open in this app.");
      return run();
    });
  },
  assertNoPendingPosition, prepare: preparePositionTransaction,
  send: requestPositionTransaction, write: writePositionJournal,
};
type DirectKind = "rollover" | "withdraw";
const labels = {
  rollover: {
    name: "Rollover", selection: "Select a miner rollover.", reopen: "Open rollover again.",
    changed: "The miner or bonus terms changed. Refresh the available bonuses and select your duration again.",
  },
  withdraw: {
    name: "Withdrawal", selection: "Select a miner withdrawal.", reopen: "Open withdrawal again.",
    changed: "The miner or withdrawal terms changed. Refresh the withdrawal amount and penalty before continuing.",
  },
} as const;
const message = (reason: unknown, kind: DirectKind) => reason instanceof Error ? reason.message : "The " + labels[kind].name.toLowerCase() + " request could not be completed.";

function assertDisplayedTerms(displayed: PositionPreview, prepared: PositionReview, kind: DirectKind) {
  const old = displayed.execution, fresh = prepared.quote.execution;
  if (!old || !fresh || !displayed.simulation.startsWith("Passed") || !prepared.quote.simulation.startsWith("Passed") ||
      getAddress(displayed.account) !== getAddress(prepared.quote.account) ||
      getAddress(old.to) !== getAddress(prepared.transaction.to) || getAddress(fresh.to) !== getAddress(prepared.transaction.to) ||
      old.data.toLowerCase() !== prepared.transaction.data.toLowerCase() || fresh.data.toLowerCase() !== prepared.transaction.data.toLowerCase() ||
      old.fingerprint !== fresh.fingerprint || old.shares !== fresh.shares || old.recipient !== fresh.recipient || old.event !== fresh.event ||
      BigInt(fresh.minimumOutput) < BigInt(old.minimumOutput)) {
    throw Error(labels[kind].changed);
  }
}

// The selection dialog is the review. Bind its shown terms to the prepared
// transaction, then retain the shared wallet checks, lock, and durable journal.
export async function submitMinerDirect(kind: DirectKind, options: MinerDirectOptions, dependencies: Partial<MinerDirectFlowDependencies> = {}): Promise<PositionJournal> {
  const { request, displayedQuote, provider, rpc, current, onStage } = options;
  const deps = { ...defaults, ...dependencies };
  if (request.type !== "miner" || request.action.kind !== kind) throw Error(labels[kind].selection);
  const account = getAddress(displayedQuote.account);
  const ensureCurrent = () => { if (!current()) throw Error("The wallet or selected miner changed. " + labels[kind].reopen); };
  // A closed dialog must not interrupt persistence of an already-started send.
  const notify = (stage: MinerDirectStage, text?: string, hash?: string) => {
    try { if (current()) onStage(stage, text, hash); } catch { /* UI observers cannot alter transaction outcomes. */ }
  };
  ensureCurrent();
  notify("checking");
  return deps.withLock(account, async () => {
    ensureCurrent();
    deps.assertNoPendingPosition(account, request);
    const review = await deps.prepare(rpc, account, request);
    ensureCurrent();
    assertDisplayedTerms(displayedQuote, review, kind);
    deps.assertNoPendingPosition(account, request);
    const entry: PositionJournal = {
      review, state: "requesting", hash: null,
      message: labels[kind].name + " wallet request started. Check wallet activity before starting another.",
    };
    deps.write(entry);
    let returnedHash: string | null = null;
    try {
      const hash = await deps.send(review, provider, rpc, current, () => notify("wallet"));
      if (!/^0x[\da-f]{64}$/i.test(hash)) throw Error("Wallet response is uncertain. Check wallet activity; do not resubmit.");
      returnedHash = hash;
      const submitted: PositionJournal = {
        ...entry, hash, state: "pending",
        message: labels[kind].name + " submitted. You can check its receipt in your wallet.",
      };
      deps.write(submitted);
      notify("pending", submitted.message, hash);
      return submitted;
    } catch (reason) {
      const details = reason as { walletRequestStarted?: boolean; code?: number } | null;
      const beforeWallet = returnedHash === null && details?.walletRequestStarted === false;
      const rejected = returnedHash === null && details?.code === 4001;
      const resolved = beforeWallet || rejected;
      const outcome: PositionJournal = {
        ...entry, hash: returnedHash, state: resolved ? "resolved" : "uncertain",
        message: message(reason, kind) + (beforeWallet ? " No transaction was requested." : rejected ? " The wallet request was rejected. No automatic retry was made." : " Check wallet activity before trying again. No automatic retry was made."),
      };
      try { deps.write(outcome); }
      catch {
        const failure = outcome.message + " The request status could not be saved. " +
          (returnedHash ? "Save this transaction hash: " + returnedHash : "Check your wallet activity; no transaction hash was returned.");
        notify("uncertain", failure, returnedHash ?? undefined);
        throw Object.assign(new Error(failure), { hash: returnedHash, journal: outcome, walletRequestStarted: !beforeWallet });
      }
      notify(resolved ? "rejected" : "uncertain", outcome.message, returnedHash ?? undefined);
      return outcome;
    }
  }, positionScope(request));
}
