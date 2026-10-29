import { Interface, getAddress } from "ethers";

export type PreparedGovernanceAction = {
  label: string;
  to: string;
  data: string;
  value: 0n;
  blocked: true;
};

export type TreasuryTarget = {
  kind: "treasury-withdrawal";
  withdrawalId: number;
  consensusPosition: number;
};

export type GovernorTarget = {
  kind: "governor-replacement";
  proposedGovernor: string;
  supportPosition: number;
  oppositionPosition: number;
};

export type ConsensusTarget = TreasuryTarget | GovernorTarget;

const senateInterface = new Interface([
  "function vote(uint256)",
  "function removeVote(uint256,uint256)",
  "function vetoProposal(uint256,uint256)",
  "function expandSenate(address)",
  "function expellSenator(address,uint256)",
  "function selfReplaceSenator(address,uint256)",
  "function grantVotingCredit()",
]);

const minerInterface = new Interface([
  "function voteForProposal(uint256,bool)",
  "function setDelegate(address,bool)",
  "function delegateeVote(address[],uint256)",
]);

const consensusInterface = new Interface([
  "function initiateTreasuryTransferProposal(uint256,address,address,uint256,uint256)",
  "function voteTreasuryTransferProposalY(uint256,uint256)",
  "function voteTreasuryTransferProposalN(uint256,uint256,bool)",
  "function proposeGovernor(address)",
  "function changeGovernor(uint256)",
  "function vetoGovernor(uint256,bool)",
  "function vetoGovernor2(uint256,bool)",
  "function enforceGovernor(uint256)",
  "function approveTreasuryTransfer(uint256)",
  "function killTreasuryTransferProposal(uint256)",
]);

const prepared = (label: string, to: string, data: string): PreparedGovernanceAction => ({
  label,
  to: getAddress(to),
  data,
  value: 0n,
  blocked: true,
});

const targetPosition = (target: ConsensusTarget, stance: "support" | "oppose") => {
  if (target.kind === "treasury-withdrawal") {
    return stance === "support" ? target.consensusPosition : target.consensusPosition + 1;
  }
  return stance === "support" ? target.supportPosition : target.oppositionPosition;
};

export function prepareMinerVote(
  minerAddress: string,
  target: ConsensusTarget,
  stance: "support" | "oppose",
  asProxy = false,
) {
  const verb = stance === "support" ? "Support" : target.kind === "treasury-withdrawal" ? "Block" : "Oppose";
  return prepared(
    `${verb} ${target.kind === "treasury-withdrawal" ? `treasury withdrawal ${target.withdrawalId}` : `Governor replacement ${getAddress(target.proposedGovernor)}`}`,
    minerAddress,
    minerInterface.encodeFunctionData("voteForProposal", [targetPosition(target, stance), asProxy]),
  );
}

export function prepareMinerDelegate(minerAddress: string, delegate: string, asProxy = false) {
  return prepared(
    `Set delegate ${getAddress(delegate)}`,
    minerAddress,
    minerInterface.encodeFunctionData("setDelegate", [getAddress(delegate), asProxy]),
  );
}

export function prepareDelegatedMinerVote(
  minerAddress: string,
  voters: string[],
  target: ConsensusTarget,
  stance: "support" | "oppose",
) {
  return prepared(
    `Apply a delegated ${stance} position for ${voters.length} verified voter addresses`,
    minerAddress,
    minerInterface.encodeFunctionData("delegateeVote", [voters.map(getAddress), targetPosition(target, stance)]),
  );
}

export function prepareSenateVote(senateAddress: string, target: ConsensusTarget) {
  const ballot = target.kind === "treasury-withdrawal" ? target.consensusPosition : target.supportPosition;
  const label = target.kind === "treasury-withdrawal"
    ? `Vote to block treasury withdrawal ${target.withdrawalId}`
    : `Vote to block Governor replacement ${getAddress(target.proposedGovernor)}`;
  return prepared(label, senateAddress, senateInterface.encodeFunctionData("vote", [ballot]));
}

export function prepareSenateVoteRemoval(senateAddress: string, target: ConsensusTarget, recordedVoteIndex: number) {
  const ballot = target.kind === "treasury-withdrawal" ? target.consensusPosition : target.supportPosition;
  return prepared(
    "Remove my recorded Senate vote",
    senateAddress,
    senateInterface.encodeFunctionData("removeVote", [ballot, recordedVoteIndex]),
  );
}

export function prepareSenateVeto(senateAddress: string, target: ConsensusTarget) {
  const consensusPosition = target.kind === "treasury-withdrawal" ? target.consensusPosition : target.supportPosition;
  const withdrawalId = target.kind === "treasury-withdrawal" ? target.withdrawalId : 0;
  return prepared(
    target.kind === "treasury-withdrawal" ? `Finalize the Senate veto of withdrawal ${withdrawalId}` : "Finalize the Senate veto of this Governor replacement",
    senateAddress,
    senateInterface.encodeFunctionData("vetoProposal", [consensusPosition, withdrawalId]),
  );
}

