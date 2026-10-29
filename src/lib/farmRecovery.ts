import { Interface, ZeroAddress, formatUnits, getAddress } from "ethers";
import { assertCurrentFarmSpec, getFarmWriteSpec } from "./farmCatalog";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";

export const FARM_RECOVERY_PAGE_SIZE = 20;
export const farmRecoveryAbi = new Interface([
  "function getNrOfStakes(address) view returns(uint256)",
  "function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256)",
]);
export type FarmRecoverySnapshot = {
  farmId: string; account: string; symbol: string; address: string;
  block: number; blockHash: string; timestamp: number; count: number; start: number;
  positions: { index: number; amount: string; amountRaw: string }[];
};

export function recoveryPositionIndex(input: string) {
  if (!/^(0|[1-9]\d*)$/.test(input) || !Number.isSafeInteger(Number(input))) throw new Error("Enter a whole, nonnegative position index.");
  return Number(input);
}

/** Principal-only discovery: never calls rewards, harvest, token-price or yield services. */
export async function readFarmRecovery(rpc: FarmReadRpc, farmId: string, accountInput: string, start = 0, signal?: AbortSignal, now = Date.now()): Promise<FarmRecoverySnapshot> {
  const spec = getFarmWriteSpec(farmId);
  if (!spec) throw new Error("Emergency recovery supports verified farm assets only.");
  const account = getAddress(accountInput);
  if (account === ZeroAddress) throw new Error("Connect a nonzero wallet address.");
  if (!Number.isSafeInteger(start) || start < 0) throw new Error("Select a valid position index.");
  signal?.throwIfAborted();
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Recovery requires PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
  if (!block?.number || !/^0x[0-9a-f]{64}$/i.test(block.hash ?? "") || !block.timestamp) throw new Error("A verified snapshot block is unavailable.");
  const timestamp = Number(BigInt(block.timestamp)), blockNumber = Number(BigInt(block.number));
  if (!Number.isSafeInteger(timestamp) || !Number.isSafeInteger(blockNumber) || blockNumber < 0
    || !Number.isFinite(now) || now - timestamp * 1000 >= 120000 || timestamp * 1000 - now > 30000) throw new Error("Recovery data is stale. Refresh for a current snapshot.");
  const tag = block.number;
  verifyRuntime(await rpc.send("eth_getCode", [spec.address, tag]), spec.runtimeCodeHash, "Farm recovery");
  const read = async (method: string, args: unknown[]) => {
    signal?.throwIfAborted();
    const result = await rpc.send("eth_call", [{ to: spec.address, data: farmRecoveryAbi.encodeFunctionData(method, args) }, tag]);
    signal?.throwIfAborted();
    return farmRecoveryAbi.decodeFunctionResult(method, result);
  };
  const rawCount = (await read("getNrOfStakes", [account]))[0] as bigint;
  if (rawCount > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Position count exceeds the supported index range.");
  const count = Number(rawCount);
  if ((count === 0 && start !== 0) || (count > 0 && start >= count)) throw new Error("That position no longer exists. Load positions from index 0.");
  const end = Math.min(count, start + FARM_RECOVERY_PAGE_SIZE);
  const positions: FarmRecoverySnapshot["positions"] = [];
  // A bounded page and four concurrent reads work even for wallets with more
  // than the main portfolio's scan limit, without pretending to show a total.
  for (let offset = start; offset < end; offset += 4) {
    const rows = await Promise.all(Array.from({ length: Math.min(4, end - offset) }, async (_, relative) => {
      const index = offset + relative, position = await read("userInfo", [account, BigInt(index)]);
      return { index, amount: formatUnits(position[0], spec.decimals), amountRaw: position[0].toString() };
    }));
    positions.push(...rows);
  }
  signal?.throwIfAborted();
  if ((await rpc.send("eth_getBlockByNumber", [tag, false]))?.hash !== block.hash) throw new Error("Recovery snapshot changed. Refresh before selecting a position.");
  signal?.throwIfAborted();
  assertCurrentFarmSpec(spec);
  return { farmId, account, symbol: spec.symbol, address: spec.address, block: blockNumber, blockHash: block.hash, timestamp, count, start, positions };
}
