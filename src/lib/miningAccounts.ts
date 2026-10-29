import { sharedDisplayReads } from "./sharedReadCache.ts";
import { DisplayReadProgress } from "./displayReadProgress.ts";
import { Contract, formatEther, formatUnits, getAddress } from "ethers";
import { TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS, OINK_TOKEN } from "../config/contracts";
import { getPublicProvider } from "./chain";
import { snapshotRunner } from "./governanceReadSafety";
import { boundedPositionCount, grossShareValue, positionWindow } from "./miningMath";
import { readFarmYield } from "./farmYield";
import { readMinerYield } from "./minerLive";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { minerExitAmounts } from "./positionPreviewMath";
import { verifyRuntime } from "./farmTransactions";
import { VERIFIED_FARM_READS } from "../config/farmReadVerification";
import { readSpecialFarm, type SpecialFarmData } from "./specialFarms";
import { discoverFarmPools, type DiscoveredFarm } from "./farmDiscovery";
import { withFarmReadBudget } from "./farmReadBudget";

type MinerPosition = ReturnType<typeof positionWindow> & {
  index: number; shares: string; gross: string; penalty: number | null;
  lastValue: string; lastAction: number; deposited: number;
};
export type MinerPoolSnapshot = typeof TIME_MINER_CONTRACTS[number] & {
  rows: MinerPosition[]; yieldEstimate: Awaited<ReturnType<typeof readMinerYield>> | null;
  totalShares: string; error: string | null; loading: boolean;
};
export type MinerPositionSnapshot = {
  account: string; block: number; timestamp: number; walletBalance: string | null;
  pools: MinerPoolSnapshot[]; complete: boolean;
};
const minerProgress = new DisplayReadProgress<MinerPositionSnapshot>();

async function fetchMinerPositions(wallet: string, signal?: AbortSignal): Promise<MinerPositionSnapshot> {
  const account = getAddress(wallet);
  const progress = minerProgress.begin(minerKey(account), signal);
  try {
    const rpc = await getPublicProvider();
    if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("PulseChain is required.");
    const block = await rpc.getBlock("latest");
    if (!block?.hash) throw new Error("Snapshot block unavailable.");
    const runner = snapshotRunner(rpc, block.number, signal);
    let walletBalance: string | null = null;
    let walletLoaded = false;
    const pools: MinerPoolSnapshot[] = TIME_MINER_CONTRACTS.map(record => ({ ...record, rows: [], yieldEstimate: null, totalShares: "0", error: null, loading: true }));
    const snapshot = (): MinerPositionSnapshot => ({ account, block: block.number, timestamp: block.timestamp, walletBalance, pools: [...pools], complete: walletLoaded && pools.every(pool => !pool.loading) });
    // Only publish values from a block that is still canonical, including partial views.
    const publish = async () => {
      if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw new Error("Snapshot block changed. Please retry.");
      signal?.throwIfAborted();
      progress.publish(snapshot());
    };
    const balanceRead = new Contract(OINK_TOKEN, ["function balanceOf(address) view returns(uint256)"], runner).balanceOf(account)
      .then((value: bigint) => { walletBalance = formatEther(value); })
      .catch(() => { signal?.throwIfAborted(); })
      .then(async () => { walletLoaded = true; await publish(); });
    const poolReads = TIME_MINER_CONTRACTS.map(async (record, poolIndex) => {
      try {
        const c = new Contract(record.address, ["function getNrOfStakes(address) view returns(uint256)", "function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)", "function withdrawFeePeriod() view returns(uint256)", "function gracePeriod() view returns(uint256)", "function totalShares() view returns(uint256)", "function balanceOf() view returns(uint256)"], runner);
        const spec = MINER_PREVIEW_SPECS.find(v => v.id === record.id)!;
        const [count, duration, grace, total, balance, codeVerified] = await Promise.all([
          c.getNrOfStakes(account), c.withdrawFeePeriod(), c.gracePeriod(), c.totalShares(), c.balanceOf(),
          rpc.getCode(record.address, block.number).then(code => { verifyRuntime(code, spec.runtimeCodeHash, "Miner"); return true; }).catch(() => false),
        ]);
        const verified = codeVerified && duration === BigInt(spec.durationDays) * 86400n && grace === BigInt(spec.graceDays) * 86400n;
        const yieldRead = verified ? readMinerYield(record.id, runner, rpc, block.number, block.timestamp).catch(() => null) : Promise.resolve(null);
        const rows = await Promise.all(Array.from({ length: boundedPositionCount(count) }, async (_, index) => {
          const r = await c.userInfo(account, index);
          const gross = grossShareValue(r[0], balance, total);
          return { index, shares: formatEther(r[0]), gross: formatEther(gross),
            penalty: verified ? Number(minerExitAmounts(gross, r[1], r[4], BigInt(block.timestamp), spec).penaltyBps) / 100 : null,
            lastValue: formatEther(r[2]), lastAction: Number(r[3]), deposited: Number(r[1]),
            ...positionWindow(r[1], duration, grace, r[4], BigInt(block.timestamp)) };
        }));
        pools[poolIndex] = { ...record, rows, yieldEstimate: null, totalShares: formatEther(total), error: null, loading: false };
        await publish();
        // APR and ticking estimates must not hold back already-read wallet positions.
        const yieldEstimate = await yieldRead;
        pools[poolIndex] = { ...pools[poolIndex], yieldEstimate };
        await publish();
      } catch (e) {
        signal?.throwIfAborted();
        pools[poolIndex] = { ...record, rows: [], yieldEstimate: null, totalShares: "0", error: e instanceof Error ? e.message : "Contract reads unavailable", loading: false };
        await publish();
      }
    });
    await Promise.all([balanceRead, ...poolReads]);
    await publish();
    return snapshot();
  } finally { progress.finish(); }
}

