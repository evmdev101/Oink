// Read-only live smoke check for the explicit farm transaction allowlist.
// No wallet is connected, approvals requested, or transactions submitted.
import { registerHooks } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Interface, keccak256 } from 'ethers';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
} });
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { verifyFarmTokenState } = await import('../src/lib/farmTokenSafety.ts');
const rpcUrl = process.env.OINK_VERIFY_RPC ?? 'https://rpc.pulsechain.com';
const output = resolve('evidence/expanded-farm-live-state.json');
let nextId = 1;
const rpc = { async send(method, params) {
  if (!['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode', 'eth_getStorageAt', 'eth_getBalance', 'eth_call'].includes(method)) throw Error('Read-only RPC method required');
  const id = nextId++;
  const response = await fetch(rpcUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  if (!response.ok) throw Error(`RPC HTTP ${response.status}`);
  const result = await response.json();
  if (result.id !== id || result.jsonrpc !== '2.0') throw Error('RPC response identity mismatch');
  if (result.error) throw Error(JSON.stringify(result.error));
  if (!Object.hasOwn(result, 'result')) throw Error('Missing RPC result');
  return result.result;
} };
const assert = (condition, message) => { if (!condition) throw Error(message); };
const sameAddress = (a, b) => a.toLowerCase() === b.toLowerCase();
const vault = new Interface([
  'function stakeToken() view returns(address)', 'function token() view returns(address)',
  'function masterchef() view returns(address)', 'function treasury() view returns(address)',
  'function treasuryWallet() view returns(address)', 'function poolID() view returns(uint256)',
  'function depositFee() view returns(uint256)', 'function fundingRate() view returns(uint256)',
  'function maxFee() view returns(uint256)', 'function maxFundingFee() view returns(uint256)',
  'function defaultDirectPayout() view returns(uint256)', 'function lastCredit() view returns(uint256)',
]);
const chef = new Interface([
  'function poolInfo(uint256) view returns(uint256,uint256,address)', 'function owner() view returns(address)',
  'function dtx() view returns(address)', 'function feeAddress() view returns(address)',
  'function totalAllocPoint() view returns(uint256)', 'function credit(address) view returns(uint256)',
  'function pendingDtx(uint256) view returns(uint256)',
]);
const governor = new Interface(['function treasuryWallet() view returns(address)', 'function masterchef() view returns(address)']);
const token = new Interface(['function decimals() view returns(uint8)', 'function balanceOf(address) view returns(uint256)']);
const reward = new Interface(['function governor() view returns(address)', 'function owner() view returns(address)']);
const checkedAt = new Date().toISOString();
assert(BigInt(await rpc.send('eth_chainId', [])) === 369n, 'Wrong chain');
const block = await rpc.send('eth_getBlockByNumber', ['latest', false]);
assert(block?.hash && block?.number && block?.timestamp, 'A fixed snapshot block is required');
assert(Date.now() - Number(BigInt(block.timestamp)) * 1000 < 120_000, 'RPC latest block is stale');
const tag = block.number;
const read = async (address, abi, method, args = []) => abi.decodeFunctionResult(method,
  await rpc.send('eth_call', [{ to: address, data: abi.encodeFunctionData(method, args) }, tag]));
const checkedRuntimes = new Map();
async function checkRuntime(address, expected, name) {
  const actual = checkedRuntimes.get(address.toLowerCase()) ?? keccak256(await rpc.send('eth_getCode', [address, tag]));
  assert(actual === expected, name + ' runtime mismatch');
  checkedRuntimes.set(address.toLowerCase(), actual);
}
const rows = [];
for (const spec of VERIFIED_FARM_WRITES) {
  const row = { id: spec.id, address: spec.address, symbol: spec.symbol, tokenAddress: spec.tokenAddress, tokenPolicy: spec.tokenPolicy?.kind ?? 'standard', probeAccount: spec.address };
  try {
    await Promise.all([
      checkRuntime(spec.address, spec.runtimeCodeHash, 'Vault'),
      checkRuntime(spec.masterchef, spec.masterchefRuntimeCodeHash, 'MasterChef'),
      checkRuntime(spec.governor, spec.governorRuntimeCodeHash, 'Governor'),
      checkRuntime(spec.rewardToken, spec.rewardTokenRuntimeCodeHash, 'OINK'),
      // Deliberately use the vault as the account argument. This tests live
      // token mode and known recipients, not any connected/user wallet status.
      verifyFarmTokenState(rpc, spec, spec.address, tag),
    ]);
    const names = ['masterchef', 'token', 'treasury', 'treasuryWallet', 'poolID', 'depositFee', 'fundingRate', 'maxFee', 'maxFundingFee', 'defaultDirectPayout', 'lastCredit'];
    const results = await Promise.all(names.map((name) => read(spec.address, vault, name).then((values) => values[0])));
    const state = Object.fromEntries(names.map((name, index) => [name, results[index]]));
    const [pool, owner, feeAddress, rewardToken, totalAllocation, governorTreasury, governorChef, rewardGovernor, rewardOwner, credit, pendingCredit, balance] = await Promise.all([
      read(spec.masterchef, chef, 'poolInfo', [BigInt(spec.poolId)]), read(spec.masterchef, chef, 'owner'),
      read(spec.masterchef, chef, 'feeAddress'), read(spec.masterchef, chef, 'dtx'), read(spec.masterchef, chef, 'totalAllocPoint'),
      read(spec.governor, governor, 'treasuryWallet'), read(spec.governor, governor, 'masterchef'),
      read(spec.rewardToken, reward, 'governor'), read(spec.rewardToken, reward, 'owner'),
      read(spec.masterchef, chef, 'credit', [spec.address]), read(spec.masterchef, chef, 'pendingDtx', [BigInt(spec.poolId)]),
      spec.tokenAddress ? read(spec.tokenAddress, token, 'balanceOf', [spec.address]).then((values) => values[0]) : rpc.send('eth_getBalance', [spec.address, tag]).then(BigInt),
    ]);
    assert(sameAddress(state.masterchef, spec.masterchef) && sameAddress(state.token, spec.rewardToken), 'Vault dependency wiring mismatch');
    assert(sameAddress(state.treasury, spec.governor) && sameAddress(state.treasuryWallet, spec.treasuryWallet), 'Vault fee/reward recipient mismatch');
    assert(state.poolID === BigInt(spec.poolId) && sameAddress(pool[2], spec.address), 'Registered pool mismatch');
    assert(sameAddress(owner[0], spec.governor) && sameAddress(feeAddress[0], spec.governor), 'MasterChef Governor wiring mismatch');
    assert(sameAddress(rewardToken[0], spec.rewardToken) && sameAddress(rewardGovernor[0], spec.governor) && sameAddress(rewardOwner[0], spec.masterchef), 'OINK dependency wiring mismatch');
    assert(sameAddress(governorTreasury[0], spec.treasuryWallet) && sameAddress(governorChef[0], spec.masterchef), 'Governor wiring mismatch');
    assert(state.maxFee === 500n && state.maxFundingFee === 250n, 'Unexpected fee maxima');
    assert(state.depositFee <= 500n && state.fundingRate <= 250n && state.defaultDirectPayout <= 10_000n, 'Fee/payout limits invalid');
    assert(pool[0] > 0n && totalAllocation[0] > 0n, 'No active reward allocation');
    assert(balance > 0n, 'Empty vault balance');
    assert(credit[0] + pendingCredit[0] >= state.lastCredit, 'Inconsistent reward credit');
    if (spec.tokenAddress) {
      const [asset, precision] = await Promise.all([read(spec.address, vault, 'stakeToken'), read(spec.tokenAddress, token, 'decimals')]);
      assert(sameAddress(asset[0], spec.tokenAddress), 'Deposit token mismatch');
      assert(Number(precision[0]) === spec.decimals, 'Deposit token decimals mismatch');
    } else assert(spec.decimals === 18, 'PLS precision mismatch');
    Object.assign(row, { passed: true, vaultAndDependencyRuntimesMatch: true, appTokenStateGuardPassed: true,
      wiringMatches: true, decimals: spec.decimals, poolId: spec.poolId, allocation: pool[0], totalAllocation: totalAllocation[0],
      depositFee: state.depositFee, fundingRate: state.fundingRate, directPayout: state.defaultDirectPayout,
      vaultBalance: balance, rewardCreditConsistent: true });
    console.log(`${spec.id}: passed`);
  } catch (error) {
    Object.assign(row, { passed: false, error: error.message });
    console.error(`${spec.id}: ${error.message}`);
  }
  rows.push(row);
}
assert((await rpc.send('eth_getBlockByNumber', [tag, false])).hash === block.hash, 'Snapshot block changed');
const report = {
  checkedAt, block: Number(BigInt(tag)), blockHash: block.hash, blockTimestamp: new Date(Number(BigInt(block.timestamp)) * 1000).toISOString(),
  chainId: 369, rpcUrl, allowlistCount: VERIFIED_FARM_WRITES.length, passed: rows.every((row) => row.passed),
  scope: 'Fresh public-read smoke check using the application verifyFarmTokenState helper plus pinned runtime, wiring, precision, fee, balance and allocation checks.',
  walletLimitation: 'No connected wallet was used. The token-policy account argument was the farm vault address, so successful blacklist checks cover vault/fee recipients only. A real user address must pass all application checks during their own review. No approvals, transfers, writes or broadcasts were attempted.',
  rows,
};
await mkdir(resolve(output, '..'), { recursive: true });
await writeFile(output, JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n');
console.log(`${rows.filter((row) => row.passed).length}/${rows.length} passed at block ${report.block}; ${output}`);
if (!report.passed) process.exitCode = 1;
