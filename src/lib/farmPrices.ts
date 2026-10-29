import { sharedDisplayReads } from "./sharedReadCache.ts";
import { TREASURY_EXTRA_TOKENS } from "../config/treasuryAssets.ts";
export const FARM_PRICE_TOKENS = {
  oink: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
  // Native PLS uses its 1:1 wrapped token's market price.
  pls: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
  plsx: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
  inc: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
  hex: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
  hoa: "0x7901a3569679AEc3501dbeC59399F327854a70fe",
  pdai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  atropa: "0xCc78A0acDF847A2C1714D2A925bB4477df5d48a6",
  solidx: "0x8Da17Db850315A34532108f0f5458fc0401525f6",
  pusdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  pusdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  pdrip: "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68",
  emit: "0x32fB5663619A657839A80133994E45c5e5cDf427",
  communitas: "0x5A9780Bfe63f3ec57f01b087cD65BD656C9034A8",
  ptgc: "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
  ufo: "0x456548A9B56eFBbD89Ca0309edd17a9E20b04018",
  ...Object.fromEntries(TREASURY_EXTRA_TOKENS.map(token => [token.priceId, token.address])),
} as const;
export type FarmPrice = { usd: string; pair: string; fetchedAt: number };
export type FarmPrices = Partial<Record<string, FarmPrice>>;
export const PRICE_MAX_AGE_MS = 120000;
export function freshFarmPrice(quote: FarmPrice | undefined, now = Date.now()) {
  return quote && now >= quote.fetchedAt && now - quote.fetchedAt <= PRICE_MAX_AGE_MS ? quote.usd : "";
}
export function selectFarmPrices(payload: unknown, fetchedAt = Date.now()): FarmPrices {
  if (!Array.isArray(payload)) throw new Error("Market price response is invalid.");
  const result: FarmPrices = {};
  for (const [id, address] of Object.entries(FARM_PRICE_TOKENS)) {
    // priceUsd belongs to the base asset, never the quote token or a same-symbol token.
    const pairs = payload.filter(pair => pair?.chainId === "pulsechain"
      && typeof pair.baseToken?.address === "string" && pair.baseToken.address.toLowerCase() === address.toLowerCase()
      && typeof pair.priceUsd === "string" && /^\d{1,20}(\.\d{1,18})?$/.test(pair.priceUsd) && Number(pair.priceUsd) > 0
      && Number.isFinite(pair.liquidity?.usd) && pair.liquidity.usd > 0
      && /^0x[0-9a-fA-F]{40}$/.test(pair.pairAddress ?? ""))
      .sort((a,b) => b.liquidity.usd - a.liquidity.usd);
    if (pairs[0]) result[id as keyof FarmPrices] = { usd:pairs[0].priceUsd, pair:pairs[0].pairAddress, fetchedAt };
  }
  return result;
}
async function fetchFarmPrices(signal?: AbortSignal): Promise<FarmPrices> {
  const response = await fetch("https://api.dexscreener.com/tokens/v1/pulsechain/" + Object.values(FARM_PRICE_TOKENS).join(","), {
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000),
    credentials:"omit",
  });
  if (!response.ok) throw new Error("Market prices are temporarily unavailable.");
  return selectFarmPrices(await response.json());
}
export function displayFee(value: string) {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}

export function readFarmPrices(signal?:AbortSignal) { return sharedDisplayReads.read("369:market-prices",fetchFarmPrices,{signal,ttl:30000,timeout:15000,cacheable:value => !!value.oink}); }
export function peekFarmPrices() { return sharedDisplayReads.peek<FarmPrices>("369:market-prices") ?? {}; }
