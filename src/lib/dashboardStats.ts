import type { ActivityRow } from "./treasuryActivity";

export function completeBalanceTotal(balances: readonly (string | null | undefined)[]): number | null {
  if (!balances.length || balances.some(value => value == null || !Number.isFinite(Number(value)))) return null;
  return balances.reduce<number>((sum, value) => sum + Number(value), 0);
}

export function inflowWindowSummary(
  rows: readonly ActivityRow[],
  coverage: { fromTimestamp: number | null; toTimestamp: number; partial: boolean } | null,
  seconds: number,
  now: number,
  price: (symbol: string) => string,
) {
  const cutoff = now - seconds;
  const inWindow = rows.filter(row => row.timestamp != null && row.timestamp >= cutoff && row.timestamp <= now);
  const complete = coverage != null && !coverage.partial && coverage.fromTimestamp != null
    && coverage.fromTimestamp <= cutoff && now >= coverage.toTimestamp && now - coverage.toTimestamp < 120
    && rows.every(row => row.timestamp != null);
  let usd: number | null = complete ? 0 : null;
  for (const row of inWindow) {
    const [amount, symbol] = row.amount.split(" ");
    const quote = price(symbol);
    if (!quote || !Number.isFinite(Number(quote)) || Number(quote) <= 0 || !Number.isFinite(Number(amount))) {
      usd = null;
      break;
    }
    if (usd != null) usd += Number(amount) * Number(quote);
  }
  return { count: inWindow.length, complete, usd };
}
