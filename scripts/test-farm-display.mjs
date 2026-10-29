import { test } from "node:test";
import assert from "node:assert/strict";
import { sumFarmAmounts, displayFarmAmount, summarizeFarmWallet } from "../src/lib/farmDisplay.ts";

test("farm amounts preserve precision beyond safe integers", () => {
  assert.equal(sumFarmAmounts(["9007199254740993.000000000000000001", "0.000000000000000009"]), "9007199254740993.00000000000000001");
  assert.equal(sumFarmAmounts(["0.12", "1.008", "5"]), "6.128");
  assert.equal(sumFarmAmounts([]), "0");
  assert.throws(() => sumFarmAmounts(["unavailable"]));
});
test("display shortening does not make small positive rewards look like zero", () => {
  assert.equal(displayFarmAmount("0.0000001"), "<0.001");
  assert.equal(displayFarmAmount("1234567.12399"), "1,234,567.123");
  assert.equal(displayFarmAmount("0.0"), "0");
});
test("portfolio sums only verified gross OINK and explicitly marks partial reads", () => {
  const complete = { data: { positions: [{ amount: "999", pending: "1.5" }, { amount: "2", pending: "0.25" }], accountError: null } };
  const failed = { data: null };
  assert.deepEqual(summarizeFarmWallet([complete, failed]), { verifiedFarms: 1, partial: true, positionCount: 2, grossPending: "1.75" });
  assert.equal(summarizeFarmWallet([failed]).grossPending, null);
  assert.equal(summarizeFarmWallet([{ data: { positions: [], accountError: null } }]).grossPending, "0");
  assert.equal(summarizeFarmWallet([{ data: { positions: null, accountError: "Failed" } }]).grossPending, null);
});
