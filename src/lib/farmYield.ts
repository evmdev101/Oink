import { Contract, formatEther, getAddress, keccak256, type ContractRunner } from "ethers";
import { FARM_READ_CHEF, VERIFIED_FARM_READS } from "../config/farmReadVerification";
import { getPublicProvider } from "./chain";
import { SPECIAL_FARM_READS } from "../config/specialFarmVerification";

export type FarmYield = { dailyPool: string; directBps: string; secondsPerBlock: number; allocation: string };
export type FarmYieldSpec = { address: string; runtimeCodeHash: string; poolId: string };
const CHEF_ABI = ["function DTXPerBlock() view returns(uint256)", "function totalAllocPoint() view returns(uint256)", "function poolInfo(uint256) view returns(uint256,uint256,address)", "function startBlock() view returns(uint256)", "function dtx() view returns(address)"];
type YieldContext = { earlier: { number: number; timestamp: number }; emission: bigint; total: bigint; start: bigint; token: string } | null;
const contexts = new WeakMap<ContractRunner, Map<number, Promise<YieldContext>>>();

function readYieldContext(runner: ContractRunner, rpc: Awaited<ReturnType<typeof getPublicProvider>>, block: number) {
  let byBlock = contexts.get(runner);
  if (!byBlock) { byBlock = new Map(); contexts.set(runner, byBlock); }
  const existing = byBlock.get(block);
  if (existing) return existing;
  const pending = (async (): Promise<YieldContext> => {
    const chef = new Contract(FARM_READ_CHEF.address, CHEF_ABI, runner);
    const [chain, chefCode, earlier, emission, total, start, token] = await Promise.all([
      rpc.send("eth_chainId", []), rpc.getCode(FARM_READ_CHEF.address, block), rpc.getBlock(Math.max(0, block - 100)),
      chef.DTXPerBlock(), chef.totalAllocPoint(), chef.startBlock(), chef.dtx(),
    ]);
    if (BigInt(chain) !== 369n || keccak256(chefCode) !== FARM_READ_CHEF.runtimeCodeHash || !earlier) return null;
    return { earlier, emission, total, start, token };
  })();
  // Every farm uses the same verified chef and timing at this exact block.
  // Sharing only within this runner preserves abort and snapshot boundaries.
  byBlock.set(block, pending);
  return pending;
}
// A constant-current-state projection, not a guaranteed payout or an exit quote.
export async function readFarmYield(id: string, runner: ContractRunner, rpc: Awaited<ReturnType<typeof getPublicProvider>>, block: number, timestamp: number, discoveredSpec?: FarmYieldSpec): Promise<FarmYield | null> {
  const spec = discoveredSpec ?? [...VERIFIED_FARM_READS, ...SPECIAL_FARM_READS].find((item) => item.id === id);
  if (!spec) return null;
  const [vaultCode, context] = await Promise.all([rpc.getCode(spec.address, block), readYieldContext(runner, rpc, block)]);
  if (keccak256(vaultCode) !== spec.runtimeCodeHash || !context || timestamp <= context.earlier.timestamp) return null;
  const { earlier, emission, total, start, token } = context;
  const vault = new Contract(spec.address, ["function masterchef() view returns(address)", "function poolID() view returns(uint256)", "function defaultDirectPayout() view returns(uint256)"], runner);
  const chef = new Contract(FARM_READ_CHEF.address, CHEF_ABI, runner);
  const [master, pid, payout, pool] = await Promise.all([vault.masterchef(), vault.poolID(), id === "treasury" ? 10000n : vault.defaultDirectPayout(), chef.poolInfo(spec.poolId)]);
  if (getAddress(master) !== getAddress(FARM_READ_CHEF.address) || pid.toString() !== spec.poolId || getAddress(pool[2]) !== getAddress(spec.address) || getAddress(token) !== getAddress(FARM_READ_CHEF.rewardToken) || payout > 10000n || total === 0n || pool[0] > total || BigInt(block) <= start || BigInt(block) < pool[1]) return null;
  const elapsed = timestamp - earlier.timestamp;
  const daily = BigInt(emission) * BigInt(pool[0]) * 86400n * BigInt(block - earlier.number) / (BigInt(total) * BigInt(elapsed));
  return { dailyPool: formatEther(daily), directBps: payout.toString(), secondsPerBlock: elapsed / (block - earlier.number), allocation: (Number(pool[0] * 1000000n / total) / 10000).toFixed(4) };
}
