// Read-only source/runtime evidence for ordinary-farm deposit tokens, group B.
// This script never obtains a signer or broadcasts. eth_call simulations do not persist.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import Module from 'node:module';
import { Contract, FetchRequest, Interface, JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';

registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (error) { if (s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw error; } } });
const { VERIFIED_FARM_READS } = await import('../src/config/farmReadVerification.ts');
const ids = ['pusdc', 'pdrip', 'emit', 'communitas', 'ptgc', 'ufo'];
const rows = VERIFIED_FARM_READS.filter(row => ids.includes(row.id));
const evidence = new URL('../evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const rpcRequest = new FetchRequest('https://rpc.pulsechain.com');
rpcRequest.timeout = 15000;
const provider = new JsonRpcProvider(rpcRequest, 369, { staticNetwork: true, batchMaxCount: 6 });
const compilerCache = new Map();
const slots = {
  pusdc: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3',
  pdrip: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
};
const adminSlots = {
  pusdc: '0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b',
  pdrip: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103',
};
const json = value => JSON.stringify(value, (_key, item) => typeof item === 'bigint' ? item.toString() : item, 2);
async function sourceFor(id, address) {
  const path = new URL('expanded-tokens-b-' + id + '-source.json', evidence);
  let cached;
  try { cached = JSON.parse(await readFile(path, 'utf8')); } catch {}
  const url = 'https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=' + address;
  if (!cached || cached.url.toLowerCase() !== url.toLowerCase() || process.argv.includes('--refresh-sources')) {
    const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!response.ok) throw Error('Source HTTP ' + response.status);
    cached = { url, data: await response.json() };
    await writeFile(path, json(cached));
  }
  const source = cached.data.result?.[0];
  if (!source?.SourceCode || !source.CompilerVersion) throw Error('Verified source unavailable for ' + id);
  await writeFile(new URL('expanded-tokens-b-' + id + '-main.sol', evidence), source.SourceCode);
  return source;
}
async function compiler(version) {
  if (compilerCache.has(version)) return compilerCache.get(version);
  const response = await fetch('https://binaries.soliditylang.org/bin/soljson-' + version + '.js', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('Compiler HTTP ' + response.status);
  const module = new Module(import.meta.filename);
  module.paths = createRequire(import.meta.url).resolve.paths('solc');
  module._compile(await response.text(), import.meta.filename);
  const fn = module.exports.cwrap(version.startsWith('v0.4.') ? 'compileStandard' : 'solidity_compile', 'string', ['string', 'number', 'number']);
  compilerCache.set(version, fn);
  return fn;
}
function withoutMetadata(hex) {
  const length = parseInt(hex.slice(-4), 16);
  if (length > hex.length / 2 - 2) throw Error('Invalid Solidity metadata length');
  return hex.slice(0, -(length + 2) * 2);
}
async function verifyBuild(id, source, runtime) {
  const file = source.FileName || 'Token.sol';
  let sources = { [file]: { content: source.SourceCode } };
  let settings = { optimizer: { enabled: source.OptimizationUsed === 'true', runs: Number(source.OptimizationRuns ?? 200) } };
  for (const extra of source.AdditionalSources ?? []) sources[extra.Filename] = { content: extra.SourceCode };
  if (source.SourceCode.startsWith('{{')) {
    const input = JSON.parse(source.SourceCode.slice(1, -1));
    sources = input.sources; settings = input.settings;
  }
  if (source.EVMVersion && source.EVMVersion !== 'default') settings.evmVersion = source.EVMVersion;
  settings.outputSelection = { '*': { '*': ['evm.deployedBytecode'] } };
  const compile = await compiler(source.CompilerVersion);
  const output = JSON.parse(compile(JSON.stringify({ language: 'Solidity', sources, settings }), 0, 0));
  const errors = output.errors?.filter(error => error.severity === 'error');
  if (errors?.length) throw Error(errors.map(error => error.formattedMessage).join('\n'));
  const matches = Object.values(output.contracts).map(contracts => contracts[source.ContractName]).filter(Boolean);
  if (matches.length !== 1) throw Error('Ambiguous compiled contract for ' + id);
  const compiled = matches[0].evm.deployedBytecode;
  const normalize = hex => {
    for (const entries of Object.values(compiled.immutableReferences ?? {})) {
      for (const { start, length } of entries) hex = hex.slice(0, start * 2) + '0'.repeat(length * 2) + hex.slice((start + length) * 2);
    }
    return withoutMetadata(hex);
  };
  const executable = normalize(runtime.slice(2));
  const expected = normalize(compiled.object);
  if (executable !== expected) throw Error('Source/runtime executable mismatch: ' + id);
  return { executableMatches: executable === expected, executableHash: keccak256('0x' + executable), compiledExecutableHash: keccak256('0x' + expected), compiler: source.CompilerVersion, settings, sourceCodeHash: keccak256(toUtf8Bytes(source.SourceCode)), allSourcesHash: keccak256(toUtf8Bytes(JSON.stringify(sources))), immutableReferences: compiled.immutableReferences ?? {} };
}

try {
  if (BigInt(await provider.send('eth_chainId', [])) !== 369n) throw Error('Wrong chain');
  const blockArgument = process.argv.find(arg => arg.startsWith('--block='));
  const block = await provider.getBlock(blockArgument ? Number(blockArgument.slice(8)) : 'latest');
  if (!block) throw Error('Snapshot block unavailable');
  const result = { capturedAt: new Date().toISOString(), chainId: 369, block: block.number, blockHash: block.hash, blockTimestamp: block.timestamp, tokens: [] };
  for (const row of rows) {
    const source = await sourceFor(row.id, row.tokenAddress);
    const runtime = await provider.getCode(row.tokenAddress, block.number);
    const item = { id: row.id, tokenAddress: row.tokenAddress, vault: row.address, runtimeHash: keccak256(runtime), sourceUrl: 'https://scan.pulsechain.com/address/' + row.tokenAddress + '#code', proxy: source.IsProxy === 'true', runtime, build: await verifyBuild(row.id, source, runtime), getters: {} };
    item.getters.decimals = await new Contract(row.tokenAddress, ['function decimals() view returns(uint8)'], provider).decimals({ blockTag: block.number });
    if (Number(item.getters.decimals) !== row.decimals) throw Error('Unexpected token decimals: ' + row.id);
    let executionSource = source;
    if (slots[row.id]) {
      const word = await provider.getStorage(row.tokenAddress, slots[row.id], block.number);
      const address = '0x' + word.slice(-40);
      item.proxyAdmin = { slot: adminSlots[row.id], address: '0x' + (await provider.getStorage(row.tokenAddress, adminSlots[row.id], block.number)).slice(-40) };
      const implementationRuntime = await provider.getCode(address, block.number);
      let implementationSource;
      try { implementationSource = await sourceFor(row.id + '-implementation', address); }
      catch (error) {
        item.implementation = { slot: slots[row.id], address, runtimeHash: keccak256(implementationRuntime), explorerAddress: source.ImplementationAddress, runtime: implementationRuntime, sourceError: error.message };
        item.recommendation = 'Keep external: current implementation source is not verified by the explorer.';
        result.tokens.push(item);
        await writeFile(new URL('expanded-tokens-b.json', evidence), json(result));
        console.log(json({ id: item.id, block: block.number, runtimeHash: item.runtimeHash, build: item.build.executableMatches, implementation: { address, hash: item.implementation.runtimeHash, sourceError: error.message } }));
        continue;
      }
      item.implementation = { slot: slots[row.id], address, runtimeHash: keccak256(implementationRuntime), explorerAddress: source.ImplementationAddress, runtime: implementationRuntime, build: await verifyBuild(row.id + '-implementation', implementationSource, implementationRuntime) };
      executionSource = implementationSource;
    }
    const abi = JSON.parse(executionSource.ABI);
    const contract = new Contract(row.tokenAddress, abi, provider);
    const zeroArgumentViews = abi.filter(entry => entry.type === 'function' && !entry.inputs.length && (entry.constant || ['view', 'pure'].includes(entry.stateMutability)) && !['DOMAIN_SEPARATOR', 'EIP712_VERSION', 'PERMIT_TYPEHASH', 'RECEIVE_WITH_AUTHORIZATION_TYPEHASH', 'TRANSFER_WITH_AUTHORIZATION_TYPEHASH', 'CANCEL_AUTHORIZATION_TYPEHASH', 'INCREASE_ALLOWANCE_WITH_AUTHORIZATION_TYPEHASH', 'DECREASE_ALLOWANCE_WITH_AUTHORIZATION_TYPEHASH', 'APPROVE_WITH_AUTHORIZATION_TYPEHASH'].includes(entry.name));
    for (const entry of zeroArgumentViews) {
      try { item.getters[entry.name] = await contract[entry.name]({ blockTag: block.number }); }
      catch (error) { item.getters[entry.name] = { error: error.shortMessage ?? error.message }; }
    }
    for (const name of ['isBlacklisted', 'isWhitelisted', 'isExcludedFromFee', 'isExcludedFromMaxBuyPerWallet', 'isExcludedFromReward', 'isExcludedFromReflection', 'isAutomatedMarketMakerPairs', 'isliquidityPair', 'lockedAmount']) {
      if (abi.some(entry => entry.type === 'function' && entry.name === name)) {
        item.getters[name + '(vault)'] = await contract[name](row.address, { blockTag: block.number });
      }
    }
    if (row.id === 'ptgc') {
      for (const name of ['reflectionFee', 'stakingFee', 'DAOFee', 'liquidityFee', 'burnFee']) {
        item.getters[name + '(P2P)'] = await contract[name](2, { blockTag: block.number });
      }
    }
    const iface = new Interface(['function approve(address,uint256) returns(bool)', 'function transfer(address,uint256) returns(bool)', 'function transferFrom(address,address,uint256) returns(bool)']);
    const sample = '0x1111111111111111111111111111111111111111';
    item.callSimulations = {};
    for (const [name, args] of [['approve', [row.address, 1n]], ['transfer', [sample, 1n]], ['transferFrom', [row.address, sample, 0n]]]) {
      try { item.callSimulations[name] = { returnData: await provider.call({ from: row.address, to: row.tokenAddress, data: iface.encodeFunctionData(name, args), blockTag: block.number }), from: row.address, args }; }
      catch (error) { item.callSimulations[name] = { error: error.shortMessage ?? error.message, reason: error.reason ?? null, from: row.address, args }; }
    }
    result.tokens.push(item);
    await writeFile(new URL('expanded-tokens-b.json', evidence), json(result));
    console.log(json({ id: item.id, block: block.number, runtimeHash: item.runtimeHash, build: item.build.executableMatches, implementation: item.implementation ? { address: item.implementation.address, hash: item.implementation.runtimeHash, build: item.implementation.build.executableMatches } : null, getters: item.getters, calls: item.callSimulations }));
  }
  if ((await provider.getBlock(block.number))?.hash !== block.hash) throw Error('Snapshot block changed');
  result.snapshotRechecked = true;
  await writeFile(new URL('expanded-tokens-b.json', evidence), json(result));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { provider.destroy(); }