export type EcosystemVaultRow = {
  id: string; label: string; address: string; source?: string; discovery?: DiscoveredFarm;
  loading: boolean; error: string | null; special: SpecialFarmData | null;
  data: null | {
    yieldEstimate: Awaited<ReturnType<typeof readFarmYield>> | null;
    tokenAddress: string | null; symbol: string; balance: string; fee: string; funding: string;
    pool: string; rewardCredit: string;
    positions: Array<{ index: number; amount: string; feesPaid: string; pending: string }> | null;
    accountError: string | null; walletBalance: string | null; walletBalanceError: string | null;
  };
};
export type EcosystemVaultSnapshot = {
  account: string | null; block: number; blockHash: string; timestamp: number;
  rows: EcosystemVaultRow[]; registry: Awaited<ReturnType<typeof discoverFarmPools>> | null;
  discoveryError: string | null; complete: boolean;
};
const farmProgress = new DisplayReadProgress<EcosystemVaultSnapshot>();

async function fetchEcosystemVaults(signal?: AbortSignal, wallet?: string): Promise<EcosystemVaultSnapshot> {
  const account = wallet ? getAddress(wallet) : null;
  const progress = farmProgress.begin(farmKey(wallet), signal);
  try {
  const rpc = await getPublicProvider();
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("PulseChain is required.");
  const block = await rpc.getBlock("latest");
  if (!block?.hash) throw new Error("Snapshot block unavailable.");
  type Record = { id: string; label: string; address: string; source?: string; discovery?: DiscoveredFarm };
  const knownRunner = snapshotRunner(rpc, block.number, signal);
  const readRecord = async (record: Record, readSignal = signal) => {
    const runner = record.discovery ? snapshotRunner(rpc, block.number, readSignal) : knownRunner;
    try {
      readSignal?.throwIfAborted();
      if (record.discovery && !record.discovery.readSpec) return { ...record, data: null, special: null as SpecialFarmData | null, error: null };
      if (record.id === "t-share" || record.id === "treasury") return { ...record, data:null, special:await readSpecialFarm(record.id,runner,rpc,block.number,block.timestamp,account), error:null };
      const spec = record.discovery?.readSpec ?? VERIFIED_FARM_READS.find(item => item.id === record.id);
      if (!spec) throw new Error("Farm reader not verified.");
      verifyRuntime(await rpc.getCode(record.address, block.number), spec.runtimeCodeHash, "Farm");
      const c = new Contract(getAddress(record.address), ["function stakeToken() view returns(address)", "function depositFee() view returns(uint256)", "function fundingRate() view returns(uint256)", "function poolID() view returns(uint256)", "function publicBalanceOf() view returns(uint256)"], runner);
      const [fee, rate, pool, rewards] = await Promise.all([c.depositFee(), c.fundingRate(), c.poolID(), c.publicBalanceOf()]);
      const native = spec.tokenAddress === null;
      const tokenAddress = native ? null : getAddress(await c.stakeToken());
      const token = tokenAddress ? new Contract(tokenAddress, ["function decimals() view returns(uint8)", "function symbol() view returns(string)", "function balanceOf(address) view returns(uint256)"], runner) : null;
      const [decimals, symbol, balance] = token ? await Promise.all([token.decimals(), token.symbol(), token.balanceOf(record.address)]) : [18n, "PLS", await rpc.getBalance(record.address, block.number)];
      if (tokenAddress?.toLowerCase() !== spec.tokenAddress?.toLowerCase() || Number(decimals) !== spec.decimals || pool.toString() !== spec.poolId) throw new Error("Farm token, decimals or pool changed. Refresh after re-verification.");
      let positions: Array<{ index: number; amount: string; feesPaid: string; pending: string }> | null = null;
      let accountError: string | null = null;
      let walletBalance: string | null = null;
      let walletBalanceError: string | null = null;
      if (account) {
        const [balanceResult, positionResult] = await Promise.all([
          (async () => {
            try {
              const liquidBalance = token ? await token.balanceOf(account) : await rpc.getBalance(account, block.number);
              return { walletBalance: formatUnits(liquidBalance, Number(decimals)), walletBalanceError: null };
            } catch { return { walletBalance: null, walletBalanceError: "Wallet balance could not be read at this snapshot." }; }
          })(),
          (async () => {
            try {
              const accountReader = new Contract(record.address, ["function getNrOfStakes(address) view returns(uint256)", "function multiCall(address,uint256) view returns(uint256,uint256,uint256,uint256)"], runner);
              const count = boundedPositionCount(await accountReader.getNrOfStakes(account));
              const foundPositions = await Promise.all(Array.from({ length: count }, async (_, index) => {
                const row = await accountReader.multiCall(account, index);
                return { index, amount: formatUnits(row[0], Number(decimals)), feesPaid: formatUnits(row[1], Number(decimals)), pending: formatEther(row[3]) };
              }));
              return { positions: foundPositions, accountError: null };
            } catch { return { positions: null, accountError: "Wallet positions could not be fully verified for this vault." }; }
          })(),
        ]);
        walletBalance = balanceResult.walletBalance;
        walletBalanceError = balanceResult.walletBalanceError;
        positions = positionResult.positions;
        accountError = positionResult.accountError;
      }
      const yieldEstimate = await readFarmYield(record.id, runner, rpc, block.number, block.timestamp, record.discovery?.readSpec).catch(() => null);
      return { ...record, special:null as SpecialFarmData | null, error: null, data: { yieldEstimate, tokenAddress, symbol: String(symbol), balance: formatUnits(balance, Number(decimals)), fee: formatUnits(fee, 2), funding: formatUnits(rate, 4), pool: pool.toString(), rewardCredit: formatEther(rewards), positions, accountError, walletBalance, walletBalanceError } };
    } catch (e) { return { ...record, data: null, special:null as SpecialFarmData | null, error: e instanceof Error ? e.message : "Vault reads unavailable" }; }
  };
  const base = { account, block: block.number, blockHash: block.hash, timestamp: block.timestamp };
  const publish = async () => {
    if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw new Error("Snapshot block changed. Please retry.");
    signal?.throwIfAborted();
    progress.publish({ ...base, rows: [...knownRows], registry: null, discoveryError: null, complete: false });
  };
  const knownRows: EcosystemVaultRow[] = ECOSYSTEM_MINER_CONTRACTS.map(record => ({ ...record, loading: true, data: null, special: null, error: null }));
  const [loadedRows, discovered] = await Promise.all([
    Promise.all(ECOSYSTEM_MINER_CONTRACTS.map(async (record, index) => {
      const row = { ...await readRecord(record), loading: false };
      knownRows[index] = row;
      await publish();
      return row;
    })),
    (async () => {
      const registry = await withFarmReadBudget(child => discoverFarmPools(rpc, { number: block.number, hash: block.hash!, timestamp: block.timestamp }, child), signal).catch(() => {
        signal?.throwIfAborted();
        return null;
      });
      const rows = await Promise.all((registry?.discoveries ?? []).map(discovery => {
        const record = { id: discovery.id, label: discovery.label, address: discovery.address, discovery };
        return withFarmReadBudget(child => readRecord(record, child), signal).catch(() => {
          signal?.throwIfAborted();
          return { ...record, data: null, special: null as SpecialFarmData | null, error: "New pool values are temporarily unavailable." };
        });
      }));
      return { registry, rows, discoveryError: registry ? null : "New pool discovery is temporarily unavailable. Existing farms are still shown." };
    })(),
  ]);
  const rows = [...loadedRows, ...discovered.rows.map(row => ({ ...row, loading: false }))];
  if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw new Error("Snapshot block changed. Please retry.");
  signal?.throwIfAborted();
  const result = { ...base, rows, registry: discovered.registry, discoveryError: discovered.discoveryError, complete: true };
  progress.publish(result);
  return result;
  } finally { progress.finish(); }
}

