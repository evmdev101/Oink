// Read-only evidence for expanding ordinary farms. Never contacts a wallet or
// submits transactions. Token behavior needs separate verification before a
// matching vault is enabled in the application.
import { createRequire, registerHooks } from 'node:module';
import Module from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Interface, keccak256, toUtf8Bytes } from 'ethers';

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
} });
const { VERIFIED_FARM_READS } = await import('../src/config/farmReadVerification.ts');
const { VERIFIED_FARM_WRITES, FARM_WRITE_VERIFICATION_EVIDENCE } = await import('../src/config/farmWriteVerification.ts');
const baseline = VERIFIED_FARM_WRITES.find((row) => row.id === 'plsx');
const compilerUrl = 'https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js';
const sourceApi = 'https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=';
// Later vaults use the same complete tokenVault body with SafeERC20 v5.2.
// Its safeTransfer / safeTransferFrom / _callOptionalReturn call paths were
// separately inspected: exact nominal amounts, revert propagation, true-or-empty
// return handling, and code-size checks. It does not measure received balances.
const laterModelAddress = '0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21';
const laterModelSourceHash = '0x0e597a81c26179820a99420f091800d94f1add835bedf43444ed7169f83521ca';
const rpcUrl = process.env.OINK_VERIFY_RPC ?? 'https://rpc.pulsechain.com';
const outputPath = resolve(process.argv.find((arg) => arg.startsWith('--output='))?.slice(9) ?? 'evidence/expanded-farm-vaults.json');
let requestId = 1;

async function fetchText(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45_000) });
  if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}
