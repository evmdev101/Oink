import { decimalAmount } from "./farmInsights";
import { freshFarmPrice, type FarmPrices } from "./farmPrices";

const UNIT = 10n ** 18n;
type RankingFarm = {
  id: string; label: string;
  data: { balance: string; pool: string; yieldEstimate: { dailyPool: string } | null } | null;
  special?: { pool: string; yieldEstimate: { dailyPool: string } | null } | null;
};
export type FarmRankMetrics = { apr: bigint | null; tvl: bigint | null; rewards: bigint | null };
export type FarmRankEntry = { id: string; label: string; pool: string; value: bigint };
export type FarmRankKey = keyof FarmRankMetrics;

// All values are 18-decimal fixed point. Missing/stale reads never rank as zero.
export function farmRankings(rows: readonly RankingFarm[], prices: FarmPrices, timestamp: number | null, now = Date.now()) {
  const fresh = timestamp != null && now >= timestamp * 1000 && now - timestamp * 1000 <= 120000;
  const rewardPrice = decimalAmount(freshFarmPrice(prices.oink, now));
  const metrics: Record<string, FarmRankMetrics> = {};
  for (const row of rows) {
    const balance = fresh && row.data ? decimalAmount(row.data.balance) : null;
    const assetPrice = decimalAmount(freshFarmPrice(prices[row.id as keyof FarmPrices], now));
    const estimate = row.special?.yieldEstimate ?? row.data?.yieldEstimate;
    const daily = fresh && estimate ? decimalAmount(estimate.dailyPool) : null;
    const tvlProduct = balance != null && assetPrice != null && assetPrice > 0n ? balance * assetPrice : null;
    const rewardProduct = daily != null && rewardPrice != null && rewardPrice > 0n ? daily * 365n * rewardPrice : null;
    metrics[row.id] = {
      tvl: tvlProduct == null ? null : tvlProduct / UNIT,
      rewards: rewardProduct == null ? null : rewardProduct / UNIT,
      apr: tvlProduct != null && tvlProduct > 0n && rewardProduct != null ? rewardProduct * 100n * UNIT / tvlProduct : null,
    };
  }
  const rank = (key: FarmRankKey): FarmRankEntry[] => rows.flatMap(row => {
    const value = metrics[row.id][key];
    return value == null ? [] : [{ id: row.id, label: row.label, pool: (row.special ?? row.data)!.pool, value }];
  }).sort((a, b) => a.value === b.value ? a.id.localeCompare(b.id) : a.value > b.value ? -1 : 1);
  const apr = rank("apr"), tvl = rank("tvl"), rewards = rank("rewards");
  return { metrics, apr, tvl, rewards, totalTvl: tvl.length ? tvl.reduce((sum, entry) => sum + entry.value, 0n) : null };
}

export function displayRankValue(value: bigint, key: FarmRankKey) {
  const cents = value / (UNIT / 100n);
  if (value > 0n && cents === 0n) return key === "apr" ? "<0.01%" : "<$0.01 USD";
  const whole = (cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const number = whole + "." + (cents % 100n).toString().padStart(2, "0");
  return key === "apr" ? number + "%" : "$" + number + " USD";
}

export function focusRankedFarm(id: string) {
  const card = document.getElementById("farm-card-" + id);
  if (!card) return false;
  card.focus({ preventScroll: true });
  card.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  return true;
}
