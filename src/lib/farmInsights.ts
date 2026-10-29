import { formatEther, parseEther } from "ethers";

export const FARM_PERIODS = [["Daily", 1n], ["Weekly", 7n], ["Monthly", 30n], ["Yearly", 365n]] as const;
export function decimalAmount(value: string | null): bigint | null {
  return value != null && /^\d{1,60}(\.\d{1,18})?$/.test(value) ? parseEther(value) : null;
}
export function projectedReward(daily: string, stake: string | null, pool: string, days: bigint) {
  const d = decimalAmount(daily), s = decimalAmount(stake), p = decimalAmount(pool);
  return d != null && s != null && p != null && p > 0n ? formatEther(d * s * days / p) : null;
}
export function percentage(numerator: bigint, denominator: bigint, decimals: 2 | 3 = 2) {
  if (denominator <= 0n) return null;
  const scale = 10n ** BigInt(decimals);
  const scaled = numerator * 100n * scale / denominator;
  return (scaled / scale).toString() + "." + (scaled % scale).toString().padStart(decimals, "0");
}
export function rewardApr(daily: string, pool: string, assetPrice: string, rewardPrice: string, days = 365n) {
  const d = decimalAmount(daily), p = decimalAmount(pool), a = decimalAmount(assetPrice), r = decimalAmount(rewardPrice);
  return d != null && p != null && p > 0n && a != null && a > 0n && r != null && r > 0n ? percentage(d * days * r, p * a) : null;
}
export type ShareReading = { at: number; value: number };
export function recordShare(readings: ShareReading[], current: ShareReading) {
  const valid = readings.filter(r => Number.isSafeInteger(r.at) && r.at > current.at - 30 * 86400000 && r.at <= current.at && Number.isFinite(r.value) && r.value >= 0).sort((a,b) => a.at-b.at);
  const last = valid.at(-1);
  if (!last || current.at - last.at >= 4 * 3600000) valid.push(current);
  return valid.slice(-181);
}
