import { Contract, formatEther, formatUnits, getAddress } from "ethers";
import { CORE_CONTRACTS, GOVERNANCE_CONTRACTS, OINK_TOKEN } from "../config/contracts";
import { getPublicProvider } from "./chain";
import { snapshotRunner } from "./governanceReadSafety";
import { sharedDisplayReads } from "./sharedReadCache.ts";

export type GovernanceSummary = { timestamp:number; votingCost:string; delaySeconds:number; rewardThreshold:string; pulseAllocation:number; fundingRate:number };
export const peekGovernanceSummary = () => sharedDisplayReads.peek<GovernanceSummary>("369:governance-summary");
export function readGovernanceSummary(signal?:AbortSignal) {
  return sharedDisplayReads.read("369:governance-summary",async child => {
    const rpc = await getPublicProvider();
    if (BigInt(await rpc.send("eth_chainId",[])) !== 369n) throw Error("PulseChain required");
    const block = await rpc.getBlock("latest");
    if (!block?.hash) throw Error("Block unavailable");
    const runner = snapshotRunner(rpc,block.number,child);
    const govAddress = CORE_CONTRACTS.find(row => row.id === "governor")!.address;
    const farmAddress = GOVERNANCE_CONTRACTS.find(row => row.id === "allocation-settings")!.address;
    const token = new Contract(OINK_TOKEN,["function governor() view returns(address)"],runner);
    const governor = new Contract(govAddress,["function farmContract() view returns(address)","function costToVote() view returns(uint256)","function delayBeforeEnforce() view returns(uint256)","function thresholdFibonaccening() view returns(uint256)","function fundingRate() view returns(uint256)"],runner);
    const farms = new Contract(farmAddress,["function percentageAllocatedToPulseEcosystem() view returns(uint256)"],runner);
    const [mappedGov,mappedFarm,cost,delay,threshold,allocation,funding] = await Promise.all([token.governor(),governor.farmContract(),governor.costToVote(),governor.delayBeforeEnforce(),governor.thresholdFibonaccening(),farms.percentageAllocatedToPulseEcosystem(),governor.fundingRate()]);
    if (getAddress(mappedGov) !== getAddress(govAddress) || getAddress(mappedFarm) !== getAddress(farmAddress)) throw Error("Governance mapping changed");
    if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw Error("Block changed");
    child.throwIfAborted();
    return {timestamp:block.timestamp,votingCost:formatEther(cost),delaySeconds:Number(delay),rewardThreshold:formatEther(threshold),pulseAllocation:Number(formatUnits(allocation,2)),fundingRate:Number(formatUnits(funding,4))};
  },{signal,timeout:30000});
}
