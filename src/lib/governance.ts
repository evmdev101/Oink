import { readGovernanceSections, type GovernanceCoverage, type GovernanceReadScope } from "./governanceSections.ts";
import { sharedDisplayReads } from "./sharedReadCache.ts";
import { Contract, formatEther, formatUnits, getAddress, ZeroAddress } from "ethers";
import { CORE_CONTRACTS, GOVERNANCE_CONTRACTS, TIME_MINER_CONTRACTS } from "../config/contracts";
import { getPublicProvider } from "./chain";
import { allProposalIds, decodeSenateBallots, snapshotRunner } from "./governanceReadSafety";

const address = (records: readonly { id: string; address: string }[], id: string) =>
  records.find((record) => record.id === id)!.address;

const ADDRESSES = {
  token: address(CORE_CONTRACTS, "oink-token"),
  governor: address(CORE_CONTRACTS, "governor"),
  senate: address(CORE_CONTRACTS, "senate"),
  consensus: address(GOVERNANCE_CONTRACTS, "consensus"),
  basic: address(GOVERNANCE_CONTRACTS, "basic-settings"),
  farms: address(GOVERNANCE_CONTRACTS, "allocation-settings"),
  reward: address(GOVERNANCE_CONTRACTS, "reward-boost"),
  credit: address(GOVERNANCE_CONTRACTS, "voting-credit"),
};

const tokenAbi = ["function governor() view returns (address)", "function owner() view returns (address)"];
const governorAbi = [
  ...["basicContract", "farmContract", "fibonacceningContract", "consensusContract", "creditContract", "senateContract", "masterchef"].map((name) => `function ${name}() view returns (address)`),
  "function costToVote() view returns (uint256)",
  "function delayBeforeEnforce() view returns (uint256)",
  "function thresholdFibonaccening() view returns (uint256)",
  "function depositFee() view returns (uint256)",
  "function fundingRate() view returns (uint256)",
  "function referralBonus() view returns (uint256)",
  "function eventFibonacceningActive() view returns (bool)",
  "function getRollBonus(address) view returns (uint256)",
  "function eligibleNewGovernor() view returns (address)",
  "function changeGovernorActivated() view returns (bool)",
  "function newGovernorRequestBlock() view returns (uint256)",
  "function newGovernorBlockDelay() view returns (uint256)",
];
const senateAbi = [
  "function senatorCount() view returns (uint256)",
  "function minSenators() view returns (uint256)",
  "function maxSenators() view returns (uint256)",
  "function viewSenators() view returns (address[])",
  "function isSenator(address) view returns (bool)",
  "function multiCall() view returns (address[],uint256[][],uint256[],uint256,uint256[])",
];
const consensusAbi = [
  "function proposalLengths() view returns (uint256 treasuryCount,uint256 consensusCount)",
  "function governorCount() view returns (uint256)",
  "function totalDTXStaked() view returns (uint256)",
  "function consensusProposal(uint256) view returns (uint16 typeOfChange,address beneficiaryAddress,uint256 timestamp)",
  "function treasuryProposal(uint256) view returns (bool valid,uint256 firstCallTimestamp,uint256 valueSacrificedForVote,uint256 valueSacrificedAgainst,uint256 delay,address tokenAddress,address beneficiary,uint256 amountToSend,uint256 consensusProposalID)",
  "function tokensCastedPerVote(uint256) view returns (uint256)",
  "function highestConsensusVotes(uint256) view returns (uint256)",
  "function isGovInvalidated(address) view returns (bool isInvalidated,bool hasPassed)",
];
const basicAbi = [
  "function proposalLengths() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  "function minDepositProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function newPoolProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,address)",
  "function delayProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function callFeeProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function rolloverBonuses(uint256) view returns (bool,uint256,uint256,uint256,uint256,address,uint256)",
  "function minThresholdFibonacceningProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
];
const farmsAbi = [
  "function proposalLengths() view returns (uint256,uint256,uint256,uint256)",
  "function proposalFarmUpdate(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256,uint16)",
  "function vaultProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function governorTransferProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,bool,uint256)",
  "function govTaxProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function percentageAllocatedToPulseEcosystem() view returns (uint256)",
  "function maxNftAllocation() view returns (uint256)",
  "function maxPulseEcoAllocation() view returns (uint256)",
  "function maxPulseEcoTotalAllocation() view returns (uint256)",
];
const rewardAbi = [
  "function proposalLengths() view returns (uint256)",
  "function fibonacceningProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function fibonacceningActiveID() view returns (uint256)",
];
const creditAbi = ["function userCredit(address) view returns (uint256)"];
const erc20Abi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
const minerAbi = [
  "function totalShares() view returns (uint256)",
  "function getPricePerFullShare() view returns (uint256)",
  "function callFee() view returns (uint256)",
  "function getUserTotalShares(address) view returns (uint256)",
  "function userVote(address) view returns (uint256)",
  "function userDelegate(address) view returns (address)",
];

