import { test } from "node:test";
import assert from "node:assert/strict";
import { decimalAmount, projectedReward, rewardApr, percentage, recordShare } from "../src/lib/farmInsights.ts";

test("insight inputs fail closed and preserve precision", () => {
  for (const input of [null, "", "-1", "NaN", "1e8", "0.0000000000000000001"]) assert.equal(decimalAmount(input), null);
  assert.equal(decimalAmount("9007199254740993.000000000000000001"), 9007199254740993000000000000000001n);
});
test("reward periods are linear without compounding and missing balances stay unknown", () => {
  assert.equal(projectedReward("100", "10", "1000", 1n), "1.0");
  assert.equal(projectedReward("100", "10", "1000", 30n), "30.0");
  assert.equal(projectedReward("100", "0", "1000", 365n), "0.0");
  assert.equal(projectedReward("100", null, "1000", 1n), null);
  assert.equal(projectedReward("100", "10", "0", 1n), null);
});
test("APR requires both positive prices and uses entered USD values", () => {
  assert.equal(rewardApr("1", "100", "1", "1"), "365.00");
  assert.equal(rewardApr("1", "100", "1", "1", 7n), "7.00");
  assert.equal(rewardApr("1", "100", "", "1"), null);
  assert.equal(rewardApr("1", "100", "0", "1"), null);
  assert.equal(rewardApr("1", "100", "1", "-1"), null);
  assert.equal(percentage(1n, 0n), null);
});
test("share history prunes old and future data and samples at four-hour intervals", () => {
  const now = 40 * 86400000;
  const current = { at: now, value: 4.57 };
  assert.deepEqual(recordShare([], current), [current]);
  assert.deepEqual(recordShare([{at:now-1000,value:4.6}], current), [{at:now-1000,value:4.6}]);
  assert.deepEqual(recordShare([{at:now-4*3600000,value:4.6}], current), [{at:now-4*3600000,value:4.6}, current]);
  assert.deepEqual(recordShare([{at:1,value:5},{at:now+1,value:6},{at:now-1,value:NaN}], current), [current]);
});
