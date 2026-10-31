import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { Interface, MaxUint256, ZeroAddress, keccak256, toQuantity } from "ethers";
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context); throw error; }
} });
const {
  parseFarmDepositAmount, farmDepositNet, verifyRuntime, prepareFarmTransaction: prepareWithCatalog,
  assertReviewCurrent, assertSameFarmTerms, requestReviewedFarmTransaction: requestWithCatalog, verifyFarmReceipt: verifyWithCatalog,
  farmVaultInterface, farmTokenInterface, FARM_CHAIN_ID, REVIEW_LIFETIME_MS,
} = await import("../src/lib/farmTransactions.ts");
// Synthetic addresses/runtimes are deliberately not production permissions.
// These unit tests inject their fixture authority explicitly; catalog tests
// exercise the default production authority, including unknown/removed farms.
const fixtureAuthority = () => {};
const prepareFarmTransaction = (rpc, spec, account, input, kind, now = Date.now(), referral = ZeroAddress) => prepareWithCatalog(rpc, spec, account, input, kind, now, referral, fixtureAuthority);
const requestReviewedFarmTransaction = (review, provider, rpc, current) => requestWithCatalog(review, provider, rpc, current, fixtureAuthority);
const verifyFarmReceipt = (rpc, review, hash) => verifyWithCatalog(rpc, review, hash, fixtureAuthority);
const { farmTokenSafetyAbi } = await import("../src/lib/farmTokenSafety.ts");
const catalog = await import("../src/lib/farmCatalog.ts");
const { VERIFIED_FARM_WRITES: knownFarmSpecs } = await import("../src/config/farmWriteVerification.ts");
const mockTokenAbi = new Interface([...farmTokenInterface.fragments, ...farmTokenSafetyAbi.fragments]);

// Every RPC and wallet below is an in-memory recording mock. This file creates
// no providers, uses no network, and can never submit a blockchain transaction.
const address = (value) => `0x${String(value).padStart(40, "0")}`;
const ACCOUNT = address(9);
const OTHER = address(8);
const HASH = `0x${"a1".repeat(32)}`;
const BLOCK_HASH = `0x${"b2".repeat(32)}`;
const UNIT = 10n ** 18n;
const chef = new Interface([
  "function owner() view returns(address)",
  "function feeAddress() view returns(address)", "function dtx() view returns(address)",
  "function poolInfo(uint256) view returns(uint256 allocPoint,uint256 lastRewardBlock,address participant)",
  "function credit(address) view returns(uint256)", "function pendingDtx(uint256) view returns(uint256)",
  "function totalAllocPoint() view returns(uint256)",
]);
const governor = new Interface(["function treasuryWallet() view returns(address)", "function masterchef() view returns(address)"]);
const reward = new Interface(["function governor() view returns(address)", "function owner() view returns(address)"]);

