import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { farmCountFromRegistry, isKnownFarmRegistryAddress } = await import('../src/lib/farmRegistryCount.ts');
const { ECOSYSTEM_MINER_CONTRACTS, TIME_MINER_CONTRACTS, GOVERNANCE_CONTRACTS, TREASURY_AND_HELPER_CONTRACTS } = await import('../src/config/contracts.ts');
const { NFT_PROJECTS } = await import('../src/config/nftProjects.ts');
const pool = address => ({ address });
const baseline = ECOSYSTEM_MINER_CONTRACTS.length;
const knownPools = [...ECOSYSTEM_MINER_CONTRACTS, ...TIME_MINER_CONTRACTS];

test('counts configured farms without reading vault balances or prices', () => {
  assert.equal(baseline, 17);
  assert.equal(farmCountFromRegistry(knownPools), baseline);
  assert.equal(farmCountFromRegistry([]), baseline);
});
test('adds newly registered farms including inactive pools, ignoring address casing', () => {
  assert.equal(farmCountFromRegistry([...knownPools, pool('0xAb00000000000000000000000000000000000001')]), baseline + 1);
});
test('excludes time miners, governance, helpers and linked NFT dashboards', () => {
  const entries = [...knownPools, ...GOVERNANCE_CONTRACTS, ...TREASURY_AND_HELPER_CONTRACTS, ...NFT_PROJECTS.flatMap(project => project.contracts)];
  const unique = [...new Map(entries.map(row => [row.address.toLowerCase(), row])).values()];
  assert.equal(farmCountFromRegistry(unique), baseline);
  for (const row of knownPools) assert.equal(isKnownFarmRegistryAddress(row.address.toUpperCase()), true);
  assert.equal(isKnownFarmRegistryAddress('0xAb00000000000000000000000000000000000001'), false);
});
test('invalid, unavailable or duplicate registry entries do not publish a partial count', () => {
  for (const address of [null, '', '0x1234', '0x' + '0'.repeat(40)]) assert.equal(farmCountFromRegistry([pool(address)]), null);
  assert.equal(farmCountFromRegistry([knownPools[0], pool(knownPools[0].address.toUpperCase())]), null);
});
