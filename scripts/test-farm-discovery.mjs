import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { setMaxListeners } from 'node:events';
import { Interface, ZeroAddress, getAddress, keccak256, toQuantity } from 'ethers';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
// All providers are recording in-memory mocks. Bytecode/source fixtures came
// from read-only public evidence collection. No runtime tests contact a network.
setMaxListeners(0);
const { discoverFarmPools, matchFarmVaultTemplate, MAX_DISCOVERY_RPC_CONCURRENCY, FARM_DISCOVERY_TIMEOUT_MS } = await import('../src/lib/farmDiscovery.ts');
const { FARM_VAULT_TEMPLATES } = await import('../src/config/farmVaultTemplates.ts');
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS, TREASURY_AND_HELPER_CONTRACTS } = await import('../src/config/contracts.ts');
const { farmVaultInterface, farmTokenInterface } = await import('../src/lib/farmTransactions.ts');
const { farmTokenSafetyAbi } = await import('../src/lib/farmTokenSafety.ts');
const { getFarmWriteSpec, replaceDiscoveredFarmSpecs } = await import('../src/lib/farmCatalog.ts');
const { refreshDiscoveredFarmCatalog } = await import('../src/lib/farmCatalogDiscovery.ts');
const fixture = JSON.parse(await readFile(new URL('../evidence/farm-vault-template-inputs.json', import.meta.url), 'utf8'));
const common = VERIFIED_FARM_WRITES[0], plsx = VERIFIED_FARM_WRITES.find(row => row.id === 'plsx'), pusdt = VERIFIED_FARM_WRITES.find(row => row.id === 'pusdt');
const addr = value => getAddress('0x' + value.toString(16).padStart(40, '0'));
const hash = value => '0x' + value.repeat(64);
const lower = value => value.toLowerCase();
const chef = new Interface(['function poolLength() view returns(uint256)', 'function poolInfo(uint256) view returns(uint256,uint256,address)', 'function owner() view returns(address)', 'function dtx() view returns(address)', 'function feeAddress() view returns(address)']);
const governor = new Interface(['function treasuryWallet() view returns(address)', 'function masterchef() view returns(address)']);
const reward = new Interface(['function governor() view returns(address)', 'function owner() view returns(address)']);
const token = new Interface([...farmTokenInterface.fragments, ...farmTokenSafetyAbi.fragments]);
function patchImmutable(code, template, role, address, all = true) {
  const offsets = template.immutables.find(row => row.role === role).offsets;
  for (const offset of all ? offsets : offsets.slice(0, 1)) code = code.slice(0, 2 + offset * 2) + lower(address).slice(2).padStart(64, '0') + code.slice(2 + (offset + 32) * 2);
  return code;
}
function sample(templateIndex = 1, asset = plsx.tokenAddress) {
  const template = FARM_VAULT_TEMPLATES[templateIndex];
  let code = fixture.models.find(row => row.id === template.id).code;
  if (template.kind === 'erc20') code = patchImmutable(code, template, 'stakeToken', asset);
  return { code, template };
}
function mock(options = {}) {
  const block = { number: 1000, hash: hash('a'), timestamp: Math.floor(Date.now() / 1000) };
  const entries = options.entries ?? [{ address: TIME_MINER_CONTRACTS[0].address, alloc: 1n }, { address: addr(100), alloc: 0n, ...sample() }];
  const calls = [], state = { inFlight: 0, maximum: 0, blockReads: 0 };
  const overrides = options.overrides ?? {};
  const rpc = { async send(method, params) {
    assert.ok(['eth_chainId', 'eth_getBlockByNumber', 'eth_getCode', 'eth_call', 'eth_getStorageAt'].includes(method), 'Read-only discovery');
    calls.push({ method, params });
    state.maximum = Math.max(state.maximum, ++state.inFlight);
    try {
      if (options.onCall) options.onCall(method, params);
      if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
      if (method === 'eth_chainId') return options.chain ?? '0x171';
      if (method === 'eth_getBlockByNumber') { ++state.blockReads; return { number: toQuantity(block.number), timestamp: toQuantity(block.timestamp), hash: options.reorg && state.blockReads > 1 ? hash('b') : block.hash }; }
      assert.equal(params.at(-1), toQuantity(block.number), 'Every state read uses the supplied block');
      const to = lower(method === 'eth_call' ? params[0].to : params[0]);
      const entryIndex = entries.findIndex(row => lower(row.address) === to);
      const entry = entries[entryIndex];
      if (method === 'eth_getCode') {
        if (options.badRuntime === to) return '0x6001';
        if (entry?.codeError) throw new Error('Vault read temporarily unavailable');
        return entry?.code ?? fixture.codes[to] ?? '0x';
      }
      if (method === 'eth_call') {
        let abi, values;
        if (to === lower(common.masterchef)) {
          abi = chef;
          const tx = abi.parseTransaction({ data: params[0].data });
          if (tx.name === 'poolLength') values = [options.poolLength ?? entries.length];
          else if (tx.name === 'poolInfo') {
            const index = Number(tx.args[0]);
            if (options.poolError === index) throw new Error('Registry read temporarily unavailable');
            values = [entries[index].alloc ?? 1n, 999n, entries[index].address];
          } else values = [{ owner: common.governor, dtx: common.rewardToken, feeAddress: common.governor }[tx.name]];
        } else if (to === lower(common.governor)) { abi = governor; values = [{ treasuryWallet: common.treasuryWallet, masterchef: common.masterchef }[abi.parseTransaction({ data: params[0].data }).name]]; }
        else if (to === lower(common.rewardToken)) { abi = reward; values = [{ governor: common.governor, owner: common.masterchef }[abi.parseTransaction({ data: params[0].data }).name]]; }
        else if (entry) {
          abi = farmVaultInterface;
          const value = {
            masterchef: common.masterchef, token: common.rewardToken, poolID: BigInt(entryIndex), treasury: common.governor, treasuryWallet: common.treasuryWallet,
            maxFee: 500n, maxFundingFee: 250n, depositFee: 0n, fundingRate: 250n, defaultDirectPayout: 50n,
            stakeToken: entry.tokenAddress ?? matchFarmVaultTemplate(entry.code)?.stakeToken ?? plsx.tokenAddress,
          };
          values = [value[abi.parseTransaction({ data: params[0].data }).name]];
        } else {
          abi = token;
          const known = VERIFIED_FARM_WRITES.find(row => row.tokenAddress && lower(row.tokenAddress) === to);
          const tx = abi.parseTransaction({ data: params[0].data });
          values = [{ decimals: BigInt(known?.decimals ?? 18), paused: false, deprecated: false, basisPointsRate: 0n, maximumFee: 0n, isBlackListed: false, isBlacklisted: false }[tx.name]];
        }
        const tx = abi.parseTransaction({ data: params[0].data });
        const override = overrides[to + ':' + tx.name] ?? overrides[tx.name];
        if (override !== undefined) values = [typeof override === 'function' ? override(tx.args) : override];
        return abi.encodeFunctionResult(tx.name, values);
      }
      throw new Error('Unexpected mock call');
    } finally { --state.inFlight; }
  } };
  return { rpc, block, calls, state, entries, run: signal => discoverFarmPools(rpc, block, signal) };
}

