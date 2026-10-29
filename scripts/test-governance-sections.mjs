import assert from "node:assert/strict";
import { test } from "node:test";
import { GOVERNANCE_FAMILIES, hasGovernanceCoverage, readGovernanceSections } from "../src/lib/governanceSections.ts";

const unexpected = async () => { throw new Error("Unrelated registry was requested"); };

test("ordinary categories load without waiting for treasury, upgrades or other categories", async () => {
  const calls = [];
  const result = await readGovernanceSections("ordinary:Pool allocation", {
    ordinary: async family => { calls.push(family); return [{ id: 7, family }]; },
    treasury: unexpected,
    upgrades: unexpected,
  });
  assert.deepEqual(calls, ["Pool allocation"]);
  assert.equal(result.history[0].id, 7);
  assert.equal(hasGovernanceCoverage(result.coverage, "ordinary:Pool allocation"), true);
  assert.equal(hasGovernanceCoverage(result.coverage, "ordinary:Voting cost"), false);
  assert.equal(hasGovernanceCoverage(result.coverage, "miner-voting"), false);
});

test("base settings never start historical registry scans or claim empty registries complete", async () => {
  const result = await readGovernanceSections("base", { ordinary: unexpected, treasury: unexpected, upgrades: unexpected });
  assert.deepEqual(result.history, []);
  assert.deepEqual(result.treasury, []);
  assert.deepEqual(result.upgrades, []);
  assert.equal(hasGovernanceCoverage(result.coverage, "base"), true);
  for (const scope of ["treasury", "upgrades", "miner-voting", "ordinary:Pool allocation", "all"]) {
    assert.equal(hasGovernanceCoverage(result.coverage, scope), false);
  }
});

test("a successfully read empty registry differs from one not requested", async () => {
  const result = await readGovernanceSections("treasury", { ordinary: unexpected, treasury: async () => [], upgrades: unexpected });
  assert.deepEqual(result.treasury, []);
  assert.equal(hasGovernanceCoverage(result.coverage, "treasury"), true);
  assert.equal(hasGovernanceCoverage(result.coverage, "upgrades"), false);
});

test("miner voting requires both target registries and propagates incomplete reads", async () => {
  let release;
  let settled = false;
  const pending = readGovernanceSections("miner-voting", {
    ordinary: unexpected,
    treasury: () => new Promise(resolve => { release = resolve; }),
    upgrades: async () => [{ supportPosition: 2 }],
  }).then(value => { settled = true; return value; });
  await Promise.resolve();
  assert.equal(settled, false);
  release([{ id: 1 }]);
  const result = await pending;
  assert.equal(hasGovernanceCoverage(result.coverage, "miner-voting"), true);
  assert.equal(result.treasury[0].id, 1);
  assert.equal(result.upgrades[0].supportPosition, 2);
  await assert.rejects(readGovernanceSections("miner-voting", {
    ordinary: unexpected, treasury: async () => [], upgrades: async () => { throw new Error("Registry incomplete"); },
  }), /Registry incomplete/);
});

test("full audit mode retains all categories, while unknown categories fail closed", async () => {
  const result = await readGovernanceSections("all", {
    ordinary: async family => [family], treasury: async () => [], upgrades: async () => [],
  });
  assert.deepEqual(result.history, [...GOVERNANCE_FAMILIES]);
  assert.equal(hasGovernanceCoverage(result.coverage, "all"), true);
  await assert.rejects(readGovernanceSections("ordinary:not-a-family", { ordinary: unexpected, treasury: unexpected, upgrades: unexpected }), /Unknown proposal family/);
});
