type Timer = ReturnType<typeof setTimeout>;
type NavigationIntent = { path: string; account: string | null };

/** Speculation must never compete with the initial screen or fan out on passing hover. */
export function createNavigationPreloader(options: {
  loadCode: (path: string) => Promise<unknown>;
  loadData: (path: string, account: string | null) => Promise<unknown>;
  allowed: () => boolean;
  now?: () => number;
  delay?: number;
  cooldown?: number;
  setTimer?: (callback: () => void, delay: number) => Timer;
  clearTimer?: (timer: Timer) => void;
}) {
  const code = new Map<string, Promise<unknown>>();
  const recent = new Map<string, number>();
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let timer: Timer | undefined;
  let queued: NavigationIntent | undefined;
  let running = false;
  const keyOf = (intent: NavigationIntent) => intent.path + ":" + (intent.account?.toLowerCase() ?? "public");
  const warmCode = (path: string) => {
    if (!options.allowed()) return Promise.resolve();
    let pending = code.get(path);
    if (!pending) {
      pending = Promise.resolve().then(() => options.loadCode(path)).catch(() => { code.delete(path); });
      code.set(path, pending);
    }
    return pending;
  };
  const drain = async (): Promise<void> => {
    if (running || !queued || !options.allowed()) return;
    const intent = queued;
    queued = undefined;
    const key = keyOf(intent);
    if (now() - (recent.get(key) ?? -Infinity) < (options.cooldown ?? 20000)) return;
    running = true;
    recent.set(key, now());
    if (recent.size > 32) recent.delete(recent.keys().next().value!);
    try { await options.loadData(intent.path, intent.account); }
    catch { recent.delete(key); }
    finally { running = false; if (queued) void drain(); }
  };
  const cancel = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    queued = undefined;
  };
  const intent = (path: string, account: string | null) => {
    cancel();
    if (!options.allowed()) return;
    void warmCode(path);
    timer = setTimer(() => { timer = undefined; queued = { path, account }; void drain(); }, options.delay ?? 200);
  };
  return { warmCode, intent, cancel, invalidate: () => { cancel(); recent.clear(); } };
}