function mockRpc(options = {}) {
  const code = new Map([[address(1), "0x6001"], [address(2), "0x6002"], [address(3), "0x6003"], [address(4), "0x6004"], [address(5), "0x6005"], [address(7), "0x6007"]]);
  const implementation = { slot: "0x" + "c3".repeat(32), address: address(7), runtimeCodeHash: keccak256(code.get(address(7))) };
  const precision = Number(options.precision ?? 18), assetUnit = 10n ** BigInt(precision);
  const spec = {
    id: options.native ? "mock-pls" : "mock-token", address: address(1), tokenAddress: options.native ? null : address(2),
    decimals: precision, symbol: options.native ? "PLS" : "TEST", poolId: "7",
    runtimeCodeHash: keccak256(code.get(address(1))), tokenRuntimeCodeHash: options.native ? null : keccak256(code.get(address(2))),
    masterchef: address(3), governor: address(4), rewardToken: address(5), treasuryWallet: address(6),
    masterchefRuntimeCodeHash: keccak256(code.get(address(3))), governorRuntimeCodeHash: keccak256(code.get(address(4))),
    rewardTokenRuntimeCodeHash: keccak256(code.get(address(5))), sourceUrl: "https://example.invalid/mock-only",
    verifiedAt: "2026-09-11", verifiedBlock: 256,
  };
  if (options.tokenPolicy) spec.tokenPolicy = options.tokenPolicy === "usdc" ? { kind: "usdc", implementation } : { kind: options.tokenPolicy };
  const state = {
    chain: "0x171", nativeBalance: 10n * UNIT, tokenBalance: 10n * assetUnit, vaultBalance: 100n * assetUnit,
    allowance: 10n * assetUnit, depositFee: 200n, fundingRate: 10n, directPayout: 0n,
    lastCredit: 20n, credit: 30n, pendingCredit: 10n, allocation: 100n, totalAllocation: 1000n,
    referred: ZeroAddress, precision: 18n, gasEstimate: 100_001n, gasPrice: 10n,
    timestamp: Math.floor(Date.now() / 1000), badCode: null, accountCode: "0x", reorg: false,
    simulateApproval: true, simulateError: null, receipt: null, transaction: null,
    tokenPaused: false, tokenDeprecated: false, tokenRate: 0n, tokenMax: 0n, tokenBlocked: null, implementationAddress: implementation.address,
    overrides: {}, ...options,
  };
  const calls = [];
  const rpc = { async send(method, params) {
    calls.push({ method, params });
    switch (method) {
      case "eth_chainId": return state.chain;
      case "eth_getBlockByNumber": return { number: "0x100", timestamp: toQuantity(state.timestamp), hash: state.reorg && params[0] !== "latest" ? HASH : BLOCK_HASH };
      case "eth_getCode": return params[0] === ACCOUNT ? state.accountCode : params[0] === state.badCode ? "0x6000" : code.get(params[0]) ?? "0x";
      case "eth_getStorageAt": {
        assert.equal(params[0], spec.tokenAddress); assert.equal(params[1], implementation.slot);
        return state.implementationWord ?? "0x" + "0".repeat(24) + state.implementationAddress.slice(2);
      }
      case "eth_getBalance": return toQuantity(params[0] === ACCOUNT ? state.nativeBalance : state.vaultBalance);
      case "eth_estimateGas": return toQuantity(state.gasEstimate);
      case "eth_gasPrice": return toQuantity(state.gasPrice);
      case "eth_getTransactionReceipt": return state.receipt;
      case "eth_getTransactionByHash": return state.transaction;
      case "eth_call": {
        const tx = params[0];
        const abi = tx.to === spec.address ? farmVaultInterface : tx.to === spec.tokenAddress ? mockTokenAbi : tx.to === spec.masterchef ? chef : tx.to === spec.governor ? governor : tx.to === spec.rewardToken ? reward : null;
        assert.ok(abi, `Unexpected mock call target ${tx.to}`);
        const decoded = abi.parseTransaction({ data: tx.data });
        const name = decoded.name;
        if (name === "deposit" || name === "approve") {
          if (state.simulateError) throw new Error(state.simulateError);
          return name === "deposit" ? "0x" : state.approvalReturn ?? (spec.tokenPolicy?.kind === "usdt" ? "0x" : abi.encodeFunctionResult(name, [state.simulateApproval]));
        }
        const values = {
          masterchef: [spec.masterchef], token: [spec.rewardToken], poolID: [BigInt(spec.poolId)],
          depositFee: [state.depositFee], fundingRate: [state.fundingRate], defaultDirectPayout: [state.directPayout],
          treasury: [spec.governor], treasuryWallet: [spec.treasuryWallet], owner: [tx.to === spec.rewardToken ? spec.masterchef : spec.governor], governor: [spec.governor],
          maxFee: [500n], maxFundingFee: [250n], feeAddress: [spec.governor], dtx: [spec.rewardToken],
          vaultBalance: [state.rewardBalance ?? state.vaultBalance],
          lockedAmount: [state.lockedAmount ?? 0n],
          poolInfo: [state.allocation, 10n, spec.address], referredBy: [state.referred], stakeToken: [spec.tokenAddress],
          decimals: [state.precision], balanceOf: [decoded.args.length && decoded.args[0] === ACCOUNT ? state.tokenBalance : state.vaultBalance],
          allowance: [state.allowance], getNrOfStakes: [2n], lastCredit: [state.lastCredit], credit: [state.credit],
          pendingDtx: [state.pendingCredit], totalAllocPoint: [state.totalAllocation],
          paused: [state.tokenPaused], deprecated: [state.tokenDeprecated], basisPointsRate: [state.tokenRate], maximumFee: [state.tokenMax],
          isBlackListed: [Boolean(decoded.args.length && decoded.args[0] === state.tokenBlocked)], isBlacklisted: [Boolean(decoded.args.length && decoded.args[0] === state.tokenBlocked)],
        };
        const result = state.overrides[`${tx.to}:${name}`] ?? state.overrides[name] ?? values[name];
        assert.ok(result, `Missing mock result for ${name}`);
        return abi.encodeFunctionResult(name, result);
      }
      default: throw new Error(`Forbidden/unimplemented mock RPC method: ${method}`);
    }
  } };
  return { rpc, spec, state, calls };
}

function mockWallet(options = {}) {
  const state = { account: ACCOUNT, chain: "0x171", hash: HASH, error: null, ...options };
  const calls = [];
  const provider = { async request(request) {
    calls.push(request);
    if (request.method === "eth_accounts") return state.account ? [state.account] : [];
    if (request.method === "eth_chainId") return state.chain;
    if (request.method === "eth_sendTransaction") {
      if (state.error) throw state.error;
      return state.hash;
    }
    throw new Error(`Forbidden/unimplemented mock wallet method: ${request.method}`);
  } };
  return { provider, state, calls };
}

async function reviewed(options = {}, kind = "deposit", input = "1.25") {
  const fixture = mockRpc(options);
  const review = await prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, input, kind);
  return { ...fixture, review };
}

