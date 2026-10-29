import { Interface, getAddress, keccak256 } from "ethers";
import type { FarmReadRpc, FarmWriteSpec } from "./farmTransactions";

export type FarmTokenPolicy =
  | { kind: "usdt" }
  | { kind: "usdc"; implementation: { slot: string; address: string; runtimeCodeHash: string } };

export function farmTokenPolicyWarnings(spec: FarmWriteSpec): string[] {
  if (!spec.tokenPolicy) return [];
  return [spec.tokenPolicy.kind === "usdt"
    ? "The pUSDT administrator can pause transfers, block addresses, enable transfer fees or replace the token implementation. These settings are checked again before opening your wallet but can change before mining."
    : "The pUSDC administrator can pause transfers, block addresses or upgrade the token implementation. These settings are checked again before opening your wallet but can change before mining."];
}

export const farmTokenSafetyAbi = new Interface([
  "function paused() view returns(bool)", "function deprecated() view returns(bool)",
  "function basisPointsRate() view returns(uint256)", "function maximumFee() view returns(uint256)",
  "function isBlackListed(address) view returns(bool)", "function isBlacklisted(address) view returns(bool)",
]);

/** Check the exact asset implementation and transfer mode at the review block. */
export async function verifyFarmTokenState(rpc: FarmReadRpc, spec: FarmWriteSpec, account: string, tag: string) {
  if (!spec.tokenAddress) return;
  const code = await rpc.send("eth_getCode", [spec.tokenAddress, tag]);
  if (code === "0x" || keccak256(code).toLowerCase() !== spec.tokenRuntimeCodeHash?.toLowerCase()) throw new Error("Deposit token runtime does not match the verified deployment.");
  const policy = spec.tokenPolicy;
  if (!policy) return;
  if (policy.kind !== "usdt" && policy.kind !== "usdc") throw new Error("Unsupported deposit token policy.");
  const read = async (method: string, args: unknown[] = []) => farmTokenSafetyAbi.decodeFunctionResult(method,
    await rpc.send("eth_call", [{ to: spec.tokenAddress, data: farmTokenSafetyAbi.encodeFunctionData(method, args) }, tag]))[0];
  if (policy.kind === "usdc") {
    const pinned = policy.implementation;
    const word = await rpc.send("eth_getStorageAt", [spec.tokenAddress, pinned.slot, tag]);
    if (typeof word !== "string" || !/^0x0{24}[0-9a-f]{40}$/i.test(word) || getAddress("0x" + word.slice(-40)) !== getAddress(pinned.address)) throw new Error("Token implementation changed. This farm needs a new verification before use.");
    const implementationCode = await rpc.send("eth_getCode", [pinned.address, tag]);
    if (implementationCode === "0x" || keccak256(implementationCode).toLowerCase() !== pinned.runtimeCodeHash.toLowerCase()) throw new Error("Token implementation runtime does not match the verified deployment.");
  } else {
    const [deprecated, rate, maximum] = await Promise.all([read("deprecated"), read("basisPointsRate"), read("maximumFee")]);
    if (deprecated !== false) throw new Error("This token has switched to another implementation. Farm actions need a new verification.");
    if (rate !== 0n || maximum !== 0n) throw new Error("This token has transfer-fee settings enabled. Its farm actions are unavailable here.");
  }
  if (await read("paused") !== false) throw new Error("This deposit token is paused. Farm actions are unavailable.");
  const blocked = await Promise.all([...new Set([account, spec.address, spec.treasuryWallet].map(getAddress))]
    .map(address => read(policy.kind === "usdt" ? "isBlackListed" : "isBlacklisted", [address])));
  if (blocked.some(value => value !== false)) throw new Error("The token blocks this wallet, farm or fee recipient. Farm actions are unavailable.");
}

export function verifyFarmApprovalResult(result: string, spec: FarmWriteSpec) {
  // The verified historical USDT implementation intentionally returns no data.
  // Empty data from any other token is never accepted as a successful approval.
  if (spec.tokenPolicy?.kind === "usdt") {
    if (result !== "0x") throw new Error("Unexpected return data from this token's approval.");
  } else if (result.toLowerCase() !== "0x" + "0".repeat(63) + "1") {
    throw new Error("The token did not confirm the simulated approval.");
  }
}
