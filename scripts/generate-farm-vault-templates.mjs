// Read-only source/runtime collection and offline template reproduction. No wallet RPC.
// First run: node scripts/generate-farm-vault-templates.mjs --refresh
// Reproduce using the cached input and pinned compiler: run without --refresh.
import { readFile, writeFile } from 'node:fs/promises';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { keccak256, toUtf8Bytes } from 'ethers';

const evidence = JSON.parse(await readFile('evidence/expanded-farm-vaults.json', 'utf8'));
const models = [
  { id: 'pls-vault-0.8.20-optimized', kind: 'native', address: '0xE145932f6b010B0166aA6860D56b2730744B7d6f', sourceCodeHash: '0x94aa4db2673d9270829d32dee1647c6e503e2a1ffab13c53933abd7e6be4535f', normalizedExecutableHash: '0x1ef00f7280bcc72d9af3b9b71e6ea78cb42785ff5c59757cd8a8bb4fcf791897' },
  ...['hex', 'hoa', 'pusdt'].map((id, index) => ({ ...evidence.rows.find(row => row.id === id), id: ['token-vault-0.8.20-optimized', 'token-vault-0.8.20-unoptimized', 'token-vault-later-0.8.20-unoptimized'][index], kind: 'erc20' })),
];
const inputPath = 'evidence/farm-vault-template-inputs.json';
const compilerPath = process.env.OINK_SOLC_0820 ?? join(tmpdir(), 'oink-soljson-v0.8.20+commit.a1b79de6.js');
const assert = (condition, message) => { if (!condition) throw Error(message); };
const fetchJson = async (url, options) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45_000) });
  assert(response.ok, 'HTTP ' + response.status);
  return response.json();
};
let requestId = 0;
const rpc = async (method, params) => {
  assert(['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode'].includes(method), 'Read-only methods only');
  const result = await fetchJson('https://rpc.pulsechain.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }) });
  if (result.error) throw Error(JSON.stringify(result.error));
  return result.result;
};
let inputs;
if (process.argv.includes('--refresh')) {
  assert(BigInt(await rpc('eth_chainId', [])) === 369n, 'Wrong chain');
  const block = await rpc('eth_getBlockByNumber', ['latest', false]);
  inputs = { block, compilerHash: evidence.compilerFileHash, models: [], codes: {} };
  for (const model of models) {
    const source = (await fetchJson(evidence.sourceApi + model.address)).result?.[0];
    assert(source?.SourceCode && keccak256(toUtf8Bytes(source.SourceCode)) === model.sourceCodeHash, 'Unreviewed source ' + model.id);
    const code = await rpc('eth_getCode', [model.address, block.number]);
    inputs.models.push({ id: model.id, source, code });
  }
  // Public bytecode fixtures let offline tests exercise real pinned dependency
  // and token hashes, without injecting a weaker production verification mode.
  const fixtureAddresses = [
    ...Object.values(evidence.dependencies).map(row => row.address),
    '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab',
    '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  ];
  for (const address of fixtureAddresses) inputs.codes[address.toLowerCase()] = await rpc('eth_getCode', [address, block.number]);
  assert((await rpc('eth_getBlockByNumber', [block.number, false])).hash === block.hash, 'Snapshot reorganized');
  await writeFile(inputPath, JSON.stringify(inputs, null, 2) + '\n');
} else inputs = JSON.parse(await readFile(inputPath, 'utf8'));
const compilerText = await readFile(compilerPath, 'utf8').catch(() => { throw Error('Download the pinned Solidity 0.8.20 compiler from https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js and set OINK_SOLC_0820 to its file path. Its hash is checked before use.'); });
assert(keccak256(toUtf8Bytes(compilerText)) === evidence.compilerFileHash, 'Compiler hash differs');
const compilerModule = new Module(import.meta.filename);
compilerModule.paths = createRequire(import.meta.url).resolve.paths('solc');
compilerModule._compile(compilerText, import.meta.filename);
const compile = compilerModule.exports.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
const templates = [];
for (const model of models) {
  const input = inputs.models.find(row => row.id === model.id);
  assert(input && keccak256(toUtf8Bytes(input.source.SourceCode)) === model.sourceCodeHash, 'Cached source differs');
  const source = input.source;
  assert(source.CompilerVersion === 'v0.8.20+commit.a1b79de6' && source.IsProxy === 'false', 'Wrong compiler or proxy');
  const output = JSON.parse(compile(JSON.stringify({ language: 'Solidity', sources: { 'Vault.sol': { content: source.SourceCode } }, settings: {
    optimizer: { enabled: source.OptimizationUsed === 'true', runs: Number(source.OptimizationRuns ?? 200) },
    outputSelection: { '*': { '*': ['evm.deployedBytecode'] } },
  } }), 0, 0));
  assert(!output.errors?.some(error => error.severity === 'error'), 'Compiler failed');
  const compiled = output.contracts['Vault.sol'][source.ContractName].evm.deployedBytecode;
  const strip = (hex) => hex.slice(0, -(parseInt(hex.slice(-4), 16) + 2) * 2);
  let actual = strip(input.code.slice(2)), expected = strip(compiled.object);
  const immutables = [];
  for (const [astId, refs] of Object.entries(compiled.immutableReferences)) {
    const values = refs.map(({ start, length }) => {
      assert(length === 32, 'Unexpected immutable width');
      const value = actual.slice(start * 2, (start + length) * 2);
      assert(/^0{24}[a-f0-9]{40}$/i.test(value), 'Non-address immutable');
      return '0x' + value.slice(-40).toLowerCase();
    });
    assert(new Set(values).size === 1, 'Inconsistent immutable values');
    const role = values[0] === evidence.dependencies.rewardToken.address.toLowerCase() ? 'rewardToken' : 'stakeToken';
    assert(role === 'rewardToken' || values[0] === model.tokenAddress?.toLowerCase(), 'Unrecognized immutable');
    immutables.push({ role, compilerAstId: astId, offsets: refs.map(ref => ref.start) });
    for (const { start, length } of refs) {
      actual = actual.slice(0, start * 2) + '0'.repeat(length * 2) + actual.slice((start + length) * 2);
      expected = expected.slice(0, start * 2) + '0'.repeat(length * 2) + expected.slice((start + length) * 2);
    }
  }
  assert(actual === expected, 'Full executable differs from compiler output');
  assert(keccak256('0x' + actual) === model.normalizedExecutableHash, 'Reviewed executable differs');
  assert(immutables.length === (model.kind === 'native' ? 1 : 2), 'Unexpected immutable count');
  const metadata = input.code.slice(2 + actual.length);
  assert(/^a2646970667358221220[0-9a-f]{64}64736f6c63430008140033$/i.test(metadata), 'Unexpected Solidity metadata format');
  templates.push({ id: model.id, kind: model.kind, compiler: source.CompilerVersion, optimizerEnabled: source.OptimizationUsed === 'true', optimizerRuns: Number(source.OptimizationRuns ?? 200), sourceCodeHash: model.sourceCodeHash, normalizedExecutableHash: model.normalizedExecutableHash, executableBytes: actual.length / 2, exemplarAddress: model.address, immutables });
}
await writeFile('src/config/farmVaultTemplates.ts', `// Generated offline by scripts/generate-farm-vault-templates.mjs.\n// Entire reviewed executable is hashed; only compiler-reported immutable\n// address slots and the validated Solidity IPFS metadata trailer are normalized.\n// Original and later helper implementations were reviewed in expanded-farm-vaults.json.\nexport type FarmVaultTemplate = {\n  id: string; kind: "native" | "erc20"; compiler: string; optimizerEnabled: boolean; optimizerRuns: number;\n  sourceCodeHash: string; normalizedExecutableHash: string; executableBytes: number; exemplarAddress: string;\n  immutables: readonly { role: "rewardToken" | "stakeToken"; compilerAstId: string; offsets: readonly number[] }[];\n};\nexport const FARM_VAULT_TEMPLATES = ${JSON.stringify(templates, null, 2)} as const satisfies readonly FarmVaultTemplate[];\n`);
console.log('Reproduced ' + templates.length + ' complete compiler-derived farm templates.');