export function prepareSenateAddition(senateAddress: string, candidate: string) {
  return prepared(`Finalize the addition of ${getAddress(candidate)}`, senateAddress, senateInterface.encodeFunctionData("expandSenate", [getAddress(candidate)]));
}

export function prepareSenateExpulsion(senateAddress: string, member: string, memberIndex: number) {
  return prepared(`Finalize the removal of ${getAddress(member)}`, senateAddress, senateInterface.encodeFunctionData("expellSenator", [getAddress(member), memberIndex]));
}

export function prepareSenateReplacement(senateAddress: string, replacement: string, memberIndex: number) {
  return prepared(`Replace my Senate seat with ${getAddress(replacement)}`, senateAddress, senateInterface.encodeFunctionData("selfReplaceSenator", [getAddress(replacement), memberIndex]));
}

export function prepareSenateCreditDistribution(senateAddress: string) {
  return prepared("Distribute verified Senate voting credit", senateAddress, senateInterface.encodeFunctionData("grantVotingCredit"));
}

export function prepareSenateMembershipVote(senateAddress: string, candidate: string, outcome: "add" | "remove") {
  const checked = getAddress(candidate);
  if (BigInt(checked) === 0n) throw new Error("A nonzero candidate is required.");
  const ballot = BigInt(checked) + (outcome === "remove" ? 1n : 0n);
  return prepared(`Vote to ${outcome} Senate member ${checked}`, senateAddress, senateInterface.encodeFunctionData("vote", [ballot]));
}

export function prepareRecordedSenateVoteRemoval(senateAddress: string, ballot: string, index: number, recordedBallots: readonly string[] | null) {
  if (!recordedBallots || !Number.isSafeInteger(index) || index < 0 || recordedBallots[index] !== ballot) {
    throw new Error("The exact recorded ballot and index must be verified first.");
  }
  return prepared(`Remove recorded Senate ballot ${ballot}`, senateAddress, senateInterface.encodeFunctionData("removeVote", [BigInt(ballot), index]));
}

export function prepareTreasuryProposal(consensusAddress: string, credit: bigint, token: string, recipient: string, amount: bigint, delaySeconds: bigint) {
  return prepared(`Propose treasury transfer to ${getAddress(recipient)}`, consensusAddress,
    consensusInterface.encodeFunctionData("initiateTreasuryTransferProposal", [credit, getAddress(token), getAddress(recipient), amount, delaySeconds]));
}

export function prepareTreasuryCreditVote(consensusAddress: string, target: TreasuryTarget, credit: bigint, stance: "support" | "oppose", withVeto = false) {
  const method = stance === "support" ? "voteTreasuryTransferProposalY" : "voteTreasuryTransferProposalN";
  return prepared(`${stance} treasury withdrawal ${target.withdrawalId} with voting credit`, consensusAddress,
    consensusInterface.encodeFunctionData(method, stance === "support" ? [target.withdrawalId, credit] : [target.withdrawalId, credit, withVeto]));
}

export function prepareGovernorProposal(consensusAddress: string, proposedGovernor: string) {
  return prepared(`Propose Governor ${getAddress(proposedGovernor)}`, consensusAddress, consensusInterface.encodeFunctionData("proposeGovernor", [getAddress(proposedGovernor)]));
}

export function prepareGovernorFinalization(
  consensusAddress: string,
  target: GovernorTarget,
  stage: "first-stage" | "opposition-veto" | "absolute-opposition-veto" | "enforce",
) {
  const calls = {
    "first-stage": ["changeGovernor", "Evaluate the first-stage Governor change"],
    "opposition-veto": ["vetoGovernor", "Finalize the relative-opposition Governor veto"],
    "absolute-opposition-veto": ["vetoGovernor2", "Finalize the absolute-opposition Governor veto"],
    enforce: ["enforceGovernor", "Finalize the Governor replacement after its block delay"],
  } as const;
  const [method, label] = calls[stage];
  return prepared(label, consensusAddress, consensusInterface.encodeFunctionData(method, method === "vetoGovernor" || method === "vetoGovernor2" ? [target.supportPosition, false] : [target.supportPosition]));
}

export function prepareTreasuryFinalization(
  consensusAddress: string,
  target: TreasuryTarget,
  outcome: "approve" | "reject",
) {
  const method = outcome === "approve" ? "approveTreasuryTransfer" : "killTreasuryTransferProposal";
  return prepared(
    outcome === "approve" ? `Finalize treasury withdrawal ${target.withdrawalId}` : `Reject treasury withdrawal ${target.withdrawalId}`,
    consensusAddress,
    consensusInterface.encodeFunctionData(method, [target.withdrawalId]),
  );
}

// Initialization, ownership changes, deployments, and broadcast helpers are
// intentionally absent. These builders only produce blocked, zero-value calldata.
