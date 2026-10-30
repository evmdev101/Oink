export type FarmDisplayIdentity = { tokenAddress: string | null; decimals: number; symbol: string; pool: string };
type BlockIdentity = { number: number; hash: string };
type Observation = { value: FarmDisplayIdentity; block: BlockIdentity; expires: number };

/** Stable farm identity for presentation reads only. Live balances, permissions,
 * fee terms and transaction validation must never use this cache. */
export class FarmIdentityCache {
  private entries = new Map<string, Observation>();
  private pending = new Map<string, Promise<FarmDisplayIdentity>>();
  private generation = 0;
  private ttl: number;
  private maxEntries: number;
  private now: () => number;
  constructor(ttl = 300000, maxEntries = 128, now = Date.now) { this.ttl = ttl; this.maxEntries = maxEntries; this.now = now; }

  clear() { this.generation++; this.entries.clear(); this.pending.clear(); }

  async read(key: string, block: BlockIdentity,
    load: (signal: AbortSignal) => Promise<FarmDisplayIdentity>,
    canonical: (block: BlockIdentity) => Promise<boolean>, signal?: AbortSignal): Promise<FarmDisplayIdentity> {
    signal?.throwIfAborted();
    const generation = this.generation;
    const previous = this.entries.get(key);
    if (previous && this.now() < previous.expires && block.number >= previous.block.number) {
      const valid = block.number === previous.block.number
        ? block.hash === previous.block.hash : await canonical(previous.block);
      signal?.throwIfAborted();
      if (valid && generation === this.generation && this.entries.get(key) === previous) return previous.value;
      if (this.entries.get(key) === previous) this.entries.delete(key);
    }
    const pendingKey = `${key}:${block.number}:${block.hash}`;
    let work = this.pending.get(pendingKey);
    if (!work) {
      // Independent subscriber cancellation cannot cancel another account's
      // simultaneous public metadata read. Work is still bounded by a timeout.
      const timeout = AbortSignal.timeout(15000);
      let timedOut: () => void = () => {};
      const deadline = new Promise<never>((_, reject) => {
        timedOut = () => reject(timeout.reason ?? new Error("Farm identity read timed out."));
        timeout.addEventListener("abort", timedOut, { once: true });
      });
      const observation = Promise.resolve().then(() => load(timeout)).then(async value => {
        timeout.throwIfAborted();
        if (!await canonical(block)) throw new Error("Farm identity snapshot block changed.");
        timeout.throwIfAborted();
        if (generation === this.generation) {
          const current = this.entries.get(key);
          if (!current || current.block.number <= block.number) {
            if (!current && this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
            this.entries.set(key, { value, block: { ...block }, expires: this.now() + this.ttl });
          }
        }
        return value;
      });
      work = Promise.race([observation, deadline]).finally(() => timeout.removeEventListener("abort", timedOut));
      if (this.pending.size < this.maxEntries) this.pending.set(pendingKey, work);
      const finish = () => { if (this.pending.get(pendingKey) === work) this.pending.delete(pendingKey); };
      void work.then(finish, finish);
    }
    if (!signal) return work;
    return new Promise((resolve, reject) => {
      const aborted = () => { cleanup(); reject(signal.reason ?? new Error("Farm identity read canceled.")); };
      const cleanup = () => signal.removeEventListener("abort", aborted);
      signal.addEventListener("abort", aborted, { once: true });
      if (signal.aborted) { aborted(); return; }
      work!.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
    });
  }
}

export const farmDisplayIdentities = new FarmIdentityCache();
if (typeof window !== "undefined") window.addEventListener("oink-positions-changed", () => farmDisplayIdentities.clear());
