/** Coordinate display work only. Wallet actions never wait on this queue. */
export class DisplayReadPriority {
  private foreground = new Set<symbol>();
  private listeners = new Set<() => void>();

  begin(signal?: AbortSignal) {
    if (signal?.aborted) return () => {};
    const ticket = Symbol();
    this.foreground.add(ticket);
    this.listeners.forEach(notify => notify());
    const finish = () => {
      signal?.removeEventListener("abort", finish);
      if (this.foreground.delete(ticket)) this.listeners.forEach(notify => notify());
    };
    signal?.addEventListener("abort", finish, { once: true });
    return finish;
  }

  wait(signal: AbortSignal, maxWait = 2500): Promise<void> {
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      let quiet: ReturnType<typeof setTimeout> | undefined;
      let deadline: ReturnType<typeof setTimeout>;
      const cleanup = () => {
        clearTimeout(quiet); clearTimeout(deadline);
        this.listeners.delete(check);
        signal.removeEventListener("abort", aborted);
      };
      const ready = () => { cleanup(); resolve(); };
      const aborted = () => { cleanup(); reject(signal.reason ?? new Error("Display read canceled")); };
      const check = () => {
        clearTimeout(quiet);
        // Allow the current React effect pass to register foreground readers.
        if (!this.foreground.size) quiet = setTimeout(ready, 50);
      };
      this.listeners.add(check);
      signal.addEventListener("abort", aborted, { once: true });
      deadline = setTimeout(ready, maxWait);
      check();
    });
  }
}

const priority = new DisplayReadPriority();
export const beginForegroundDisplayRead = (signal?: AbortSignal) => priority.begin(signal);
export const waitForForegroundDisplayReads = (signal: AbortSignal) => priority.wait(signal);
