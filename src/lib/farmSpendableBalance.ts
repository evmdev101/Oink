import { Interface, toQuantity } from "ethers";
import type { FarmReadRpc, FarmWriteSpec } from "./farmTransactions";

const locks = new Interface(["function lockedAmount(address) view returns(uint256)"]);
export function farmHasTransferLocks(spec: Pick<FarmWriteSpec, "tokenPolicy"> | undefined): boolean {
  return spec?.tokenPolicy?.kind === "variable-transfer" && spec.tokenPolicy.lockedBalance === "lockedAmount";
}

/** Token locks stay in balanceOf but cannot be transferred into an OINK farm. */
export function farmSpendableBalance(total: bigint, locked: bigint): bigint {
  if (total < 0n || locked < 0n || locked > total) throw Error("Token lock accounting is inconsistent. Transferable balance is unavailable.");
  return total - locked;
}

export async function readFarmLockedBalance(rpc: FarmReadRpc, spec: FarmWriteSpec, account: string, block: string | number): Promise<bigint> {
  if (!farmHasTransferLocks(spec)) return 0n;
  if (!spec.tokenAddress) throw Error("Token locks require a token address.");
  return BigInt(locks.decodeFunctionResult("lockedAmount", await rpc.send("eth_call", [{ to: spec.tokenAddress, data: locks.encodeFunctionData("lockedAmount", [account]) }, toQuantity(block)]))[0]);
}