export type ProposalHistory = {
  key: string;
  family: string;
  reference: string;
  change: string;
  valid: boolean;
  openedAt: number;
  votingDeadline: number;
  support: string;
  opposition: string;
  status: string;
};

export type TreasuryRequest = {
  id: number;
  valid: boolean;
  openedAt: number;
  votingDeadline: number;
  finalizationAfter: number;
  token: string;
  beneficiary: string;
  amountRaw: string;
  amount: string | null;
  assetSymbol: string | null;
  creditSupport: string;
  creditOpposition: string;
  supportPosition: number;
  oppositionPosition: number;
  minerSupport: string;
  minerOpposition: string;
};

export type MinerSnapshot = {
  label: string;
  address: string;
  weight: number;
  totalShares: string;
  pricePerShare: string;
  callFee: string;
  walletShares?: string;
  walletWeightedPower?: string;
  selectedPosition?: number;
  delegate?: string;
};

export type GovernorProposal = {
  supportPosition: number;
  oppositionPosition: number;
  proposedGovernor: string;
  proposedAt: number;
  currentSupport: string;
  currentOpposition: string;
  highestSupport: string;
  invalidated: boolean;
  passedFirstStage: boolean;
};

export type GovernanceSnapshot = {
  blockNumber: number;
  blockHash: string;
  coverage: GovernanceCoverage;
  registryCounts: { treasury: number; consensus: number; upgrades: number };
  blockTimestamp: number;
  walletAddress: string | null;
  settings: {
    currentGovernor: string;
    votingCost: string;
    delaySeconds: number;
    rewardThreshold: string;
    depositFee: number;
    fundingRate: number;
    governorShare: number;
    referralBonus: number;
    rewardEventActive: boolean;
    rollBonuses: number[];
    pulseAllocation: number;
    maxNftAllocation: number;
    maxPulseAllocation: number;
    maxPulseTotalAllocation: number;
  };
  counts: Record<string, number>;
  history: ProposalHistory[];
  miners: MinerSnapshot[];
  walletCredit: string | null;
  totalLocked: string;
  senate: {
    count: number;
    minimum: number;
    maximum: number;
    majority: number;
    members: string[];
    memberVotes: string[][] | null;
    walletIsMember: boolean | null;
  };
  treasury: TreasuryRequest[];
  upgrades: GovernorProposal[];
  upgrade: {
    proposalCount: number;
    supportPosition: number;
    oppositionPosition: number;
    proposedGovernor: string;
    proposedAt: number;
    currentSupport: string;
    currentOpposition: string;
    highestSupport: string;
    invalidated: boolean;
    passedFirstStage: boolean;
    eligibleGovernor: string;
    activationPending: boolean;
    requestBlock: number;
    blockDelay: number;
  };
};

const toNumber = (value: unknown) => Number(value);
const tokens = (value: bigint) => formatEther(value);
const pct = (value: bigint) => Number(value) / 100;