test('default authority binds discovered deposits to the current catalog and stops a removed or changed review',async()=>{
  // Like the position tests, substitute fixture-only verified code in this
  // isolated process; the default catalog permission checks remain enabled.
  const f=mockRpc({native:true}), common=knownFarmSpecs[0], original=structuredClone(common);
  f.spec.id='registry-'+f.spec.address;f.spec.poolId='999';f.spec.discoveryTemplateId='pls-vault-0.8.20-optimized';f.spec.discoveryBlockHash=BLOCK_HASH;
  Object.assign(common,{...f.spec,id:original.id,address:original.address,poolId:original.poolId});
  try{
    catalog.replaceDiscoveredFarmSpecs([f.spec]);
    const review=await prepareWithCatalog(f.rpc,f.spec,ACCOUNT,'1','deposit');
    assert.equal(review.transaction.to,f.spec.address);assert.equal(review.transaction.value,toQuantity(UNIT));
    assert(f.calls.some(call=>call.method==='eth_call'&&call.params[0].to===f.spec.masterchef&&chef.parseTransaction(call.params[0])?.name==='poolInfo'&&chef.parseTransaction(call.params[0]).args[0]===999n));
    const wallet=mockWallet();assert.equal(await requestWithCatalog(review,wallet.provider,f.rpc,()=>true),HASH);
    assert.equal(wallet.calls.filter(call=>call.method==='eth_sendTransaction').length,1);
    catalog.replaceDiscoveredFarmSpecs([]);
    const disconnected=mockWallet();await assert.rejects(requestWithCatalog(review,disconnected.provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(disconnected.calls.length,0);
    await assert.rejects(verifyWithCatalog(f.rpc,review,HASH),/unavailable or changed/);
    catalog.replaceDiscoveredFarmSpecs([{...f.spec,poolId:'1000'}]);
    await assert.rejects(requestWithCatalog(review,disconnected.provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(disconnected.calls.length,0);
    catalog.replaceDiscoveredFarmSpecs([f.spec]);
    const racing=mockWallet(),originalRequest=racing.provider.request;
    racing.provider.request=async request=>{const result=await originalRequest(request);if(request.method==='eth_accounts')catalog.replaceDiscoveredFarmSpecs([]);return result;};
    await assert.rejects(requestWithCatalog(review,racing.provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(racing.calls.filter(call=>call.method==='eth_sendTransaction').length,0);
  }finally{catalog.replaceDiscoveredFarmSpecs([]);for(const key of Object.keys(common))delete common[key];Object.assign(common,original);}
});

function receiptFor(review, logs = []) {
  return { transactionHash: HASH, status: "0x1", from: ACCOUNT, to: review.transaction.to, blockNumber: "0x100", blockHash: BLOCK_HASH, logs };
}
function transactionFor(review) {
  return { ...review.transaction, input: review.transaction.data, hash: HASH, blockNumber: "0x100", blockHash: BLOCK_HASH };
}
function depositLog(review, overrides = {}) {
  const values = { amount: review.recordedAmount, fee: review.feeAmount, sender: ACCOUNT, referral: review.referral, ...overrides };
  const encoded = farmVaultInterface.encodeEventLog(farmVaultInterface.getEvent("Deposit"), [values.sender, values.amount, 0n, values.fee, values.referral]);
  return { address: review.spec.address, ...encoded };
}

test("deposit parser preserves exact raw units without floating point", () => {
  assert.equal(parseFarmDepositAmount("9007199254740993.000000000000000001", 18), 9007199254740993000000000000000001n);
  assert.equal(parseFarmDepositAmount("1.000001", 6), 1_000_001n);
  assert.equal(parseFarmDepositAmount(" 1 ", 0), 1n);
  assert.equal(parseFarmDepositAmount(MaxUint256.toString(), 0), MaxUint256);
});
for (const input of ["", "0", "0.0", "-1", "+1", "1e18", "1,000", ".5", "1.", "01", "0x10", "1 2", "NaN", "Infinity", (MaxUint256 + 1n).toString()]) {
  test(`deposit parser rejects malformed/nonpositive amount ${JSON.stringify(input)}`, () => assert.throws(() => parseFarmDepositAmount(input, 0)));
}
test("deposit parser rejects excess or unsupported precision", () => {
  assert.throws(() => parseFarmDepositAmount("1.0000001", 6), /decimal places/);
  for (const precision of [-1, 37, 1.5, NaN]) assert.throws(() => parseFarmDepositAmount("1", precision), /precision/);
});
test("fee rounding follows raw integer basis points", () => {
  assert.deepEqual(farmDepositNet(10_001n, 200n), { fee: 200n, recorded: 9801n });
  assert.deepEqual(farmDepositNet(1n, 500n), { fee: 0n, recorded: 1n });
  assert.throws(() => farmDepositNet(1n, 501n));
  assert.throws(() => farmDepositNet(0n, 0n));
});
test("runtime verification rejects missing and changed bytecode", () => {
  verifyRuntime("0x6001", keccak256("0x6001"), "Vault");
  assert.throws(() => verifyRuntime("0x", keccak256("0x"), "Vault"), /runtime/);
  assert.throws(() => verifyRuntime("0x6000", keccak256("0x6001"), "Vault"), /runtime/);
});
test("native deposit uses exact native value, zero referral and correct net units", async () => {
  const { review, calls } = await reviewed({ native: true });
  const tx = farmVaultInterface.parseTransaction(review.transaction);
  assert.equal(tx.name, "deposit"); assert.equal(tx.args[0], 1_250_000_000_000_000_000n); assert.equal(tx.args[1], ZeroAddress);
  assert.equal(BigInt(review.transaction.value), review.amount); assert.equal(review.transaction.chainId, "0x171");
  assert.equal(review.feeAmount, 25_000_000_000_000_000n); assert.equal(review.recordedAmount, 1_225_000_000_000_000_000n);
  assert.equal(review.gasBudget, 120_002n);
  assert.ok(calls.filter((call) => call.method === "eth_call").every((call) => call.params[1] === "0x100"));
  assert.ok(calls.every((call) => call.method !== "eth_sendTransaction"));
});

for(const native of [true,false])test((native?'native':'ERC20')+' deposits review and encode selected referral without overriding chain state',async()=>{
  const f=mockRpc({native}),selected=OTHER;
  const fresh=()=>prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,'1','deposit',Date.now(),selected);
  const q=await fresh();assert.equal(q.requestedReferral,selected);assert.equal(q.referral,selected);assert.equal(q.existingReferral,ZeroAddress);assert.equal(farmVaultInterface.parseTransaction({data:q.transaction.data}).args[1],selected);
  const wallet=mockWallet();await requestReviewedFarmTransaction(q,wallet.provider,f.rpc,()=>true);assert.equal(wallet.calls.filter(c=>c.method==='eth_sendTransaction').length,1);
  f.state.referred=address(7);const existing=await fresh();assert.equal(existing.referral,address(7));assert.equal(existing.existingReferral,address(7));assert.equal(farmVaultInterface.parseTransaction({data:existing.transaction.data}).args[1],ZeroAddress);
  f.state.referred=ZeroAddress;const self=await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,'1','deposit',Date.now(),ACCOUNT);assert.equal(self.referral,ZeroAddress);assert.equal(self.requestedReferral,ZeroAddress);
});
test('referral changes before signing force a new review and mismatched referral events stay unresolved',async()=>{
  const f=mockRpc(),q=await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,'1','deposit',Date.now(),OTHER),wallet=mockWallet();
  f.state.referred=OTHER;await assert.rejects(requestReviewedFarmTransaction(q,wallet.provider,f.rpc,()=>true),/terms changed/);assert.equal(wallet.calls.filter(c=>c.method==='eth_sendTransaction').length,0);
  f.state.referred=ZeroAddress;f.state.transaction=transactionFor(q);f.state.receipt=receiptFor(q,[depositLog(q)]);assert.equal((await verifyFarmReceipt(f.rpc,q,HASH)).state,'confirmed');
  f.state.receipt=receiptFor(q,[depositLog(q,{referral:ZeroAddress})]);assert.equal((await verifyFarmReceipt(f.rpc,q,HASH)).state,'unverified');
  await assert.rejects(prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,'1','deposit',Date.now(),'invalid'));
});
test("ERC20 deposit has zero native value and preserves token precision", async () => {
  const fixture = mockRpc({ precision: 6n, tokenBalance: 10_000_000n, allowance: 10_000_000n });
  fixture.spec.decimals = 6;
  const review = await prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1.000001", "deposit");
  assert.equal(review.amount, 1_000_001n); assert.equal(review.transaction.value, "0x0");
  assert.equal(farmVaultInterface.parseTransaction(review.transaction).args[0], 1_000_001n);
});
test("approval is an exact amount to the reviewed vault, never unlimited by default", async () => {
  const { review } = await reviewed({ allowance: 0n }, "approve", "2");
  const decoded = farmTokenInterface.parseTransaction(review.transaction);
  assert.equal(review.transaction.to, review.spec.tokenAddress); assert.equal(review.transaction.value, "0x0");
  assert.equal(decoded.args[0], review.spec.address); assert.equal(decoded.args[1], 2n * UNIT); assert.notEqual(decoded.args[1], MaxUint256);
});
test("nonzero allowances can be replaced directly with the exact approved amount", async () => {
  const fixture = mockRpc({ allowance: 1n });
  const approval = await prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "2", "approve");
  const approved = farmTokenInterface.parseTransaction(approval.transaction);
  assert.equal(approved.args[0], fixture.spec.address);
  assert.equal(approved.args[1], 2n * UNIT);
  assert.equal(approval.allowance, 1n);
  const reset = await prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "", "reset-approval");
  assert.equal(reset.amount, 0n); assert.equal(farmTokenInterface.parseTransaction(reset.transaction).args[1], 0n);
  fixture.state.allowance = 0n;
  await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "", "reset-approval"), /already has zero/);
});
test("insufficient allowance blocks deposit and native approval is unavailable", async () => {
  const token = mockRpc({ allowance: 1n });
  await assert.rejects(prepareFarmTransaction(token.rpc, token.spec, ACCOUNT, "1", "deposit"), /Approve the exact/);
  const native = mockRpc({ native: true });
  await assert.rejects(prepareFarmTransaction(native.rpc, native.spec, ACCOUNT, "1", "approve"), /no token approval/);
});
test("preparation rejects wrong chain, stale/reorg snapshots and contract wallets", async () => {
  for (const [options, match] of [[{ chain: "0x1" }, /not PulseChain/], [{ timestamp: Math.floor(Date.now() / 1000) - 121 }, /stale/], [{ reorg: true }, /Snapshot block changed/], [{ accountCode: "0xef010000" }, /externally owned/]]) {
    const fixture = mockRpc(options);
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), match);
  }
  const fixture = mockRpc();
  await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ZeroAddress, "1", "deposit"), /nonzero wallet/);
});
test("every hashed dependency fails closed on changed runtime", async () => {
  for (const badCode of [address(1), address(2), address(3), address(4), address(5)]) {
    const fixture = mockRpc({ badCode });
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), /runtime/);
  }
});
test("all wiring/units checks reject mismatches including pool participant at tuple index two", async () => {
  for (const [key, value] of [["masterchef", [OTHER]], ["token", [OTHER]], ["treasury", [OTHER]], ["treasuryWallet", [OTHER]], ["owner", [OTHER]], ["governor", [OTHER]], ["poolInfo", [100n, 10n, OTHER]], ["poolID", [8n]], ["stakeToken", [OTHER]], ["decimals", [6n]]]) {
    const fixture = mockRpc({ overrides: { [key]: value } });
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), /changed|current wiring/);
  }
});
test("unverified fee and payout ranges are unavailable", async () => {
  for (const options of [{ depositFee: 501n }, { fundingRate: 251n }, { directPayout: 10_001n }]) {
    const fixture = mockRpc(options);
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), /verified limits/);
  }
  for (const overrides of [{ maxFee: [501n] }, { maxFundingFee: [251n] }]) {
    const fixture = mockRpc({ overrides });
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), /fee limits/);
  }
});
test("empty vault, inactive global allocation and inconsistent reward credit block deposits", async () => {
  for (const [options, match] of [[{ vaultBalance: 0n }, /pre-deposit asset balance/], [{ totalAllocation: 0n }, /active reward allocation/], [{ lastCredit: 100n }, /reward credit is inconsistent/]]) {
    const fixture = mockRpc(options);
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", "deposit"), match);
  }
});
test("balance checks preserve a PLS gas reserve for deposits and approvals", async () => {
  for (const [options, kind, match] of [[{ native: true, nativeBalance: UNIT }, "deposit", /pay for gas/], [{ nativeBalance: 1n, allowance: 0n }, "approve", /pay for gas/], [{ tokenBalance: 1n }, "deposit", /does not hold/]]) {
    const fixture = mockRpc(options);
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", kind), match);
  }
});
test("failed simulation, false approval and unavailable gas cannot produce a review", async () => {
  for (const [options, kind, match] of [[{ simulateError: "mock revert" }, "deposit", /mock revert/], [{ simulateApproval: false, allowance: 0n }, "approve", /did not confirm/], [{ gasEstimate: 0n }, "deposit", /Gas could not/]]) {
    const fixture = mockRpc(options);
    await assert.rejects(prepareFarmTransaction(fixture.rpc, fixture.spec, ACCOUNT, "1", kind), match);
  }
});
test("review expiry, disconnected account and network changes are rejected", async () => {
  const { review } = await reviewed();
  assertReviewCurrent(review, ACCOUNT, FARM_CHAIN_ID, review.createdAt + REVIEW_LIFETIME_MS);
  for (const [account, chain, now] of [[null, FARM_CHAIN_ID, review.createdAt], [OTHER, FARM_CHAIN_ID, review.createdAt], [ACCOUNT, 1n, review.createdAt], [ACCOUNT, FARM_CHAIN_ID, review.createdAt - 1], [ACCOUNT, FARM_CHAIN_ID, review.createdAt + REVIEW_LIFETIME_MS + 1]]) assert.throws(() => assertReviewCurrent(review, account, chain, now), /changed|expired/);
});
test("all user-facing terms and calldata/value are locked to the review", async () => {
  const { review } = await reviewed();
  assertSameFarmTerms(review, { ...review });
  for (const patch of [{ amount: review.amount + 1n }, { depositFee: 201n }, { fundingRate: 11n }, { directPayout: 1n }, { feeAmount: 1n }, { recordedAmount: 1n }, { referral: OTHER }, { account: OTHER }, { kind: "approve" }]) assert.throws(() => assertSameFarmTerms(review, { ...review, ...patch }), /terms changed/);
  for (const patch of [{ to: OTHER }, { value: "0x1" }, { data: "0x1234" }]) assert.throws(() => assertSameFarmTerms(review, { ...review, transaction: { ...review.transaction, ...patch } }), /terms changed/);
});
test("final review sends exactly one mock wallet request after fresh checks", async () => {
  const { rpc, review } = await reviewed();
  const wallet = mockWallet();
  assert.equal(await requestReviewedFarmTransaction(review, wallet.provider, rpc, () => true), HASH);
  const sends = wallet.calls.filter((call) => call.method === "eth_sendTransaction");
  assert.equal(sends.length, 1); assert.equal(sends[0].params[0].data, review.transaction.data);
  assert.equal(wallet.calls.filter((call) => call.method === "eth_accounts").length, 2);
});
test("changed wallet, network or session prevents even a mock send", async () => {
  const { rpc, review } = await reviewed();
  for (const [options, current] of [[{ account: OTHER }, true], [{ account: null }, true], [{ chain: "0x1" }, true], [{}, false]]) {
    const wallet = mockWallet(options);
    await assert.rejects(requestReviewedFarmTransaction(review, wallet.provider, rpc, () => current), /changed/);
    assert.equal(wallet.calls.filter((call) => call.method === "eth_sendTransaction").length, 0);
  }
});
test("session invalidation during fresh preparation prevents submission", async () => {
  const { rpc, review } = await reviewed();
  const wallet = mockWallet();
  let checks = 0;
  await assert.rejects(requestReviewedFarmTransaction(review, wallet.provider, rpc, () => ++checks === 1), /session changed/);
  assert.equal(wallet.calls.filter((call) => call.method === "eth_sendTransaction").length, 0);
});
test("account changed between the two wallet checks prevents submission", async () => {
  const { rpc, review } = await reviewed();
  const wallet = mockWallet();
  const original = wallet.provider.request;
  let reads = 0;
  wallet.provider.request = async (request) => {
    if (request.method === "eth_accounts" && ++reads === 2) wallet.state.account = OTHER;
    return original(request);
  };
  await assert.rejects(requestReviewedFarmTransaction(review, wallet.provider, rpc, () => true), /account or network changed/);
  assert.equal(wallet.calls.filter((call) => call.method === "eth_sendTransaction").length, 0);
});
test("updated fees/allowance before signing force another review", async () => {
  const fixture = await reviewed();
  const wallet = mockWallet();
  fixture.state.depositFee = 201n;
  await assert.rejects(requestReviewedFarmTransaction(fixture.review, wallet.provider, fixture.rpc, () => true), /terms changed/);
  fixture.state.depositFee = 200n; fixture.state.allowance = 0n;
  await assert.rejects(requestReviewedFarmTransaction(fixture.review, wallet.provider, fixture.rpc, () => true), /Approve the exact/);
  assert.equal(wallet.calls.filter((call) => call.method === "eth_sendTransaction").length, 0);
});
test("wallet failure and uncertain hash do not automatically retry", async () => {
  const { rpc, review } = await reviewed();
  for (const options of [{ error: new Error("User rejected") }, { hash: "unexpected" }]) {
    const wallet = mockWallet(options);
    await assert.rejects(requestReviewedFarmTransaction(review, wallet.provider, rpc, () => true), /rejected|uncertain/);
    assert.equal(wallet.calls.filter((call) => call.method === "eth_sendTransaction").length, 1);
  }
});
test("receipt distinguishes pending, reverted and identity mismatch", async () => {
  const { rpc, state, review } = await reviewed();
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "pending");
  state.receipt = { ...receiptFor(review), status: "0x0" };
  state.transaction = transactionFor(review);
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "failed");
  state.receipt = { ...receiptFor(review), from: OTHER }; state.transaction = transactionFor(review);
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
});
test("deposit confirmation requires matching vault, sender, amount and fee event", async () => {
  const { rpc, state, review } = await reviewed();
  state.transaction = transactionFor(review);
  state.receipt = receiptFor(review, [depositLog(review)]);
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "confirmed");
  for (const logs of [[], [depositLog(review, { sender: OTHER })], [depositLog(review, { amount: 1n })], [depositLog(review, { fee: 1n })], [depositLog(review, { referral: OTHER })], [{ ...depositLog(review), address: OTHER }]]) {
    state.receipt = receiptFor(review, logs);
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
});
test("receipt reconciliation rejects changed mined transaction identity, calldata or native value", async () => {
  const { rpc, state, review } = await reviewed();
  state.receipt = receiptFor(review, [depositLog(review)]);
  for (const patch of [{ hash: BLOCK_HASH }, { from: OTHER }, { to: OTHER }, { input: "0x1234" }, { value: "0x1" }]) {
    state.transaction = { ...transactionFor(review), ...patch };
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
  state.transaction = transactionFor(review);
  state.receipt.transactionHash = BLOCK_HASH;
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  state.receipt.transactionHash = HASH; state.transaction = null;
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
});
test("approval receipt verifies allowance at its mined block, not latest", async () => {
  const { rpc, state, review, calls } = await reviewed({ allowance: 0n }, "approve");
  state.receipt = receiptFor(review); state.transaction = transactionFor(review); state.allowance = review.amount;
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "confirmed");
  const read = calls.findLast((call) => call.method === "eth_call"); assert.equal(read.params[1], state.receipt.blockNumber);
  state.allowance = 1n;
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
});
test("a reverted status never bypasses receipt and transaction identity checks", async () => {
  const { rpc, state, review } = await reviewed();
  for (const patch of [{ transactionHash: BLOCK_HASH }, { from: OTHER }, { to: OTHER }, { from: null }]) {
    state.receipt = { ...receiptFor(review), status: "0x0", ...patch }; state.transaction = transactionFor(review);
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
  state.receipt = { ...receiptFor(review), status: "0x0" };
  for (const patch of [{ hash: BLOCK_HASH }, { from: OTHER }, { to: OTHER }, { input: "0x1234" }, { value: "0x1" }, { value: null }]) {
    state.transaction = { ...transactionFor(review), ...patch };
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
  state.transaction = null;
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
});
test("unknown or malformed receipt statuses stay unverified rather than failed", async () => {
  const { rpc, state, review } = await reviewed(); state.transaction = transactionFor(review);
  for (const status of [undefined, null, false, 0, 1, "0", "1", "0x2", "0x00", "0x01", "bad"]) {
    state.receipt = { ...receiptFor(review, [depositLog(review)]), status };
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
});
test("receipt chain, hash and canonical block are checked before releasing pending state", async () => {
  const { rpc, state, review } = await reviewed();
  await assert.rejects(verifyFarmReceipt(rpc, review, "bad"), /valid transaction hash/);
  state.chain = "0x1";
  await assert.rejects(verifyFarmReceipt(rpc, review, HASH), /requires PulseChain/);
  state.chain = "0x171"; state.transaction = transactionFor(review);
  for (const status of ["0x0", "0x1"]) {
    state.receipt = { ...receiptFor(review, [depositLog(review)]), status }; state.reorg = true;
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
  state.reorg = false;
  for (const patch of [{ blockHash: HASH }, { blockNumber: "0x101" }, { blockNumber: null }]) {
    state.transaction = { ...transactionFor(review), ...patch };
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
});
test("allowance verification catches a reorg during the block-pinned read", async () => {
  const { rpc, state, review } = await reviewed({ allowance: 0n }, "approve");
  state.receipt = receiptFor(review); state.transaction = transactionFor(review); state.allowance = review.amount;
  const original = rpc.send;
  rpc.send = async (method, params) => { const result = await original(method, params); if (method === "eth_call") state.reorg = true; return result; };
  assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
});
test("missing or removed deposit logs never confirm a successful receipt", async () => {
  const { rpc, state, review } = await reviewed(); state.transaction = transactionFor(review);
  for (const logs of [undefined, null, [{ ...depositLog(review), removed: true }], [null]]) {
    state.receipt = receiptFor(review, logs);
    assert.equal((await verifyFarmReceipt(rpc, review, HASH)).state, "unverified");
  }
});

for (const precision of [6, 8, 12, 18]) test(`${precision}-decimal asset approval, deposit and receipt preserve every raw unit`, async () => {
  const unit = 10n ** BigInt(precision), input = "1." + "0".repeat(precision - 1) + "1", amount = unit + 1n;
  const approval = await reviewed({ precision, allowance: 0n }, "approve", input);
  const approved = farmTokenInterface.parseTransaction(approval.review.transaction);
  assert.equal(approval.review.amount, amount); assert.equal(approved.args[0], approval.spec.address); assert.equal(approved.args[1], amount);
  approval.state.receipt = receiptFor(approval.review); approval.state.transaction = transactionFor(approval.review); approval.state.allowance = amount;
  assert.equal((await verifyFarmReceipt(approval.rpc, approval.review, HASH)).state, "confirmed");
  approval.state.allowance = amount + 1n;
  assert.equal((await verifyFarmReceipt(approval.rpc, approval.review, HASH)).state, "unverified", "approval receipt must match exact raw allowance");

  const deposit = await reviewed({ precision }, "deposit", input), decoded = farmVaultInterface.parseTransaction(deposit.review.transaction);
  const fee = amount * 200n / 10000n;
  assert.equal(deposit.review.amount, amount); assert.equal(deposit.review.feeAmount, fee); assert.equal(deposit.review.recordedAmount, amount - fee);
  assert.equal(decoded.args[0], amount); assert.equal(decoded.args[1], ZeroAddress); assert.equal(deposit.review.transaction.value, "0x0");
  deposit.state.transaction = transactionFor(deposit.review); deposit.state.receipt = receiptFor(deposit.review, [depositLog(deposit.review)]);
  assert.equal((await verifyFarmReceipt(deposit.rpc, deposit.review, HASH)).state, "confirmed");
  for (const patch of [{ amount: amount - fee - 1n }, { fee: fee + 1n }]) {
    deposit.state.receipt = receiptFor(deposit.review, [depositLog(deposit.review, patch)]);
    assert.equal((await verifyFarmReceipt(deposit.rpc, deposit.review, HASH)).state, "unverified", "one raw unit disagreement cannot confirm a deposit");
  }
});

test("USDT approval respects token simulation failures and verifies exact allowance", async () => {
  const f = mockRpc({ tokenPolicy: "usdt", precision: 6n, allowance: 123n });
  f.state.simulateError = "Token requires zero allowance";
  await assert.rejects(prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "1.000001", "approve"), /Token requires zero allowance/);
  f.state.simulateError = null;
  const reset = await prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "", "reset-approval");
  const calldata = farmTokenInterface.parseTransaction(reset.transaction);
  assert.equal(calldata.args[0], f.spec.address); assert.equal(calldata.args[1], 0n); assert.equal(reset.amount, 0n);
  f.state.receipt = receiptFor(reset); f.state.transaction = transactionFor(reset); f.state.allowance = 0n;
  assert.equal((await verifyFarmReceipt(f.rpc, reset, HASH)).state, "confirmed");
  const approval = await prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "1.000001", "approve");
  assert.equal(farmTokenInterface.parseTransaction(approval.transaction).args[1], 1000001n);
  f.state.receipt = receiptFor(approval); f.state.transaction = transactionFor(approval); f.state.allowance = 1000001n;
  assert.equal((await verifyFarmReceipt(f.rpc, approval, HASH)).state, "confirmed");
  f.state.allowance = MaxUint256;
  assert.equal((await verifyFarmReceipt(f.rpc, approval, HASH)).state, "unverified", "unexpected unlimited allowance is not equivalent to exact approval");
});

test("only explicitly verified USDT accepts empty approval data", async () => {
  const trueValue = "0x" + "0".repeat(63) + "1", falseValue = "0x" + "0".repeat(64);
  for (const tokenPolicy of [undefined, "usdt", "usdc"]) {
    for (const approvalReturn of ["0x", trueValue, falseValue, "0x01", trueValue + "00"]) {
      const f = mockRpc({ tokenPolicy, allowance: 0n, approvalReturn });
      const expected = tokenPolicy === "usdt" ? approvalReturn === "0x" : approvalReturn === trueValue;
      if (expected) await prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "1", "approve");
      else await assert.rejects(prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "1", "approve"), /return data|did not confirm/);
    }
  }
});

