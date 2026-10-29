import { positionScope } from "./actionJournal";
import { getAddress, ZeroAddress, type Eip1193Provider } from "ethers";
import type { FarmReadRpc } from "./farmTransactions";
import {
  assertNoPendingPosition, positionLock,
  preparePositionTransaction, requestPositionTransaction, writePositionJournal,
  type PositionJournal, type PositionRequest,
} from "./positionTransactions";

export type PositionDirectStage = "checking" | "wallet" | "pending" | "rejected" | "uncertain";
export type PositionDirectOptions = {
  account: string;
  request: PositionRequest;
  provider: Eip1193Provider;
  rpc: FarmReadRpc;
  current: () => boolean;
  onStage: (stage: PositionDirectStage, message?: string, hash?: string) => void;
};
export type PositionDirectDependencies = {
  withLock: (account: string, run: () => Promise<PositionJournal>, scope?:string) => Promise<PositionJournal>;
  assertNoPendingPosition: typeof assertNoPendingPosition;
  prepare: typeof preparePositionTransaction;
  send: typeof requestPositionTransaction;
  write: typeof writePositionJournal;
};
const defaults: PositionDirectDependencies = {
  async withLock(account, run, scope) {
    if (typeof navigator === "undefined" || !navigator.locks) throw Error("This browser cannot coordinate wallet requests safely. Use a current wallet-enabled browser.");
    return navigator.locks.request(positionLock(account) + ":" + scope, { ifAvailable: true }, async lock => {
      if (!lock) throw Error("Another wallet request is open in this app.");
      return run();
    });
  },
  assertNoPendingPosition, prepare: preparePositionTransaction,
  send: requestPositionTransaction, write: writePositionJournal,
};
const message = (reason: unknown) => reason instanceof Error ? reason.message : "The position request could not be completed.";

// The user's action button authorizes preparation and the wallet prompt. Exact
// transaction simulation, fresh preflight, account checks and receipts remain
// in the existing position engine; this flow never retries a wallet send.
export async function submitPositionDirect(options: PositionDirectOptions, dependencies: Partial<PositionDirectDependencies> = {}): Promise<PositionJournal> {
  const { provider, rpc, current, onStage } = options, account = getAddress(options.account);
  if (account === ZeroAddress) throw Error("Connect a nonzero wallet on PulseChain.");
  const request = structuredClone(options.request), deps = { ...defaults, ...dependencies };
  const ensureCurrent = () => { if (!current()) throw Error("The selected action or wallet changed. Choose the action again."); };
  const notify = (stage: PositionDirectStage, text?: string, hash?: string) => {
    try { if (current()) onStage(stage, text, hash); } catch { /* UI observers cannot change the transaction outcome. */ }
  };
  const requireClear = () => { deps.assertNoPendingPosition(account, request); };
  ensureCurrent(); notify("checking");
  return deps.withLock(account, async () => {
    ensureCurrent(); requireClear();
    const review = await deps.prepare(rpc, account, request);
    ensureCurrent(); requireClear();
    const entry: PositionJournal = { review, state: "requesting", hash: null, message: "Wallet request started. Check wallet activity before starting another." };
    deps.write(entry);
    let returnedHash: string | null = null;
    try {
      const hash = await deps.send(review, provider, rpc, current, () => notify("wallet"));
      if (!/^0x[\da-f]{64}$/i.test(hash)) throw Error("Wallet response is uncertain. Check wallet activity; do not resubmit.");
      returnedHash = hash;
      const submitted: PositionJournal = { ...entry, hash, state: "pending", message: "Submitted. You can check its receipt in your wallet." };
      deps.write(submitted); notify("pending", submitted.message, hash);
      return submitted;
    } catch (reason) {
      const details = reason as { walletRequestStarted?: boolean; code?: number } | null;
      const beforeWallet = returnedHash === null && details?.walletRequestStarted === false;
      const rejected = returnedHash === null && details?.code === 4001;
      const resolved = beforeWallet || rejected;
      const outcome: PositionJournal = {
        ...entry, hash: returnedHash, state: resolved ? "resolved" : "uncertain",
        message: message(reason) + (beforeWallet ? " No transaction was requested." : rejected ? " The wallet request was rejected. No automatic retry was made." : " Check wallet activity before trying again. No automatic retry was made."),
      };
      try { deps.write(outcome); }
      catch {
        const failure = outcome.message + " The request status could not be saved. " + (returnedHash ? "Save this transaction hash: " + returnedHash : "Check wallet activity; no transaction hash was returned.");
        notify("uncertain", failure, returnedHash ?? undefined);
        throw Object.assign(new Error(failure), { hash: returnedHash, journal: outcome, walletRequestStarted: !beforeWallet });
      }
      notify(resolved ? "rejected" : "uncertain", outcome.message, returnedHash ?? undefined);
      return outcome;
    }
  }, positionScope(request));
}