for (let index = 0; index < FARM_VAULT_TEMPLATES.length; index++) test('Exact reviewed compiler executable matches: ' + FARM_VAULT_TEMPLATES[index].id, () => {
  const { code, template } = sample(index);
  const match = matchFarmVaultTemplate(code);
  assert.equal(match?.template.id, template.id);
  assert.equal(match?.rewardToken, getAddress(common.rewardToken));
  assert.equal(match?.stakeToken, template.kind === 'native' ? null : plsx.tokenAddress);
});
test('One altered opcode is rejected even with every original getter selector', () => {
  const { code } = sample();
  assert.equal(matchFarmVaultTemplate('0x61' + code.slice(4)), null);
});
test('Each repeated immutable must agree and must be a canonical nonzero address', () => {
  const { code, template } = sample();
  assert.equal(matchFarmVaultTemplate(patchImmutable(code, template, 'stakeToken', addr(900), false)), null);
  assert.equal(matchFarmVaultTemplate(patchImmutable(code, template, 'stakeToken', ZeroAddress)), null);
  const offset = template.immutables[0].offsets[0];
  assert.equal(matchFarmVaultTemplate(code.slice(0, 2 + offset * 2) + 'ff' + code.slice(4 + offset * 2)), null);
});
test('Only exact Solidity metadata structure is ignored; unknown trailer, compiler, truncation and appended bytes rejected', () => {
  const { code, template } = sample();
  const metadataStart = 2 + template.executableBytes * 2;
  assert.ok(matchFarmVaultTemplate(code.slice(0, metadataStart + 20) + 'ab'.repeat(32) + code.slice(metadataStart + 84)));
  for (const bad of [code + '00', code.slice(0, -2), code.slice(0, -4) + 'ffff', code.slice(0, -6) + '150033', code.slice(0, metadataStart) + '00'.repeat(53)]) assert.equal(matchFarmVaultTemplate(bad), null);
});
test('Known-asset new deployment yields same-block read/write spec, including zero reward allocation', async () => {
  const f = mock(), result = await f.run(), farm = result.discoveries[0];
  assert.equal(result.partial, false); assert.equal(result.pools.length, 2);
  assert.equal(farm.status, 'supported'); assert.equal(farm.allocPoint, '0'); assert.match(farm.reason, /no reward allocation/);
  assert.equal(farm.id, 'registry-' + lower(f.entries[1].address)); assert.equal(farm.poolId, '1');
  assert.equal(farm.writeSpec.runtimeCodeHash, keccak256(f.entries[1].code));
  assert.equal(farm.writeSpec.tokenRuntimeCodeHash, plsx.tokenRuntimeCodeHash);
  assert.equal(farm.writeSpec.discoveryBlockHash, f.block.hash); assert.equal(farm.writeSpec.verifiedBlock, f.block.number);
  assert.equal(farm.readSpec.tokenAddress, plsx.tokenAddress); assert.equal(farm.priceId, 'plsx');
  assert.equal(f.state.blockReads, 2);
});
test('Native PLS and all three token compiler variants can coexist without ABI-based fallback', async () => {
  const entries = FARM_VAULT_TEMPLATES.map((_, index) => ({ address: addr(100 + index), alloc: 3n, ...sample(index) }));
  const f = mock({ entries, delay: 1 }), result = await f.run();
  assert.deepEqual(result.discoveries.map(row => row.status), Array(4).fill('supported'));
  assert.equal(result.discoveries[0].writeSpec.tokenAddress, null);
  assert.equal(f.state.maximum, MAX_DISCOVERY_RPC_CONCURRENCY);
});
test('Unreviewed token receives no read/write permission or invented price/logo', async () => {
  const f = mock({ entries: [{ address: addr(100), ...sample(1, addr(900)) }] });
  const farm = (await f.run()).discoveries[0];
  assert.equal(farm.status, 'awaiting-integration'); assert.match(farm.reason, /asset has not been independently reviewed/);
  for (const key of ['readSpec', 'writeSpec', 'priceId', 'logoId']) assert.equal(farm[key], undefined);
});
test('Unknown new NFT/module contracts stay visible without permission', async () => {
  const f = mock({ entries: [{ address: '0x7B2DcC0D0180D6863e4D6Fa14903459638c5b45B', code: '0x6001', alloc: 3503n }] });
  const row = (await f.run()).discoveries[0];
  assert.equal(row.status, 'awaiting-integration'); assert.equal(row.allocPoint, '3503'); assert.equal(row.writeSpec, undefined);
});
test('Known farm, time-miner and configured NFT participants remain in registry but are not rediscovered', async () => {
  const known = [...TIME_MINER_CONTRACTS, ...ECOSYSTEM_MINER_CONTRACTS, TREASURY_AND_HELPER_CONTRACTS.find(row => row.id === 'nft-mining')];
  const f = mock({ entries: known.map(row => ({ address: row.address, alloc: 0n })) }), result = await f.run();
  assert.equal(result.pools.length, known.length); assert.equal(result.discoveries.length, 0); assert.equal(result.partial, false);
});
for (const [name, options, message] of [
  ['wrong chain', { chain: '0x1' }, /PulseChain/],
  ['unreviewed registry runtime', { badRuntime: lower(common.masterchef) }, /runtime/],
  ['unreviewed governor runtime', { badRuntime: lower(common.governor) }, /runtime/],
  ['changed governor owner', { overrides: { [lower(common.masterchef) + ':owner']: addr(99) } }, /owner/],
  ['changed reward wiring', { overrides: { dtx: addr(99) } }, /reward token/],
  ['registry beyond maximum', { poolLength: 51 }, /50 pools/],
  ['canonical block changed after reads', { reorg: true }, /block changed/],
]) test(name + ' rejects the snapshot globally', async () => assert.rejects(mock(options).run(), message));
test('Stale or future blocks fail before reading the RPC', async () => {
  for (const difference of [-121, 31]) {
    const f = mock(); f.block.timestamp += difference;
    await assert.rejects(f.run(), /stale|timestamp/); assert.equal(f.calls.length, 0);
  }
});
for (const [name, overrides, message] of [
  ['wrong vault chef', { masterchef: addr(88) }, /MasterChef/],
  ['getter lies about immutable deposit token', { stakeToken: addr(88) }, /Immutable deposit asset/],
  ['wrong reward recipient', { treasury: addr(88) }, /recipient/],
  ['wrong pool identifier', { poolID: 99n }, /identifier/],
  ['changed precision', { decimals: 8n }, /precision/],
  ['invalid fees', { depositFee: 501n }, /fees/],
  ['invalid fee cap', { maxFundingFee: 251n }, /fees/],
  ['invalid payout', { defaultDirectPayout: 10001n }, /payouts/],
]) test(name + ' leaves the pool awaiting integration', async () => {
  // For shared method names only the vault getter changes, dependencies stay valid.
  if (Object.hasOwn(overrides, 'masterchef')) { overrides[lower(addr(100)) + ':masterchef'] = overrides.masterchef; delete overrides.masterchef; }
  const row = (await mock({ overrides }).run()).discoveries[0];
  assert.equal(row.status, 'awaiting-integration'); assert.match(row.reason, message); assert.equal(row.writeSpec, undefined);
});
test('Changed immutable reward token is rejected despite getter returning expected OINK', async () => {
  const data = sample(); data.code = patchImmutable(data.code, data.template, 'rewardToken', addr(9));
  const row = (await mock({ entries: [{ address: addr(100), ...data }] }).run()).discoveries[0];
  assert.equal(row.status, 'awaiting-integration'); assert.match(row.reason, /Immutable reward token/);
});
test('Token implementation runtime must still match its independently reviewed deployment', async () => {
  const row = (await mock({ badRuntime: lower(plsx.tokenAddress) }).run()).discoveries[0];
  assert.equal(row.status, 'awaiting-integration'); assert.match(row.reason, /token runtime/);
});
test('Known pUSDT keeps its reviewed token policy; vault/treasury blacklist and transfer mode are checked', async () => {
  const entries = [{ address: addr(100), ...sample(3, pusdt.tokenAddress) }];
  const good = (await mock({ entries }).run()).discoveries[0];
  assert.equal(good.status, 'supported'); assert.deepEqual(good.writeSpec.tokenPolicy, { kind: 'usdt' });
  for (const overrides of [{ paused: true }, { deprecated: true }, { basisPointsRate: 1n }, { maximumFee: 1n }, { isBlackListed: true }]) {
    const bad = (await mock({ entries, overrides }).run()).discoveries[0];
    assert.equal(bad.status, 'awaiting-integration'); assert.equal(bad.writeSpec, undefined);
  }
});
test('Incomplete registry does not grant permissions even to otherwise compatible entries', async () => {
  const result = await mock({ poolError: 0 }).run();
  assert.equal(result.partial, true); assert.equal(result.pools[0].address, null); assert.ok(result.warnings.length);
  assert.equal(result.discoveries[0].status, 'awaiting-integration'); assert.equal(result.discoveries[0].writeSpec, undefined);
});
test('Duplicate participants produce one visible row, mark registry invalid and cannot acquire writes', async () => {
  const row = { address: addr(100), ...sample() }, result = await mock({ entries: [row, row] }).run();
  assert.equal(result.partial, true); assert.equal(result.pools.length, 2); assert.equal(result.discoveries.length, 1);
  assert.equal(result.discoveries[0].writeSpec, undefined);
});
test('Zero participant addresses are explicit registry errors, not fake farms', async () => {
  const result = await mock({ entries: [{ address: ZeroAddress }] }).run();
  assert.equal(result.partial, true); assert.match(result.pools[0].error, /zero address/); assert.equal(result.discoveries.length, 0);
});
test('An individual unavailable vault does not hide other compatible discoveries', async () => {
  const result = await mock({ entries: [{ address: addr(100), codeError: true }, { address: addr(101), ...sample() }] }).run();
  assert.equal(result.partial, false); assert.deepEqual(result.discoveries.map(row => row.status), ['awaiting-integration', 'supported']);
});
test('Pre-aborted discovery issues no RPC calls', async () => {
  const controller = new AbortController(); controller.abort(); const f = mock();
  await assert.rejects(f.run(controller.signal), { name: 'AbortError' }); assert.equal(f.calls.length, 0);
});
test('Abort during a hanging RPC resolves promptly and does not authorize or enqueue more work', async () => {
  const controller = new AbortController(), f = mock(); let calls = 0;
  const rpc = { send() { ++calls; queueMicrotask(() => controller.abort()); return new Promise(() => {}); } };
  await assert.rejects(discoverFarmPools(rpc, f.block, controller.signal), { name: 'AbortError' }); assert.equal(calls, 1);
});
test('Discovery deadline ends a permanently hanging RPC without real-time waiting', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = mock(); let began;
  const started = new Promise(resolve => { began = resolve; });
  const rpc = { send() { began(); return new Promise(() => {}); } };
  const outcome = assert.rejects(discoverFarmPools(rpc, f.block), { name: 'TimeoutError' });
  await started;
  context.mock.timers.tick(FARM_DISCOVERY_TIMEOUT_MS);
  await outcome;
});
test('Abort with a queued 50-pool registry prevents further sends and respects the global concurrency bound', async () => {
  const controller = new AbortController(); let registryCalls = 0;
  const f = mock({ entries: Array.from({ length: 50 }, (_, index) => ({ address: addr(100 + index), ...sample() })), delay: 1,
    onCall(method, params) { if (method === 'eth_call' && params[0].data.startsWith(chef.getFunction('poolInfo').selector) && ++registryCalls === 2) controller.abort(); } });
  await assert.rejects(f.run(controller.signal), { name: 'AbortError' });
  assert.ok(registryCalls <= 4); assert.ok(f.state.maximum <= MAX_DISCOVERY_RPC_CONCURRENCY);
});
test('Recovery refresh publishes only a complete fresh canonical discovery', async () => {
  replaceDiscoveredFarmSpecs([]);
  try {
    const f = mock(), result = await refreshDiscoveredFarmCatalog(f.rpc);
    const row = result.discoveries[0], published = getFarmWriteSpec(row.id);
    assert.ok(published); assert.equal(published.discoveryBlockHash, f.block.hash);
    assert.equal(published.runtimeCodeHash, row.writeSpec.runtimeCodeHash); assert.equal(f.state.blockReads, 4);
  } finally { replaceDiscoveredFarmSpecs([]); }
});
test('Incomplete registry and a reorg clear a previous dynamic permission', async () => {
  const seed = (await mock().run()).discoveries[0].writeSpec;
  try {
    for (const options of [{ poolError: 0 }, { reorg: true }]) {
      replaceDiscoveredFarmSpecs([seed]); assert.ok(getFarmWriteSpec(seed.id));
      await assert.rejects(refreshDiscoveredFarmCatalog(mock(options).rpc), /fully checked|block changed/);
      assert.equal(getFarmWriteSpec(seed.id), undefined);
    }
    replaceDiscoveredFarmSpecs([seed]);
    const f = mock();
    const rpc = { async send(method, params) {
      const result = await f.rpc.send(method, params);
      return method === 'eth_getBlockByNumber' && f.state.blockReads === 4 ? { ...result, hash: hash('b') } : result;
    } };
    await assert.rejects(refreshDiscoveredFarmCatalog(rpc), /snapshot changed/);
    assert.equal(getFarmWriteSpec(seed.id), undefined);
  } finally { replaceDiscoveredFarmSpecs([]); }
});
test('Aborted and late recovery refreshes cannot overwrite a newer catalog publication', async () => {
  const first = (await mock().run()).discoveries[0].writeSpec;
  const newer = { ...first, id: 'registry-' + lower(addr(101)), address: addr(101) };
  try {
    for (const abort of [false, true]) {
      replaceDiscoveredFarmSpecs([first]);
      const controller = new AbortController(); let switched = false, f;
      f = mock({ onCall(method) {
        if (!switched && method === 'eth_getBlockByNumber' && f.state.blockReads === 3) {
          switched = true; replaceDiscoveredFarmSpecs([newer]);
          if (abort) controller.abort();
        }
      } });
      await assert.rejects(refreshDiscoveredFarmCatalog(f.rpc, controller.signal), abort ? { name: 'AbortError' } : /refreshed elsewhere/);
      assert.ok(switched); assert.equal(getFarmWriteSpec(first.id), undefined); assert.ok(getFarmWriteSpec(newer.id));
    }
  } finally { replaceDiscoveredFarmSpecs([]); }
});
test('A fresh recovery refresh restores a cleared catalog without trusting saved data', async () => {
  try {
    const first = await refreshDiscoveredFarmCatalog(mock().rpc), id = first.discoveries[0].id;
    replaceDiscoveredFarmSpecs([]); assert.equal(getFarmWriteSpec(id), undefined);
    const fresh = mock(); await refreshDiscoveredFarmCatalog(fresh.rpc);
    assert.ok(getFarmWriteSpec(id));
    assert.ok(fresh.calls.some(call => call.method === 'eth_getCode'));
    assert.ok(fresh.calls.some(call => call.method === 'eth_call' && call.params[0].data.startsWith(chef.getFunction('poolInfo').selector)));
  } finally { replaceDiscoveredFarmSpecs([]); }
});
