import { FARM_PRICE_TOKENS, freshFarmPrice, type FarmPrices } from "./farmPrices";
import { sumFarmAmounts } from "./farmDisplay";
import { displayPrice, mergeDisplayPrices } from "./retainedPublicDisplay";
import type { StrategyAsset, TreasuryStrategyRow } from "./treasuryStrategies";

type StrategySnapshot = { block: number; timestamp: number; rows: TreasuryStrategyRow[] };
type ObservedAsset = StrategyAsset & { observedAt: number; observedBlock: number; retained: boolean };
type ObservedRow = Omit<TreasuryStrategyRow, "assets"> & { assets: ObservedAsset[] };
export type ObservedStrategySnapshot = Omit<StrategySnapshot, "rows"> & { rows: ObservedRow[] };
export type StrategyDisplayGroup = { symbol: string; balance: string | null; usd: number | null; current: boolean; observedAt: number };
export type StrategyDisplay = {
  snapshot: ObservedStrategySnapshot | null;
  prices: FarmPrices;
  groups: StrategyDisplayGroup[];
  currentComplete: boolean;
  lastComplete: { value: number; timestamp: number; block: number } | null;
};
const validBalance = (value: string | null): value is string => value != null && /^(0|[1-9]\d*)(\.\d+)?$/.test(value);
const freshAt = (timestamp: number, now: number) => timestamp > 0 && timestamp * 1000 <= now && now - timestamp * 1000 < 120000;

/** Public display observations only; never used to prepare a transaction. */
export function mergeStrategySnapshot(previous: ObservedStrategySnapshot | null, next: StrategySnapshot): ObservedStrategySnapshot {
  if (previous && (next.block < previous.block || next.timestamp < previous.timestamp)) return previous;
  const rows: ObservedRow[] = next.rows.map(row => {
    const old = previous?.rows.find(candidate => candidate.id === row.id && candidate.address.toLowerCase() === row.address.toLowerCase());
    return { ...row, assets: row.assets.map(asset => {
      if (!row.error && validBalance(asset.balance)) return { ...asset, observedAt: next.timestamp, observedBlock: next.block, retained: false };
      const observed = old?.assets.find(candidate => candidate.address.toLowerCase() === asset.address.toLowerCase() && candidate.symbol === asset.symbol && validBalance(candidate.balance));
      return observed ? { ...observed, retained: true } : { ...asset, balance: null, observedAt: 0, observedBlock: 0, retained: false };
    }) };
  });
  // A missing strategy is an incomplete read, not a confirmed removal or zero.
  for (const row of previous?.rows ?? []) if (!rows.some(candidate => candidate.id === row.id)) rows.push({ ...row, error: "Awaiting current position", assets: row.assets.map(asset => ({ ...asset, retained: true })) });
  return { block: next.block, timestamp: next.timestamp, rows };
}

export function updateStrategyDisplay(previous: StrategyDisplay | null, next: StrategySnapshot | null, incomingPrices: FarmPrices, now = Date.now()): StrategyDisplay {
  const snapshot = next ? mergeStrategySnapshot(previous?.snapshot ?? null, next) : previous?.snapshot ?? null;
  const prices = mergeDisplayPrices(previous?.prices ?? {}, incomingPrices, now);
  const assets = snapshot?.rows.flatMap(row => row.assets) ?? [];
  const groups = [...new Set(assets.map(row => row.symbol))].map(symbol => {
    const parts = assets.filter(row => row.symbol === symbol);
    const balance = parts.every(row => validBalance(row.balance)) ? sumFarmAmounts(parts.map(row => row.balance!)) : null;
    const id = Object.entries(FARM_PRICE_TOKENS).find(([, address]) => address.toLowerCase() === parts[0].address.toLowerCase())?.[0];
    const quote = id ? prices[id] : undefined;
    const price = displayPrice(quote, now);
    const usd = balance == null ? null : Number(balance) === 0 ? 0 : price ? Number(balance) * Number(price) : null;
    const current = parts.every(row => !row.retained && freshAt(row.observedAt, now)) && (balance != null && Number(balance) === 0 || !!freshFarmPrice(quote, now));
    return { symbol, balance, usd: usd != null && Number.isFinite(usd) ? usd : null, current, observedAt: Math.min(...parts.map(row => row.observedAt)) };
  });
  const currentComplete = !!snapshot && !snapshot.rows.some(row => row.error) && groups.length > 0 && groups.every(row => row.current && row.usd != null);
  const lastComplete = currentComplete ? { value: groups.reduce((sum, row) => sum + row.usd!, 0), timestamp: snapshot!.timestamp, block: snapshot!.block } : previous?.lastComplete ?? null;
  return { snapshot, prices, groups, currentComplete, lastComplete };
}