async function rpc(method, params) {
  if (!['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode', 'eth_call'].includes(method)) throw Error('Read-only RPC method required');
  const result = JSON.parse(await fetchText(rpcUrl, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId++, method, params }),
  }));
  if (result.error) throw Error(JSON.stringify(result.error));
  if (!Object.hasOwn(result, 'result')) throw Error('Missing RPC result');
  return result.result;
}
const vault = new Interface([
  'function stakeToken() view returns(address)', 'function token() view returns(address)',
  'function masterchef() view returns(address)', 'function treasury() view returns(address)',
  'function treasuryWallet() view returns(address)', 'function poolID() view returns(uint256)',
  'function depositFee() view returns(uint256)', 'function fundingRate() view returns(uint256)',
  'function maxFee() view returns(uint256)', 'function maxFundingFee() view returns(uint256)',
  'function defaultDirectPayout() view returns(uint256)', 'function lastFundingChangeTimestamp() view returns(uint256)',
  'function lastCredit() view returns(uint256)',
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
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const assert = (condition, message) => { if (!condition) throw Error(message); };
const hashSource = (source) => keccak256(toUtf8Bytes(source));
function sourceUnits(source) {
  // The explorer flattens these identical nine source files in two orders and
  // uses both LF and CRLF. Compare every complete file, not just selected ABI
  // methods, while allowing only flattening order and outer whitespace.
  const entries = source.replace(/\r\n/g, '\n').split(/^\/\/ File: /m).filter((part) => part.trim()).map((part) => {
    const newline = part.indexOf('\n');
    assert(newline > 0, 'Unrecognized flattened source');
    return [part.slice(0, newline), part.slice(newline).trim()];
  });
  assert(new Set(entries.map(([name]) => name)).size === entries.length, 'Duplicate source file');
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}
function solidityTokens(source) {
  const noComments = source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match, literal) => literal ?? ' ');
  return (noComments.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|0x[\da-fA-F]+|[A-Za-z_$][\w$]*|\d+|[^\s]/g) ?? []).join(' ');
}
function normalizedCore(source, row) {
  let text = source;
  const replacements = [
    ['IERC20 public immutable token', `IERC20(${baseline.rewardToken})`],
    ['IERC20 public immutable stakeToken', `IERC20(${row.tokenAddress})`],
    ['IMasterChef public masterchef', `IMasterChef(${baseline.masterchef})`],
    ['uint256 public poolID', row.poolId],
  ];
  // Later deployments initialize the same fields in their declarations instead
  // of accepting constructor arguments. Normalize only the expected exact
  // token, chef, reward and pool values; any other initializer remains a diff.
  for (const [declaration, value] of replacements) {
    const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escape(declaration) + '\\s*=\\s*' + escape(value) + '\\s*;', 'i'), declaration + ';');
  }
  // The final four vaults start at the already-supported maximum funding rate.
  // This changes initial state only; the full fee calculation and limits remain
  // byte-for-byte equal, and current state is checked independently below.
  if (['emit', 'communitas', 'ptgc', 'ufo'].includes(row.id)) text = text.replace(/uint256 public fundingRate = 250;/, 'uint256 public fundingRate = 0;');
  text = text.replace(/constructor\(\s*IERC20 _stakeToken,\s*IMasterChef _masterchef,\s*uint256 _poolId,\s*IERC20 _token\s*\)\s*\{\s*stakeToken = _stakeToken;\s*masterchef = _masterchef;\s*poolID = _poolId;\s*token = _token;/, 'constructor() {');
  return solidityTokens(text);
}
function normalizedReviewedFiles(units, row) {
  return Object.fromEntries(Object.entries(units).map(([path, content]) => {
    const key = path.replace(/^.*\/contracts\/(interface|pulse-ecosystem)\//, '$1/');
    return [key, key === 'pulse-ecosystem/tokenVault.sol' ? normalizedCore(content, row) : solidityTokens(content)];
  }).sort(([a], [b]) => a.localeCompare(b)));
}
function withoutMetadata(hex) {
  const byteLength = parseInt(hex.slice(-4), 16) + 2;
  assert(Number.isFinite(byteLength) && byteLength * 2 < hex.length, 'Invalid Solidity metadata');
  return hex.slice(0, -byteLength * 2);
}
function normalizeRuntime(hex, compiled) {
  for (const refs of Object.values(compiled.immutableReferences)) for (const { start, length } of refs) {
    hex = hex.slice(0, start * 2) + '0'.repeat(length * 2) + hex.slice((start + length) * 2);
  }
  return withoutMetadata(hex);
}
function verifyImmutableValues(code, compiled, tokenAddress, rewardAddress) {
  const values = {};
  for (const [id, refs] of Object.entries(compiled.immutableReferences)) {
    const found = refs.map(({ start, length }) => {
      assert(length === 32, 'Unexpected immutable width');
      return '0x' + code.slice(2 + start * 2, 2 + (start + length) * 2);
    });
    assert(found.length > 0 && new Set(found).size === 1, 'Inconsistent immutable reference values');
    assert(/^0x0{24}[0-9a-fA-F]{40}$/.test(found[0]), 'Non-address immutable value');
    values[id] = '0x' + found[0].slice(-40);
  }
  assert(Object.keys(values).length === 2, 'Unexpected immutable count');
  const actual = Object.values(values).map((value) => value.toLowerCase()).sort();
  assert(JSON.stringify(actual) === JSON.stringify([tokenAddress.toLowerCase(), rewardAddress.toLowerCase()].sort()), 'Immutable addresses differ from expected deposit/reward tokens');
  return values;
}
function functionSource(source, name) {
  const contractStart = source.search(/contract\s+tokenVault\b/);
  assert(contractStart >= 0, 'Missing tokenVault implementation');
  source = source.slice(contractStart);
  const expression = new RegExp('function\\s+' + name + '\\s*\\(');
  const match = expression.exec(source);
  assert(match, 'Missing function: ' + name);
  const start = source.indexOf('{', match.index);
  assert(start >= 0, 'Missing function body: ' + name);
  let depth = 1, end = start + 1;
  while (end < source.length && depth) {
    if (source[end] === '{') depth++;
    if (source[end] === '}') depth--;
    end++;
  }
  assert(depth === 0, 'Incomplete function: ' + name);
  return source.slice(match.index, end).replace(/\r\n/g, '\n');
}
const methods = ['deposit', 'harvest', 'withdraw', 'selfHarvest', 'emergencyWithdraw', 'payFee', '_removeStake', 'updateFees', 'updateTreasury', 'setPoolPayout', 'updateSettings'];
async function sourceFor(address) {
  const response = JSON.parse(await fetchText(sourceApi + address));
  const source = response.result?.[0];
  assert(source?.SourceCode, 'Missing verified source: ' + address);
  return source;
}

const checkedAt = new Date().toISOString();
assert(BigInt(await rpc('eth_chainId', [])) === 369n, 'Wrong chain');
const block = await rpc('eth_getBlockByNumber', ['latest', false]);
const tag = block.number;
const read = async (address, abi, method, args = []) => abi.decodeFunctionResult(method,
  await rpc('eth_call', [{ to: address, data: abi.encodeFunctionData(method, args) }, tag]));
const [compilerText, modelSource, laterModelSource] = await Promise.all([fetchText(compilerUrl), sourceFor(baseline.address), sourceFor(laterModelAddress)]);
assert(hashSource(modelSource.SourceCode) === FARM_WRITE_VERIFICATION_EVIDENCE.sourceCodeHashes.tokenVault, 'Baseline source changed');
assert(hashSource(laterModelSource.SourceCode) === laterModelSourceHash, 'Later SafeERC20 v5.2 source baseline changed');
const oldUnits = sourceUnits(modelSource.SourceCode), laterUnits = sourceUnits(laterModelSource.SourceCode);
for (const name of ['tokenVault.sol', 'IacPool.sol', 'IMasterChef.sol', 'IGovernor.sol', 'ReentrancyGuard.sol']) {
  const oldContent = Object.entries(oldUnits).find(([path]) => path.endsWith('/' + name))?.[1];
  const newContent = Object.entries(laterUnits).find(([path]) => path.endsWith('/' + name))?.[1];
  assert(oldContent && newContent === oldContent, 'Later model core source differs: ' + name);
}
const compilerModule = new Module(import.meta.filename);
compilerModule.paths = createRequire(import.meta.url).resolve.paths('solc');
compilerModule._compile(compilerText, import.meta.filename);
const compile = compilerModule.exports.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
const compileCache = new Map();
function compileSource(source) {
  assert(source.CompilerVersion === 'v0.8.20+commit.a1b79de6' && source.IsProxy === 'false', 'Unexpected compiler/proxy');
  const input = JSON.stringify({ language: 'Solidity', sources: { 'Vault.sol': { content: source.SourceCode } }, settings: {
    optimizer: { enabled: source.OptimizationUsed === 'true', runs: Number(source.OptimizationRuns ?? 200) },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } },
  } });
  if (compileCache.has(input)) return compileCache.get(input);
  const output = JSON.parse(compile(input, 0, 0));
  const errors = output.errors?.filter((error) => error.severity === 'error');
  assert(!errors?.length, JSON.stringify(errors));
  const compiled = output.contracts['Vault.sol'][source.ContractName].evm.deployedBytecode;
  compileCache.set(input, compiled);
  return compiled;
}
const modelCompiled = compileSource(modelSource);
const modelExecutable = normalizeRuntime(modelCompiled.object, modelCompiled);
assert(keccak256('0x' + modelExecutable) === FARM_WRITE_VERIFICATION_EVIDENCE.normalizedExecutableHashes.tokenVault, 'Baseline normalized executable changed');
const dependencyRows = [
  ['masterchef', baseline.masterchef, baseline.masterchefRuntimeCodeHash],
  ['governor', baseline.governor, baseline.governorRuntimeCodeHash],
  ['rewardToken', baseline.rewardToken, baseline.rewardTokenRuntimeCodeHash],
];
const dependencies = {};
for (const [name, address, expected] of dependencyRows) {
  const runtimeCodeHash = keccak256(await rpc('eth_getCode', [address, tag]));
  assert(runtimeCodeHash === expected, name + ' runtime changed');
  dependencies[name] = { address, runtimeCodeHash };
}
const [owner, feeAddress, rewardToken, totalAllocation, governorTreasury, governorChef, rewardGovernor, rewardOwner] = await Promise.all([
  read(baseline.masterchef, chef, 'owner'), read(baseline.masterchef, chef, 'feeAddress'),
  read(baseline.masterchef, chef, 'dtx'), read(baseline.masterchef, chef, 'totalAllocPoint'),
  read(baseline.governor, governor, 'treasuryWallet'), read(baseline.governor, governor, 'masterchef'),
  read(baseline.rewardToken, reward, 'governor'), read(baseline.rewardToken, reward, 'owner'),
]);
assert(same(owner[0], baseline.governor) && same(feeAddress[0], baseline.governor), 'MasterChef Governor wiring changed');
assert(same(rewardToken[0], baseline.rewardToken) && same(rewardGovernor[0], baseline.governor) && same(rewardOwner[0], baseline.masterchef), 'Reward token wiring changed');
assert(same(governorTreasury[0], baseline.treasuryWallet) && same(governorChef[0], baseline.masterchef), 'Governor wiring changed');
assert(totalAllocation[0] > 0n, 'No active global allocation');
const rows = [];
for (const row of VERIFIED_FARM_READS.filter((item) => !['pls', 'plsx', 'inc'].includes(item.id))) {
  const evidence = { id: row.id, address: row.address, tokenAddress: row.tokenAddress, poolId: row.poolId };
  try {
    const [source, code, tokenCode] = await Promise.all([
      sourceFor(row.address), rpc('eth_getCode', [row.address, tag]), rpc('eth_getCode', [row.tokenAddress, tag]),
    ]);
    const compiled = compileSource(source);
    const actualExecutable = normalizeRuntime(code.slice(2), compiled);
    assert(actualExecutable === normalizeRuntime(compiled.object, compiled), row.id + ' compiled runtime mismatch');
    const sourceFiles = sourceUnits(source.SourceCode);
    const normalizedFiles = JSON.stringify(normalizedReviewedFiles(sourceFiles, row));
    const modelVariant = normalizedFiles === JSON.stringify(normalizedReviewedFiles(oldUnits, baseline)) ? 'SafeERC20 v4.9'
      : normalizedFiles === JSON.stringify(normalizedReviewedFiles(laterUnits, baseline)) ? 'SafeERC20 v5.2/v5.3' : null;
    assert(modelVariant, row.id + ' source files differ from both reviewed tokenVault generations');
    assert(keccak256(code) === row.runtimeCodeHash, row.id + ' runtime changed from read verification');
    const immutableValues = verifyImmutableValues(code, compiled, row.tokenAddress, baseline.rewardToken);
    const methodHashes = {};
    for (const method of methods) {
      const actual = functionSource(source.SourceCode, method), expected = functionSource(modelSource.SourceCode, method);
      assert(actual === expected, row.id + ' method differs: ' + method);
      methodHashes[method] = hashSource(actual);
    }
    const getterNames = ['stakeToken', 'token', 'masterchef', 'treasury', 'treasuryWallet', 'poolID', 'depositFee', 'fundingRate', 'maxFee', 'maxFundingFee', 'defaultDirectPayout', 'lastFundingChangeTimestamp', 'lastCredit'];
    const values = await Promise.all(getterNames.map((method) => read(row.address, vault, method).then((result) => result[0])));
    const state = Object.fromEntries(getterNames.map((name, index) => [name, values[index]]));
    const [pool, precision, balance, credit, pendingCredit] = await Promise.all([
      read(baseline.masterchef, chef, 'poolInfo', [BigInt(row.poolId)]), read(row.tokenAddress, token, 'decimals'),
      read(row.tokenAddress, token, 'balanceOf', [row.address]), read(baseline.masterchef, chef, 'credit', [row.address]),
      read(baseline.masterchef, chef, 'pendingDtx', [BigInt(row.poolId)]),
    ]);
    assert(same(state.stakeToken, row.tokenAddress) && same(state.token, baseline.rewardToken), 'Immutable token mismatch');
    assert(same(state.masterchef, baseline.masterchef) && same(state.treasury, baseline.governor) && same(state.treasuryWallet, baseline.treasuryWallet), 'Vault wiring mismatch');
    assert(state.poolID === BigInt(row.poolId) && same(pool[2], row.address), 'Vault pool mismatch');
    assert(Number(precision[0]) === row.decimals, 'Token decimals changed');
    assert(state.maxFee === 500n && state.maxFundingFee === 250n, 'Vault fee maxima changed');
    assert(state.depositFee <= 500n && state.fundingRate <= 250n && state.defaultDirectPayout <= 10_000n, 'Fees/payout outside verified limits');
    const liveBlockers = [];
    if (pool[0] <= 0n) liveBlockers.push('No active reward allocation');
    if (balance[0] <= 0n) liveBlockers.push('Zero pre-deposit balance causes harvest division by zero');
    if (credit[0] + pendingCredit[0] < state.lastCredit) liveBlockers.push('Reward credit is below recorded lastCredit');
    Object.assign(evidence, {
      exactVaultModelCandidate: true, liveBlockers, executableMatchesCompiledSource: true,
      modelVariant, reviewedVaultCoreAndHelpersMatch: true,
      sourceNormalization: 'Solidity tokens match after removing comments, whitespace, flattened file order, local source-root names and only the verified token/reward/chef/pool declaration initializers plus equivalent constructor assignments; the final four vaults initialize fundingRate at 250 instead of 0. Constructor pool payout settings and all runtime functions remain compared.',
      initialFundingRate: source.SourceCode.match(/uint256 public fundingRate = (\d+);/)?.[1],
      sameOptimizedOriginalModelExecutable: actualExecutable === modelExecutable,
      sourceUrl: `https://scan.pulsechain.com/address/${row.address}#code`, sourceCodeHash: hashSource(source.SourceCode),
      compiler: source.CompilerVersion, optimizerEnabled: source.OptimizationUsed === 'true', optimizerRuns: Number(source.OptimizationRuns ?? 200),
      normalizedSourceCodeHash: hashSource(source.SourceCode.replace(/\r\n/g, '\n')),
      sourceFileHashes: Object.fromEntries(Object.entries(sourceUnits(source.SourceCode)).map(([name, content]) => [name, hashSource(content)])),
      runtimeCodeHash: keccak256(code), normalizedExecutableHash: keccak256('0x' + actualExecutable),
      tokenRuntimeCodeHash: keccak256(tokenCode), decimals: Number(precision[0]), immutableReferences: compiled.immutableReferences, immutableValues,
      methodHashes, state, allocation: pool[0], lastRewardBlock: pool[1], vaultTokenBalance: balance[0],
      currentCredit: credit[0], pendingCredit: pendingCredit[0], totalAllocation: totalAllocation[0],
      tokenBehaviorStatus: 'Requires separate token source, transfer, approval and proxy verification before enabling writes',
    });
    console.log(JSON.stringify({ id: row.id, exactVaultModelCandidate: true, liveBlockers, tokenRuntimeCodeHash: evidence.tokenRuntimeCodeHash }));
  } catch (error) {
    Object.assign(evidence, { exactVaultModelCandidate: false, error: error.message });
    console.error(row.id + ': ' + error.message);
  }
  rows.push(evidence);
}
assert((await rpc('eth_getBlockByNumber', [tag, false])).hash === block.hash, 'Snapshot block changed');
const report = {
  checkedAt, chainId: 369, block: Number(BigInt(tag)), blockHash: block.hash,
  blockTimestamp: new Date(Number(BigInt(block.timestamp)) * 1000).toISOString(), rpcUrl, sourceApi,
  compilerUrl, compilerFileHash: hashSource(compilerText),
  baseline: { address: baseline.address, sourceCodeHash: hashSource(modelSource.SourceCode), normalizedExecutableHash: keccak256('0x' + modelExecutable) },
  laterBaseline: { address: laterModelAddress, sourceCodeHash: laterModelSourceHash, library: 'SafeERC20 v5.2',
    review: 'All tokenVault, IacPool, IMasterChef, IGovernor and ReentrancyGuard files exactly match the original generation. SafeERC20 transfer helpers use the same nominal transfer model; v5.2 uses low-level assembly, error propagation and true-or-empty success checks. All later source files are compared in full to this pinned separately reviewed baseline.' },
  dependencies, treasuryWallet: baseline.treasuryWallet,
  methodReview: {
    deposit: 'Harvest before exact amount safeTransferFrom; records nominal amount less deposit fee; existing referral retained; no received-balance measurement.',
    claim: 'selfHarvest accrues each selected full position before funding fees, updates debt, splits gross OINK by wallet/miner payout, tracks referral points.',
    withdraw: 'Full indexed position only; rewards accrue before funding fees; position swap/popped; nominal remaining principal transferred to sender.',
    emergency: 'Full indexed position only; funding fee applies, position removed, all OINK forfeited; no harvest; Withdraw event uses penalty field for returned nominal principal.',
    fundingFee: 'Whole hours from max(lastAction,lastFundingChangeTimestamp), amount * hours * rate / 1000000, capped at 20%; transfer to treasury; decrement position amount.',
    referral: 'Zero referral input preserves existing referredBy; claim/withdraw add paid OINK amount to sender/referrer referralPoints.',
  },
  limitations: [
    'This evidence verifies vault behavior and pinned public state. It does not establish token transfer behavior or safety, authorize broadcasting, or activate application permissions.',
    'Deposit-token runtime hashes and decimals are observations only; token source/proxy/fee verification is a separate requirement.',
    'MasterChef, Governor and OINK runtimes match existing pins; they are not independently recompiled by this script.',
    'Mutable values must be rechecked at every transaction review. No transaction was broadcast or simulated with a wallet account.',
  ], rows,
};
await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n');
console.log(`Saved ${rows.length} vault reviews at block ${report.block}: ${outputPath}`);
if (rows.some((row) => !row.exactVaultModelCandidate)) process.exitCode = 1;
