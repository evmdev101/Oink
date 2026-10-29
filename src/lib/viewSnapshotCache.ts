const invalidators = new Set<() => void>();
export function invalidateViewSnapshots() { invalidators.forEach(clear => clear()); }
if (typeof window !== "undefined") window.addEventListener("oink-positions-changed",invalidateViewSnapshots);

/** Short-lived display-only data. Transaction validation never reads this cache. */
export function createViewSnapshotCache<T>(ttl = 60000) {
  let entry: { key:string; value:T; expires:number } | null = null;
  invalidators.add(() => { entry = null; });
  return {
    get(key:string):T | null { return entry?.key === key && Date.now() < entry.expires ? entry.value : null; },
    set(key:string,value:T) { entry = {key,value,expires:Date.now() + ttl}; },
  };
}
