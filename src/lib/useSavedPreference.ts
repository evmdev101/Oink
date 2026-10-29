import { useEffect, useState } from "react";

// Only interface preferences are saved here, never balances or transaction inputs.
export function readPreference<T extends string | boolean>(key: string, fallback: T, allowed?: readonly T[]): T {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return typeof value === typeof fallback && (typeof value !== "string" || value.length <= 500) && (!allowed || allowed.includes(value as T)) ? value as T : fallback;
  } catch { return fallback; }
}

export function useSavedPreference<T extends string | boolean>(key: string, fallback: T, allowed?: readonly T[]) {
  const [value, setValue] = useState<T>(() => readPreference(key, fallback, allowed));
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep controls usable without storage. */ }
  }, [key, value]);
  return [value, setValue] as const;
}
