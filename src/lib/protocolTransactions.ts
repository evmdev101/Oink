import { getAddress, getCreateAddress, toQuantity, ZeroAddress, type Eip1193Provider } from "ethers";
import { assertGovernanceActionEnabled } from "../config/publicPreview";
import type { FarmReadRpc } from "./farmTransactions";

export type ProtocolRequest = { module: string; action: string; args: Record<string, string> };
export type ProtocolQuote = { title: string; account: string; block: number; blockHash: string; timestamp: number; to: string; data: string; value: string; facts: [string, string][]; warnings: string[]; fingerprint: string } & (
  { kind?: "call"; creation?: never } |
  { kind: "creation"; creation: { nonce: string; runtime: string } }
);
// For creation, `to` records the predicted contract for display/recovery only.
// protocolWalletTransaction removes it from the actual EVM creation request.
export type ProtocolReview = { request: ProtocolRequest; quote: ProtocolQuote; transaction: { from: string; to: string; data: string; value: string; chainId: string; gas: string; nonce?: string }; gasCost: string; createdAt: number };
export type ProtocolReceipt = { transactionHash: string; from: string; to: string | null; contractAddress?: string | null; blockNumber: string; blockHash: string; status: string; logs: { address: string; topics: string[]; data: string; removed?: boolean }[] };
export type ProtocolAdapter = { prepare(rpc: FarmReadRpc, account: string, request: ProtocolRequest): Promise<ProtocolQuote>; verify(rpc: FarmReadRpc, review: ProtocolReview, receipt: ProtocolReceipt): Promise<boolean> };
export const PROTOCOL_REVIEW_LIFETIME = 60_000;
const hashPattern = /^0x[0-9a-f]{64}$/i;
const quantity = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const addressEqual = (a: string, b: string) => getAddress(a) === getAddress(b);
export function validProtocolCreation(quote: ProtocolQuote) {
  return quote.kind === "creation" && !!quote.creation && quantity.test(quote.creation.nonce) && /^0x(?:[0-9a-f]{2})+$/i.test(quote.creation.runtime) && quote.value === "0x0" && addressEqual(quote.to, getCreateAddress({ from: quote.account, nonce: BigInt(quote.creation.nonce) }));
}
export function protocolWalletTransaction(review: Pick<ProtocolReview,"quote"|"transaction">) {
  if (review.quote.kind !== "creation") return review.transaction;
  if (!validProtocolCreation(review.quote) || review.transaction.nonce !== review.quote.creation.nonce || !addressEqual(review.transaction.to,review.quote.to)) throw Error("Invalid contract-creation request.");
  const { to: _predicted, ...creation } = review.transaction;
  return creation;
}

