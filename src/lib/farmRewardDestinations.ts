import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { getFarmWriteSpec, farmSpecIdentity, assertCurrentFarmSpec } from "./farmCatalog";
import { accessSnapshot, sameAccessAddress } from "./accessSnapshot";
import { getPublicProvider } from "./chain";
import type { FarmReadRpc } from "./farmTransactions";
import { sharedDisplayReads } from "./sharedReadCache.ts";
import { formatEther, parseEther } from "ethers";

export type RewardDestinations = { block: number; timestamp: number; rates: Record<string, string | null>; minimums: Record<string, string | null> };
export function rewardRateText(rate: string | null | undefined): string | null {
  if (rate == null || !/^\d+$/.test(rate) || BigInt(rate) > 10000n) return null;
  const percent = (bps: bigint) => `${bps / 100n}${bps % 100n ? '.' + (bps % 100n).toString().padStart(2, '0').replace(/0+$/, '') : ''}%`;
  const value = BigInt(rate);
  return `${percent(10000n - value)} penalty`;
}

export function rewardDestinationAmount(gross: string | null | undefined, rate: string | null | undefined): string | null {
  if (gross == null || !/^\d{1,60}(?:\.\d{1,18})?$/.test(gross) || rewardRateText(rate) == null) return null;
  return formatEther(parseEther(gross) * BigInt(rate!) / 10000n);
}

export function rewardDestinationEligibility(gross: string | null | undefined, rate: string | null | undefined, minimum: string | null | undefined): "ready" | "below-minimum" | "unavailable" | "unknown" {
  if (rate === "0") return "unavailable";
  const amount = rewardDestinationAmount(gross, rate);
  if (amount == null || minimum == null || !/^\d{1,78}$/.test(minimum)) return "unknown";
  const value = parseEther(amount);
  if (value === 0n) return "unavailable";
  return value < BigInt(minimum) ? "below-minimum" : "ready";
}

export async function loadFarmRewardDestinations(rpc: FarmReadRpc, farmId: string): Promise<RewardDestinations> {
  const spec = getFarmWriteSpec(farmId);
  if (!spec) throw Error("Unsupported farm.");
  const snapshot = await accessSnapshot(rpc);
  await snapshot.runtime(spec.address, spec.runtimeCodeHash);
  sameAccessAddress((await snapshot.read(spec.address, "masterchef"))[0], spec.masterchef, "Farm reward contract");
  const destinations = [{ id: "wallet", address: null }, ...MINER_PREVIEW_SPECS];
  const rows = await Promise.all(destinations.map(async target => {
    try {
      const rate = target.address
        ? (await snapshot.read(spec.address, "viewPoolPayout", [target.address]))[0]
        : (await snapshot.read(spec.address, "defaultDirectPayout"))[0];
      return [target.id, rewardRateText(String(rate)) == null ? null : String(rate)] as const;
    } catch { return [target.id, null] as const; }
  }));
  const minimums = await Promise.all(destinations.map(async target => {
    if (!target.address) return [target.id, "0"] as const;
    try {
      const miner = MINER_PREVIEW_SPECS.find(miner => miner.id === target.id)!;
      await snapshot.runtime(miner.address, miner.runtimeCodeHash);
      const minimum = BigInt((await snapshot.read(miner.address, "minimumGift"))[0]);
      return [target.id, minimum >= 0n ? minimum.toString() : null] as const;
    } catch { return [target.id, null] as const; }
  }));
  await snapshot.finish();
  assertCurrentFarmSpec(spec);
  return { block: snapshot.block, timestamp: snapshot.timestamp, rates: Object.fromEntries(rows), minimums: Object.fromEntries(minimums) };
}

export function readFarmRewardDestinations(farmId: string, signal?: AbortSignal) {
  const spec = getFarmWriteSpec(farmId);
  if (!spec) return Promise.reject(new Error("Unsupported farm."));
  return sharedDisplayReads.read<RewardDestinations>(`369:farm-reward-destinations:v2:${farmSpecIdentity(spec)}`, async child => {
    child.throwIfAborted();
    const value = await loadFarmRewardDestinations(await getPublicProvider(), farmId);
    child.throwIfAborted();
    return value;
  }, { signal, ttl: 30000, timeout: 20000, cacheable: value => Object.values(value.rates).every(rate => rate != null) && Object.values(value.minimums).every(minimum => minimum != null) });
}