for (const tokenPolicy of ["usdt", "usdc"]) test(`${tokenPolicy} state changes after review prevent submission and receipt confirmation`, async () => {
  const f = await reviewed({ tokenPolicy, precision: 6n }), wallet = mockWallet();
  const badStates = [
    [{ tokenPaused: true }, /paused/],
    ...[ACCOUNT, f.spec.address, f.spec.treasuryWallet].map(tokenBlocked => [{ tokenBlocked }, /blocks/]),
    ...(tokenPolicy === "usdt"
      ? [[{ tokenDeprecated: true }, /implementation/], [{ tokenRate: 1n }, /transfer-fee/], [{ tokenMax: 1n }, /transfer-fee/]]
      : [[{ implementationAddress: OTHER }, /implementation/], [{ badCode: address(7) }, /implementation runtime/], [{ implementationWord: "0x1234" }, /implementation/]]),
  ];
  for (const [patch, pattern] of badStates) {
    const original = Object.fromEntries(Object.keys(patch).map(key => [key, f.state[key]]));
    Object.assign(f.state, patch);
    await assert.rejects(requestReviewedFarmTransaction(f.review, wallet.provider, f.rpc, () => true), pattern);
    f.state.receipt = receiptFor(f.review, [depositLog(f.review)]); f.state.transaction = transactionFor(f.review);
    assert.equal((await verifyFarmReceipt(f.rpc, f.review, HASH)).state, "unverified", "a matching deposit event cannot override changed token behavior");
    Object.assign(f.state, original);
  }
  assert.equal(wallet.calls.filter(call => call.method === "eth_sendTransaction").length, 0);
});

