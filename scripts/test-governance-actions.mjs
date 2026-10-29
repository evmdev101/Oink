import assert from "node:assert/strict";
import { test } from "node:test";
import { Interface } from "ethers";
import { ORDINARY_CALLS, prepareOrdinaryAction } from "../src/lib/ordinaryGovernanceCalls.ts";
import { prepareSenateMembershipVote, prepareRecordedSenateVoteRemoval, prepareTreasuryProposal, prepareTreasuryCreditVote } from "../src/lib/governanceTransactions.ts";
import { simulateGovernanceAction } from "../src/lib/governanceSimulation.ts";

const address = "0x0000000000000000000000000000000000000001";
for (const [family, stages] of Object.entries(ORDINARY_CALLS)) {
  for (const [stage, signature] of Object.entries(stages)) {
    test(`${family}: ${stage} ABI encoding stays blocked`, () => {
      const iface = new Interface([signature]);
      const fragment = iface.fragments[0];
      const args = fragment.inputs.map((input) => input.type === "address" ? address : input.type === "bool" ? false : 123n);
      const action = prepareOrdinaryAction(address, family, stage, args);
      assert.deepEqual(Array.from(iface.decodeFunctionData(fragment, action.data)), args);
      assert.equal(action.blocked, true);
      assert.equal(action.value, 0n);
    });
  }
}

test("membership ballots encode full address integer and removal offset", () => {
  const candidate = "0xffffffffffffffffffffffffffffffffffffffff";
  const iface = new Interface(["function vote(uint256)"]);
  const added = prepareSenateMembershipVote(address, candidate, "add");
  const removed = prepareSenateMembershipVote(address, candidate, "remove");
  assert.equal(iface.decodeFunctionData("vote", added.data)[0], BigInt(candidate));
  assert.equal(iface.decodeFunctionData("vote", removed.data)[0], BigInt(candidate) + 1n);
});

test("recorded vote removal fails closed for missing data or mismatched index", () => {
  assert.throws(() => prepareRecordedSenateVoteRemoval(address, "99", 0, null));
  assert.throws(() => prepareRecordedSenateVoteRemoval(address, "99", 0, ["98"]));
  assert.equal(prepareRecordedSenateVoteRemoval(address, "99", 0, ["99"]).blocked, true);
});

test("treasury creation preserves raw token amount and opposition-veto boolean", () => {
  const iface = new Interface(["function initiateTreasuryTransferProposal(uint256,address,address,uint256,uint256)", "function voteTreasuryTransferProposalN(uint256,uint256,bool)"]);
  const created = prepareTreasuryProposal(address, 100n, address, address, 123456789n, 3600n);
  assert.equal(iface.decodeFunctionData("initiateTreasuryTransferProposal", created.data)[3], 123456789n);
  const vote = prepareTreasuryCreditVote(address, { kind: "treasury-withdrawal", withdrawalId: 12, consensusPosition: 25 }, 123n, "oppose", true);
  assert.deepEqual(Array.from(iface.decodeFunctionData("voteTreasuryTransferProposalN", vote.data)), [12n, 123n, true]);
});

const action = { label: "test", to: address, data: "0x12345678", value: 0n, blocked: true };
const mockRpc = () => ({
  send: async () => "0x171",
  getBlock: async () => ({ number: 123, hash: "0xabc" }),
  getCode: async () => "0x1234",
  call: async (tx) => { assert.equal(tx.blockTag, 123); assert.equal(tx.from, address); return "0x"; },
});

test("successful read-only simulation is still blocked and does not claim approval", async () => {
  const result = await simulateGovernanceAction(mockRpc(), action, address);
  assert.equal(result.blocked, true);
  assert.match(result.warning, /not verified/);
});

test("simulation rejects wrong network, no code, reverts and changed blocks", async () => {
  await assert.rejects(simulateGovernanceAction({ ...mockRpc(), send: async () => "0x1" }, action, address), /PulseChain/);
  await assert.rejects(simulateGovernanceAction({ ...mockRpc(), getCode: async () => "0x" }, action, address), /no deployed code/);
  await assert.rejects(simulateGovernanceAction({ ...mockRpc(), call: async () => { throw new Error("invalid proposal"); } }, action, address), /invalid proposal/);
  let reads = 0;
  await assert.rejects(simulateGovernanceAction({ ...mockRpc(), getBlock: async () => ({ number: 123, hash: reads++ ? "changed" : "original" }) }, action, address), /changed/);
});
