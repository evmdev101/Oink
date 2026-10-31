import { Interface, MaxUint256, ZeroAddress, formatUnits, getAddress, keccak256, parseUnits, toQuantity, type Eip1193Provider } from "ethers";
import { verifyFarmApprovalResult, verifyFarmTokenState, type FarmTokenPolicy } from "./farmTokenSafety";
import { effectiveReferral } from "./referralSelection";
import { assertCurrentFarmSpec } from "./farmCatalog";

// This describes individually verified deployments, not every contract with a
// similar ABI. Adding a farm requires a new deployment/source verification.
export type FarmWriteSpec = {
  id: string; address: string; tokenAddress: string | null; decimals: number; symbol: string; poolId: string;
  runtimeCodeHash: string; tokenRuntimeCodeHash: string | null;
  tokenPolicy?: FarmTokenPolicy;
  masterchef: string; governor: string; rewardToken: string; treasuryWallet: string;
  masterchefRuntimeCodeHash: string; governorRuntimeCodeHash: string; rewardTokenRuntimeCodeHash: string;
  sourceUrl: string; verifiedAt: string; verifiedBlock: number;
  discoveryTemplateId?: string; discoveryBlockHash?: string;
};
export type FarmSpecAuthority = (spec: FarmWriteSpec) => void;
export type FarmReadRpc = { send(method: string, params: unknown[]): Promise<any> };
export type FarmWriteKind = "deposit" | "approve" | "approve-max" | "reset-approval";
export const FARM_CHAIN_ID = 369n;
export const REVIEW_LIFETIME_MS = 60_000;
export const farmVaultInterface = new Interface([
  "function deposit(uint256 amount,address referral) payable",
  "function stakeToken() view returns(address)", "function token() view returns(address)",
  "function masterchef() view returns(address)", "function poolID() view returns(uint256)",
  "function depositFee() view returns(uint256)", "function fundingRate() view returns(uint256)",
  "function defaultDirectPayout() view returns(uint256)", "function treasury() view returns(address)",
  "function treasuryWallet() view returns(address)", "function referredBy(address) view returns(address)",
  "function getNrOfStakes(address) view returns(uint256)",
  "function lastCredit() view returns(uint256)",
  "function maxFee() view returns(uint256)", "function maxFundingFee() view returns(uint256)",
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,uint256 depositFee,address indexed referral)",
]);
export const farmTokenInterface = new Interface([
  "function approve(address spender,uint256 amount) returns(bool)",
  "function allowance(address owner,address spender) view returns(uint256)",
  "function balanceOf(address owner) view returns(uint256)", "function decimals() view returns(uint8)",
]);
const chefInterface = new Interface(["function owner() view returns(address)", "function feeAddress() view returns(address)", "function dtx() view returns(address)", "function poolInfo(uint256) view returns(uint256,uint256,address)", "function credit(address) view returns(uint256)", "function pendingDtx(uint256) view returns(uint256)", "function totalAllocPoint() view returns(uint256)"]);
const governorInterface = new Interface(["function treasuryWallet() view returns(address)", "function masterchef() view returns(address)"]);
const rewardInterface = new Interface(["function governor() view returns(address)", "function owner() view returns(address)"]);

export function parseFarmDepositAmount(input: string, decimals: number): bigint {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Unsupported token precision.");
  const value = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value)) throw new Error("Enter a positive decimal amount without commas or exponent notation.");
  if ((value.split(".")[1]?.length ?? 0) > decimals) throw new Error("Amount has more decimal places than this asset supports.");
  const amount = parseUnits(value, decimals);
  if (amount <= 0n || amount > MaxUint256) throw new Error("Amount must be greater than zero and fit the token's uint256 units.");
  return amount;
}
export function farmDepositNet(amount: bigint, depositFee: bigint) {
  if (amount <= 0n || depositFee < 0n || depositFee > 500n) throw new Error("Deposit amount or fee is outside the verified limits.");
  const fee = amount * depositFee / 10_000n;
  return { fee, recorded: amount - fee };
}
function sameAddress(a: string, b: string) { return getAddress(a) === getAddress(b); }
function requireAddress(actual: string, expected: string, label: string) {
  if (!sameAddress(actual, expected)) throw new Error(label + " changed. This action is not enabled for the current wiring.");
}
export function verifyRuntime(code: string, expectedHash: string, label: string) {
  if (code === "0x" || keccak256(code).toLowerCase() !== expectedHash.toLowerCase()) throw new Error(label + " runtime does not match the verified deployment.");
}

