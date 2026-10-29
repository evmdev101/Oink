import { Contract, formatEther, getAddress, type ContractRunner } from "ethers";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { verifyRuntime } from "./farmTransactions";
import { getPublicProvider } from "./chain";
export type MinerYield = { dailyPool:string; apr:string|null; poolBalance:string; totalShares:string; timestamp:number };
export async function readMinerYield(id:string,runner:ContractRunner,rpc:Awaited<ReturnType<typeof getPublicProvider>>,block:number,timestamp:number):Promise<MinerYield> {
  const spec=MINER_PREVIEW_SPECS.find(v=>v.id===id)!;const core=VERIFIED_FARM_WRITES[0];
  await Promise.all([[spec.address,spec.runtimeCodeHash],[core.masterchef,core.masterchefRuntimeCodeHash]].map(async ([address,hash])=>verifyRuntime(await rpc.getCode(address,block),hash,"Miner yield dependency")));
  const miner=new Contract(spec.address,["function masterchef() view returns(address)","function poolID() view returns(uint256)","function balanceOf() view returns(uint256)","function totalShares() view returns(uint256)"],runner);
  const chef=new Contract(core.masterchef,["function DTXPerBlock() view returns(uint256)","function totalAllocPoint() view returns(uint256)","function poolInfo(uint256) view returns(uint256,uint256,address)","function startBlock() view returns(uint256)"],runner);
  const [master,pid,balance,emission,total,pool,start,earlier,shares]=await Promise.all([miner.masterchef(),miner.poolID(),miner.balanceOf(),chef.DTXPerBlock(),chef.totalAllocPoint(),chef.poolInfo(spec.poolId),chef.startBlock(),rpc.getBlock(Math.max(0,block-100)),miner.totalShares()]);
  if(getAddress(master)!==getAddress(core.masterchef)||pid!==BigInt(spec.poolId)||getAddress(pool[2])!==getAddress(spec.address)||total<=0n||pool[0]>total||BigInt(block)<=start||!earlier||timestamp<=earlier.timestamp)throw Error("Miner emission estimate unavailable.");
  const daily=BigInt(emission)*BigInt(pool[0])*86400n*BigInt(block-earlier.number)/(BigInt(total)*BigInt(timestamp-earlier.timestamp));
  return {dailyPool:formatEther(daily),apr:balance>0n?(Number(daily*365n*10000n/BigInt(balance))/100).toFixed(2):null,poolBalance:formatEther(balance),totalShares:formatEther(shares),timestamp};
}
export function estimateMinerValue(gross:bigint,shares:bigint,total:bigint,daily:bigint,elapsed:number) {
  if(total<=0n||shares<0n||shares>total||daily<0n||!Number.isFinite(elapsed))return gross;
  return gross+daily*shares*BigInt(Math.max(0,Math.min(60,Math.floor(elapsed))))/total/86400n;
}
