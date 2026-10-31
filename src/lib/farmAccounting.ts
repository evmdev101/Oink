import { Interface, toQuantity } from "ethers";
import type { FarmReadRpc, FarmWriteSpec } from "./farmTransactions";

const abi = new Interface(["function balanceOf(address) view returns(uint256)", "function vaultBalance() view returns(uint256)"]);
export const receivedFarmAccounting = (spec: FarmWriteSpec) => spec.tokenPolicy?.kind === "variable-transfer" && spec.tokenPolicy.accounting === "received";
export const variableFarmTransfers = (spec: FarmWriteSpec) => spec.tokenPolicy?.kind === "variable-transfer";

/** Actual liquidity and reward denominators differ in reflection-aware vaults. */
export async function readFarmAssetBalance(rpc: FarmReadRpc, spec: FarmWriteSpec, block: string | number): Promise<bigint> {
  const tag = toQuantity(block);
  return spec.tokenAddress
    ? BigInt(abi.decodeFunctionResult("balanceOf", await rpc.send("eth_call", [{ to: spec.tokenAddress, data: abi.encodeFunctionData("balanceOf", [spec.address]) }, tag]))[0])
    : BigInt(await rpc.send("eth_getBalance", [spec.address, tag]));
}
export async function readFarmRewardBalance(rpc: FarmReadRpc, spec: FarmWriteSpec, block: string | number): Promise<bigint> {
  if (!receivedFarmAccounting(spec)) return readFarmAssetBalance(rpc, spec, block);
  return BigInt(abi.decodeFunctionResult("vaultBalance", await rpc.send("eth_call", [{ to: spec.address, data: abi.encodeFunctionData("vaultBalance") }, toQuantity(block)]))[0]);
}
