import { getAddress, type JsonRpcProvider } from "ethers";
import type { PreparedGovernanceAction } from "./governanceTransactions";

// Read-only infrastructure, deliberately not connected to any UI action.
// A successful eth_call may still finalize a rejected proposal; it is not an
// approval, an effect audit, or permission to broadcast.
export async function simulateGovernanceAction(
  rpc: Pick<JsonRpcProvider, "send" | "getBlock" | "getCode" | "call">,
  action: PreparedGovernanceAction,
  caller: string,
) {
  if (action.blocked !== true || action.value !== 0n) throw new Error("Only blocked, zero-value previews are supported.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Simulation requires PulseChain.");
  const block = await rpc.getBlock("latest");
  if (!block?.hash) throw new Error("Cannot verify simulation block.");
  const to = getAddress(action.to);
  if (await rpc.getCode(to, block.number) === "0x") throw new Error("Target has no deployed code.");
  const result = await rpc.call({ to, from: getAddress(caller), data: action.data, value: 0n, blockTag: block.number });
  if ((await rpc.getBlock(block.number))?.hash !== block.hash) throw new Error("Simulation block changed; retry.");
  return { blockNumber: block.number, result, blocked: true as const,
    warning: "Call did not revert. Outcome and asset effects are not verified; broadcasting remains disabled." };
}
