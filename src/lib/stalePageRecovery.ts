type RecoveryHost = { storage: Pick<Storage, "getItem" | "setItem">; reload: () => void; now: () => number };

/** A tab can retain an old route URL after a new site build replaces its files. */
export function recoverStalePage(error: unknown, host?: RecoveryHost): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(message)) return false;
  try {
    const env = host ?? { storage: window.sessionStorage, reload: () => window.location.reload(), now: Date.now };
    const now = env.now(), previous = Number(env.storage.getItem("oink:stale-page-reload"));
    if (previous > 0 && now - previous < 30000) return false;
    env.storage.setItem("oink:stale-page-reload", String(now));
    if (env.storage.getItem("oink:stale-page-reload") !== String(now)) return false;
    env.reload();
    return true;
  } catch { return false; }
}