const minerKey = (wallet:string) => "369:miners:" + getAddress(wallet).toLowerCase();
const farmKey = (wallet?:string) => "369:farms:" + (wallet ? getAddress(wallet).toLowerCase() : "public");
export function readMinerPositions(wallet:string,signal?:AbortSignal) {
  return sharedDisplayReads.read(minerKey(wallet),child => fetchMinerPositions(wallet,child),{signal,cacheable:value => value.walletBalance != null && value.pools.every(pool => !pool.error)});
}
export function readEcosystemVaults(signal?:AbortSignal,wallet?:string) {
  return sharedDisplayReads.read(farmKey(wallet),child => fetchEcosystemVaults(child,wallet),{signal,cacheable:value => !value.discoveryError && value.rows.every(row => !row.error && !row.data?.accountError && !row.special?.accountError)});
}
export function peekMinerPositions(wallet:string) { return sharedDisplayReads.peek<Awaited<ReturnType<typeof fetchMinerPositions>>>(minerKey(wallet)); }
export function peekEcosystemVaults(wallet?:string) { return sharedDisplayReads.peek<Awaited<ReturnType<typeof fetchEcosystemVaults>>>(farmKey(wallet)) ?? farmProgress.peek(farmKey(wallet)); }

export function subscribeMinerPositions(wallet: string, listener: (value: MinerPositionSnapshot) => void) {
  return minerProgress.subscribe(minerKey(wallet), listener);
}
export function subscribeEcosystemVaults(wallet: string | undefined, listener: (value: EcosystemVaultSnapshot) => void) {
  return farmProgress.subscribe(farmKey(wallet), listener);
}
