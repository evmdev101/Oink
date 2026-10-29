import type { FarmPrices } from "./farmPrices";

type SnapshotIdentity = { account: string | null; timestamp: number; complete?: boolean };
export type FarmDisplayResult<Snapshot> = {
  snapshot: Snapshot | null;
  prices: FarmPrices;
  loadedAt: number;
  priceError: string | null;
};

// Display values arrive independently. A slow quote or optional registry read
// must not discard already-verified farm balances or keep every card waiting.
export function createFarmDisplayLoader<Snapshot extends SnapshotIdentity>(sources: {
  readSnapshot: (signal: AbortSignal, account: string) => Promise<Snapshot>;
  peekSnapshot: (account: string) => Snapshot | null;
  subscribe: (account: string, listener: (snapshot: Snapshot) => void) => () => void;
  readPrices: (signal: AbortSignal) => Promise<FarmPrices>;
  peekPrices: () => FarmPrices;
  mapPrices: (snapshot: Snapshot, prices: FarmPrices) => FarmPrices;
  hasValues?: (snapshot: Snapshot) => boolean;
  now?: () => number;
}) {
  const now = sources.now ?? Date.now;
  const belongsTo = (snapshot: Snapshot, account: string) => (snapshot.account ?? "").toLowerCase() === account.toLowerCase();
  const peek = (account: string): FarmDisplayResult<Snapshot> | null => {
    const snapshot = sources.peekSnapshot(account);
    if (!snapshot || !belongsTo(snapshot, account)) return null;
    return { snapshot, prices: sources.mapPrices(snapshot, sources.peekPrices()), loadedAt: now(), priceError: null };
  };

  const load = async (account: string, signal: AbortSignal, onUpdate: (value: FarmDisplayResult<Snapshot>) => void = () => {}) => {
    signal.throwIfAborted();
    const cached = peek(account);
    let snapshot = cached?.snapshot ?? null;
    let prices = sources.peekPrices();
    let priceError: string | null = null;
    let active = true;
    const current = (): FarmDisplayResult<Snapshot> => ({ snapshot, prices: snapshot ? sources.mapPrices(snapshot, prices) : prices, loadedAt: now(), priceError });
    const publish = () => { if (active && !signal.aborted) onUpdate(current()); };
    const accept = (next: Snapshot) => {
      if (!belongsTo(next, account)) throw new Error("Waiting for the selected wallet's values.");
      // Keep a useful cached view while the new reader initializes its skeleton.
      if (next.complete === false && snapshot?.complete === true) return;
      if (next.complete === false && snapshot && next.timestamp < snapshot.timestamp) return;
      if (next.complete === false && snapshot && sources.hasValues && !sources.hasValues(next)) return;
      snapshot = next;
      publish();
    };
    const unsubscribe = sources.subscribe(account, next => {
      if (belongsTo(next, account)) accept(next);
    });
    let aborted: () => void = () => {};
    const cancellation = new Promise<never>((_, reject) => {
      aborted = () => reject(signal.reason ?? new Error("Farm read canceled."));
      signal.addEventListener("abort", aborted, { once: true });
    });
    try {
      publish();
      const snapshotRead = sources.readSnapshot(signal, account).then(next => { accept(next); return next; });
      const priceRead = sources.readPrices(signal).then(next => {
        prices = { ...prices, ...next };
        publish();
      }, () => {
        priceError = "Some market prices are unavailable. Farm balances remain visible.";
        publish();
      });
      const [completeSnapshot] = await Promise.race([Promise.all([snapshotRead, priceRead]), cancellation]);
      return { ...current(), snapshot: completeSnapshot };
    } finally {
      active = false;
      unsubscribe();
      signal.removeEventListener("abort", aborted);
    }
  };
  return { load, peek };
}