export type FarmTransactionReview = {
  spec: FarmWriteSpec; kind: FarmWriteKind; account: string; amount: bigint;
  transaction: { from: string; to: string; data: string; value: string; chainId: string; gas: string };
  block: number; blockHash: string; createdAt: number; depositFee: bigint; fundingRate: bigint;
  directPayout: bigint; feeAmount: bigint; recordedAmount: bigint; referral: string; requestedReferral?: string; existingReferral?: string;
  allowance: bigint | null; walletBalance: bigint; gasEstimate: bigint; gasBudget: bigint;
  gasPrice: bigint; estimatedMaxGasCost: bigint;
};

export async function prepareFarmTransaction(
  rpc: FarmReadRpc, spec: FarmWriteSpec, accountInput: string, input: string, kind: FarmWriteKind, now = Date.now(), requestedReferral = ZeroAddress, authority: FarmSpecAuthority = assertCurrentFarmSpec,
): Promise<FarmTransactionReview> {
  authority(spec);
  const account = getAddress(accountInput);
  if (sameAddress(account, ZeroAddress)) throw new Error("Connect a nonzero wallet address.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== FARM_CHAIN_ID) throw new Error("The public RPC is not PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
  if (!block?.hash || !block.number || !block.timestamp) throw new Error("A fixed snapshot block is required.");
  if (now - Number(BigInt(block.timestamp)) * 1000 > 120_000) throw new Error("Public chain data is stale. Retry later.");
  const tag = block.number;
  const read = async (to: string, abi: Interface, method: string, args: unknown[] = []) => abi.decodeFunctionResult(method,
    await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, tag]));
  const targets = [
    [spec.address, spec.runtimeCodeHash, "Vault"], [spec.masterchef, spec.masterchefRuntimeCodeHash, "MasterChef"],
    [spec.governor, spec.governorRuntimeCodeHash, "Governor"], [spec.rewardToken, spec.rewardTokenRuntimeCodeHash, "OINK token"],
  ];
  await Promise.all(targets.map(async ([address, hash, label]) => verifyRuntime(await rpc.send("eth_getCode", [address, tag]), hash, label)));
  await verifyFarmTokenState(rpc, spec, account, tag);
  if (await rpc.send("eth_getCode", [account, tag]) !== "0x") throw new Error("These actions support externally owned wallets only, not contract or delegated-code wallets.");
  const [masterchef, rewardToken, poolId, depositFeeResult, fundingResult, directResult, treasury, treasuryWallet, owner, governorTreasury, rewardGovernor, pool, referred] = await Promise.all([
    read(spec.address, farmVaultInterface, "masterchef"), read(spec.address, farmVaultInterface, "token"),
    read(spec.address, farmVaultInterface, "poolID"), read(spec.address, farmVaultInterface, "depositFee"),
    read(spec.address, farmVaultInterface, "fundingRate"), read(spec.address, farmVaultInterface, "defaultDirectPayout"),
    read(spec.address, farmVaultInterface, "treasury"), read(spec.address, farmVaultInterface, "treasuryWallet"),
    read(spec.masterchef, chefInterface, "owner"), read(spec.governor, governorInterface, "treasuryWallet"),
    read(spec.rewardToken, rewardInterface, "governor"), read(spec.masterchef, chefInterface, "poolInfo", [BigInt(spec.poolId)]),
    read(spec.address, farmVaultInterface, "referredBy", [account]),
  ]);
  requireAddress(masterchef[0], spec.masterchef, "Vault MasterChef");
  requireAddress(rewardToken[0], spec.rewardToken, "Vault reward token");
  requireAddress(treasury[0], spec.governor, "Reward penalty recipient");
  requireAddress(treasuryWallet[0], spec.treasuryWallet, "Fee treasury");
  requireAddress(governorTreasury[0], spec.treasuryWallet, "Governor treasury");
  requireAddress(owner[0], spec.governor, "MasterChef Governor");
  requireAddress(rewardGovernor[0], spec.governor, "OINK Governor");
  requireAddress(pool[2], spec.address, "Registered pool");
  if (poolId[0] !== BigInt(spec.poolId)) throw new Error("Vault pool identifier changed.");
  const [maxFee, maxFunding, feeRecipient, chefToken, governorChef, rewardOwner] = await Promise.all([
    read(spec.address, farmVaultInterface, "maxFee"), read(spec.address, farmVaultInterface, "maxFundingFee"),
    read(spec.masterchef, chefInterface, "feeAddress"), read(spec.masterchef, chefInterface, "dtx"),
    read(spec.governor, governorInterface, "masterchef"), read(spec.rewardToken, rewardInterface, "owner"),
  ]);
  if (maxFee[0] !== 500n || maxFunding[0] !== 250n) throw new Error("Vault fee limits do not match the verified source.");
  requireAddress(feeRecipient[0], spec.governor, "MasterChef fee recipient");
  requireAddress(chefToken[0], spec.rewardToken, "MasterChef reward token");
  requireAddress(governorChef[0], spec.masterchef, "Governor MasterChef");
  requireAddress(rewardOwner[0], spec.masterchef, "OINK owner");
  const depositFee = BigInt(depositFeeResult[0]), fundingRate = BigInt(fundingResult[0]), directPayout = BigInt(directResult[0]);
  if (depositFee < 0n || depositFee > 500n || fundingRate < 0n || fundingRate > 250n || directPayout < 0n || directPayout > 10_000n) throw new Error("Fees or payouts are outside the verified limits.");
  const amount = kind === "reset-approval" ? 0n : kind === "approve-max" ? MaxUint256 : parseFarmDepositAmount(input, spec.decimals);
  const nativeBalance = BigInt(await rpc.send("eth_getBalance", [account, tag]));
  let walletBalance = nativeBalance;
  let allowance: bigint | null = null;
  if (spec.tokenAddress) {
    const [asset, precision, balance, allowed] = await Promise.all([
      read(spec.address, farmVaultInterface, "stakeToken"), read(spec.tokenAddress, farmTokenInterface, "decimals"),
      read(spec.tokenAddress, farmTokenInterface, "balanceOf", [account]), read(spec.tokenAddress, farmTokenInterface, "allowance", [account, spec.address]),
    ]);
    requireAddress(asset[0], spec.tokenAddress, "Deposit asset");
    if (Number(precision[0]) !== spec.decimals) throw new Error("Deposit token decimals changed.");
    walletBalance = BigInt(balance[0]); allowance = BigInt(allowed[0]);
    if (kind === "deposit" && allowance < amount) throw new Error("Approve the exact deposit amount first, then review the deposit separately.");
    if (kind === "reset-approval" && allowance === 0n) throw new Error("This vault already has zero allowance.");
  } else if (kind !== "deposit") throw new Error("Native PLS deposits need no token approval.");
  if (kind === "deposit") {
    const [vaultBalance, lastCredit, credit, pendingCredit, totalAllocation] = await Promise.all([
      spec.tokenAddress ? read(spec.tokenAddress, farmTokenInterface, "balanceOf", [spec.address]).then((result) => BigInt(result[0])) : rpc.send("eth_getBalance", [spec.address, tag]).then(BigInt),
      read(spec.address, farmVaultInterface, "lastCredit"), read(spec.masterchef, chefInterface, "credit", [spec.address]),
      read(spec.masterchef, chefInterface, "pendingDtx", [BigInt(spec.poolId)]), read(spec.masterchef, chefInterface, "totalAllocPoint"),
    ]);
    if (vaultBalance <= 0n) throw new Error("This vault has no pre-deposit asset balance. Its harvest denominator cannot be used safely.");
    if (pool[0] <= 0n || totalAllocation[0] <= 0n) throw new Error("This pool does not have an active reward allocation.");
    if (credit[0] + pendingCredit[0] < lastCredit[0]) throw new Error("Vault reward credit is inconsistent. Deposit preparation is blocked.");
  }
  if (kind !== "approve-max" && amount > walletBalance) throw new Error("The connected wallet does not hold this amount.");
  const referralSelection=effectiveReferral(account,referred[0],kind==='deposit'?requestedReferral:ZeroAddress);
  const tx = { from: account, to: kind === "deposit" ? spec.address : spec.tokenAddress!,
    data: kind === "deposit" ? farmVaultInterface.encodeFunctionData("deposit", [amount, referralSelection.calldata]) : farmTokenInterface.encodeFunctionData("approve", [spec.address, amount]),
    value: toQuantity(kind === "deposit" && !spec.tokenAddress ? amount : 0n) };
  // This executes no transaction and persists no state. A successful simulation
  // is only a feasibility check, never a claim about safety or profitability.
  const result = await rpc.send("eth_call", [tx, tag]);
  if (kind !== "deposit") verifyFarmApprovalResult(result, spec);
  const gasEstimate = BigInt(await rpc.send("eth_estimateGas", [tx, tag]));
  if (gasEstimate <= 0n) throw new Error("Gas could not be estimated.");
  const gasBudget = (gasEstimate * 120n + 99n) / 100n;
  const gasPrice = BigInt(await rpc.send("eth_gasPrice", []));
  const estimatedMaxGasCost = gasBudget * gasPrice;
  if (nativeBalance < BigInt(tx.value) + estimatedMaxGasCost) throw new Error("Leave enough PLS in this wallet to pay for gas.");
  if ((await rpc.send("eth_getBlockByNumber", [tag, false]))?.hash !== block.hash) throw new Error("Snapshot block changed. Review again.");
  authority(spec);
  const net = kind === "deposit" ? farmDepositNet(amount, depositFee) : { fee: 0n, recorded: 0n };
  return { spec, kind, account, amount, transaction: { ...tx, chainId: toQuantity(FARM_CHAIN_ID), gas: toQuantity(gasBudget) },
    block: Number(BigInt(tag)), blockHash: block.hash, createdAt: now, depositFee, fundingRate, directPayout,
    feeAmount: net.fee, recordedAmount: net.recorded, referral: referralSelection.actual, requestedReferral: referralSelection.requested, existingReferral: referralSelection.existing, allowance,
    walletBalance, gasEstimate, gasBudget, gasPrice, estimatedMaxGasCost };
}

