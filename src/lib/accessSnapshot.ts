import { Interface, ZeroAddress, getAddress, toQuantity } from "ethers";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";
export const accessAbi = new Interface([
  "function owner() view returns(address)", "function governor() view returns(address)", "function token() view returns(address)", "function XPD() view returns(address)",
  "function masterchef() view returns(address)", "function dtx() view returns(address)", "function feeAddress() view returns(address)", "function treasury() view returns(address)",
  "function treasuryWallet() view returns(address)", "function poolID() view returns(uint256)", "function poolInfo(uint256) view returns(uint256,uint256,address)",
  "function credit(address) view returns(uint256)", "function pendingDtx(uint256) view returns(uint256)", "function defaultDirectPayout() view returns(uint256)",
  "function viewPoolPayout(address) view returns(uint256)", "function viewPoolMinServe(address) view returns(uint256)", "function admin() view returns(address)",
  "function migrationPool() view returns(address)", "function withdrawFeePeriod() view returns(uint256)", "function minimumGift() view returns(uint256)",
]);
export function sameAccessAddress(actual: string, expected: string, label: string) { if (getAddress(actual) !== getAddress(expected)) throw Error(label + " changed. Refresh or use the original interface."); }
export async function accessSnapshot(rpc: FarmReadRpc, blockNumber?: number) {
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("This feature requires PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", [blockNumber == null ? "latest" : toQuantity(blockNumber), false]);
  if (!block?.hash || !block?.number || !block?.timestamp) throw Error("Block snapshot unavailable.");
  const number = Number(BigInt(block.number)), timestamp = Number(BigInt(block.timestamp));
  if (!Number.isSafeInteger(number) || !Number.isSafeInteger(timestamp)) throw Error("Invalid block snapshot.");
  if (blockNumber == null && (Date.now() - timestamp * 1000 > 120000 || timestamp * 1000 > Date.now() + 30000)) throw Error("Data is stale. Refresh to try again.");
  const read = async (to: string, method: string, args: unknown[] = [], abi = accessAbi) => abi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, block.number]));
  const runtime = async (address: string, hash: string) => verifyRuntime(await rpc.send("eth_getCode", [address, block.number]), hash, "Contract");
  const finish = async () => { if ((await rpc.send("eth_getBlockByNumber", [block.number, false]))?.hash !== block.hash) throw Error("Block changed while reading. Refresh to try again."); };
  return { block: number, blockHash: block.hash as string, tag: block.number as string, timestamp, read, runtime, finish };
}
export type AccessSnapshot = Awaited<ReturnType<typeof accessSnapshot>>;
export async function verifyAccessCore(s: AccessSnapshot) {
  const c = VERIFIED_FARM_WRITES[0];
  await Promise.all([[c.masterchef,c.masterchefRuntimeCodeHash],[c.governor,c.governorRuntimeCodeHash],[c.rewardToken,c.rewardTokenRuntimeCodeHash]].map(([address,hash])=>s.runtime(address,hash)));
  await Promise.all([[c.masterchef,"owner",c.governor],[c.masterchef,"feeAddress",c.governor],[c.masterchef,"dtx",c.rewardToken],[c.rewardToken,"owner",c.masterchef],[c.rewardToken,"governor",c.governor],[c.governor,"masterchef",c.masterchef],[c.governor,"treasuryWallet",c.treasuryWallet]].map(async ([address,method,expected])=>sameAccessAddress((await s.read(address,method))[0],expected,method)));
  return c;
}
export async function verifyAccessMiner(s: AccessSnapshot, id: string) {
  const target = MINER_PREVIEW_SPECS.find(v=>v.id===id), c = VERIFIED_FARM_WRITES[0];
  if (!target) throw Error("Select a supported reward destination.");
  await s.runtime(target.address,target.runtimeCodeHash);
  await Promise.all([["token",c.rewardToken],["masterchef",c.masterchef],["treasury",c.governor],["admin",c.governor],["migrationPool",ZeroAddress]].map(async ([method,expected])=>sameAccessAddress((await s.read(target.address,method))[0],expected,"Destination "+method)));
  if ((await s.read(target.address,"poolID"))[0]!==BigInt(target.poolId) || (await s.read(target.address,"withdrawFeePeriod"))[0]!==BigInt(target.durationDays)*86400n) throw Error("Destination duration or pool changed.");
  sameAccessAddress((await s.read(c.masterchef,"poolInfo",[target.poolId]))[2],target.address,"Destination pool");
  return target;
}
