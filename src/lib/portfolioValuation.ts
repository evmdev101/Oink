const unit = 10n ** 18n;
function decimal(value:string | null):bigint | null {
  if (value == null || !/^\d{1,60}(\.\d{1,18})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * unit + BigInt(fraction.padEnd(18, "0"));
}
/** Zero holdings need no quote. Missing or stale inputs must never become zero. */
export function portfolioMarketValue(quantity:string | null, price:string | null, fresh:boolean):bigint | null {
  const amount = decimal(quantity);
  const quote = decimal(price);
  if (!fresh || amount == null) return null;
  if (amount === 0n) return 0n;
  return quote != null && quote > 0n ? amount * quote / unit : null;
}
export function completePortfolioTotal(values:readonly (bigint | null)[]):bigint | null {
  return values.length && values.every(value => value != null) ? values.reduce<bigint>((sum, value) => sum + value!, 0n) : null;
}
