import { sumFarmAmounts } from "./farmDisplay";
import { FARM_PRICE_TOKENS, freshFarmPrice, type FarmPrices } from "./farmPrices";
import { TREASURY_EXTRA_TOKENS } from "../config/treasuryAssets";
import { displayPrice } from "./retainedPublicDisplay";

type Asset = { symbol: string; address: string | null; balance: string | null };
export type TreasuryValueRow = { symbol: string; balance: string | null; usd: number | null; components?: TreasuryValueRow[] };
const mainSymbols = ["PLS", "OINK", "INC", "PLSX", "HEX", "PRINT", "EARN"];
export function treasuryWalletValues(assets: readonly Asset[], prices: FarmPrices, now: number) {
  return calculateWalletValues(assets, prices, quote => freshFarmPrice(quote, now));
}

/** Preserve observed USD values on the public dashboard while quotes refresh. */
export function treasuryWalletDisplayValues(assets: readonly Asset[], prices: FarmPrices, now: number) {
  const result = calculateWalletValues(assets, prices, quote => displayPrice(quote, now));
  if (!result.complete && result.total === 0 && result.rows.some(row => row.balance != null && Number(row.balance) > 0 && row.usd == null)) result.total = null;
  return result;
}

function calculateWalletValues(assets: readonly Asset[], prices: FarmPrices, priceOf: (quote: FarmPrices[string]) => string) {
  const value = (asset: Asset): TreasuryValueRow => {
    const priceId = asset.symbol === "PLS" ? "pls" : Object.entries(FARM_PRICE_TOKENS).find(([, address]) => address.toLowerCase() === asset.address?.toLowerCase())?.[0];
    const quote = priceId ? priceOf(prices[priceId]) : "";
    const usd = asset.balance == null ? null : Number(asset.balance) === 0 ? 0 : quote ? Number(asset.balance) * Number(quote) : null;
    return { symbol: asset.symbol, balance: asset.balance, usd: usd != null && Number.isFinite(usd) ? usd : null };
  };
  const tokens = mainSymbols.map(symbol => value(assets.find(asset => asset.symbol === symbol) ?? { symbol, address: null, balance: null }));
  const components = TREASURY_EXTRA_TOKENS.filter(asset => asset.symbol.startsWith("HTT-")).map(asset => value(assets.find(row => row.symbol === asset.symbol) ?? { ...asset, balance: null }));
  const timeToken: TreasuryValueRow = {
    symbol: "HEX Time Token",
    balance: components.every(row => row.balance != null) ? sumFarmAmounts(components.map(row => row.balance!)) : null,
    usd: components.every(row => row.usd != null) ? components.reduce((sum, row) => sum + row.usd!, 0) : null,
    components,
  };
  const other = assets.filter(asset => !mainSymbols.includes(asset.symbol) && !asset.symbol.startsWith("HTT-") && (asset.balance == null || Number(asset.balance) > 0)).map(value);
  const rows = [...tokens, timeToken, ...other];
  // Keep the same descending-value order as the original, while preserving unread balances.
  rows.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  const complete = rows.every(row => row.balance != null && row.usd != null);
  const priced = rows.filter(row => row.usd != null);
  return { rows, complete, total: priced.length ? priced.reduce((sum, row) => sum + row.usd!, 0) : null };
}
