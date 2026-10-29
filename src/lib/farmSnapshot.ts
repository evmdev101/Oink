import { readEcosystemVaults, peekEcosystemVaults, subscribeEcosystemVaults } from "./miningAccounts";
import { readFarmPrices, peekFarmPrices, freshFarmPrice, type FarmPrices } from "./farmPrices";
import { ECOSYSTEM_MINER_CONTRACTS } from "../config/contracts";
import { createFarmDisplayLoader, type FarmDisplayResult } from "./farmDisplayLoader";

export type FarmSnapshot = Awaited<ReturnType<typeof readEcosystemVaults>>;

// Strict completeness checks remain available to callers that require a fully
// priced snapshot. Display loading intentionally does not use this as a gate.
export function validateFarmSnapshot(snapshot: FarmSnapshot, prices: FarmPrices, account: string, now = Date.now()) {
  if ((snapshot.account ?? "").toLowerCase() !== account.toLowerCase()) throw new Error("Waiting for the selected wallet's values.");
  if (now < snapshot.timestamp * 1000 || now - snapshot.timestamp * 1000 >= 120000) throw new Error("Waiting for a fresh farm snapshot.");
  const incomplete = ECOSYSTEM_MINER_CONTRACTS.filter(record => {
    const row = snapshot.rows.find(row => row.id === record.id);
    if (!row || row.error || !(row.special ?? row.data)?.yieldEstimate) return true;
    if (!account) return false;
    if (row.special) return row.special.kind === "t-share" && (row.special.accountError != null || row.special.registeredShares == null || row.special.pending == null);
    return !row.data || row.data.accountError != null || row.data.walletBalanceError != null || row.data.positions == null || row.data.walletBalance == null;
  });
  if (incomplete.length) throw new Error(`Waiting for ${incomplete.map(row => row.label).join(", ")} farm values.`);
  // New pools have independent readiness. An unfamiliar asset or a failed read
  // must never strand every existing farm behind the full-page loader.
  const required = ["oink", ...ECOSYSTEM_MINER_CONTRACTS.filter(record => snapshot.rows.some(row => row.id === record.id && row.data)).map(row => row.id)];
  const missing = required.filter(id => !freshFarmPrice(prices[id as keyof FarmPrices], now));
  if (missing.length) throw new Error(`Waiting for ${missing.map(id => id.toUpperCase()).join(", ")} market prices.`);
}

export function withDiscoveredFarmPrices(snapshot: FarmSnapshot, prices: FarmPrices): FarmPrices {
  const result = { ...prices };
  for (const row of snapshot.rows) {
    const priceId = row.discovery?.priceId;
    if (priceId && prices[priceId]) result[row.id] = prices[priceId];
  }
  return result;
}

export type FarmDisplaySnapshot = FarmDisplayResult<FarmSnapshot>;

const displayLoader = createFarmDisplayLoader<FarmSnapshot>({
  readSnapshot: (signal, account) => readEcosystemVaults(signal, account),
  peekSnapshot: peekEcosystemVaults,
  subscribe: subscribeEcosystemVaults,
  readPrices: readFarmPrices,
  peekPrices: peekFarmPrices,
  mapPrices: withDiscoveredFarmPrices,
  hasValues: snapshot => snapshot.rows.some(row => row.data != null || row.special != null),
});

export function loadFarmSnapshot(account: string, signal: AbortSignal, onUpdate?: (value: FarmDisplaySnapshot) => void) {
  return displayLoader.load(account, AbortSignal.any([signal, AbortSignal.timeout(60000)]), onUpdate);
}

// Last-known values are useful display data even when a quote is missing or a
// refresh is due. The page still enforces freshness for estimates and actions.
export const peekFarmSnapshot = displayLoader.peek;
