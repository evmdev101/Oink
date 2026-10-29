import { test } from "node:test";
import assert from "node:assert/strict";
import { FARM_PRICE_TOKENS, selectFarmPrices, freshFarmPrice, displayFee } from "../src/lib/farmPrices.ts";
const pair = (extra={}) => ({ chainId:"pulsechain", baseToken:{address:FARM_PRICE_TOKENS.pls}, priceUsd:"0.000012", liquidity:{usd:1000}, pairAddress:"0x"+"1".repeat(40), ...extra });
test("prices use exact base-token address and chain, not matching symbols or quote tokens", () => {
  assert.deepEqual(selectFarmPrices([pair({chainId:"ethereum"}), pair({baseToken:{address:FARM_PRICE_TOKENS.plsx},quoteToken:{address:FARM_PRICE_TOKENS.pls}})], 100).pls, undefined);
  assert.equal(selectFarmPrices([pair()], 100).pls.usd, "0.000012");
});
test("highest liquidity valid market wins and invalid quotes are excluded", () => {
  const quotes = selectFarmPrices([pair(), pair({priceUsd:"0.000013",liquidity:{usd:2000}}), pair({priceUsd:"NaN",liquidity:{usd:1e9}}), pair({priceUsd:"0",liquidity:{usd:1e9}})], 100);
  assert.equal(quotes.pls.usd,"0.000013");
  assert.deepEqual(selectFarmPrices([pair({liquidity:{usd:0}}),pair({pairAddress:"bad"})]),{});
  assert.throws(()=>selectFarmPrices({pairs:[]}));
});
test("stale, future and missing prices never enter APR", () => {
  const q=selectFarmPrices([pair()],100).pls;
  assert.equal(freshFarmPrice(q,100),"0.000012");
  assert.equal(freshFarmPrice(q,120101),"");
  assert.equal(freshFarmPrice(q,99),"");
  assert.equal(freshFarmPrice(undefined),"");
});
test("fees trim presentation zeros without losing hourly precision", () => {
  assert.equal(displayFee("0.0"),"0");
  assert.equal(displayFee("0.025"),"0.025");
  assert.equal(displayFee("2.5000"),"2.5");
  assert.equal(displayFee("100"),"100");
});
