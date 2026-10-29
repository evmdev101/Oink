import { getAddress, MaxUint256, ZeroAddress } from "ethers";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { FARM_VAULT_TEMPLATES } from "../config/farmVaultTemplates";
import type { FarmWriteSpec } from "./farmTransactions";

// This is an in-memory permission catalog. Saved reviews/journals never add
// permission; only a complete verified registry snapshot may publish entries.
let discovered: readonly FarmWriteSpec[] = [];
let revision = 0;
let publication = 0;
const listeners = new Set<() => void>();
const hash = /^0x[0-9a-f]{64}$/i;
export const isDiscoveredFarmId = (id: string) => /^registry-0x[0-9a-f]{40}$/.test(id);
export const getFarmCatalogRevision = () => revision;
export const getFarmCatalogPublication = () => publication;
export const subscribeFarmCatalog = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getFarmWriteSpecs = (): readonly FarmWriteSpec[] => [...VERIFIED_FARM_WRITES, ...discovered];
export const getFarmWriteSpec = (id: string): FarmWriteSpec | undefined => VERIFIED_FARM_WRITES.find(spec => spec.id === id) ?? discovered.find(spec => spec.id === id);

const address = (value: string) => getAddress(value).toLowerCase();
const policyIdentity = (spec: FarmWriteSpec) => spec.tokenPolicy?.kind === "usdc"
  ? ["usdc", spec.tokenPolicy.implementation.slot.toLowerCase(), address(spec.tokenPolicy.implementation.address), spec.tokenPolicy.implementation.runtimeCodeHash.toLowerCase()]
  : spec.tokenPolicy?.kind ?? null;
// Snapshot age is checked by live reads. Re-verifying unchanged permissions at
// a newer block must not alter a review's semantic identity.
export function farmSpecIdentity(spec: FarmWriteSpec): string {
  return JSON.stringify([spec.id, address(spec.address), spec.tokenAddress ? address(spec.tokenAddress) : null,
    spec.decimals, spec.symbol, spec.poolId, spec.runtimeCodeHash.toLowerCase(), spec.tokenRuntimeCodeHash?.toLowerCase() ?? null,
    address(spec.masterchef), address(spec.governor), address(spec.rewardToken), address(spec.treasuryWallet),
    spec.masterchefRuntimeCodeHash.toLowerCase(), spec.governorRuntimeCodeHash.toLowerCase(), spec.rewardTokenRuntimeCodeHash.toLowerCase(),
    policyIdentity(spec), spec.discoveryTemplateId ?? null]);
}
export function assertCurrentFarmSpec(spec: FarmWriteSpec): void {
  const current = getFarmWriteSpec(spec.id);
  if (!current || farmSpecIdentity(current) !== farmSpecIdentity(spec)) throw new Error("This farm's verified configuration is unavailable or changed. Refresh the farm before continuing.");
}

function validateDiscoveredSpec(spec: FarmWriteSpec): void {
  if (!spec || !isDiscoveredFarmId(spec.id) || spec.id !== "registry-" + address(spec.address) || getAddress(spec.address) === ZeroAddress)
    throw new Error("Invalid discovered farm identity.");
  if (!spec.discoveryTemplateId || !hash.test(spec.discoveryBlockHash ?? "") || !hash.test(spec.runtimeCodeHash)
    || !Number.isSafeInteger(spec.verifiedBlock) || spec.verifiedBlock < 0 || !Number.isFinite(Date.parse(spec.verifiedAt))
    || !/^(0|[1-9][0-9]*)$/.test(spec.poolId) || BigInt(spec.poolId) > MaxUint256)
    throw new Error("Discovered farm verification evidence is incomplete.");
  if (!FARM_VAULT_TEMPLATES.some(template => template.id === spec.discoveryTemplateId && template.kind === (spec.tokenAddress ? "erc20" : "native"))) throw new Error("Discovered farm executable model is not reviewed.");
  const common = VERIFIED_FARM_WRITES[0];
  for (const key of ["masterchef", "governor", "rewardToken", "treasuryWallet"] as const)
    if (address(spec[key]) !== address(common[key])) throw new Error("Discovered farm dependency is not reviewed.");
  for (const key of ["masterchefRuntimeCodeHash", "governorRuntimeCodeHash", "rewardTokenRuntimeCodeHash"] as const)
    if (spec[key].toLowerCase() !== common[key].toLowerCase()) throw new Error("Discovered farm dependency runtime is not reviewed.");
  const token = VERIFIED_FARM_WRITES.find(candidate => candidate.tokenAddress === null ? spec.tokenAddress === null : !!spec.tokenAddress && address(candidate.tokenAddress) === address(spec.tokenAddress));
  if (!token || spec.decimals !== token.decimals || spec.symbol !== token.symbol
    || spec.tokenRuntimeCodeHash?.toLowerCase() !== token.tokenRuntimeCodeHash?.toLowerCase()
    || JSON.stringify(policyIdentity(spec)) !== JSON.stringify(policyIdentity(token))) throw new Error("Discovered farm asset is not independently reviewed.");
}

export function replaceDiscoveredFarmSpecs(specs: readonly FarmWriteSpec[]): void {
  const next: FarmWriteSpec[] = [];
  const ids = new Set(VERIFIED_FARM_WRITES.map(spec => String(spec.id)));
  const addresses = new Set(VERIFIED_FARM_WRITES.map(spec => address(spec.address)));
  const pools = new Set(VERIFIED_FARM_WRITES.map(spec => String(spec.poolId)));
  for (const input of specs) {
    validateDiscoveredSpec(input);
    if (ids.has(input.id) || addresses.has(address(input.address)) || pools.has(input.poolId)) throw new Error("Discovered farms contain a duplicate identity, address, or pool.");
    ids.add(input.id); addresses.add(address(input.address)); pools.add(input.poolId);
    const spec = structuredClone(input);
    if (spec.tokenPolicy?.kind === "usdc") Object.freeze(spec.tokenPolicy.implementation);
    if (spec.tokenPolicy) Object.freeze(spec.tokenPolicy);
    next.push(Object.freeze(spec));
  }
  const changed = JSON.stringify(discovered.map(farmSpecIdentity).sort()) !== JSON.stringify(next.map(farmSpecIdentity).sort());
  discovered = Object.freeze(next);
  ++publication;
  if (changed) { ++revision; listeners.forEach(listener => listener()); }
}
