type Entry<T> = { value?:T; savedAt:number; freshUntil:number; pending?:Promise<T>; controller?:AbortController };

/** Display reads only. One caller leaving a page must not cancel another page's read. */
export class SharedReadCache {
  private entries = new Map<string,Entry<unknown>>();
  private maxEntries:number;
  constructor(maxEntries = 32) { this.maxEntries = maxEntries; }
  peek<T>(key:string,maxAge = 1800000):T | null {
    const entry = this.entries.get(key);
    return entry?.value !== undefined && Date.now() - entry.savedAt < maxAge ? entry.value as T : null;
  }
  clear(prefix = "") {
    for (const [key,entry] of this.entries) {
      if (!key.startsWith(prefix)) continue;
      this.entries.delete(key);
      entry.controller?.abort();
    }
  }
  read<T>(key:string,load:(signal:AbortSignal) => Promise<T>,options:{ signal?:AbortSignal; ttl?:number; timeout?:number; cacheable?:(value:T) => boolean } = {}):Promise<T> {
    if (options.signal?.aborted) return Promise.reject(options.signal.reason);
    let entry = this.entries.get(key) as Entry<T> | undefined;
    if (entry?.value !== undefined && Date.now() < entry.freshUntil) return Promise.resolve(entry.value);
    if (!entry?.pending) {
      if (!entry) {
        if (this.entries.size >= this.maxEntries) {
          const oldest = this.entries.keys().next().value!;
          this.entries.get(oldest)?.controller?.abort();
          this.entries.delete(oldest);
        }
        entry = { savedAt:0,freshUntil:0 };
        this.entries.set(key,entry);
      }
      const current = entry;
      const controller = new AbortController();
      current.controller = controller;
      const timer = setTimeout(() => controller.abort(new Error("Shared read timed out")),options.timeout ?? 60000);
      const work = Promise.resolve().then(() => { controller.signal.throwIfAborted(); return load(controller.signal); });
      current.pending = this.observe(work,controller.signal).then(value => {
        if (this.entries.get(key) === current) {
          current.value = value;
          current.savedAt = Date.now();
          current.freshUntil = current.savedAt + (options.cacheable?.(value) === false ? 0 : options.ttl ?? 20000);
        }
        return value;
      }).finally(() => { clearTimeout(timer); current.pending = undefined; current.controller = undefined; });
      // A route can leave with no subscribers; still finish and warm the cache.
      void current.pending.catch(() => {});
    }
    return this.observe(entry.pending!,options.signal);
  }
  private observe<T>(promise:Promise<T>,signal?:AbortSignal):Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve,reject) => {
      const aborted = () => { cleanup(); reject(signal.reason ?? new Error("Read cancelled")); };
      const cleanup = () => signal.removeEventListener("abort",aborted);
      signal.addEventListener("abort",aborted,{once:true});
      promise.then(value => { cleanup(); resolve(value); },error => { cleanup(); reject(error); });
    });
  }
}

export const sharedDisplayReads = new SharedReadCache();
if (typeof window !== "undefined") window.addEventListener("oink-positions-changed",() => sharedDisplayReads.clear());
