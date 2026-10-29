import { Interface, ZeroAddress, formatEther, getAddress } from "ethers";
import { getFarmWriteSpec, farmSpecIdentity, assertCurrentFarmSpec } from "./farmCatalog";
import { accessSnapshot, sameAccessAddress, verifyAccessCore } from "./accessSnapshot";
import { getPublicProvider } from "./chain";
import type { FarmReadRpc } from "./farmTransactions";
import { sharedDisplayReads } from "./sharedReadCache.ts";

export type FarmClaimReward = { farmId: string; account: string; index: number; gross: string; timestamp: number };
const CACHE_PREFIX = "369:farm-claim-reward:";
if (typeof window !== "undefined") window.addEventListener("oink-positions-changed", () => sharedDisplayReads.clear(CACHE_PREFIX));
export const farmClaimRewardAbi = new Interface([
  "function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256)",
  "function getNrOfStakes(address) view returns(uint256)",
  "function accDtxPerShare() view returns(uint256)",
  "function lastCredit() view returns(uint256)",
  "function balanceOf(address) view returns(uint256)",
]);

function identity(farmId: string, accountInput: string, index: number) {
  const account = getAddress(accountInput), spec = getFarmWriteSpec(farmId);
  if (!spec) throw Error("Unsupported farm.");
  if (account === ZeroAddress) throw Error("Connect a nonzero wallet to read rewards.");
  if (!Number.isSafeInteger(index) || index < 0) throw Error("Select a valid farm position.");
  return { account, spec };
}

/** Harvest-equivalent gross rewards, including credit missing from multiCall's display estimate. */
export async function loadFarmClaimReward(rpc: FarmReadRpc, farmId: string, accountInput: string, index: number): Promise<FarmClaimReward> {
  const { account, spec } = identity(farmId, accountInput, index);
  const snapshot = await accessSnapshot(rpc);
  const [, core] = await Promise.all([snapshot.runtime(spec.address, spec.runtimeCodeHash), verifyAccessCore(snapshot)]);
  sameAccessAddress(spec.masterchef, core.masterchef, "Configured farm reward contract");
  await Promise.all([
    ...[["token", core.rewardToken], ["masterchef", core.masterchef], ["treasury", core.governor], ["treasuryWallet", core.treasuryWallet]].map(async ([method, expected]) => sameAccessAddress((await snapshot.read(spec.address, method))[0], expected, "Farm " + method)),
    (async () => {
      if ((await snapshot.read(spec.address, "poolID"))[0] !== BigInt(spec.poolId)) throw Error("Farm pool registration changed.");
      sameAccessAddress((await snapshot.read(core.masterchef, "poolInfo", [BigInt(spec.poolId)]))[2], spec.address, "Farm reward participant");
    })(),
  ]);
  const read = (method: string, args: unknown[] = []) => snapshot.read(spec.address, method, args, farmClaimRewardAbi);
  if (BigInt(index) >= (await read("getNrOfStakes", [account]))[0]) throw Error("Position no longer exists. Refresh your positions.");
  const [position, accumulator, lastCredit, credit, pending, balance] = await Promise.all([
    read("userInfo", [account, index]), read("accDtxPerShare"), read("lastCredit"),
    snapshot.read(core.masterchef, "credit", [spec.address]), snapshot.read(core.masterchef, "pendingDtx", [BigInt(spec.poolId)]),
    spec.tokenAddress ? snapshot.read(spec.tokenAddress, "balanceOf", [spec.address], farmClaimRewardAbi).then(result => BigInt(result[0])) : rpc.send("eth_getBalance", [spec.address, snapshot.tag]).then(BigInt),
  ]);
  const amount = BigInt(position[0]), debt = BigInt(position[1]), available = BigInt(balance);
  if (amount <= 0n || available <= 0n || amount > available || BigInt(credit[0]) + BigInt(pending[0]) < BigInt(lastCredit[0])) throw Error("Farm reward accounting is unavailable or inconsistent.");
  const accAfterHarvest = BigInt(accumulator[0]) + (BigInt(credit[0]) + BigInt(pending[0]) - BigInt(lastCredit[0])) * 1000000000000n / available;
  if (accAfterHarvest < debt) throw Error("Farm reward accounting is unavailable or inconsistent.");
  const gross = amount * (accAfterHarvest - debt) / 1000000000000n;
  await snapshot.finish();
  assertCurrentFarmSpec(spec);
  return { farmId, account, index, gross: formatEther(gross), timestamp: snapshot.timestamp };
}

export function readFarmClaimReward(farmId: string, accountInput: string, index: number, signal?: AbortSignal): Promise<FarmClaimReward> {
  const { account, spec } = identity(farmId, accountInput, index);
  return sharedDisplayReads.read<FarmClaimReward>(`${CACHE_PREFIX}${farmSpecIdentity(spec)}:${account.toLowerCase()}:${index}`, async child => {
    child.throwIfAborted();
    const result = await loadFarmClaimReward(await getPublicProvider(), farmId, account, index);
    child.throwIfAborted();
    return result;
  }, { signal, ttl: 10000, timeout: 20000 });
}
