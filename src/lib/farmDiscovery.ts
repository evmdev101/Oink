import { Interface, ZeroAddress, getAddress, keccak256, toQuantity } from "ethers";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { isKnownFarmRegistryAddress } from "./farmRegistryCount";
import { FARM_VAULT_TEMPLATES, type FarmVaultTemplate } from "../config/farmVaultTemplates";
import { farmTokenInterface, farmVaultInterface, verifyRuntime, type FarmReadRpc, type FarmWriteSpec } from "./farmTransactions";
import { verifyFarmTokenState } from "./farmTokenSafety";

export type RegistryFarmPool = { poolId: string; allocPoint: string | null; lastRewardBlock: string | null; address: string | null; error?: string };
export type FarmDiscoveryReadSpec = { id: string; address: string; tokenAddress: string | null; decimals: number; poolId: string; runtimeCodeHash: string };
export type DiscoveredFarm = {
  id: string; address: string; poolId: string; allocPoint: string; label: string;
  status: "supported" | "awaiting-integration"; reason: string;
  readSpec?: FarmDiscoveryReadSpec;
  writeSpec?: FarmWriteSpec & { discoveryTemplateId: string; discoveryBlockHash: string };
  priceId?: string; logoId?: string; templateId?: string;
};
export type FarmDiscoveryBlock = { number: number; hash: string; timestamp: number };
export type FarmDiscoveryResult = {
  pools: RegistryFarmPool[]; discoveries: DiscoveredFarm[]; partial: boolean; warnings: string[];
  block: number; blockHash: string; timestamp: number;
};
export const MAX_DISCOVERY_POOLS = 50;
export const MAX_DISCOVERY_RPC_CONCURRENCY = 4;
export const FARM_DISCOVERY_TIMEOUT_MS = 30_000;

const chefAbi = new Interface([
  "function poolLength() view returns(uint256)", "function poolInfo(uint256) view returns(uint256,uint256,address)",
  "function owner() view returns(address)", "function dtx() view returns(address)", "function feeAddress() view returns(address)",
]);
const governorAbi = new Interface(["function treasuryWallet() view returns(address)", "function masterchef() view returns(address)"]);
const rewardAbi = new Interface(["function governor() view returns(address)", "function owner() view returns(address)"]);
const sameAddress = (left: string, right: string) => getAddress(left) === getAddress(right);
const requireAddress = (actual: string, expected: string, description: string) => {
  if (!sameAddress(actual, expected)) throw new Error(description + " differs from the reviewed wiring.");
};
function active(signal: AbortSignal) { if (signal.aborted) throw signal.reason ?? new DOMException("Discovery cancelled", "AbortError"); }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 200) : "Pool verification could not be completed."; }

/** No ABI resemblance or on-chain name grants compatibility. Every executable
 * byte must match a reviewed compilation, except its compiler-reported immutable
 * address slots. Repeated slots must agree. The only ignored trailer is the
 * exact IPFS/solc-0.8.20 metadata structure emitted by that compiler. */
export function matchFarmVaultTemplate(code: string): { template: FarmVaultTemplate; rewardToken: string; stakeToken: string | null } | null {
  if (typeof code !== "string" || !FARM_VAULT_TEMPLATES.some(template => code.length === 2 + (template.executableBytes + 53) * 2)
    || !/^0x(?:[a-f0-9]{2})+$/i.test(code)) return null;
  const bytes = code.slice(2).toLowerCase();
  for (const template of FARM_VAULT_TEMPLATES) {
    if (bytes.length !== (template.executableBytes + 53) * 2) continue;
    const metadata = bytes.slice(template.executableBytes * 2);
    if (!/^a2646970667358221220[a-f0-9]{64}64736f6c63430008140033$/.test(metadata)) continue;
    let executable = bytes.slice(0, template.executableBytes * 2);
    const values: Partial<Record<"rewardToken" | "stakeToken", string>> = {};
    let valid = true;
    for (const immutable of template.immutables) {
      for (const offset of immutable.offsets) {
        const word = executable.slice(offset * 2, (offset + 32) * 2);
        if (!/^0{24}[a-f0-9]{40}$/.test(word) || /^0+$/.test(word)) { valid = false; break; }
        const address = getAddress("0x" + word.slice(-40));
        if (values[immutable.role] && values[immutable.role] !== address) { valid = false; break; }
        values[immutable.role] = address;
        executable = executable.slice(0, offset * 2) + "0".repeat(64) + executable.slice((offset + 32) * 2);
      }
      if (!valid) break;
    }
    if (valid && values.rewardToken && keccak256("0x" + executable) === template.normalizedExecutableHash)
      return { template, rewardToken: values.rewardToken, stakeToken: values.stakeToken ?? null };
  }
  return null;
}

