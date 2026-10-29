import { Contract, JsonRpcProvider, formatEther, getAddress, keccak256 } from "ethers";

const RPCS = [
  "https://rpc.pulsechain.com",
  "https://pulsechain.publicnode.com",
  "https://rpc-pulsechain.g4mm4.io",
];

const addresses = {
  token: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
  governor: "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16",
  consensus: "0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3",
  senate: "0x147B43930283d1DDe43d805B7f17E4604b7ca493",
  votingCredit: "0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A",
  miners: [
    "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8",
    "0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4",
    "0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67",
    "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1",
    "0x15b51Ece819f3B51ce814de67bB2419660701a3c",
    "0xf3E82f4123d4262a2baEC25b03652f3932A91739",
  ],
};

const tokenAbi = [
  "function governor() view returns (address)",
  "function owner() view returns (address)",
];
const governorAbi = [
  "function senateContract() view returns (address)",
  "function consensusContract() view returns (address)",
  "function creditContract() view returns (address)",
  "function costToVote() view returns (uint256)",
  "function delayBeforeEnforce() view returns (uint256)",
  "function eligibleNewGovernor() view returns (address)",
  "function changeGovernorActivated() view returns (bool)",
  "function newGovernorRequestBlock() view returns (uint256)",
  "function newGovernorBlockDelay() view returns (uint256)",
  "function acPool1() view returns (address)",
  "function acPool2() view returns (address)",
  "function acPool3() view returns (address)",
  "function acPool4() view returns (address)",
  "function acPool5() view returns (address)",
  "function acPool6() view returns (address)",
];
const senateAbi = [
  "function token() view returns (address)",
  "function owner() view returns (address)",
  "function senatorCount() view returns (uint256)",
  "function minSenators() view returns (uint256)",
  "function maxSenators() view returns (uint256)",
  "function viewSenators() view returns (address[])",
  "function votesForProposal(uint256) view returns (uint256)",
];
const consensusAbi = [
  "function owner() view returns (address)",
  "function creditContract() view returns (address)",
  "function governorCount() view returns (uint256)",
  "function proposalLengths() view returns (uint256 treasuryCount, uint256 consensusCount)",
  "function totalDTXStaked() view returns (uint256)",
  "function consensusProposal(uint256) view returns (uint16 typeOfChange, address beneficiaryAddress, uint256 timestamp)",
  "function treasuryProposal(uint256) view returns (bool valid, uint256 firstCallTimestamp, uint256 valueSacrificedForVote, uint256 valueSacrificedAgainst, uint256 delay, address tokenAddress, address beneficiary, uint256 amountToSend, uint256 consensusProposalID)",
  "function highestConsensusVotes(uint256) view returns (uint256)",
  "function tokensCastedPerVote(uint256) view returns (uint256)",
  "function isGovInvalidated(address) view returns (bool isInvalidated, bool hasPassed)",
];
const votingCreditAbi = [
  "function owner() view returns (address)",
  "function masterchef() view returns (address)",
  "function creditingContractCount() view returns (uint256)",
  "function deductingContractCount() view returns (uint256)",
];
const minerAbi = [
  "function balanceOf() view returns (uint256)",
  "function totalShares() view returns (uint256)",
  "function getPricePerFullShare() view returns (uint256)",
];

async function providerForAudit() {
  for (const url of RPCS) {
    const provider = new JsonRpcProvider(
      url,
      { chainId: 369, name: "pulsechain" },
      { staticNetwork: true, batchMaxCount: 8 },
    );
    try {
      await provider.getBlockNumber();
      return { provider, url };
    } catch {
      provider.destroy();
    }
  }
  throw new Error("No configured PulseChain RPC responded.");
}

const asAddress = (value) => getAddress(value);
const asNumber = (value) => Number(value);
const asToken = (value) => formatEther(value);

