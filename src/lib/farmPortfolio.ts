import { farmWalletPositions, sumFarmAmounts } from "./farmDisplay";
import { decimalAmount } from "./farmInsights";
import { freshFarmPrice, type FarmPrices } from "./farmPrices";
import type { FarmRankMetrics } from "./farmRankings";

type WalletFarm = Parameters<typeof farmWalletPositions>[0] & { id: string };
export function pendingFarmRewards(row: WalletFarm): bigint | null {
  const positions = farmWalletPositions(row);
  return positions == null ? null : decimalAmount(sumFarmAmounts(positions.map(position => position.pending)));
}

export function farmStakedValue(rows: readonly WalletFarm[], prices: FarmPrices, timestamp: number | null, now = Date.now()) {
  if (timestamp == null || now < timestamp * 1000 || now - timestamp * 1000 >= 120000) return { value: null, partial: true };
  let value = 0n, known = 0, missing = 0;
  for (const row of rows) {
    // T-Shares are not deposited assets; treasury assets are not wallet positions.
    if (row.id === "t-share" || row.id === "treasury") continue;
    const positions = farmWalletPositions(row);
    if (positions == null) { missing++; continue; }
    const amount = decimalAmount(sumFarmAmounts(positions.map(position => position.amount)));
    if (amount === 0n) { known++; continue; }
    const price = decimalAmount(freshFarmPrice(prices[row.id as keyof FarmPrices], now));
    if (amount == null || price == null || price <= 0n) { missing++; continue; }
    value += amount * price / 10n ** 18n; known++;
  }
  return { value: known ? value : null, partial: missing > 0 };
}

export const FARM_SORTS = ["default", "name", "fee", "apr", "tvl", "pending"] as const;
export type FarmSort = typeof FARM_SORTS[number];
export function descendingKnown(a: bigint | null, b: bigint | null) {
  return a == null ? b == null ? 0 : 1 : b == null ? -1 : a === b ? 0 : a > b ? -1 : 1;
}
export function compareFarms<T extends WalletFarm & { label: string; data: (WalletFarm["data"] & { fee: string }) | null }>(a: T, b: T, sort: FarmSort, metrics: Record<string, FarmRankMetrics>, favorites: readonly string[], freshWallet: boolean) {
  if (sort === "name") return a.label.localeCompare(b.label);
  if (sort === "fee") {
    const av = decimalAmount(a.data?.fee ?? null), bv = decimalAmount(b.data?.fee ?? null);
    return descendingKnown(av == null ? null : -av, bv == null ? null : -bv);
  }
  if (sort === "apr" || sort === "tvl") return descendingKnown(metrics[a.id]?.[sort] ?? null, metrics[b.id]?.[sort] ?? null);
  if (sort === "pending") return descendingKnown(freshWallet ? pendingFarmRewards(a) : null, freshWallet ? pendingFarmRewards(b) : null);
  return Number(favorites.includes(b.id)) - Number(favorites.includes(a.id));
}
