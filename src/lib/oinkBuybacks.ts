import { Interface, keccak256, toQuantity, zeroPadValue } from "ethers";
import { COMMUNITY_DEPLOYMENTS } from "../config/communityMaintenanceVerification";
import { OINK_TOKEN } from "../config/contracts";
import type { FarmReadRpc } from "./farmTransactions";
import { getPublicProvider } from "./chain";
import { waitForForegroundDisplayReads } from "./displayReadPriority";
import history from "../data/oink-buyback-history.json" with { type: "json" };

export const OINK_BUYBACK_ADDRESSES = [COMMUNITY_DEPLOYMENTS.buyback.address] as const;
export const OINK_BUYBACK_FROM_BLOCK = 21946386;
const deployment = COMMUNITY_DEPLOYMENTS;
const abi = new Interface([
  "function DTX() view returns(address)", "function wPLS() view returns(address)",
  "function PAIR_ADDRESS() view returns(address)", "function UNISWAP_ROUTER_ADDRESS() view returns(address)",
  "function token0() view returns(address)", "function token1() view returns(address)",
  "function buyWithPLS()",
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
const HASH = /^0x[0-9a-f]{64}$/i;
const same = (a: unknown, b: string) => typeof a === "string" && a.toLowerCase() === b.toLowerCase();
export type BuybackRow = { address: string; key: string; tx: string; block: number; blockHash: string; index: number; timestamp: number; spentRaw: bigint; oinkRaw: bigint };
export type BuybackSnapshot = { block: number; hash: string; timestamp: number; rows: BuybackRow[]; totalOinkRaw: bigint; totalSpentRaw: bigint };
export type BuybackSeed = { contracts: { address: string; fromBlock: number }[]; block: number; hash: string; timestamp: number; rows: (Omit<BuybackRow, "spentRaw" | "oinkRaw"> & { spentRaw: string; oinkRaw: string })[] };
type Block = { number: string; timestamp: string; hash: string };
type Log = { address: string; topics: string[]; data: string; blockNumber: string; blockHash: string; transactionHash: string; logIndex: string; removed?: boolean };
function unsigned(raw: unknown): number {
  if (typeof raw !== "string" || !/^0x[0-9a-f]+$/i.test(raw)) throw Error("Invalid buyback record.");
  const value = Number(BigInt(raw));
  if (!Number.isSafeInteger(value) || value < 0) throw Error("Invalid buyback record.");
  return value;
}
function blockOf(value: any, expected?: number): Block {
  if (!value || !HASH.test(value.hash) || unsigned(value.timestamp) <= 0
    || (expected != null && unsigned(value.number) !== expected)) throw Error("Buyback block unavailable.");
  unsigned(value.number);
  return value;
}
function merge(rows: readonly BuybackRow[]) {
  const unique = new Map<string, BuybackRow>();
  for (const row of rows) {
    if (!same(row.address, deployment.buyback.address) || !HASH.test(row.tx) || !HASH.test(row.blockHash)
      || row.key !== `${row.tx.toLowerCase()}:${row.index}` || !Number.isSafeInteger(row.block) || row.block < OINK_BUYBACK_FROM_BLOCK
      || !Number.isSafeInteger(row.index) || row.index < 0 || !Number.isSafeInteger(row.timestamp) || row.timestamp <= 0
      || row.spentRaw <= 0n || row.oinkRaw <= 0n) throw Error("Invalid buyback history.");
    const previous = unique.get(row.key);
    if (previous && (previous.block !== row.block || !same(previous.blockHash, row.blockHash)
      || previous.spentRaw !== row.spentRaw || previous.oinkRaw !== row.oinkRaw || previous.timestamp !== row.timestamp)) throw Error("Conflicting buyback history.");
    unique.set(row.key, row);
  }
  return [...unique.values()].sort((a, b) => b.block - a.block || b.index - a.index);
}
export function aggregateBuybacks(snapshot: BuybackSnapshot, seconds?: number) {
  const rows = snapshot.rows.filter(row => row.timestamp <= snapshot.timestamp && (seconds == null || row.timestamp >= snapshot.timestamp - seconds));
  return { count: rows.length, spentRaw: rows.reduce((sum, row) => sum + row.spentRaw, 0n), oinkRaw: rows.reduce((sum, row) => sum + row.oinkRaw, 0n) };
}
function snapshotOf(block: number, hash: string, timestamp: number, rows: BuybackRow[]): BuybackSnapshot {
  const snapshot = { block, hash, timestamp, rows: merge(rows), totalOinkRaw: 0n, totalSpentRaw: 0n };
  if (snapshot.rows.some(row => row.block > block || row.timestamp > timestamp)) throw Error("Invalid buyback range.");
  const totals = aggregateBuybacks(snapshot);
  return { ...snapshot, totalOinkRaw: totals.oinkRaw, totalSpentRaw: totals.spentRaw };
}
function archiveOf(seed: BuybackSeed) {
  if (seed.contracts.length !== 1 || !same(seed.contracts[0].address, deployment.buyback.address)
    || seed.contracts[0].fromBlock !== OINK_BUYBACK_FROM_BLOCK || !Number.isSafeInteger(seed.block) || seed.block < OINK_BUYBACK_FROM_BLOCK
    || !HASH.test(seed.hash) || !Number.isSafeInteger(seed.timestamp) || seed.timestamp <= 0) throw Error("Invalid buyback archive.");
  return snapshotOf(seed.block, seed.hash, seed.timestamp, seed.rows.map(row => {
    if (!/^\d+$/.test(row.spentRaw) || !/^\d+$/.test(row.oinkRaw)) throw Error("Invalid buyback archive amount.");
    return { ...row, spentRaw: BigInt(row.spentRaw), oinkRaw: BigInt(row.oinkRaw) };
  }));
}

/** The deployed helper has no purchase event. Count only its successful direct
 * buyWithPLS calls with a matching pair Swap and incoming OINK Transfer. The
 * treasury forward can include donated OINK; daily usage can include refunds.
 * Neither is a purchase amount. Gas is excluded from PLS spent. */
export async function readBuybacks(rpc: FarmReadRpc, previous: BuybackSnapshot | null = null, seed: BuybackSeed = history, signal?: AbortSignal): Promise<BuybackSnapshot> {
  const deadline = Date.now() + 45000;
  const send = async (method: string, params: unknown[]) => {
    signal?.throwIfAborted();
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw Error("Buyback read timed out.");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      const value = await Promise.race([rpc.send(method, params), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(Error("Buyback read timed out.")), Math.min(remaining, 12000));
        abort = () => reject(signal?.reason ?? Error("Buyback read canceled."));
        signal?.addEventListener("abort", abort, { once: true });
      })]);
      signal?.throwIfAborted();
      return value;
    } finally { clearTimeout(timer); if (abort) signal?.removeEventListener("abort", abort); }
  };
  if (BigInt(await send("eth_chainId", [])) !== 369n) throw Error("PulseChain required.");
  const tip = blockOf(await send("eth_getBlockByNumber", ["latest", false]));
  const block = unsigned(tip.number), timestamp = unsigned(tip.timestamp);
  if (Date.now() / 1000 - timestamp >= 120 || timestamp > Date.now() / 1000 + 30) throw Error("Current buyback block unavailable.");
  const archive = archiveOf(seed);
  if (archive.block > block) throw Error("Buyback archive is ahead of the chain.");
  const blocks = new Map<number, Block>([[block, tip]]);
  const blockAt = async (number: number) => {
    if (!blocks.has(number)) blocks.set(number, blockOf(await send("eth_getBlockByNumber", [toQuantity(number), false]), number));
    return blocks.get(number)!;
  };
  const anchor = await blockAt(archive.block);
  if (!same(anchor.hash, archive.hash) || unsigned(anchor.timestamp) !== archive.timestamp) throw Error("Buyback archive anchor changed.");
  const readAddress = async (target: string, method: string, expected: string) => {
    const result = await send("eth_call", [{ to: target, data: abi.encodeFunctionData(method) }, toQuantity(block)]);
    if (!same(abi.decodeFunctionResult(method, result)[0], expected)) throw Error("Buyback contract identity changed.");
  };
  await Promise.all([
    ...[deployment.buyback, deployment.pair].map(async contract => {
      const code = await send("eth_getCode", [contract.address, toQuantity(block)]);
      if (keccak256(code) !== contract.runtimeCodeHash) throw Error("Buyback contract code changed.");
    }),
    readAddress(deployment.buyback.address, "DTX", OINK_TOKEN),
    readAddress(deployment.buyback.address, "wPLS", deployment.wpls.address),
    readAddress(deployment.buyback.address, "PAIR_ADDRESS", deployment.pair.address),
    readAddress(deployment.buyback.address, "UNISWAP_ROUTER_ADDRESS", deployment.router.address),
    readAddress(deployment.pair.address, "token0", deployment.wpls.address),
    readAddress(deployment.pair.address, "token1", OINK_TOKEN),
  ]);
  let base = archive;
  if (previous && previous.block >= archive.block && previous.block <= block) {
    const prior = await blockAt(previous.block);
    if (same(prior.hash, previous.hash) && unsigned(prior.timestamp) === previous.timestamp) {
      base = snapshotOf(previous.block, previous.hash, previous.timestamp, previous.rows);
    }
  }
  const rows = [...base.rows];
  const seen = new Set(rows.map(row => row.key));
  const range = async (from: number, to: number): Promise<void> => {
    const logs = await send("eth_getLogs", [{ address: deployment.pair.address,
      topics: [abi.getEvent("Swap")!.topicHash, null, zeroPadValue(deployment.buyback.address, 32)], fromBlock: toQuantity(from), toBlock: toQuantity(to) }]);
    if (!Array.isArray(logs)) throw Error("Buyback history unavailable.");
    if (logs.length >= 1000) {
      if (from === to) throw Error("Buyback history incomplete.");
      const middle = Math.floor((from + to) / 2);
      await range(from, middle); await range(middle + 1, to); return;
    }
    for (const log of logs as Log[]) {
      const number = unsigned(log.blockNumber), index = unsigned(log.logIndex);
      if (log.removed || !same(log.address, deployment.pair.address) || number < from || number > to
        || !HASH.test(log.transactionHash) || !HASH.test(log.blockHash)) throw Error("Unexpected buyback record.");
      const event = abi.parseLog(log);
      if (!event || event.name !== "Swap" || !same(event.args.to, deployment.buyback.address)) throw Error("Unexpected buyback swap.");
      const key = `${log.transactionHash.toLowerCase()}:${index}`;
      if (seen.has(key)) {
        const prior = rows.find(row => row.key === key)!;
        if (prior.block !== number || !same(prior.blockHash, log.blockHash) || prior.spentRaw !== event.args.amount0In || prior.oinkRaw !== event.args.amount1Out) throw Error("Conflicting buyback record.");
        continue;
      }
      const [tx, receipt, eventBlock] = await Promise.all([
        send("eth_getTransactionByHash", [log.transactionHash]), send("eth_getTransactionReceipt", [log.transactionHash]), blockAt(number),
      ]);
      if (!tx || !receipt || unsigned(receipt.status) !== 1 || !same(receipt.transactionHash, log.transactionHash)
        || !same(tx.hash, log.transactionHash) || !same(tx.blockHash, log.blockHash) || !same(receipt.blockHash, log.blockHash)
        || unsigned(tx.blockNumber) !== number || unsigned(receipt.blockNumber) !== number || !same(eventBlock.hash, log.blockHash)
        || !Array.isArray(receipt.logs)) throw Error("Buyback transaction unavailable.");
      // Anyone may send unsolicited swaps to this address. They are excluded.
      if (!same(tx.to, deployment.buyback.address) || !same(tx.input ?? tx.data, abi.encodeFunctionData("buyWithPLS"))) continue;
      for (const item of receipt.logs as Log[]) {
        if (item.removed || !same(item.transactionHash, log.transactionHash) || !same(item.blockHash, log.blockHash)
          || unsigned(item.blockNumber) !== number) throw Error("Buyback receipt log changed.");
      }
      if (!same(event.args.sender, deployment.router.address) || event.args.amount0In <= 0n || event.args.amount1Out <= 0n
        || event.args.amount1In !== 0n || event.args.amount0Out !== 0n) throw Error("Invalid buyback amounts.");
      const matchingSwap = receipt.logs.filter((item: Log) => same(item.address, log.address) && unsigned(item.logIndex) === index);
      if (matchingSwap.length !== 1 || matchingSwap[0].removed || matchingSwap[0].data !== log.data
        || JSON.stringify(matchingSwap[0].topics).toLowerCase() !== JSON.stringify(log.topics).toLowerCase()) throw Error("Buyback receipt changed.");
      const incoming = receipt.logs.filter((item: Log) => same(item.address, OINK_TOKEN)
        && same(item.topics[0], abi.getEvent("Transfer")!.topicHash)).map((item: Log) => abi.parseLog(item)!)
        .filter((item: any) => same(item.args.from, deployment.pair.address) && same(item.args.to, deployment.buyback.address));
      if (incoming.length !== 1 || incoming[0].args.value !== event.args.amount1Out) throw Error("Purchased OINK transfer unavailable.");
      const paid = receipt.logs.filter((item: Log) => same(item.address, deployment.wpls.address)
        && same(item.topics[0], abi.getEvent("Transfer")!.topicHash)).map((item: Log) => abi.parseLog(item)!)
        .filter((item: any) => same(item.args.from, deployment.router.address) && same(item.args.to, deployment.pair.address));
      if (paid.length !== 1 || paid[0].args.value !== event.args.amount0In) throw Error("Buyback PLS payment unavailable.");
      rows.push({ address: deployment.buyback.address, key, tx: log.transactionHash.toLowerCase(), block: number,
        blockHash: log.blockHash.toLowerCase(), index, timestamp: unsigned(eventBlock.timestamp), spentRaw: event.args.amount0In, oinkRaw: event.args.amount1Out });
      seen.add(key);
    }
  };
  for (let from = base.block + 1; from <= block; from += 25000) await range(from, Math.min(block, from + 24999));
  if (!same(blockOf(await send("eth_getBlockByNumber", [toQuantity(block), false]), block).hash, tip.hash)) throw Error("Buyback head changed.");
  return snapshotOf(block, tip.hash, timestamp, rows);
}

let previous: BuybackSnapshot | null = null;
export function peekPublicBuybacks() { return previous; }
export async function readPublicBuybacks(signal?: AbortSignal) {
  const controller = signal ?? AbortSignal.timeout(50000);
  await waitForForegroundDisplayReads(controller);
  const snapshot = await readBuybacks(await getPublicProvider(), previous, history, controller);
  if (!previous || snapshot.block >= previous.block) previous = snapshot;
  return snapshot;
}
