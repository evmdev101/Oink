/** Session-only public presentation data. Never use this for wallet reads,
 * transaction preparation, quotes, or deciding whether an action is available. */
export function readPublicRefreshDisplay<T>(key: string, valid: (value: unknown) => value is T): T | null {
  try {
    const raw = sessionStorage.getItem(`oink:public-refresh:v1:369:${key}`);
    if (!raw || raw.length > 250000) return null;
    const entry = JSON.parse(raw);
    const age = Date.now() - entry.savedAt;
    return Number.isFinite(age) && age >= 0 && age < 120000 && valid(entry.value) ? entry.value : null;
  } catch { return null; }
}

export function savePublicRefreshDisplay(key: string, value: unknown, observedAt = Date.now()) {
  try {
    if (!Number.isFinite(observedAt) || observedAt <= 0 || observedAt > Date.now()) return;
    const raw = JSON.stringify({ savedAt: observedAt, value });
    if (raw.length <= 250000) sessionStorage.setItem(`oink:public-refresh:v1:369:${key}`, raw);
  } catch { /* Private browsing or full storage must not interrupt the page. */ }
}

export const publicDisplayRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
export const publicDisplayAmount = (value: unknown): value is string =>
  typeof value === "string" && /^\d{1,100}(\.\d{1,36})?$/.test(value);
