import { Interface, getAddress, keccak256, ZeroAddress, toBeHex } from "ethers";
import { NFT_ALLOCATION, NFT_ALLOCATION_ABI } from "../config/nftGovernanceVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import type { ParticipationSnapshot } from "./participationTransactions";

export const nftAllocationAbi = new Interface(NFT_ALLOCATION_ABI);
export const nftReadAbi = new Interface([
  "function nftAllocationContract() view returns(address)", "function nftAllocation(address,uint256) view returns(uint256)",
  "function tokensCastedPerVote(uint256) view returns(uint256)", "function totalDTXStaked() view returns(uint256)",
  "function costToVote() view returns(uint256)", "function deductingContract(address) view returns(bool)",
]);
const common = VERIFIED_FARM_WRITES[0], {credit, consensus} = PARTICIPATION_CONTRACTS;
/** Address-derived ballot IDs must never pass through Number or consensus array indices. */
export function allocationPositions(input: string) {
  const candidate = getAddress(input);
  if (candidate === ZeroAddress) throw Error("Enter a nonzero allocation contract.");
  return { candidate, support: BigInt(candidate), opposition: BigInt(candidate) + 1n, predecessor: getAddress(toBeHex(BigInt(candidate) - 1n, 20)) };
}
export async function readNftAllocation(rpc: FarmReadRpc, s: ParticipationSnapshot, input: string, rejecting = false) {
  const positions = allocationPositions(input), to = NFT_ALLOCATION.address;
  verifyRuntime(await rpc.send("eth_getCode", [to, s.block.number]), NFT_ALLOCATION.runtimeCodeHash, "NFT allocation governance");
  const read = (target: string, method: string, args: unknown[] = []) => s.read(target, method, args, target === to && nftAllocationAbi.hasFunction(method) ? nftAllocationAbi : nftReadAbi.hasFunction(method) ? nftReadAbi : undefined);
  const wires = [[to,"token",common.rewardToken],[to,"owner",common.governor],[to,"creditContract",credit.address],[common.governor,"nftAllocationContract",to]];
  await Promise.all(wires.map(async([target,method,expected]) => { if(getAddress((await read(target,method))[0]) !== getAddress(expected)) throw Error("NFT allocation wiring changed."); }));
  const code = await rpc.send("eth_getCode", [positions.candidate,s.block.number]);
  if (!rejecting && (!code || code === "0x")) throw Error("The candidate must be a deployed allocation contract.");
  // This is the same read-only compatibility probe used by notifyVote, not an audit.
  if (!rejecting) await read(positions.candidate,"nftAllocation",[to,0n]);
  const [pending, predecessor, approved, approveThreshold, rejectThreshold, rejectionPeriod, yes, no, total] = await Promise.all([
    read(to,"pendingContract",[positions.candidate]), read(to,"pendingContract",[positions.predecessor]),
    read(to,"allocationContract",[positions.candidate]),read(to,"approveThreshold"),read(to,"rejectThreshold"),read(to,"rejectionPeriod"),
    read(consensus.address,"tokensCastedPerVote",[positions.support]),read(consensus.address,"tokensCastedPerVote",[positions.opposition]),read(consensus.address,"totalDTXStaked"),
  ]);
  return {...positions,codeHash:keccak256(code),pending:Array.from(pending) as [boolean,bigint,bigint],predecessorPending:Boolean(predecessor[0]),approved:Boolean(approved[0]),approveThreshold:BigInt(approveThreshold[0]),rejectThreshold:BigInt(rejectThreshold[0]),rejectionPeriod:BigInt(rejectionPeriod[0]),yes:BigInt(yes[0]),no:BigInt(no[0]),total:BigInt(total[0])};
}