test("deposit receipt catches a reorg during token-policy verification", async () => {
  const f = await reviewed({ tokenPolicy: "usdc", precision: 6n });
  f.state.receipt = receiptFor(f.review, [depositLog(f.review)]); f.state.transaction = transactionFor(f.review);
  const original = f.rpc.send;
  let checkedImplementation = false;
  f.rpc.send = async (method, params) => {
    const result = await original(method, params);
    if (method === "eth_getStorageAt") { assert.equal(params[2], f.state.receipt.blockNumber); checkedImplementation = true; f.state.reorg = true; }
    return result;
  };
  assert.equal((await verifyFarmReceipt(f.rpc, f.review, HASH)).state, "unverified");
  assert.equal(checkedImplementation, true);
});


test("MAX approval needs no deposit input or token balance and verifies the full allowance", async () => {
  const f = await reviewed({ allowance: 1n, tokenBalance: 0n }, "approve-max", "");
  const decoded = farmTokenInterface.parseTransaction(f.review.transaction);
  assert.equal(f.review.amount, MaxUint256);
  assert.equal(decoded.args[0], f.spec.address);
  assert.equal(decoded.args[1], MaxUint256);
  assert.equal(f.review.transaction.to, f.spec.tokenAddress);
  assert.equal(f.review.transaction.value, "0x0");
  f.state.receipt = receiptFor(f.review); f.state.transaction = transactionFor(f.review); f.state.allowance = MaxUint256;
  assert.equal((await verifyFarmReceipt(f.rpc, f.review, HASH)).state, "confirmed");
  f.state.allowance = 1n;
  assert.equal((await verifyFarmReceipt(f.rpc, f.review, HASH)).state, "unverified");
});