export async function prepareProtocolTransaction(rpc: FarmReadRpc, accountInput: string, request: ProtocolRequest, adapter: ProtocolAdapter, now = Date.now()): Promise<ProtocolReview> {
  const account = getAddress(accountInput);
  if (account === ZeroAddress || BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("Connect a nonzero wallet on PulseChain.");
  const quote = await adapter.prepare(rpc, account, request);
  if (!addressEqual(quote.account, account) || getAddress(quote.to) === ZeroAddress || !hashPattern.test(quote.blockHash) || !Number.isSafeInteger(quote.block) || quote.block < 0 || !quantity.test(quote.value) || !/^0x(?:[0-9a-f]{2}){4,}$/i.test(quote.data) || !quote.fingerprint) throw Error("Invalid action review.");
  if ((quote.kind !== undefined && quote.kind !== "call" && quote.kind !== "creation") || (quote.kind === "creation" ? !validProtocolCreation(quote) : quote.creation !== undefined)) throw Error("Invalid action kind.");
  if (!Number.isSafeInteger(quote.timestamp) || now - quote.timestamp * 1000 > 120000 || quote.timestamp * 1000 - now > 30000) throw Error("Action snapshot is stale. Refresh before continuing.");
  const tag = toQuantity(quote.block);
  const canonical = async () => { const b = await rpc.send("eth_getBlockByNumber", [tag, false]); return b?.hash === quote.blockHash && b?.number && BigInt(b.number) === BigInt(quote.block) && Number(BigInt(b.timestamp)) === quote.timestamp; };
  if (!await canonical()) throw Error("Snapshot changed. Review again.");
  if (await rpc.send("eth_getCode", [account, tag]) !== "0x") throw Error("This action supports standard externally owned wallets only.");
  const transaction:ProtocolReview["transaction"] = { from: account, to: getAddress(quote.to), data: quote.data, value: quote.value, chainId: "0x171", gas: "0x0", ...(quote.kind === "creation" ? {nonce:quote.creation.nonce} : {}) };
  if (quote.kind === "creation") {
    const [confirmed,pending] = await Promise.all([rpc.send("eth_getTransactionCount",[account,tag]),rpc.send("eth_getTransactionCount",[account,"pending"])]);
    if (BigInt(confirmed) !== BigInt(quote.creation.nonce) || BigInt(pending) !== BigInt(quote.creation.nonce) || await rpc.send("eth_getCode",[quote.to,tag]) !== "0x") throw Error("The wallet nonce changed or another transaction is pending. Wait and review the deployment again.");
  }
  const { gas: _gas, ...simulation } = protocolWalletTransaction({quote,transaction});
  const result = await rpc.send("eth_call", [simulation, tag]);
  if (quote.kind === "creation" && result.toLowerCase() !== quote.creation.runtime.toLowerCase()) throw Error("Simulated contract runtime does not match the reviewed helper.");
  const estimate = BigInt(await rpc.send("eth_estimateGas", [simulation, tag])), price = BigInt(await rpc.send("eth_gasPrice", []));
  if (estimate <= 0n || price <= 0n) throw Error("Gas estimate unavailable.");
  const budget = (estimate * 120n + 99n) / 100n, gasCost = budget * price;
  if (BigInt(await rpc.send("eth_getBalance", [account, tag])) < BigInt(quote.value) + gasCost) throw Error("Keep enough PLS for this action and gas.");
  transaction.gas = toQuantity(budget);
  if (!await canonical()) throw Error("Snapshot changed during preparation. Review again.");
  return { request: structuredClone(request), quote, transaction, gasCost: gasCost.toString(), createdAt: now };
}
export function assertSameProtocolTerms(previous: ProtocolReview, fresh: ProtocolReview) {
  if (!addressEqual(previous.quote.account, fresh.quote.account) || !addressEqual(previous.transaction.to, fresh.transaction.to) || previous.transaction.data !== fresh.transaction.data || previous.transaction.value !== fresh.transaction.value || previous.quote.fingerprint !== fresh.quote.fingerprint || previous.quote.kind !== fresh.quote.kind || previous.transaction.nonce !== fresh.transaction.nonce || JSON.stringify(previous.quote.creation) !== JSON.stringify(fresh.quote.creation)) throw Error("Action terms changed. Review the updated values before continuing.");
}
export async function requestProtocolTransaction(review: ProtocolReview, adapter: ProtocolAdapter, rpc: FarmReadRpc, provider: Eip1193Provider, current: () => boolean, onWalletRequest?: () => void) {
  assertGovernanceActionEnabled(review.request);
  let walletRequestStarted = false;
  try {
    const check = async () => {
      const [accounts, chain] = await Promise.all([provider.request({ method: "eth_accounts" }), provider.request({ method: "eth_chainId" })]);
      if (!Array.isArray(accounts) || !accounts[0] || !addressEqual(accounts[0], review.quote.account) || BigInt(chain) !== 369n || !current() || Date.now() < review.createdAt || Date.now() - review.createdAt > PROTOCOL_REVIEW_LIFETIME) throw Error("Wallet changed or review expired. Review again.");
    };
    await check();
    const fresh = await prepareProtocolTransaction(rpc, review.quote.account, review.request, adapter);
    assertSameProtocolTerms(review, fresh);
    await check();
    onWalletRequest?.();
    walletRequestStarted = true;
    const hash = await provider.request({ method: "eth_sendTransaction", params: [protocolWalletTransaction(fresh)] });
    if (typeof hash !== "string" || !hashPattern.test(hash)) throw Error("Wallet response is uncertain. Check wallet activity; do not resubmit.");
    return hash;
  } catch (error) { throw Object.assign(new Error(error instanceof Error ? error.message : "Wallet request failed."), { walletRequestStarted, code: (error as { code?: number })?.code }); }
}
export async function verifyProtocolReceipt(rpc: FarmReadRpc, review: ProtocolReview, hash: string, adapter: ProtocolAdapter): Promise<{ state: "pending" | "uncertain" | "confirmed" | "failed"; message: string }> {
  if (!hashPattern.test(hash) || BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("Invalid receipt request.");
  const receipt = await rpc.send("eth_getTransactionReceipt", [hash]);
  if (receipt === null) return { state: "pending", message: "Waiting for mining. Do not resubmit." };
  const uncertain = { state: "uncertain" as const, message: "The exact action outcome could not be verified. Check the receipt and wallet; do not repeat it." };
  try {
    const tx = await rpc.send("eth_getTransactionByHash", [hash]);
    const targetMatches = review.quote.kind === "creation" ? validProtocolCreation(review.quote) && receipt.to === null && tx?.to === null && quantity.test(tx.nonce) && BigInt(tx.nonce) === BigInt(review.quote.creation.nonce) : addressEqual(receipt.to, review.transaction.to) && addressEqual(tx?.to, review.transaction.to);
    if (!tx || !targetMatches || !hashPattern.test(receipt.transactionHash) || !hashPattern.test(tx.hash) || receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || tx.hash.toLowerCase() !== hash.toLowerCase() || !addressEqual(receipt.from, review.quote.account) || !addressEqual(tx.from, review.quote.account) || tx.input.toLowerCase() !== review.transaction.data.toLowerCase() || !quantity.test(tx.value) || BigInt(tx.value) !== BigInt(review.transaction.value) || !hashPattern.test(receipt.blockHash) || !hashPattern.test(tx.blockHash) || receipt.blockHash.toLowerCase() !== tx.blockHash.toLowerCase() || !quantity.test(receipt.blockNumber) || !quantity.test(tx.blockNumber) || BigInt(receipt.blockNumber) !== BigInt(tx.blockNumber)) return uncertain;
    const canonical = async () => { const b = await rpc.send("eth_getBlockByNumber", [receipt.blockNumber, false]); return b?.hash?.toLowerCase() === receipt.blockHash.toLowerCase() && b?.number && BigInt(b.number) === BigInt(receipt.blockNumber); };
    if (!await canonical() || !["0x0", "0x1"].includes(receipt.status)) return uncertain;
    if (receipt.status === "0x0") return { state: "failed", message: "The reviewed transaction reverted. Gas may have been spent; its requested changes were not applied." };
    if (review.quote.kind === "creation" && (!receipt.contractAddress || !addressEqual(receipt.contractAddress, review.quote.to) || (await rpc.send("eth_getCode",[receipt.contractAddress,receipt.blockNumber])).toLowerCase() !== review.quote.creation.runtime.toLowerCase())) return uncertain;
    if (!Array.isArray(receipt.logs) || receipt.logs.some((log: { removed?: boolean }) => log.removed)) return uncertain;
    if (!await adapter.verify(rpc, review, receipt) || !await canonical()) return uncertain;
    return { state: "confirmed", message: "The reviewed transaction and its expected effects were verified in the mined block." };
  } catch { return uncertain; }
}