function proposalStatus(valid: boolean, openedAt: number, delay: number, globalDelay: number, now: number) {
  if (!valid) return "Closed on-chain";
  if (now < openedAt + delay) return "Voting open — requested delay";
  if (now < openedAt + delay + globalDelay) return "Voting open — review window";
  return "Voting ended — execution not verified";
}

async function fetchGovernanceBase(onProgress: (message: string) => void = () => {}, signal?: AbortSignal, selectedAccount: string | null = null): Promise<GovernanceSnapshot> {
  onProgress("Reading contract configuration");
  const rpc = await getPublicProvider();
  const block = await rpc.getBlock("latest");
  const walletAddress = selectedAccount ? getAddress(selectedAccount) : null;
  if (!block?.hash) throw new Error("Unable to verify the snapshot block. Refresh to retry.");
  const blockNumber = block.number;
  const now = block.timestamp;
  const provider = snapshotRunner(rpc, blockNumber, signal);
  const token = new Contract(ADDRESSES.token, tokenAbi, provider);
  const deployedGovernor = getAddress(await token.governor());
  if (deployedGovernor !== getAddress(ADDRESSES.governor)) {
    throw new Error(`Governor changed to ${deployedGovernor}. Contract mappings must be reviewed before displaying governance state.`);
  }
  const chef = new Contract(await token.owner(), ["function governorFee() view returns (uint256)"], provider);
  const governorShare = await chef.governorFee();
  const governor = new Contract(ADDRESSES.governor, governorAbi, provider);
  const links = { basicContract: ADDRESSES.basic, farmContract: ADDRESSES.farms,
    fibonacceningContract: ADDRESSES.reward, consensusContract: ADDRESSES.consensus,
    creditContract: ADDRESSES.credit, senateContract: ADDRESSES.senate,
    masterchef: address(CORE_CONTRACTS, "inflation") };
  await Promise.all(Object.entries(links).map(async ([getter, expected]) => {
    if (getAddress(await governor[getter]()) !== getAddress(expected)) {
      throw new Error(`${getter} mapping changed; contract review required.`);
    }
  }));
  const senate = new Contract(ADDRESSES.senate, senateAbi, provider);
  const consensus = new Contract(ADDRESSES.consensus, consensusAbi, provider);
  const basic = new Contract(ADDRESSES.basic, basicAbi, provider);
  const farms = new Contract(ADDRESSES.farms, farmsAbi, provider);
  const reward = new Contract(ADDRESSES.reward, rewardAbi, provider);
  const credit = new Contract(ADDRESSES.credit, creditAbi, provider);

  const [
    currentGovernor, costToVote, delayBeforeEnforce, thresholdFibonaccening,
    depositFee, fundingRate, referralBonus, rewardEventActive, rollBonuses,
    basicLengths, farmLengths, rewardLength, pulseAllocation, maxNftAllocation,
    maxPulseAllocation, maxPulseTotalAllocation, senatorCount, minSenators,
    maxSenators, members, consensusLengths, governorCount, totalLocked,
    eligibleGovernor, activationPending, requestBlock, blockDelay, walletCredit,
  ] = await Promise.all([
    token.governor(), governor.costToVote(), governor.delayBeforeEnforce(), governor.thresholdFibonaccening(),
    governor.depositFee(), governor.fundingRate(), governor.referralBonus(), governor.eventFibonacceningActive(),
    Promise.all(TIME_MINER_CONTRACTS.map((miner) => governor.getRollBonus(miner.address))),
    basic.proposalLengths(), farms.proposalLengths(), reward.proposalLengths(),
    farms.percentageAllocatedToPulseEcosystem(), farms.maxNftAllocation(),
    farms.maxPulseEcoAllocation(), farms.maxPulseEcoTotalAllocation(),
    senate.senatorCount(), senate.minSenators(), senate.maxSenators(), senate.viewSenators(),
    consensus.proposalLengths(), consensus.governorCount(), consensus.totalDTXStaked(),
    governor.eligibleNewGovernor(), governor.changeGovernorActivated(), governor.newGovernorRequestBlock(),
    governor.newGovernorBlockDelay(), walletAddress ? credit.userCredit(walletAddress) : Promise.resolve(null),
  ]);

  const globalDelay = toNumber(delayBeforeEnforce);
  const basicCounts = Array.from(basicLengths, toNumber);
  const farmCounts = Array.from(farmLengths, toNumber);
  const rewardCount = toNumber(rewardLength);
  const minerWeights = [20, 30, 50, 75, 115, 150];
  const miners = await Promise.all(TIME_MINER_CONTRACTS.map(async (record, index) => {
    const miner = new Contract(record.address, minerAbi, provider);
    const [totalShares, price, callFee, walletShares, selectedPosition, delegate] = await Promise.all([
      miner.totalShares(), miner.getPricePerFullShare(), miner.callFee(),
      walletAddress ? miner.getUserTotalShares(walletAddress) : Promise.resolve(null),
      walletAddress ? miner.userVote(walletAddress) : Promise.resolve(null),
      walletAddress ? miner.userDelegate(walletAddress) : Promise.resolve(null),
    ]);
    const weighted = walletShares === null
      ? null
      : (BigInt(walletShares.toString()) * BigInt(price.toString()) * BigInt(minerWeights[index])) / (100n * 10n ** 18n);
    return {
      label: record.label,
      address: record.address,
      weight: minerWeights[index],
      totalShares: tokens(totalShares),
      pricePerShare: tokens(price),
      callFee: pct(callFee).toString(),
      walletShares: walletShares === null ? undefined : tokens(walletShares),
      walletWeightedPower: weighted === null ? undefined : tokens(weighted),
      selectedPosition: selectedPosition === null ? undefined : toNumber(selectedPosition),
      delegate: delegate === null ? undefined : getAddress(delegate),
    };
  }));

  const memberAddresses = (members as string[]).map(getAddress);
  let memberVotes: string[][] | null = [];
  if (memberAddresses.length) {
    try {
      const senateData = await senate.multiCall();
      memberVotes = decodeSenateBallots(memberAddresses, senateData[0], senateData[1]);
    } catch {
      memberVotes = null;
    }
  }

  const walletIsMember = walletAddress ? Boolean(await senate.isSenator(walletAddress)) : null;
  onProgress("Verifying the completed governance snapshot");
  const confirmedBlock = await rpc.getBlock(blockNumber);
  if (!confirmedBlock || confirmedBlock.hash !== block.hash) {
    throw new Error("Snapshot block changed during loading. Refresh to read a consistent snapshot.");
  }

  return {
    blockNumber,
    blockHash: block.hash,
    coverage: { ordinary: [], treasury: false, upgrades: false },
    registryCounts: { treasury: toNumber(consensusLengths[0]), consensus: toNumber(consensusLengths[1]), upgrades: toNumber(governorCount) },
    blockTimestamp: now,
    walletAddress,
    settings: {
      currentGovernor: getAddress(currentGovernor),
      votingCost: tokens(costToVote),
      delaySeconds: globalDelay,
      rewardThreshold: tokens(thresholdFibonaccening),
      depositFee: pct(depositFee),
      fundingRate: Number(formatUnits(fundingRate, 4)),
      governorShare: pct(governorShare),
      referralBonus: pct(referralBonus),
      rewardEventActive: Boolean(rewardEventActive),
      rollBonuses: rollBonuses.map((value: bigint) => pct(value)),
      pulseAllocation: pct(pulseAllocation),
      maxNftAllocation: pct(maxNftAllocation),
      maxPulseAllocation: pct(maxPulseAllocation),
      maxPulseTotalAllocation: pct(maxPulseTotalAllocation),
    },
    counts: {
      "Voting cost": basicCounts[0], "New pool": basicCounts[1], "Enforcement delay": basicCounts[2],
      "Harvest call fee": basicCounts[3], "Rollover bonus": basicCounts[4], "Reward-event threshold": basicCounts[5],
      "Pool allocation": farmCounts[0], "Vault setting": farmCounts[1],
      "Governor transfer or burn": farmCounts[2], "Governor tax": farmCounts[3], "Reward boost": rewardCount,
    },
    history: [],
    miners,
    walletCredit: walletCredit === null ? null : tokens(walletCredit),
    totalLocked: tokens(totalLocked),
    senate: {
      count: toNumber(senatorCount), minimum: toNumber(minSenators), maximum: toNumber(maxSenators),
      majority: Math.floor(toNumber(senatorCount) / 2) + 1, members: memberAddresses, memberVotes,
      walletIsMember,
    },
    treasury: [],
    upgrades: [],
    upgrade: {
      supportPosition: 0, oppositionPosition: 0, proposedGovernor: ZeroAddress, proposedAt: 0,
      currentSupport: "0", currentOpposition: "0", highestSupport: "0", invalidated: false, passedFirstStage: false,
      proposalCount: toNumber(governorCount),
      eligibleGovernor: getAddress(eligibleGovernor), activationPending: Boolean(activationPending),
      requestBlock: toNumber(requestBlock), blockDelay: toNumber(blockDelay),
    },
  };
}