test("MAX approval still checks token simulation and rejects native PLS approvals", async () => {
  const f = mockRpc({ simulateApproval: false });
  await assert.rejects(prepareFarmTransaction(f.rpc, f.spec, ACCOUNT, "", "approve-max"), /did not confirm/);
  const native = mockRpc({ native: true });
  await assert.rejects(prepareFarmTransaction(native.rpc, native.spec, ACCOUNT, "", "approve-max"), /no token approval/);
});

test("registered zero-allocation farms retain deposits when their contract simulation passes", async () => {
 const f = await reviewed({allocation:0n});
 assert.equal(f.review.kind, "deposit");
 const rejected = mockRpc({allocation:0n,simulateError:"Contract rejected deposit"});
 await assert.rejects(prepareFarmTransaction(rejected.rpc,rejected.spec,ACCOUNT,"1","deposit"),/Contract rejected/);
});

test("received-token vaults confirm actual credited deposits after token fees", async () => {
 const f = mockRpc({vaultBalance:0n,rewardBalance:100n*UNIT});
 f.spec.tokenPolicy = {kind:"variable-transfer",accounting:"received"};
 const review = await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"2","deposit");
 assert.equal(review.amount,2n*UNIT);
 f.state.transaction = transactionFor(review);
 const actual = {amount:147n*UNIT/100n,fee:3n*UNIT/100n};
 f.state.receipt = receiptFor(review,[depositLog(review,actual)]);
 assert.equal((await verifyFarmReceipt(f.rpc,review,HASH)).state,"confirmed");
 f.state.receipt = receiptFor(review,[depositLog(review,{...actual,fee:actual.fee+1n})]);
 assert.equal((await verifyFarmReceipt(f.rpc,review,HASH)).state,"unverified");
 f.state.receipt = receiptFor(review,[depositLog(review,{...actual,sender:OTHER})]);
 assert.equal((await verifyFarmReceipt(f.rpc,review,HASH)).state,"unverified");
});