async function main() {
  const { provider, url } = await providerForAudit();
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  const token = new Contract(addresses.token, tokenAbi, provider);
  const governor = new Contract(addresses.governor, governorAbi, provider);
  const senate = new Contract(addresses.senate, senateAbi, provider);
  const consensus = new Contract(addresses.consensus, consensusAbi, provider);
  const votingCredit = new Contract(addresses.votingCredit, votingCreditAbi, provider);

  const [
    tokenGovernor,
    tokenOwner,
    governorSenate,
    governorConsensus,
    governorCredit,
    costToVote,
    delayBeforeEnforce,
    eligibleNewGovernor,
    changeGovernorActivated,
    newGovernorRequestBlock,
    newGovernorBlockDelay,
    governorPools,
    senateToken,
    senateOwner,
    senatorCount,
    minSenators,
    maxSenators,
    senators,
    consensusOwner,
    consensusCredit,
    governorCount,
    proposalLengths,
    totalLocked,
    creditOwner,
    creditMasterchef,
    creditingContractCount,
    deductingContractCount,
  ] = await Promise.all([
    token.governor(),
    token.owner(),
    governor.senateContract(),
    governor.consensusContract(),
    governor.creditContract(),
    governor.costToVote(),
    governor.delayBeforeEnforce(),
    governor.eligibleNewGovernor(),
    governor.changeGovernorActivated(),
    governor.newGovernorRequestBlock(),
    governor.newGovernorBlockDelay(),
    Promise.all([1, 2, 3, 4, 5, 6].map((id) => governor[`acPool${id}`]())),
    senate.token(),
    senate.owner(),
    senate.senatorCount(),
    senate.minSenators(),
    senate.maxSenators(),
    senate.viewSenators(),
    consensus.owner(),
    consensus.creditContract(),
    consensus.governorCount(),
    consensus.proposalLengths(),
    consensus.totalDTXStaked(),
    votingCredit.owner(),
    votingCredit.masterchef(),
    votingCredit.creditingContractCount(),
    votingCredit.deductingContractCount(),
  ]);

  const treasuryCount = asNumber(proposalLengths.treasuryCount);
  const consensusCount = asNumber(proposalLengths.consensusCount);
  if (process.env.GOV_SUMMARY_ONLY === "1") {
    console.log(JSON.stringify({
      observedAt: new Date().toISOString(),
      rpc: url,
      blockNumber,
      blockTimestamp: block?.timestamp ?? null,
      tokenGovernor: asAddress(tokenGovernor),
      tokenOwner: asAddress(tokenOwner),
      governorSenate: asAddress(governorSenate),
      governorConsensus: asAddress(governorConsensus),
      governorCredit: asAddress(governorCredit),
      governorPools: governorPools.map(asAddress),
      senateToken: asAddress(senateToken),
      senateOwner: asAddress(senateOwner),
      senatorCount: asNumber(senatorCount),
      minSenators: asNumber(minSenators),
      maxSenators: asNumber(maxSenators),
      senateMembers: senators.map(asAddress),
      consensusOwner: asAddress(consensusOwner),
      consensusCredit: asAddress(consensusCredit),
      governorCount: asNumber(governorCount),
      treasuryCount,
      consensusCount,
      totalLockedOINK: asToken(totalLocked),
      costToVoteOINK: asToken(costToVote),
      delayBeforeEnforceSeconds: asNumber(delayBeforeEnforce),
      eligibleNewGovernor: asAddress(eligibleNewGovernor),
      changeGovernorActivated,
      newGovernorRequestBlock: asNumber(newGovernorRequestBlock),
      newGovernorBlockDelay: asNumber(newGovernorBlockDelay),
      creditOwner: asAddress(creditOwner),
      creditMasterchef: asAddress(creditMasterchef),
      creditingContractCount: asNumber(creditingContractCount),
      deductingContractCount: asNumber(deductingContractCount),
    }, null, 2));
    provider.destroy();
    return;
  }
  // The published UI identifies the sole Governor proposal as the paired
  // support/opposition positions 75 and 76. Read those exact deployed records
  // instead of scanning hundreds of unrelated consensus slots serially.
  const consensusIds = consensusCount > 76 ? [75, 76] : [];
  const consensusRows = await Promise.all(consensusIds.map(async (id) => {
    const [row, highest, liveVotes] = await Promise.all([
      consensus.consensusProposal(id),
      consensus.highestConsensusVotes(id),
      consensus.tokensCastedPerVote(id),
    ]);
    return {
      id,
      typeOfChange: Number(row.typeOfChange),
      beneficiary: asAddress(row.beneficiaryAddress),
      timestamp: asNumber(row.timestamp),
      highestLockedVotes: asToken(highest),
      currentLockedVotes: asToken(liveVotes),
    };
  }));

  const treasuryIds = Array.from(
    { length: Math.min(treasuryCount, 6) },
    (_, index) => treasuryCount - 1 - index,
  );
  const treasuryRows = await Promise.all(treasuryIds.map(async (id) => {
    const row = await consensus.treasuryProposal(id);
    return {
      id,
      valid: row.valid,
      firstCallTimestamp: asNumber(row.firstCallTimestamp),
      creditFor: asToken(row.valueSacrificedForVote),
      creditAgainst: asToken(row.valueSacrificedAgainst),
      requestedDelaySeconds: asNumber(row.delay),
      token: asAddress(row.tokenAddress),
      beneficiary: asAddress(row.beneficiary),
      amountRaw: row.amountToSend.toString(),
      consensusProposalId: asNumber(row.consensusProposalID),
    };
  }));

  const upgradeCandidates = [];
  for (const row of consensusRows.filter((item) => item.id > 0 && item.id % 2 === 1 && item.typeOfChange === 0)) {
    const status = await consensus.isGovInvalidated(row.beneficiary);
    upgradeCandidates.push({
      supportProposalId: row.id,
      oppositionProposalId: row.id + 1,
      proposedGovernor: row.beneficiary,
      proposedAt: row.timestamp,
      invalidated: status.isInvalidated,
      passedFirstStage: status.hasPassed,
    });
  }

  const minerRows = [];
  for (let index = 0; index < addresses.miners.length; index += 1) {
    const minerAddress = addresses.miners[index];
    const miner = new Contract(minerAddress, minerAbi, provider);
    const [balance, totalShares, price, code] = await Promise.all([
      miner.balanceOf(),
      miner.totalShares(),
      miner.getPricePerFullShare(),
      provider.getCode(minerAddress),
    ]);
    minerRows.push({
      index,
      address: asAddress(minerAddress),
      balanceOINK: asToken(balance),
      totalShares: totalShares.toString(),
      pricePerShare: asToken(price),
      bytecodeHash: keccak256(code),
    });
  }

  const result = {
    observedAt: new Date().toISOString(),
    rpc: url,
    blockNumber,
    blockTimestamp: block?.timestamp ?? null,
    addresses,
    wiring: {
      tokenGovernor: asAddress(tokenGovernor),
      tokenOwner: asAddress(tokenOwner),
      governorSenate: asAddress(governorSenate),
      governorConsensus: asAddress(governorConsensus),
      governorCredit: asAddress(governorCredit),
      governorPools: governorPools.map(asAddress),
      senateToken: asAddress(senateToken),
      senateOwner: asAddress(senateOwner),
      consensusOwner: asAddress(consensusOwner),
      consensusCredit: asAddress(consensusCredit),
      creditOwner: asAddress(creditOwner),
      creditMasterchef: asAddress(creditMasterchef),
    },
    settings: {
      costToVoteOINK: asToken(costToVote),
      delayBeforeEnforceSeconds: asNumber(delayBeforeEnforce),
      newGovernorBlockDelay: asNumber(newGovernorBlockDelay),
      newGovernorRequestBlock: asNumber(newGovernorRequestBlock),
      eligibleNewGovernor: asAddress(eligibleNewGovernor),
      changeGovernorActivated,
      creditingContractCount: asNumber(creditingContractCount),
      deductingContractCount: asNumber(deductingContractCount),
    },
    senate: {
      senatorCount: asNumber(senatorCount),
      minSenators: asNumber(minSenators),
      maxSenators: asNumber(maxSenators),
      majorityRequired: Math.floor(asNumber(senatorCount) / 2) + 1,
      members: senators.map(asAddress),
    },
    consensus: {
      governorProposalCount: asNumber(governorCount),
      treasuryProposalCount: treasuryCount,
      consensusRecordCount: consensusCount,
      totalLockedOINK: asToken(totalLocked),
      records: consensusRows,
      treasuryRequests: treasuryRows,
      upgradeCandidates,
    },
    miners: minerRows,
  };

  console.log(JSON.stringify(result, null, 2));
  provider.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
