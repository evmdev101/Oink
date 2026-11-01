import fs from "node:fs/promises";
import { Interface, keccak256, toQuantity, zeroPadValue } from "ethers";

// Verified deployed source: evidence/community-maintenance/buyback.sol.
// AccumulateDTX has no purchase event. Record its direct buyWithPLS calls using
// the trading pair's actual Swap input/output, excluding router PLS refunds.
const ADDRESS = "0xa36d037B01C148025C54e4f86C0032F05a93D4Ce";
const FROM = 21946386;
const CREATION = "0xb59ef613113ce3adc5668b1f02301d9fc72e4ae38aaa0a9f9365e99ee55fe19e";
const RUNTIME = "0x22dc47922e1c9f53e0ad37ac0995c7d7a34c1372aed9b6be8261717b4319a14c";
const PAIR = "0xEf9Ea3d72e28c7140481209190601C085027D6fE";
const ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9";
const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
const OINK = "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38";
const api = new Interface([
  "function DTX() view returns(address)", "function wPLS() view returns(address)",
  "function PAIR_ADDRESS() view returns(address)", "function uniswapRouter() view returns(address)",
  "function token0() view returns(address)", "function token1() view returns(address)",
  "function buyWithPLS()",
  "event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
const same = (a, b) => typeof a === "string" && a.toLowerCase() === b.toLowerCase();
let sequence = 0;
const rpcUrl = process.env.OINK_BUYBACK_RPC || "https://rpc.pulsechain.com";
async function rpc(method, params) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++sequence, method, params }), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error("RPC HTTP " + response.status);
      const data = await response.json();
      if (data.error) throw Error(JSON.stringify(data.error));
      if (data.result === undefined) throw Error("Empty RPC result");
      return data.result;
    } catch (error) { last = error; }
  }
  throw last;
}
async function readBlock(number) {
  const value = await rpc("eth_getBlockByNumber", [number === "latest" ? number : toQuantity(number), false]);
  if (!value?.hash || !value.number || !value.timestamp || number !== "latest" && Number(BigInt(value.number)) !== number) throw Error("Invalid block");
  return value;
}
async function concurrent(values, workers, operation) {
  const output = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    while (cursor < values.length) { const index = cursor++; output[index] = await operation(values[index]); }
  }));
  return output;
}
if (BigInt(await rpc("eth_chainId", [])) !== 369n) throw Error("PulseChain required");
const head = await readBlock("latest"), block = Number(BigInt(head.number)), timestamp = Number(BigInt(head.timestamp));
const creation = await rpc("eth_getTransactionReceipt", [CREATION]);
if (Number(BigInt(creation.blockNumber)) !== FROM || !same(creation.contractAddress, ADDRESS) || BigInt(creation.status) !== 1n) throw Error("Creation does not match");
if (await rpc("eth_getCode", [ADDRESS, toQuantity(FROM - 1)]) !== "0x") throw Error("Deployment boundary changed");
if (keccak256(await rpc("eth_getCode", [ADDRESS, head.number])) !== RUNTIME) throw Error("Buyback runtime changed");
await Promise.all([[ADDRESS, "DTX", OINK], [ADDRESS, "wPLS", WPLS], [ADDRESS, "PAIR_ADDRESS", PAIR], [ADDRESS, "uniswapRouter", ROUTER],
  [PAIR, "token0", WPLS], [PAIR, "token1", OINK]].map(async ([to, method, expected]) => {
  const value = api.decodeFunctionResult(method, await rpc("eth_call", [{ to, data: api.encodeFunctionData(method) }, head.number]))[0];
  if (!same(value, expected)) throw Error("Contract identity changed: " + method);
}));
const topics = [api.getEvent("Swap").topicHash, null, zeroPadValue(ADDRESS, 32)];
async function range(from, to) {
  let logs;
  try { logs = await rpc("eth_getLogs", [{ address: PAIR, topics, fromBlock: toQuantity(from), toBlock: toQuantity(to) }]); }
  catch (error) {
    if (from === to) throw error;
    const middle = Math.floor((from + to) / 2);
    return [...await range(from, middle), ...await range(middle + 1, to)];
  }
  if (!Array.isArray(logs)) throw Error("Invalid logs");
  if (logs.length >= 1000) {
    if (from === to) throw Error("Log response truncated");
    const middle = Math.floor((from + to) / 2);
    return [...await range(from, middle), ...await range(middle + 1, to)];
  }
  for (const log of logs) if (log.removed || !same(log.address, PAIR) || Number(BigInt(log.blockNumber)) < from || Number(BigInt(log.blockNumber)) > to) throw Error("Unexpected log");
  return logs;
}
const ranges = [];
for (let from = FROM; from <= block; from += 25000) ranges.push([from, Math.min(block, from + 24999)]);
let finished = 0;
const logs = (await concurrent(ranges, 6, async ([from, to]) => {
  const found = await range(from, to);
  if (++finished % 40 === 0) console.log(`Scanned ${finished}/${ranges.length} ranges`);
  return found;
})).flat();
console.log("Candidate swaps", logs.length);
const rows = (await concurrent(logs, 6, async log => {
  const [tx, receipt, eventBlock] = await Promise.all([
    rpc("eth_getTransactionByHash", [log.transactionHash]), rpc("eth_getTransactionReceipt", [log.transactionHash]), readBlock(Number(BigInt(log.blockNumber))),
  ]);
  if (!tx || !receipt || !same(eventBlock.hash, log.blockHash) || !same(receipt.blockHash, log.blockHash) || !same(tx.blockHash, log.blockHash)) throw Error("Purchase block changed");
  // A third party may swap tokens to this address; that is not a protocol buyback.
  if (!same(tx.to, ADDRESS) || tx.input.toLowerCase() !== api.encodeFunctionData("buyWithPLS").toLowerCase()) return null;
  if (BigInt(receipt.status) !== 1n || !same(receipt.to, ADDRESS)) throw Error("Purchase did not succeed");
  const event = api.parseLog(log);
  if (!same(event.args.sender, ROUTER) || !same(event.args.to, ADDRESS) || event.args.amount0In <= 0n || event.args.amount1Out <= 0n
    || event.args.amount1In !== 0n || event.args.amount0Out !== 0n) throw Error("Unexpected buyback direction");
  const matchingSwaps = receipt.logs.filter(entry => same(entry.address, PAIR) && entry.topics[0] === api.getEvent("Swap").topicHash)
    .map(entry => api.parseLog(entry)).filter(entry => same(entry.args.to, ADDRESS));
  if (matchingSwaps.length !== 1) throw Error("Ambiguous buyback swap");
  const transfers = receipt.logs.filter(entry => same(entry.address, OINK) && entry.topics[0] === api.getEvent("Transfer").topicHash).map(entry => api.parseLog(entry));
  const received = transfers.filter(entry => same(entry.args.from, PAIR) && same(entry.args.to, ADDRESS)).reduce((sum, entry) => sum + entry.args.value, 0n);
  if (received !== event.args.amount1Out) throw Error("Purchased OINK does not match actual receipt");
  const spent = receipt.logs.filter(entry => same(entry.address, WPLS) && entry.topics[0] === api.getEvent("Transfer").topicHash).map(entry => api.parseLog(entry))
    .filter(entry => same(entry.args.from, ROUTER) && same(entry.args.to, PAIR)).reduce((sum, entry) => sum + entry.args.value, 0n);
  if (spent !== event.args.amount0In) throw Error("PLS spend does not match actual pair receipt");
  const txHash = log.transactionHash.toLowerCase(), index = Number(BigInt(log.logIndex));
  return { address: ADDRESS.toLowerCase(), key: `${txHash}:${index}`, tx: txHash, block: Number(BigInt(log.blockNumber)), blockHash: log.blockHash.toLowerCase(),
    index, timestamp: Number(BigInt(eventBlock.timestamp)), spentRaw: spent.toString(), oinkRaw: received.toString() };
})).filter(Boolean).sort((a, b) => b.block - a.block || b.index - a.index);
if (new Set(rows.map(row => row.key)).size !== rows.length || new Set(rows.map(row => row.tx)).size !== rows.length) throw Error("Duplicate buyback");
if (!same((await readBlock(block)).hash, head.hash)) throw Error("Archive anchor changed");
await fs.mkdir("src/data", { recursive: true });
await fs.writeFile("src/data/oink-buyback-history.json", JSON.stringify({ contracts: [{ address: ADDRESS, fromBlock: FROM }], block, hash: head.hash.toLowerCase(), timestamp, rows }, null, 2) + "\n");
console.log(JSON.stringify({ block, timestamp, purchases: rows.length, totalSpentRaw: rows.reduce((sum, row) => sum + BigInt(row.spentRaw), 0n).toString(), totalOinkRaw: rows.reduce((sum, row) => sum + BigInt(row.oinkRaw), 0n).toString(), latest: rows[0] }, null, 2));