export function assertReviewCurrent(review: FarmTransactionReview, account: string | null, chainId: bigint | null, now = Date.now()) {
  if (!account || !sameAddress(account, review.account) || chainId !== FARM_CHAIN_ID) throw new Error("Wallet account or network changed. Review again.");
  if (now < review.createdAt || now - review.createdAt > REVIEW_LIFETIME_MS) throw new Error("This review expired. Refresh it before continuing.");
}
export function assertSameFarmTerms(previous: FarmTransactionReview, fresh: FarmTransactionReview) {
  const keys = ["depositFee", "fundingRate", "directPayout", "feeAmount", "recordedAmount", "referral", "amount", "kind", "account"] as const;
  if (keys.some((key) => previous[key] !== fresh[key]) || previous.transaction.data !== fresh.transaction.data || previous.transaction.to !== fresh.transaction.to || previous.transaction.value !== fresh.transaction.value) throw new Error("Transaction terms changed. Read a new review before signing.");
}

// Invoked only by the user's final review button. Tests use a recording mock,
// never a connected wallet. It requests a wallet transaction, not a signature
// retained by this app; the wallet still owns its confirmation screen.
export async function requestReviewedFarmTransaction(review: FarmTransactionReview, provider: Eip1193Provider, rpc: FarmReadRpc, stillCurrent: () => boolean, authority: FarmSpecAuthority = assertCurrentFarmSpec) {
  let walletRequestStarted = false;
  try {
  authority(review.spec);
  const verifyWallet = async () => {
    const [accounts, chain] = await Promise.all([provider.request({ method: "eth_accounts" }), provider.request({ method: "eth_chainId" })]);
    assertReviewCurrent(review, Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null, BigInt(chain));
    if (!stillCurrent()) throw new Error("The wallet session changed. Review again.");
    authority(review.spec);
  };
  await verifyWallet();
  const fresh = await prepareFarmTransaction(rpc, review.spec, review.account, formatUnits(review.amount, review.spec.decimals), review.kind,Date.now(),review.requestedReferral??ZeroAddress,authority);
  assertSameFarmTerms(review, fresh);
  await verifyWallet();
  // No automatic retry: a wallet/RPC error here can have an uncertain outcome.
  walletRequestStarted = true;
  const hash = await provider.request({ method: "eth_sendTransaction", params: [fresh.transaction] });
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error("Wallet result is uncertain. Check wallet activity before trying again.");
  return hash;
  } catch (reason) {
    throw Object.assign(new Error(reason instanceof Error ? reason.message : "Wallet request failed."), { walletRequestStarted, code: (reason as { code?: number })?.code });
  }
}

