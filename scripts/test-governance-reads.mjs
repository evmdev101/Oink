import assert from "node:assert/strict";
import { test } from "node:test";
import { Contract, Interface } from "ethers";
import { snapshotRunner, decodeSenateBallots, snapshotIsStale, allProposalIds } from "../src/lib/governanceReadSafety.ts";

const member = "0x0000000000000000000000000000000000000001";

test("contract reads pin the snapshot block, including conflicting overrides", async () => {
  const abi = ["function totalShares() view returns (uint256)"];
  const iface = new Interface(abi);
  const calls = [];
  const runner = snapshotRunner({ call: async (tx) => {
    calls.push(tx);
    return iface.encodeFunctionResult("totalShares", [123n]);
  } }, 12345);
  const contract = new Contract(member, abi, runner);
  assert.equal(await contract.totalShares(), 123n);
  assert.equal(await contract.totalShares({ blockTag: "latest" }), 123n);
  assert.deepEqual(calls.map((call) => call.blockTag), [12345, 12345]);
  assert.equal(runner.sendTransaction, undefined);
});

test("historical-read failure is surfaced, never retried at latest", async () => {
  let attempts = 0;
  const runner = snapshotRunner({ call: async () => { attempts++; throw new Error("unavailable block"); } }, 12345);
  await assert.rejects(runner.call({ to: member }), /unavailable block/);
  assert.equal(attempts, 1);
});

test("address-sized Senate ballots retain distinct exact IDs", () => {
  const id = BigInt("0xffffffffffffffffffffffffffffffffffffffff");
  assert.deepEqual(decodeSenateBallots([member], [member], [[id, id + 1n]]), [[id.toString(), (id + 1n).toString()]]);
});

test("empty ballots are valid only with a matching registry", () => {
  assert.deepEqual(decodeSenateBallots([], [], []), []);
  assert.deepEqual(decodeSenateBallots([member], [member], [[]]), [[]]);
  assert.throws(() => decodeSenateBallots([member], [], []), /registry/);
  assert.throws(() => decodeSenateBallots([member], ["0x0000000000000000000000000000000000000002"], [[]]), /registry/);
});

test("staleness uses block time, including the two-minute boundary", () => {
  assert.equal(snapshotIsStale(1000, 1119999), false);
  assert.equal(snapshotIsStale(1000, 1120000), true);
  assert.equal(snapshotIsStale(1000, 1500000), true);
});

test("discovery includes old proposal zero and rejects incomplete scan sizes", () => {
  assert.deepEqual(allProposalIds(0), []);
  assert.deepEqual(allProposalIds(4), [3, 2, 1, 0]);
  assert.equal(allProposalIds(430).length, 430);
  for (const value of [-1, 1.5, NaN, 5001]) assert.throws(() => allProposalIds(value), /incomplete/);
});

test("snapshot runner bounds concurrent reads without dropping requests", async () => {
  let active = 0, peak = 0;
  const runner = snapshotRunner({ call: async () => {
    active++; peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return "0x";
  } }, 100);
  const results = await Promise.all(Array.from({ length: 100 }, () => runner.call({ to: member })));
  assert.equal(results.length, 100);
  assert.ok(peak <= 12);
});
