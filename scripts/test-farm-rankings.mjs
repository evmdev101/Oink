import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
// Mirror Vite's extensionless local TypeScript resolution for these pure tests.
const hooks = registerHooks({ resolve(specifier, context, next) {
  return next(["./farmInsights", "./farmPrices"].includes(specifier) ? specifier + ".ts" : specifier, context);
} });
const { farmRankings, displayRankValue, focusRankedFarm } = await import("../src/lib/farmRankings.ts");
hooks.deregister();
const now = 1_000_000;
const quote = usd => ({ usd, pair:"unused", fetchedAt:now });
const prices = { pls:quote("2"), plsx:quote("1"), inc:quote("5"), oink:quote("1") };
const farm = (id, balance, dailyPool) => ({ id, label:id.toUpperCase(), data:{ balance, pool:id, yieldEstimate:dailyPool == null ? null : { dailyPool } } });
const rows = [farm("pls", "100", "1"), farm("plsx", "100", "2"), farm("inc", "100", "3"), farm("unknown", "99999", null)];

test("live APR, TVL and annual gross rewards rank independently, without changing source rows", () => {
  const r = farmRankings(rows, prices, now/1000, now);
  assert.deepEqual(r.apr.map(x=>x.id), ["plsx","inc","pls"]);
  assert.deepEqual(r.tvl.map(x=>x.id), ["inc","pls","plsx"]);
  assert.deepEqual(r.rewards.map(x=>x.id), ["inc","plsx","pls"]);
  assert.equal(displayRankValue(r.apr[0].value,"apr"), "730.00%");
  assert.equal(displayRankValue(r.rewards[0].value,"rewards"), "$1,095.00 USD");
  assert.equal(displayRankValue(r.totalTvl,"tvl"), "$800.00 USD");
  assert.equal(r.metrics.unknown.tvl, null);
  assert.equal(rows[0].id,"pls");
});

test("stale, future, missing and invalid inputs are excluded instead of fabricated as zero", () => {
  for (const timestamp of [null, now/1000-121, now/1000+1]) {
    const r=farmRankings(rows,prices,timestamp,now);
    assert.deepEqual(r.apr,[]); assert.deepEqual(r.tvl,[]); assert.deepEqual(r.rewards,[]);
    assert.equal(r.totalTvl,null);
  }
  const r=farmRankings(rows,{...prices, pls:{...prices.pls,fetchedAt:now-120001}, oink:quote("NaN")},now/1000,now);
  assert.deepEqual(r.apr,[]); assert.deepEqual(r.rewards,[]);
  assert.deepEqual(r.tvl.map(x=>x.id),["inc","plsx"]);
  assert.equal(farmRankings([farm("pls","-1","NaN")], prices,now/1000,now).totalTvl,null);
});

test("true zero emissions remain valid; empty pools do not acquire an APR", () => {
  const r=farmRankings([farm("pls","0","0"),farm("inc","100","0")],prices,now/1000,now);
  assert.equal(r.metrics.pls.apr,null);
  assert.equal(r.metrics.pls.tvl,0n);
  assert.equal(r.metrics.inc.apr,0n);
  assert.equal(displayRankValue(r.metrics.inc.apr,"apr"),"0.00%");
});

test("ranking and formatting preserve large values and sort ties deterministically", () => {
  const r=farmRankings([farm("pls","9007199254740993.000000000000000001",null),farm("plsx","18014398509481986",null)],prices,now/1000,now);
  assert.deepEqual(r.tvl.map(x=>x.id),["pls","plsx"]);
  assert.equal(displayRankValue(r.tvl[0].value,"tvl"),"$18,014,398,509,481,986.00 USD");
  assert.equal(displayRankValue(1n,"tvl"),"<$0.01 USD");
  const ties=farmRankings([farm("plsx","2","0"),farm("pls","1","0")],prices,now/1000,now);
  assert.deepEqual(ties.tvl.map(x=>x.id),["pls","plsx"]);
});

test("farm jump focuses the exact card and respects reduced motion without wallet actions", () => {
  const calls=[];
  const oldDocument=globalThis.document, oldWindow=globalThis.window;
  try {
    let reduced=false;
    globalThis.document={getElementById:id => id === "farm-card-pls" ? {focus:args=>calls.push(["focus",args]),scrollIntoView:args=>calls.push(["scroll",args])} : null};
    globalThis.window={matchMedia:()=>({matches:reduced})};
    assert.equal(focusRankedFarm("pls"),true);
    assert.deepEqual(calls,[["focus",{preventScroll:true}],["scroll",{behavior:"smooth",block:"start"}]]);
    reduced=true;
    focusRankedFarm("pls");
    assert.equal(calls.at(-1)[1].behavior,"instant");
    assert.equal(focusRankedFarm("missing"),false);
  } finally {
    if(oldDocument===undefined) delete globalThis.document; else globalThis.document=oldDocument;
    if(oldWindow===undefined) delete globalThis.window; else globalThis.window=oldWindow;
  }
});
