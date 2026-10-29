import type { FarmPrice, FarmPrices } from "./farmPrices";

/** Last observed market prices for PUBLIC DISPLAY only. Never use for quotes,
 * approvals, transactions or freshness decisions; retain the original timestamp. */
export function displayPrice(quote: FarmPrice | undefined, now = Date.now()): string {
  return quote && Number.isFinite(quote.fetchedAt) && quote.fetchedAt > 0 && quote.fetchedAt <= now
    && /^\d{1,20}(\.\d{1,18})?$/.test(quote.usd) && Number(quote.usd) > 0 ? quote.usd : "";
}

export function mergeDisplayPrices(previous: FarmPrices, next: FarmPrices, now = Date.now()): FarmPrices {
  const merged = { ...previous };
  for (const [id, quote] of Object.entries(next)) {
    if (displayPrice(quote, now) && (!merged[id] || quote!.fetchedAt >= merged[id]!.fetchedAt)) merged[id] = quote;
  }
  return merged;
}

/** Partial balance failures cannot erase a previously observed public balance.
 * Callers must disclose that retained balances may precede the latest block. */
export function mergeTreasuryHoldings<T extends { block: number; timestamp: number; rows: { address: string; assets: { symbol: string; address: string | null; balance: string | null }[] }[] }>(previous: T | null, next: T): { value: T; retained: boolean } {
  if (previous && next.block < previous.block) return { value: previous, retained: true };
  let retained = false;
  const rows = next.rows.map(row => {
    const prior = previous?.rows.find(owner => owner.address.toLowerCase() === row.address.toLowerCase());
    return { ...row, assets: row.assets.map(asset => {
      if (asset.balance != null) return asset;
      const old = prior?.assets.find(candidate => candidate.symbol === asset.symbol && candidate.address?.toLowerCase() === asset.address?.toLowerCase());
      if (old?.balance == null) return asset;
      retained = true;
      return { ...asset, balance: old.balance };
    }) };
  });
  return { value: { ...next, rows } as T, retained };
}
