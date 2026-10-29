/** Optional new-pool reads cannot consume the full existing-farm load budget. */
export async function withFarmReadBudget<T>(read: (signal: AbortSignal) => Promise<T>, parent?: AbortSignal, milliseconds = 12000): Promise<T> {
  parent?.throwIfAborted();
  const controller = new AbortController();
  const signal = parent ? AbortSignal.any([parent, controller.signal]) : controller.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  try {
    return await Promise.race([
      Promise.resolve().then(() => read(signal)),
      new Promise<never>((_, reject) => {
        onAbort = () => reject(signal.reason ?? new Error("Farm read cancelled."));
        signal.addEventListener("abort", onAbort, { once: true });
        timer = setTimeout(() => controller.abort(new Error("New pool read timed out.")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    controller.abort();
  }
}
