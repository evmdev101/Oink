import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedPositionCount, grossShareValue, positionWindow } from "../src/lib/miningMath.ts";

test("gross share value uses integer accounting, not rounded share price", () => {
  assert.equal(grossShareValue(3n, 10n, 7n), 4n);
  assert.equal(grossShareValue(10n ** 30n, 10n ** 36n, 10n ** 31n), 10n ** 35n);
  assert.equal(grossShareValue(0n, 0n, 0n), 0n);
  assert.throws(() => grossShareValue(1n, 1n, 0n));
});
test("mandatory lock takes precedence and equality stays locked", () => {
  assert.match(positionWindow(100n, 30n, 3n, 40n, 140n).status, /Mandatory/);
  assert.match(positionWindow(100n, 30n, 3n, 40n, 141n).status, /late fee/);
});
test("maturity and grace boundaries do not promise executable withdrawal", () => {
  assert.match(positionWindow(100n, 30n, 3n, 0n, 129n).status, /early fee/);
  assert.match(positionWindow(100n, 30n, 3n, 0n, 130n).status, /execution unverified/);
  assert.match(positionWindow(100n, 30n, 3n, 0n, 133n).status, /execution unverified/);
  assert.match(positionWindow(100n, 30n, 3n, 0n, 134n).status, /late fee/);
});
test("position scan refuses silent truncation", () => {
  assert.equal(boundedPositionCount(0n), 0);
  assert.equal(boundedPositionCount(1000n), 1000);
  assert.throws(() => boundedPositionCount(1001n));
  assert.throws(() => boundedPositionCount(-1n));
});
