import { getAddress } from "ethers";
import { getPublicProvider } from "./chain";
import { type FarmReadRpc } from "./farmTransactions";
import { readSale, SALE_DESTINATIONS } from "./miningOffers";
import { SharedReadCache } from "./sharedReadCache.ts";

export type SaleMaximums = Record<string, Awaited<ReturnType<typeof readSale>>>;
const maxima = new SharedReadCache(8);
type MaximumListener = { generation: number; notify: (values: SaleMaximums) => void };
const listeners = new Map<string, Set<MaximumListener>>();
let generation = 0;
const cacheKey = (account?: string | null) => "369:sale-inventory-maximums:" + (account ? getAddress(account).toLowerCase() : 'public');
export const saleMaximumKey = (asset: string, duration: string) => JSON.stringify([asset, duration]);

export function peekSaleMaximums(account?: string | null): SaleMaximums | null {
  return maxima.peek<SaleMaximums>(cacheKey(account));
}

export function clearSaleMaximums() {
  generation++;
  listeners.clear();
  maxima.clear();
}

/** Warm every selector combination once; clicking Max only consumes this display data. */
export async function readSaleMaximumsFromRpc(rpc: FarmReadRpc, accountInput?: string | null, signal?: AbortSignal, onReady?: (values: SaleMaximums) => void): Promise<SaleMaximums> {
  const account = accountInput ? getAddress(accountInput) : null;
  const requests = new Map<string, Promise<unknown>>();
  const shared: FarmReadRpc = {
    send(method, params) {
      signal?.throwIfAborted();
      // Start reads share one latest block. Canonical hash checks at the end of
      // each quote must still reach the provider, even when their tag matches.
      if (method === "eth_getBlockByNumber" && params[0] !== "latest") return rpc.send(method, params);
      const key = JSON.stringify([method, params]);
      let pending = requests.get(key);
      if (!pending) {
        pending = Promise.resolve().then(() => { signal?.throwIfAborted(); return rpc.send(method, params); });
        requests.set(key, pending);
      }
      return pending;
    },
  };
  const pairs = ["PLS", "PLSX", "INC", "HEX"].flatMap(asset => SALE_DESTINATIONS.map(destination => ({ asset, duration: destination.id })));
  const result: SaleMaximums = {};
  await Promise.allSettled(pairs.map(async ({ asset, duration }) => {
    const value = await readSale(shared, asset, "", duration, account, "receive", { maximum: 'inventory' });
    signal?.throwIfAborted();
    if (value.maxReceive === null || value.quoteError) return;
    if (value.maxReceive !== "0.0" && (!value.quote || !value.paymentAmount || !value.quoteFunded)) return;
    result[saleMaximumKey(asset, duration)] = value;
    // Publish each canonically checked pair without waiting for slower tokens.
    // One observer must not fail the background read for everyone else.
    try { onReady?.({ ...result }); } catch { /* Display observers are independent. */ }
  }));
  signal?.throwIfAborted();
  if (!Object.keys(result).length) throw Error("Maximum amounts are unavailable. Please try again.");
  return result;
}

export function readSaleMaximums(account?: string | null, signal?: AbortSignal, onReady?: (values: SaleMaximums) => void): Promise<SaleMaximums> {
  const key = cacheKey(account), started = generation;
  const listener: MaximumListener | null = onReady && !signal?.aborted ? {
    generation: started,
    notify(values) {
      if (generation !== started || signal?.aborted) return;
      try { onReady(values); } catch { /* Keep other subscribers and the cache alive. */ }
    },
  } : null;
  if (listener) {
    let subscribed = listeners.get(key);
    if (!subscribed) { subscribed = new Set(); listeners.set(key, subscribed); }
    subscribed.add(listener);
  }
  const detach = () => {
    if (listener) {
      const subscribed = listeners.get(key);
      subscribed?.delete(listener);
      if (!subscribed?.size) listeners.delete(key);
    }
    signal?.removeEventListener("abort", detach);
  };
  if (listener) signal?.addEventListener("abort", detach, { once: true });
  return maxima.read(key, async child => {
    child.throwIfAborted();
    return readSaleMaximumsFromRpc(await getPublicProvider(), account, child, values => {
      if (generation !== started) return;
      for (const subscriber of listeners.get(key) ?? []) {
        if (subscriber.generation === started) subscriber.notify(values);
      }
    });
  }, { signal, ttl: 20000, timeout: 60000 }).then(values => {
    listener?.notify(values); // A fresh cache hit does not run the loader callback.
    return values;
  }).finally(detach);
}

if (typeof window !== "undefined") window.addEventListener("oink-positions-changed", clearSaleMaximums);
