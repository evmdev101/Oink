import { Contract, formatEther, formatUnits, getAddress } from "ethers";
import { OINK_TOKEN, TIME_MINER_CONTRACTS } from "../config/contracts";
import { getPublicProvider } from "./chain";
import { snapshotIsStale, snapshotRunner } from "./governanceReadSafety";
import { readMinerYield, type MinerYield } from "./minerLive";
import { sharedDisplayReads } from "./sharedReadCache.ts";

export type TimeMinerSummary = {
  block: number; timestamp: number;
  rows: Array<{ shares: string; sharePrice: string; callFee: string } | null>;
};
export type PublicMinerYields = { block: number; timestamp: number; yields: Record<string, MinerYield | null> };
export type MinerWalletBalance = { account: string; block: number; timestamp: number; balance: string };

async function atSnapshot<T>(signal: AbortSignal, load: (context: {
  rpc: Awaited<ReturnType<typeof getPublicProvider>>;
  runner: ReturnType<typeof snapshotRunner>; number: number; timestamp: number;
}) => Promise<T>) {
  const rpc = await getPublicProvider();
  signal.throwIfAborted();
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("PulseChain is required.");
  const block = await rpc.getBlock("latest");
  if (!block?.hash || snapshotIsStale(block.timestamp, Date.now()) || block.timestamp * 1000 - Date.now() > 30000) throw Error("Current miner data is unavailable.");
  const result = await load({ rpc, runner: snapshotRunner(rpc, block.number, signal), number: block.number, timestamp: block.timestamp });
  if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw Error("Snapshot block changed. Please retry.");
  signal.throwIfAborted();
  return result;
}

export function peekTimeMinerSummary() { return sharedDisplayReads.peek<TimeMinerSummary>("369:miner-summary"); }
export function readTimeMinerSummary(signal?: AbortSignal) {
  return sharedDisplayReads.read("369:miner-summary", child => atSnapshot(child, async ({ runner, number, timestamp }): Promise<TimeMinerSummary> => {
    const rows = await Promise.all(TIME_MINER_CONTRACTS.map(async record => {
      try {
        const miner = new Contract(record.address, ["function totalShares() view returns(uint256)", "function getPricePerFullShare() view returns(uint256)", "function callFee() view returns(uint256)"], runner);
        const [shares, price, fee] = await Promise.all([miner.totalShares(), miner.getPricePerFullShare(), miner.callFee()]);
        return { shares: formatEther(shares), sharePrice: formatEther(price), callFee: formatUnits(fee, 2) };
      } catch { child.throwIfAborted(); return null; }
    }));
    return { block: number, timestamp, rows };
  }), { signal, cacheable: value => value.rows.every(row => row != null) });
}

export function peekPublicMinerYields() { return sharedDisplayReads.peek<PublicMinerYields>("369:miner-yields"); }
export function readPublicMinerYields(signal?: AbortSignal) {
  return sharedDisplayReads.read("369:miner-yields", child => atSnapshot(child, async ({ rpc, runner, number, timestamp }): Promise<PublicMinerYields> => {
    const rows = await Promise.all(TIME_MINER_CONTRACTS.map(async miner => [miner.id, await readMinerYield(miner.id, runner, rpc, number, timestamp).catch(() => null)] as const));
    return { block: number, timestamp, yields: Object.fromEntries(rows) };
  }), { signal, cacheable: value => Object.values(value.yields).every(row => row != null) });
}

const balanceKey = (account: string) => "369:miner-wallet:" + getAddress(account).toLowerCase();
export function peekMinerWalletBalance(account: string) { return sharedDisplayReads.peek<MinerWalletBalance>(balanceKey(account)); }
export function readMinerWalletBalance(account: string, signal?: AbortSignal) {
  const normalized = getAddress(account);
  return sharedDisplayReads.read(balanceKey(normalized), child => atSnapshot(child, async ({ runner, number, timestamp }): Promise<MinerWalletBalance> => {
    const token = new Contract(OINK_TOKEN, ["function balanceOf(address) view returns(uint256)"], runner);
    return { account: normalized, block: number, timestamp, balance: formatEther(await token.balanceOf(normalized)) };
  }), { signal });
}
