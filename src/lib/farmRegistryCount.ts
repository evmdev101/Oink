import { CORE_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS, GOVERNANCE_CONTRACTS, TIME_MINER_CONTRACTS, TREASURY_AND_HELPER_CONTRACTS } from "../config/contracts";
import { VERIFIED_FARM_READS } from "../config/farmReadVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { isNftDashboardPool } from "../config/nftProjects";

// Shared with discovery so the overview can count listed farms from its existing
// registry read without loading every vault, price and discovery bytecode.
const known = new Set([
  ...CORE_CONTRACTS, ...ECOSYSTEM_MINER_CONTRACTS, ...GOVERNANCE_CONTRACTS,
  ...TIME_MINER_CONTRACTS, ...TREASURY_AND_HELPER_CONTRACTS,
  ...VERIFIED_FARM_READS, ...VERIFIED_FARM_WRITES,
].map(row => row.address.toLowerCase()));

export const isKnownFarmRegistryAddress = (address: string) => known.has(address.toLowerCase());

export function farmCountFromRegistry(pools: readonly { address: string | null }[]): number | null {
  const farms = new Set(ECOSYSTEM_MINER_CONTRACTS.filter(row => !isNftDashboardPool(row.address)).map(row => row.address.toLowerCase()));
  const seen = new Set<string>();
  for (const pool of pools) {
    const key = pool.address?.toLowerCase();
    if (!key || !/^0x[0-9a-f]{40}$/.test(key) || /^0x0{40}$/.test(key) || seen.has(key)) return null;
    seen.add(key);
    if (!isKnownFarmRegistryAddress(key) && !isNftDashboardPool(key)) farms.add(key);
  }
  return farms.size;
}