// All calls, including token-policy Promise.all reads, share one semaphore.
// Aborting abandons the result immediately; an uncancellable RPC retains its
// permit until it settles, so a timeout can never multiply in-flight requests.
function limitedRpc(rpc: FarmReadRpc, signal: AbortSignal): FarmReadRpc {
  let inFlight = 0;
  const waiting: (() => void)[] = [];
  const acquire = async () => {
    active(signal);
    if (inFlight < MAX_DISCOVERY_RPC_CONCURRENCY) { ++inFlight; return; }
    await new Promise<void>((resolve, reject) => {
      const ready = () => { signal.removeEventListener("abort", cancelled); resolve(); };
      const cancelled = () => {
        const index = waiting.indexOf(ready);
        if (index >= 0) waiting.splice(index, 1);
        reject(signal.reason);
      };
      waiting.push(ready); signal.addEventListener("abort", cancelled, { once: true });
    });
    // A release hands its occupied permit directly to this waiter.
    if (signal.aborted) { release(); active(signal); }
  };
  const release = () => { const next = waiting.shift(); if (next) next(); else --inFlight; };
  return { async send(method, params) {
    await acquire();
    return new Promise((resolve, reject) => {
      const cancelled = () => reject(signal.reason);
      signal.addEventListener("abort", cancelled, { once: true });
      // A synchronous send throw is also captured and releases its permit.
      Promise.resolve().then(() => { active(signal); return rpc.send(method, params); }).then(
        result => { active(signal); resolve(result); }, reject,
      ).catch(reject).finally(() => { signal.removeEventListener("abort", cancelled); release(); });
    });
  } };
}

/** Enumerate and classify a complete fixed-block registry without any wallet
 * access. The result itself does not publish transaction permissions. A caller
 * must discard partial/outdated snapshots; send preparation still rechecks the
 * exact runtime, registry membership, live wiring, token policy and wallet. */
export async function discoverFarmPools(rpc: FarmReadRpc, block: FarmDiscoveryBlock, signal?: AbortSignal): Promise<FarmDiscoveryResult> {
  if (!Number.isSafeInteger(block.number) || block.number < 0 || !/^0x[a-f0-9]{64}$/i.test(block.hash)
    || !Number.isSafeInteger(block.timestamp) || block.timestamp <= 0) throw new Error("A valid fixed discovery block is required.");
  const age = Date.now() - block.timestamp * 1000;
  if (age > 120_000 || age < -30_000) throw new Error("Registry data is stale or its timestamp is invalid. Refresh discovery before using new pools.");
  const controller = new AbortController();
  const cancelled = () => controller.abort(signal?.reason ?? new DOMException("Discovery cancelled", "AbortError"));
  if (signal?.aborted) cancelled();
  else signal?.addEventListener("abort", cancelled, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException("Pool discovery timed out. Retry the registry refresh.", "TimeoutError")), FARM_DISCOVERY_TIMEOUT_MS);
  try {
    return await discoverAtBlock(limitedRpc(rpc, controller.signal), block, controller.signal);
  } finally {
    clearTimeout(timer); signal?.removeEventListener("abort", cancelled);
    controller.abort(new DOMException("Discovery completed", "AbortError"));
  }
}

