/** Ephemeral display progress for a shared read; never a transaction-data cache. */
export class DisplayReadProgress<T> {
  private listeners = new Map<string, Set<(value: T) => void>>();
  private pending = new Map<string, { token: object; value?: T }>();

  subscribe(key: string, listener: (value: T) => void) {
    let group = this.listeners.get(key);
    if (!group) this.listeners.set(key, group = new Set());
    group.add(listener);
    const latest = this.pending.get(key)?.value;
    if (latest !== undefined) listener(latest);
    return () => {
      group.delete(listener);
      if (!group.size && this.listeners.get(key) === group) this.listeners.delete(key);
    };
  }

  peek(key: string): T | null { return this.pending.get(key)?.value ?? null; }

  begin(key: string, signal?: AbortSignal) {
    const entry: { token: object; value?: T } = { token: {} };
    this.pending.set(key, entry);
    const finish = () => {
      signal?.removeEventListener("abort", finish);
      if (this.pending.get(key) === entry) this.pending.delete(key);
    };
    signal?.addEventListener("abort", finish, { once: true });
    if (signal?.aborted) finish();
    return {
      publish: (value: T) => {
        if (signal?.aborted || this.pending.get(key) !== entry) return;
        entry.value = value;
        for (const listener of this.listeners.get(key) ?? []) listener(value);
      },
      finish,
    };
  }
}
