import { Interface } from "ethers";
import { ORDINARY_DEPLOYMENTS } from "../config/ordinaryGovernanceVerification";
import type { FarmReadRpc } from "./farmTransactions";
import { accessSnapshot,sameAccessAddress,verifyAccessCore } from "./accessSnapshot";
import { readCommunityActionAvailability } from "./communityMaintenanceActions";
const abi=new Interface([
  "function lastHarvestedTime() view returns(uint256)","function eventFibonacceningActive() view returns(bool)","function fibonacceningContract() view returns(address)","function farmContract() view returns(address)",
  "function percentageAllocatedToPulseEcosystem() view returns(uint256)","function maxPulseEcoTotalAllocation() view returns(uint256)","function lastReducePulseAllocation() view returns(uint256)",
  "function fibonacceningActiveID() view returns(uint256)","function fibonacceningActivatedBlock() view returns(uint256)","function fibonacceningProposals(uint256) view returns(bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
]);
export async function readMaintenanceStatus(rpc:FarmReadRpc){
  const s=await accessSnapshot(rpc),common=await verifyAccessCore(s),farm=ORDINARY_DEPLOYMENTS.farms,reward=ORDINARY_DEPLOYMENTS.reward;
  await Promise.all([s.runtime(farm.address,farm.runtimeCodeHash),s.runtime(reward.address,reward.runtimeCodeHash)]);
  sameAccessAddress((await s.read(common.governor,"farmContract",[],abi))[0],farm.address,"Allocation module");
  sameAccessAddress((await s.read(common.governor,"fibonacceningContract",[],abi))[0],reward.address,"Reward event module");
  const [lastHarvest,active,allocation,maximum,lastReduction]=await Promise.all([s.read(common.governor,"lastHarvestedTime",[],abi),s.read(common.governor,"eventFibonacceningActive",[],abi),s.read(farm.address,"percentageAllocatedToPulseEcosystem",[],abi),s.read(farm.address,"maxPulseEcoTotalAllocation",[],abi),s.read(farm.address,"lastReducePulseAllocation",[],abi)]);
  if(allocation[0]>10000n||maximum[0]>10000n)throw Error("Allocation settings require a new review.");
  let eventId:string|null=null,eventEndBlock:string|null=null,eventReady=false;
  if(active[0]){const [id,activated]=await Promise.all([s.read(reward.address,"fibonacceningActiveID",[],abi),s.read(reward.address,"fibonacceningActivatedBlock",[],abi)]);const details=await s.read(reward.address,"fibonacceningProposals",[id[0]],abi);eventId=id[0].toString();eventEndBlock=(activated[0]+details[6]).toString();eventReady=activated[0]>0n&&BigInt(s.block)>=BigInt(eventEndBlock!);}
  const base={block:s.block,timestamp:s.timestamp,lastHarvest:Number(lastHarvest[0]),allocation:allocation[0].toString(),maximum:maximum[0].toString(),rebalanceNeeded:allocation[0]>maximum[0],nextReduction:Number(lastReduction[0])+7*86400,reductionReady:maximum[0]>0n&&BigInt(s.timestamp)>=lastReduction[0]+7n*86400n,eventId,eventEndBlock,eventReady};
  const availability=await readCommunityActionAvailability(rpc,s,base);await s.finish();return{...base,...availability};
}