async function discoverAtBlock(rpc: FarmReadRpc, block: FarmDiscoveryBlock, signal: AbortSignal): Promise<FarmDiscoveryResult> {
  active(signal);
  const common: FarmWriteSpec = VERIFIED_FARM_WRITES[0];
  const tag = toQuantity(block.number);
  const read = async (to: string, abi: Interface, method: string, args: unknown[] = []) => abi.decodeFunctionResult(method,
    await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, tag]));
  const canonical = async () => {
    const current = await rpc.send("eth_getBlockByNumber", [tag, false]);
    if (!current || current.hash?.toLowerCase() !== block.hash.toLowerCase() || Number(BigInt(current.number)) !== block.number
      || Number(BigInt(current.timestamp)) !== block.timestamp) throw new Error("The registry block changed. Refresh before using discovered pools.");
  };
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Pool discovery requires PulseChain.");
  await canonical();
  await Promise.all([
    [common.masterchef, common.masterchefRuntimeCodeHash, "MasterChef"],
    [common.governor, common.governorRuntimeCodeHash, "Governor"],
    [common.rewardToken, common.rewardTokenRuntimeCodeHash, "OINK"],
  ].map(async ([address, hash, label]) => verifyRuntime(await rpc.send("eth_getCode", [address, tag]), hash, label)));
  const [owner, reward, feeRecipient, treasury, governorChef, rewardGovernor, rewardOwner, length] = await Promise.all([
    read(common.masterchef, chefAbi, "owner"), read(common.masterchef, chefAbi, "dtx"), read(common.masterchef, chefAbi, "feeAddress"),
    read(common.governor, governorAbi, "treasuryWallet"), read(common.governor, governorAbi, "masterchef"),
    read(common.rewardToken, rewardAbi, "governor"), read(common.rewardToken, rewardAbi, "owner"), read(common.masterchef, chefAbi, "poolLength"),
  ]);
  requireAddress(owner[0], common.governor, "MasterChef owner");
  requireAddress(reward[0], common.rewardToken, "MasterChef reward token");
  requireAddress(feeRecipient[0], common.governor, "MasterChef fee recipient");
  requireAddress(treasury[0], common.treasuryWallet, "Governor treasury");
  requireAddress(governorChef[0], common.masterchef, "Governor MasterChef");
  requireAddress(rewardGovernor[0], common.governor, "OINK governor");
  requireAddress(rewardOwner[0], common.masterchef, "OINK owner");
  if (length[0] > BigInt(MAX_DISCOVERY_POOLS)) throw new Error("The registry exceeds the supported discovery limit of 50 pools and needs review.");
  const pools: RegistryFarmPool[] = await Promise.all(Array.from({ length: Number(length[0]) }, async (_, index) => {
    try {
      const pool = await read(common.masterchef, chefAbi, "poolInfo", [index]);
      const address = getAddress(pool[2]);
      return { poolId: String(index), allocPoint: pool[0].toString(), lastRewardBlock: pool[1].toString(), address,
        ...(address === ZeroAddress ? { error: "Registry participant is the zero address." } : {}) };
    } catch (error) {
      active(signal);
      return { poolId: String(index), allocPoint: null, lastRewardBlock: null, address: null, error: errorText(error) };
    }
  }));
  const counts = new Map<string, number>();
  for (const pool of pools) if (pool.address) counts.set(pool.address.toLowerCase(), (counts.get(pool.address.toLowerCase()) ?? 0) + 1);
  for (const pool of pools) if (pool.address && counts.get(pool.address.toLowerCase())! > 1) pool.error = "Registry participant appears in multiple pool slots.";
  const partial = pools.some(pool => !!pool.error);
  const warnings = pools.filter(pool => pool.error).map(pool => "Pool " + pool.poolId + ": " + pool.error);
  const unique = new Set<string>();
  const candidates = pools.filter(pool => {
    if (!pool.address || pool.address === ZeroAddress || isKnownFarmRegistryAddress(pool.address) || unique.has(pool.address.toLowerCase())) return false;
    unique.add(pool.address.toLowerCase()); return true;
  });
  const discoveries = await Promise.all(candidates.map(async (pool): Promise<DiscoveredFarm> => {
    const address = pool.address!;
    const base: DiscoveredFarm = { id: "registry-" + address.toLowerCase(), address, poolId: pool.poolId, allocPoint: pool.allocPoint!,
      label: "Registered pool #" + pool.poolId, status: "awaiting-integration", reason: "This registered contract needs an integration review." };
    if (partial) return { ...base, reason: "The registry snapshot is incomplete or contains invalid entries. Refresh before using newly discovered pools." };
    try {
      const code = await rpc.send("eth_getCode", [address, tag]);
      const match = matchFarmVaultTemplate(code);
      if (!match) return { ...base, reason: "This contract does not match a reviewed farm implementation. Its pool is registered, but actions need an integration review." };
      requireAddress(match.rewardToken, common.rewardToken, "Immutable reward token");
      const reviewed: FarmWriteSpec | undefined = VERIFIED_FARM_WRITES.find(spec => match.stakeToken === null ? spec.tokenAddress === null
        : !!spec.tokenAddress && sameAddress(spec.tokenAddress, match.stakeToken));
      if (!reviewed) return { ...base, templateId: match.template.id, reason: "The vault implementation matches, but its deposit asset has not been independently reviewed. Actions need token integration." };
      const spec: FarmWriteSpec & { discoveryTemplateId: string; discoveryBlockHash: string } = {
        ...reviewed, id: base.id, address, poolId: pool.poolId, runtimeCodeHash: keccak256(code),
        verifiedBlock: block.number, verifiedAt: new Date(block.timestamp * 1000).toISOString(),
        sourceUrl: "https://scan.pulsechain.com/address/" + address + "#code", discoveryTemplateId: match.template.id, discoveryBlockHash: block.hash,
      };
      const [chef, token, pid, governor, wallet, maxFee, maxFunding, fee, funding, payout] = await Promise.all([
        read(address, farmVaultInterface, "masterchef"), read(address, farmVaultInterface, "token"), read(address, farmVaultInterface, "poolID"),
        read(address, farmVaultInterface, "treasury"), read(address, farmVaultInterface, "treasuryWallet"),
        read(address, farmVaultInterface, "maxFee"), read(address, farmVaultInterface, "maxFundingFee"),
        read(address, farmVaultInterface, "depositFee"), read(address, farmVaultInterface, "fundingRate"), read(address, farmVaultInterface, "defaultDirectPayout"),
      ]);
      requireAddress(chef[0], common.masterchef, "Vault MasterChef"); requireAddress(token[0], match.rewardToken, "Vault reward token");
      requireAddress(governor[0], common.governor, "Vault reward recipient"); requireAddress(wallet[0], common.treasuryWallet, "Vault fee treasury");
      if (pid[0] !== BigInt(pool.poolId)) throw new Error("Vault pool identifier does not match its registry slot.");
      if (maxFee[0] !== 500n || maxFunding[0] !== 250n || fee[0] > 500n || funding[0] > 250n || payout[0] > 10_000n)
        throw new Error("Vault fees or payouts are outside reviewed limits.");
      if (spec.tokenAddress) {
        const [asset, precision] = await Promise.all([read(address, farmVaultInterface, "stakeToken"), read(spec.tokenAddress, farmTokenInterface, "decimals")]);
        requireAddress(asset[0], match.stakeToken!, "Immutable deposit asset");
        if (precision[0] !== BigInt(spec.decimals)) throw new Error("Deposit asset decimals differ from its reviewed precision.");
        // No wallet is connected during discovery. Check the vault and treasury;
        // normal transaction preparation also checks the actual wallet account.
        await verifyFarmTokenState(rpc, spec, address, tag);
      }
      return { ...base, label: spec.symbol + " farm", status: "supported", templateId: match.template.id,
        reason: pool.allocPoint === "0" ? "Reviewed farm and deposit asset verified. This pool currently has no reward allocation." : "Reviewed farm implementation, deposit asset and registry wiring verified.",
        readSpec: { id: spec.id, address, tokenAddress: spec.tokenAddress, decimals: spec.decimals, poolId: spec.poolId, runtimeCodeHash: spec.runtimeCodeHash },
        writeSpec: spec, priceId: reviewed.id, logoId: reviewed.id };
    } catch (error) { active(signal); return { ...base, reason: errorText(error) }; }
  }));
  await canonical(); active(signal);
  return { pools, discoveries, partial, warnings, block: block.number, blockHash: block.hash, timestamp: block.timestamp };
}
