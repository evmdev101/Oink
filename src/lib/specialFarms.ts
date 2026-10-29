import { Contract, formatEther, formatUnits, getAddress, keccak256, type ContractRunner } from "ethers";
import { SPECIAL_FARM_READS } from "../config/specialFarmVerification";
import { FARM_READ_CHEF } from "../config/farmReadVerification";
import { readFarmYield, type FarmYield } from "./farmYield";
import type { getPublicProvider } from "./chain";

export type SpecialFarmData = {
  kind: "t-share" | "treasury"; pool: string; treasury: string; rewardCredit: string;
  yieldEstimate: FarmYield | null; totalShares: string | null; registeredPoolShares: string | null;
  registeredShares: string | null; pending: string | null; lastAction: number | null;
  safePeriod: number | null; maxStakes: string | null; accountError: string | null;
};
const SEED_SHARES = 100000000n;
export function tShareAmounts(total: bigint, registered?: bigint) {
  if(total < SEED_SHARES || (registered != null && (registered < 0n || registered > total-SEED_SHARES))) throw Error("Invalid registered HEX shares.");
  return { totalShares:formatUnits(total,12), registeredPoolShares:formatUnits(total-SEED_SHARES,12), registeredShares:registered==null?null:formatUnits(registered,12) };
}
export function tShareWalletSnapshot(total: bigint, info: readonly bigint[], timestamp: number) {
  if(info.length !== 4 || info[1] !== total || info[2] < 0n || info[3] < 0n || info[3] > BigInt(timestamp)) throw Error("Inconsistent T-Share snapshot.");
  return {...tShareAmounts(total,info[0]),pending:formatEther(info[2]),lastAction:Number(info[3])};
}
export async function readSpecialFarm(id: string, runner: ContractRunner, rpc: Awaited<ReturnType<typeof getPublicProvider>>, block: number, timestamp: number, account: string | null): Promise<SpecialFarmData> {
  const spec=SPECIAL_FARM_READS.find(s=>s.id===id);
  if(!spec)throw Error("Unknown special farm.");
  if(BigInt(await rpc.send("eth_chainId",[]))!==369n || keccak256(await rpc.getCode(spec.address,block))!==spec.runtimeCodeHash)throw Error("Special farm runtime or chain changed.");
  const c=new Contract(spec.address,["function treasury() view returns(address)","function masterchef() view returns(address)","function poolID() view returns(uint256)","function publicBalanceOf() view returns(uint256)","function hexC() view returns(address)","function token() view returns(address)","function totalTshares() view returns(uint256)","function safePeriod() view returns(uint256)","function maxStakes() view returns(uint256)","function multiCall(address) view returns(uint256,uint256,uint256,uint256)"],runner);
  const [master,pool,treasury,rewards,yieldEstimate]=await Promise.all([c.masterchef(),c.poolID(),c.treasury(),c.publicBalanceOf(),readFarmYield(id,runner,rpc,block,timestamp)]);
  if(getAddress(master)!==getAddress(FARM_READ_CHEF.address)||String(pool)!==spec.poolId||!yieldEstimate)throw Error("Special farm reward wiring is unavailable or changed.");
  if(id==="treasury" && getAddress(treasury)!==getAddress(spec.treasury))throw Error("Treasury destination changed.");
  const result:SpecialFarmData={kind:spec.id,pool:String(pool),treasury:getAddress(treasury),rewardCredit:formatEther(rewards),yieldEstimate,totalShares:null,registeredPoolShares:null,registeredShares:null,pending:null,lastAction:null,safePeriod:null,maxStakes:null,accountError:null};
  if(id==="treasury")return result;
  const [hex,token,total,safePeriod,maxStakes]=await Promise.all([c.hexC(),c.token(),c.totalTshares(),c.safePeriod(),c.maxStakes()]);
  if(getAddress(hex)!==getAddress(spec.tokenAddress!)||getAddress(token)!==getAddress(FARM_READ_CHEF.rewardToken))throw Error("HEX or OINK token wiring changed.");
  Object.assign(result,tShareAmounts(total),{safePeriod:Number(safePeriod),maxStakes:String(maxStakes)});
  if(!Number.isSafeInteger(result.safePeriod))throw Error("Invalid safe period.");
  if(account)try {
    const info=await c.multiCall(getAddress(account));
    Object.assign(result,tShareWalletSnapshot(total,info,timestamp));
  } catch { result.accountError="Registered shares and rewards could not be read for this wallet."; }
  return result;
}
