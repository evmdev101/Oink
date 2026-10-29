import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256 } from 'ethers';
registerHooks({ resolve(s, c, n) { try { return n(s, c); } catch (error) { if (s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return n(s + '.ts', c); throw error; } } });
const { readFarmYield } = await import('../src/lib/farmYield.ts');
const { FARM_READ_CHEF } = await import('../src/config/farmReadVerification.ts');
const abi = new Interface([
  'function masterchef() view returns(address)', 'function poolID() view returns(uint256)',
  'function defaultDirectPayout() view returns(uint256)', 'function DTXPerBlock() view returns(uint256)',
  'function totalAllocPoint() view returns(uint256)', 'function poolInfo(uint256) view returns(uint256,uint256,address)',
  'function startBlock() view returns(uint256)', 'function dtx() view returns(address)',
]);
const vaults = ['0x' + '1'.repeat(40), '0x' + '2'.repeat(40)];
const chefCode = '0x1234', vaultCode = '0x5678';
function setup(chain = 369n) {
  const counts = { chain: 0, chefCode: 0, earlierBlock: 0, calls: {} };
  const rpc = {
    send: async () => { counts.chain++; return chain; },
    getCode: async address => { if (address === FARM_READ_CHEF.address) { counts.chefCode++; return chefCode; } return vaultCode; },
    getBlock: async number => { counts.earlierBlock++; return { number, timestamp: 10000 }; },
  };
  const runner = { call: async tx => {
    const call = abi.parseTransaction({ data: tx.data });
    counts.calls[call.name] = (counts.calls[call.name] ?? 0) + 1;
    const result = {
      masterchef: [FARM_READ_CHEF.address],
      poolID: [BigInt(vaults.indexOf(tx.to.toLowerCase()) + 7)],
      defaultDirectPayout: [10000n], DTXPerBlock: [10n ** 18n], totalAllocPoint: [200n],
      poolInfo: [100n, 999n, vaults[Number(call.args.length ? call.args[0] : 7n) - 7]],
      startBlock: [1n], dtx: [FARM_READ_CHEF.rewardToken],
    }[call.name];
    return abi.encodeFunctionResult(call.name, result);
  } };
  const read = (index, block = 1000) => readFarmYield('fixture-' + index, runner, rpc, block, 11000, { address: vaults[index], runtimeCodeHash: keccak256(vaultCode), poolId: String(index + 7) });
  return { counts, read };
}

test('all farms reuse chef verification, emission and timing only within the same snapshot', async () => {
  const original = FARM_READ_CHEF.runtimeCodeHash;
  FARM_READ_CHEF.runtimeCodeHash = keccak256(chefCode);
  try {
    const f = setup();
    const results = await Promise.all([f.read(0), f.read(1)]);
    assert.deepEqual(results.map(result => result.dailyPool), ['4320.0', '4320.0']);
    assert.equal(f.counts.chain, 1);
    assert.equal(f.counts.chefCode, 1);
    assert.equal(f.counts.earlierBlock, 1);
    for (const method of ['DTXPerBlock', 'totalAllocPoint', 'startBlock', 'dtx']) assert.equal(f.counts.calls[method], 1);
    assert.equal(f.counts.calls.poolInfo, 2, 'each pool still verifies its own allocation and address');
    await f.read(0, 1001);
    assert.equal(f.counts.chain, 2, 'a different block revalidates shared state');
    assert.equal(f.counts.calls.DTXPerBlock, 2);
  } finally { FARM_READ_CHEF.runtimeCodeHash = original; }
});

test('shared context never bypasses chain or runtime verification', async () => {
  const original = FARM_READ_CHEF.runtimeCodeHash;
  FARM_READ_CHEF.runtimeCodeHash = keccak256(chefCode);
  try { assert.equal(await setup(1n).read(0), null); }
  finally { FARM_READ_CHEF.runtimeCodeHash = original; }
  assert.equal(await setup().read(0), null, 'unverified chef runtime remains unusable');
});