export async function verifyFarmReceipt(rpc: FarmReadRpc, review: FarmTransactionReview, hash: string, authority: FarmSpecAuthority = assertCurrentFarmSpec) {
  authority(review.spec);
  const isHash = (value: unknown): value is string => typeof value === "string" && /^0x[0-9a-f]{64}$/i.test(value);
  const isQuantity = (value: unknown): value is string => typeof value === "string" && /^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value);
  const matchesAddress = (actual: unknown, expected: string) => {
    try { return typeof actual === "string" && sameAddress(actual, expected); } catch { return false; }
  };
  const unverified = (message: string) => ({ state: "unverified" as const, message: message + " Inspect wallet activity and the receipt; do not repeat it." });
  if (!isHash(hash)) throw new Error("A valid transaction hash is required for receipt verification.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== FARM_CHAIN_ID) throw new Error("Receipt verification requires PulseChain.");
  const receipt = await rpc.send("eth_getTransactionReceipt", [hash]);
  if (receipt === null) return { state: "pending" as const, message: "Pending on PulseChain. Do not resubmit the same transaction." };
  if (!receipt || !isHash(receipt.transactionHash) || receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || !matchesAddress(receipt.from, review.account) || !matchesAddress(receipt.to, review.transaction.to)) {
    return unverified("Receipt identity does not match the reviewed transaction.");
  }
  const transaction = await rpc.send("eth_getTransactionByHash", [hash]);
  if (!transaction || !isHash(transaction.hash) || transaction.hash.toLowerCase() !== hash.toLowerCase() || !matchesAddress(transaction.from, review.account) || !matchesAddress(transaction.to, review.transaction.to) || typeof transaction.input !== "string" || transaction.input.toLowerCase() !== review.transaction.data.toLowerCase() || !isQuantity(transaction.value) || BigInt(transaction.value) !== BigInt(review.transaction.value)) {
    return unverified("Mined transaction differs from the review.");
  }
  if (!isHash(receipt.blockHash) || !isHash(transaction.blockHash) || receipt.blockHash.toLowerCase() !== transaction.blockHash.toLowerCase() || !isQuantity(receipt.blockNumber) || !isQuantity(transaction.blockNumber) || BigInt(receipt.blockNumber) !== BigInt(transaction.blockNumber)) {
    return unverified("Receipt and transaction do not identify the same mined block.");
  }
  const blockIsCanonical = async () => {
    const block = await rpc.send("eth_getBlockByNumber", [receipt.blockNumber, false]);
    authority(review.spec);
    return block && isHash(block.hash) && block.hash.toLowerCase() === receipt.blockHash.toLowerCase() && isQuantity(block.number) && BigInt(block.number) === BigInt(receipt.blockNumber);
  };
  if (!await blockIsCanonical()) return unverified("The receipt block is no longer canonical or could not be verified.");
  // Never treat an arbitrary non-success value as a revert: a malformed status
  // or a receipt for a different transaction must not release the pending gate.
  if (receipt.status !== "0x0" && receipt.status !== "0x1") return unverified("The receipt has an unknown or malformed execution status.");
  if (receipt.status === "0x0") return { state: "failed" as const, message: "The reviewed transaction reverted in its verified mined block. Gas may have been spent; the requested change was not applied." };
  if (review.spec.tokenPolicy) {
    try { await verifyFarmTokenState(rpc, review.spec, review.account, receipt.blockNumber); }
    catch { return unverified("Token transfer mode or implementation could not be verified at the receipt block."); }
  }
  if (review.kind === "deposit") {
    if (!Array.isArray(receipt.logs)) return unverified("Deposit event data is unavailable.");
    const deposits = (receipt.logs as { address: string; topics: string[]; data: string; removed?: boolean }[]).filter((log) => log && !log.removed && matchesAddress(log.address, review.spec.address)).flatMap((log) => {
      try { const parsed = farmVaultInterface.parseLog(log); return parsed?.name === "Deposit" ? [parsed] : []; } catch { return []; }
    });
    const match = deposits.find((event) => sameAddress(event.args.sender, review.account) && event.args.amount === review.recordedAmount && event.args.depositFee === review.feeAmount && sameAddress(event.args.referral, review.referral));
    if (!await blockIsCanonical()) return unverified("The receipt block changed while checking the deposit.");
    return match ? { state: "confirmed" as const, message: "Deposit confirmed; the vault's recorded amount and deposit fee match this review." } : { state: "unverified" as const, message: "Transaction succeeded, but the deposit event did not match the review. Inspect the receipt; do not repeat it." };
  }
  const result = await rpc.send("eth_call", [{ to: review.spec.tokenAddress, data: farmTokenInterface.encodeFunctionData("allowance", [review.account, review.spec.address]) }, receipt.blockNumber]);
  const allowance = farmTokenInterface.decodeFunctionResult("allowance", result)[0];
  if (!await blockIsCanonical()) return unverified("The receipt block changed while checking the allowance.");
  return allowance === review.amount ? { state: "confirmed" as const, message: "Allowance confirmed at the receipt block. A deposit is a separate transaction." } : { state: "unverified" as const, message: "Transaction succeeded, but allowance differs from the requested amount. Refresh and inspect wallet activity." };
}
