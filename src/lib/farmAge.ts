type FarmCreation = {
  address: string;
  block: number | null;
  timestamp: string | null;
  txHash: string | null;
  fetchedAt: number;
};

const cacheKey = "oink:farm-creation:v1";
const explorerApi = "https://api.scan.pulsechain.com/api/v2";
const dayMs = 24 * 60 * 60 * 1000;

function readCache(): Record<string, FarmCreation> {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(cacheKey) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, FarmCreation> : {};
  } catch {
    return {};
  }
}

function writeCache(value: Record<string, FarmCreation>) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(value));
  } catch {
    // Farm age is helpful metadata, not required state.
  }
}

function validCachedCreation(value: FarmCreation | undefined, address: string) {
  return value?.address.toLowerCase() === address.toLowerCase()
    && Date.now() - value.fetchedAt < 30 * dayMs;
}

export async function readFarmCreation(address: string, signal?: AbortSignal): Promise<FarmCreation | null> {
  const key = address.toLowerCase();
  const cached = readCache()[key];
  if (validCachedCreation(cached, address)) return cached;

  const addressResponse = await fetch(`${explorerApi}/addresses/${address}`, { signal });
  if (!addressResponse.ok) throw new Error("Contract creation lookup unavailable.");
  const addressData: unknown = await addressResponse.json();
  const creationTx = typeof addressData === "object" && addressData && "creation_tx_hash" in addressData
    && typeof addressData.creation_tx_hash === "string" ? addressData.creation_tx_hash : null;
  if (!creationTx) return null;

  const txResponse = await fetch(`${explorerApi}/transactions/${creationTx}`, { signal });
  if (!txResponse.ok) throw new Error("Contract creation transaction unavailable.");
  const txData: unknown = await txResponse.json();
  const result: FarmCreation = {
    address,
    txHash: creationTx,
    block: typeof txData === "object" && txData && "block" in txData && Number.isSafeInteger(Number(txData.block)) ? Number(txData.block) : null,
    timestamp: typeof txData === "object" && txData && "timestamp" in txData && typeof txData.timestamp === "string" ? txData.timestamp : null,
    fetchedAt: Date.now(),
  };
  const next = readCache();
  next[key] = result;
  writeCache(next);
  return result;
}

export function farmAgeLabel(timestamp: string | null, now = Date.now()) {
  if (!timestamp) return null;
  const created = new Date(timestamp).getTime();
  if (!Number.isFinite(created) || created > now + dayMs) return null;
  const days = Math.max(0, Math.floor((now - created) / dayMs));
  const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(created);
  if (days < 1) return `Created ${date} · today`;
  if (days < 60) return `Created ${date} · ${days} days old`;
  const months = Math.floor(days / 30);
  if (days < 730) return `Created ${date} · ${months} months old`;
  const years = Math.floor(days / 365);
  const remainderMonths = Math.floor((days - years * 365) / 30);
  return `Created ${date} · ${years} year${years === 1 ? "" : "s"}${remainderMonths ? ` ${remainderMonths} mo` : ""} old`;
}
