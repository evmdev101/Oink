import { Interface, getAddress, toQuantity, zeroPadValue } from "ethers";
import { TREASURY_WALLET } from "../config/contracts";
import type { FarmReadRpc } from "./farmTransactions";
import { decodeActivity, treasuryActivityAssets, type ActivityRow } from "./treasuryActivity";

const transferAbi = new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const monthSeconds = 30 * 86400;
const chunkSize = 25000;
type Block = { number: string; hash: string; timestamp: string };
export type TreasuryInflows = {
  from: number; to: number; fromTimestamp: number; toTimestamp: number; toHash: string;
  partial: false; rows: ActivityRow[];
};

/** Read only incoming, tracked ERC20 transfers; never scans unrelated farm events.
 * A successful result covers the whole month. Refreshes reuse canonical history
 * and scan only new blocks. Errors leave the previous snapshot untouched. */
export async function readTreasuryInflows(rpc: FarmReadRpc, previous: TreasuryInflows | null = null, signal?: AbortSignal): Promise<TreasuryInflows> {
  const send = async (method: string, params: unknown[]) => {
    signal?.throwIfAborted();
    const value = await rpc.send(method, params);
    signal?.throwIfAborted();
    return value;
  };
  const readBlock = async (number: number | "latest"): Promise<Block> => {
    const value = await send("eth_getBlockByNumber", [number === "latest" ? number : toQuantity(number), false]);
    if (!value?.hash || !value?.number || !value?.timestamp
      || (number !== "latest" && Number(BigInt(value.number)) !== number)) throw Error("Inflow block unavailable.");
    return value;
  };
  if (BigInt(await send("eth_chainId", [])) !== 369n) throw Error("Wrong chain.");
  const tip = await readBlock("latest"), to = Number(BigInt(tip.number)), toTimestamp = Number(BigInt(tip.timestamp));
  if (!Number.isSafeInteger(to) || Date.now() / 1000 - toTimestamp >= 120 || toTimestamp > Date.now() / 1000 + 30) throw Error("Inflow snapshot is stale.");
  const cutoff = toTimestamp - monthSeconds;
  let reuse = previous && previous.to <= to && previous.fromTimestamp <= cutoff ? previous : null;
  if (reuse && (await readBlock(reuse.to)).hash !== reuse.toHash) reuse = null;
  const rows = new Map<string, ActivityRow>(reuse?.rows.map(row => [row.key, row]) ?? []);
  const blocks = new Map<number, Block>([[to, tip]]);
  const blockAt = async (number: number) => {
    if (!blocks.has(number)) blocks.set(number, await readBlock(number));
    return blocks.get(number)!;
  };
  let from = reuse?.from ?? to, fromTimestamp = reuse?.fromTimestamp ?? toTimestamp;
  let cursor = to, finished = reuse?.to === to;
  for (let chunk = 0; !finished && chunk < 64; chunk++) {
    const start = Math.max(reuse ? reuse.to + 1 : 0, cursor - chunkSize + 1);
    const [first, logs] = await Promise.all([
      blockAt(start),
      send("eth_getLogs", [{ address: treasuryActivityAssets.map(asset => asset.address),
        topics: [transferAbi.getEvent("Transfer")!.topicHash, null, zeroPadValue(TREASURY_WALLET, 32)],
        fromBlock: toQuantity(start), toBlock: toQuantity(cursor) }]),
    ]);
    if (!Array.isArray(logs) || logs.length >= 1000) throw Error("Inflow history response is incomplete.");
    const decoded: { row: ActivityRow; blockHash: string }[] = [];
    for (const log of logs) {
      if (log.removed) throw Error("Inflow history changed while loading.");
      const row = decodeActivity(log), transfer = transferAbi.parseLog(log);
      if (!row || !transfer || row.block < start || row.block > cursor
        || row.recipient?.toLowerCase() !== TREASURY_WALLET.toLowerCase()) {
        // Zero-value transfers have no monetary effect and are intentionally omitted.
        if (transfer?.args.value === 0n) continue;
        throw Error("Unexpected inflow record.");
      }
      if (getAddress(transfer.args.from) === getAddress(TREASURY_WALLET)) continue;
      decoded.push({ row: { ...row, label: "Treasury received" }, blockHash: log.blockHash });
    }
    const numbers = [...new Set(decoded.map(item => item.row.block))];
    for (let offset = 0; offset < numbers.length; offset += 6) await Promise.all(numbers.slice(offset, offset + 6).map(blockAt));
    for (const item of decoded) {
      const block = blocks.get(item.row.block)!;
      if (block.hash !== item.blockHash) throw Error("Inflow event block changed.");
      rows.set(item.row.key, { ...item.row, timestamp: Number(BigInt(block.timestamp)) });
    }
    if (!reuse) { from = start; fromTimestamp = Number(BigInt(first.timestamp)); }
    finished = reuse ? start === reuse.to + 1 : fromTimestamp <= cutoff || start === 0;
    cursor = start - 1;
  }
  if (!finished) throw Error("Thirty-day inflow history is not fully loaded.");
  if ((await readBlock(to)).hash !== tip.hash) throw Error("Inflow snapshot changed.");
  return { from, to, fromTimestamp, toTimestamp, toHash: tip.hash, partial: false,
    rows: [...rows.values()].filter(row => row.timestamp! >= cutoff).sort((a,b) => b.block - a.block || b.index - a.index) };
}