async function fetchGovernanceSection(scope: GovernanceReadScope, base: GovernanceSnapshot, onProgress: (message: string) => void, signal?: AbortSignal): Promise<GovernanceSnapshot> {
  if (scope === "base") return base;
  const rpc = await getPublicProvider();
  const provider = snapshotRunner(rpc, base.blockNumber, signal);
  const consensus = new Contract(ADDRESSES.consensus, consensusAbi, provider);
  const basic = new Contract(ADDRESSES.basic, basicAbi, provider);
  const farms = new Contract(ADDRESSES.farms, farmsAbi, provider);
  const reward = new Contract(ADDRESSES.reward, rewardAbi, provider);
  const globalDelay = base.settings.delaySeconds;
  const now = base.blockTimestamp;
  const sections = await readGovernanceSections<ProposalHistory, TreasuryRequest, GovernorProposal>(scope, {
    ordinary: async selectedFamily => {
      const history: ProposalHistory[] = [];

      const addStandard = async (
        family: string,
        count: number,
        getter: (id: number) => Promise<unknown>,
        change: (row: any) => string,
        layout = { opened: 1, support: 2, opposition: 3, delay: 4 },
      ) => {
        if (family !== selectedFamily) return;
        const rows = await Promise.all(allProposalIds(count).map(async (id) => ({ id, row: await getter(id) as any })));
        rows.forEach(({ id, row }) => {
          const openedAt = toNumber(row[layout.opened]);
          const delay = toNumber(row[layout.delay]);
          history.push({
            key: `${family}-${id}`,
            family,
            reference: `${family} proposal ${id}`,
            change: change(row),
            valid: Boolean(row[0]),
            openedAt,
            votingDeadline: openedAt + delay + globalDelay,
            support: tokens(row[layout.support]),
            opposition: tokens(row[layout.opposition]),
            status: proposalStatus(Boolean(row[0]), openedAt, delay, globalDelay, now),
          });
        });
      };

      onProgress(`Reading ${selectedFamily.toLowerCase()} proposals`);
      await Promise.all([
        addStandard("Voting cost", base.counts["Voting cost"], (id) => basic.minDepositProposals(id), (r) => `Set minimum voting cost to ${tokens(r[5])} OINK`),
        addStandard("New pool", base.counts["New pool"], (id) => basic.newPoolProposal(id), (r) => `Add pool contract ${getAddress(r[5])}`),
        addStandard("Enforcement delay", base.counts["Enforcement delay"], (id) => basic.delayProposals(id), (r) => `Set global enforcement delay to ${toNumber(r[5])} seconds`),
        addStandard("Harvest call fee", base.counts["Harvest call fee"], (id) => basic.callFeeProposal(id), (r) => `Set miner call fee to ${pct(r[5])}%`),
        addStandard("Rollover bonus", base.counts["Rollover bonus"], (id) => basic.rolloverBonuses(id), (r) => `Set ${getAddress(r[5])} rollover bonus to ${pct(r[6])}%`),
        addStandard("Reward-event threshold", base.counts["Reward-event threshold"], (id) => basic.minThresholdFibonacceningProposal(id), (r) => `Set reward-event threshold to ${tokens(r[5])} OINK`),
        addStandard("Pool allocation", base.counts["Pool allocation"], (id) => farms.proposalFarmUpdate(id), (r) => `Set pool ${toNumber(r[1])} allocation to ${pct(r[2])}%`, { opened: 6, support: 3, opposition: 4, delay: 5 }),
        addStandard("Vault setting", base.counts["Vault setting"], (id) => farms.vaultProposals(id), (r) => toNumber(r[2]) === 1 ? `Set vault funding rate to ${formatUnits(r[3], 4)}% per hour` : toNumber(r[2]) === 0 ? `Set vault deposit fee to ${pct(r[3])}%` : toNumber(r[2]) === 2 ? `Set vault referral bonus to ${pct(r[3])}%` : `Unknown vault field ${r[2]}: raw value ${r[3]}`, { opened: 1, support: 4, opposition: 5, delay: 6 }),
        addStandard("Governor transfer or burn", base.counts["Governor transfer or burn"], (id) => farms.governorTransferProposals(id), (r) => `${r[6] ? "Burn" : "Transfer to treasury"} ${tokens(r[2])} OINK`, { opened: 1, support: 3, opposition: 4, delay: 5 }),
        addStandard("Governor tax", base.counts["Governor tax"], (id) => farms.govTaxProposals(id), (r) => `Set Governor inflation share to ${pct(r[2])}%`, { opened: 1, support: 3, opposition: 4, delay: 5 }),
        addStandard("Reward boost", base.counts["Reward boost"], (id) => reward.fibonacceningProposals(id), (r) => `Schedule ${tokens(r[5])} OINK per block for ${toNumber(r[6])} blocks`),
      ]);

      history.sort((a, b) => b.openedAt - a.openedAt);

      return history;
    },
    treasury: async () => {
      const treasuryCount = base.registryCounts.treasury;
      const metadataCache = new Map<string, Promise<{ decimals: number; symbol: string } | null>>();
      const tokenMetadata = (tokenAddress: string) => {
        const checksum = getAddress(tokenAddress);
        const cached = metadataCache.get(checksum);
        if (cached) return cached;
        const pending = (async () => {
          try {
            const erc20 = new Contract(checksum, erc20Abi, provider);
            const [decimals, symbol] = await Promise.all([erc20.decimals(), erc20.symbol()]);
            return { decimals: toNumber(decimals), symbol: String(symbol) };
          } catch {
            return null;
          }
        })();
        metadataCache.set(checksum, pending);
        return pending;
      };
      onProgress(`Scanning all ${treasuryCount} treasury requests and their voting power`);
      let treasuryLoaded = 0;
      const treasury = await Promise.all(allProposalIds(treasuryCount).map(async (id) => {
        const row = await consensus.treasuryProposal(id);
        const supportPosition = toNumber(row[8]);
        const tokenAddress = getAddress(row[5]);
        const [minerSupport, minerOpposition, metadata] = await Promise.all([
          consensus.tokensCastedPerVote(supportPosition), consensus.tokensCastedPerVote(supportPosition + 1), tokenMetadata(tokenAddress),
        ]);
        treasuryLoaded++;
        onProgress(`Read ${treasuryLoaded} of ${treasuryCount} treasury requests and their voting power`);
        const openedAt = toNumber(row[1]);
        const requestedDelay = toNumber(row[4]);
        return {
          id,
          valid: Boolean(row[0]),
          openedAt,
          votingDeadline: openedAt + requestedDelay + globalDelay,
          finalizationAfter: openedAt + requestedDelay + (globalDelay * 2),
          token: tokenAddress,
          beneficiary: getAddress(row[6]),
          amountRaw: row[7].toString(),
          amount: metadata ? formatUnits(row[7], metadata.decimals) : null,
          assetSymbol: metadata?.symbol ?? null,
          creditSupport: tokens(row[2]),
          creditOpposition: tokens(row[3]),
          supportPosition,
          oppositionPosition: supportPosition + 1,
          minerSupport: tokens(minerSupport),
          minerOpposition: tokens(minerOpposition),
        };
      }));

      return treasury;
    },
    upgrades: async () => {
      onProgress("Discovering Governor proposals from the consensus registry");
      const consensusCount = base.registryCounts.consensus;
      const positions = allProposalIds(consensusCount).filter((id) => id > 0 && id % 2 === 1);
      const candidates = await Promise.all(positions.map(async (id) => ({ id, row: await consensus.consensusProposal(id) })));
      const upgrades: GovernorProposal[] = await Promise.all(candidates.filter(({ row }) => toNumber(row[0]) === 0).map(async ({ id, row }) => {
        const pair = await consensus.consensusProposal(id + 1);
        if (toNumber(pair[0]) !== 0 || getAddress(pair[1]) !== getAddress(row[1]) || pair[2] !== row[2]) {
          throw new Error("Governor proposal pair mismatch; discovery is incomplete.");
        }
        const candidate = getAddress(row[1]);
        const [support, opposition, highest, invalidation] = await Promise.all([
          consensus.tokensCastedPerVote(id), consensus.tokensCastedPerVote(id + 1),
          consensus.highestConsensusVotes(id), consensus.isGovInvalidated(candidate),
        ]);
        return { supportPosition: id, oppositionPosition: id + 1, proposedGovernor: candidate,
          proposedAt: toNumber(row[2]), currentSupport: tokens(support), currentOpposition: tokens(opposition),
          highestSupport: tokens(highest), invalidated: Boolean(invalidation[0]), passedFirstStage: Boolean(invalidation[1]) };
      }));
      if (upgrades.length !== base.registryCounts.upgrades) throw new Error("Governor proposal count mismatch; discovery is incomplete.");
      return upgrades;
    },
  });
  signal?.throwIfAborted();
  if ((await rpc.getBlock(base.blockNumber))?.hash !== base.blockHash) throw new Error("Snapshot block changed during loading. Refresh to read a consistent snapshot.");
  const selected = sections.upgrades.find(row => base.upgrade.activationPending && row.proposedGovernor === base.upgrade.eligibleGovernor)
    ?? sections.upgrades.find(row => !row.invalidated) ?? sections.upgrades[0];
  return { ...base, ...sections, upgrade: { ...base.upgrade, ...selected } };
}

export const isZeroAddress = (value: string) => value === ZeroAddress;

const governanceKey = (account:string | null, scope: GovernanceReadScope) => "369:governance:" + (account ? getAddress(account).toLowerCase() : "public") + ":" + scope;
export function peekGovernanceSnapshot(account:string | null, scope: GovernanceReadScope = "all") { return sharedDisplayReads.peek<GovernanceSnapshot>(governanceKey(account, scope)); }
export function loadGovernanceSnapshot(onProgress:(message:string) => void = () => {},signal?:AbortSignal,selectedAccount:string | null = null, scope: GovernanceReadScope = "all"): Promise<GovernanceSnapshot> {
  const loadBase = () => sharedDisplayReads.read(governanceKey(selectedAccount, "base"),child => fetchGovernanceBase(onProgress,child,selectedAccount),{signal,ttl:30000,timeout:45000});
  if (scope === "base") return loadBase();
  return sharedDisplayReads.read(governanceKey(selectedAccount, scope),async child => {
    const base = await loadGovernanceSnapshot(onProgress,child,selectedAccount,"base");
    return fetchGovernanceSection(scope,base,onProgress,child);
  },{signal,ttl:60000,timeout:120000});
}