function lockedTokenFixture(locked = 25n * UNIT) {
 const f = mockRpc({tokenBalance:100n*UNIT,lockedAmount:locked,allowance:MaxUint256});
 f.spec.tokenPolicy={kind:"variable-transfer",accounting:"received",lockedBalance:"lockedAmount"};
 return f;
}
test("token-locked wallet balances cannot be deposited and explain the available amount", async () => {
 const f=lockedTokenFixture();
 await assert.rejects(prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"100","deposit"),/Only 75.0 TEST is available to stake; 25.0 is locked/);
 const exact=await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"75","deposit");
 assert.equal(exact.amount,75n*UNIT);
 assert.equal(exact.walletBalance,100n*UNIT,"total wallet holdings retain their meaning");
 await assert.rejects(prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"75.000000000000000001","deposit"),/Only 75.0/);
});
test("a token lock added before signing prevents the wallet transaction", async () => {
 const f=lockedTokenFixture(),review=await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"75","deposit"),wallet=mockWallet();
 f.state.lockedAmount=50n*UNIT;
 await assert.rejects(requestReviewedFarmTransaction(review,wallet.provider,f.rpc,()=>true),/Only 50.0/);
 assert.equal(wallet.calls.filter(call=>call.method==="eth_sendTransaction").length,0);
});
test("MAX approval remains available even when the token balance is completely locked", async () => {
 const f=lockedTokenFixture(100n*UNIT);
 const review=await prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"","approve-max");
 assert.equal(review.amount,MaxUint256);
 assert.equal(f.calls.some(call=>call.method==="eth_call"&&call.params[0].data.startsWith(farmTokenInterface.getFunction("lockedAmount").selector)),false);
 await assert.rejects(prepareFarmTransaction(f.rpc,f.spec,ACCOUNT,"1","deposit"),/Only 0.0/);
});
