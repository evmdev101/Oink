import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s,c,n) { try { return n(s,c); } catch(e) { if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s)) return n(s+'.ts',c); throw e; } } });
const { rewardAllocation } = await import('../src/lib/rewardAllocation.ts');
const { TIME_MINER_CONTRACTS, ECOSYSTEM_MINER_CONTRACTS } = await import('../src/config/contracts.ts');
const { NFT_PROJECTS } = await import('../src/config/nftProjects.ts');
const unknown = '0x1111111111111111111111111111111111111111';

test('allocation derives every percentage from current registry points and groups miners by address, independent of slot', () => {
  const pools = [
    { address: ECOSYSTEM_MINER_CONTRACTS[0].address, points: 15n },
    { address: TIME_MINER_CONTRACTS[5].address, points: 84n },
    { address: unknown, points: 1n },
  ];
  const result = rewardAllocation(pools,100n);
  assert.equal(result.active.find(row => row.label === 'OINK miners').percent,84);
  assert.equal(result.active.find(row => row.label === 'PLS miners').percent,15);
  assert.equal(result.active.find(row => row.address === unknown).percent,1);
  assert.equal(result.rows.length,3);
  assert.equal(rewardAllocation(pools.map(row => ({...row,points:row.points*2n})),200n).active[0].percent,84);
});

test('inactive and unfamiliar NFT pools remain visible with their registry identity', () => {
  const result = rewardAllocation([
    {address:NFT_PROJECTS[0].contracts[0].address,points:1n},
    {address:unknown,points:0n},
  ],1n);
  assert.match(result.rows[0].label,/NFT/);
  assert.equal(result.rows[0].percent,100);
  assert.equal(result.inactive[0].address,unknown);
  assert.equal(result.inactive[0].percent,0);
  assert.equal(result.active.length,1);
});

test('zero allocations have no fabricated active pools or division errors', () => {
  const result = rewardAllocation([{address:unknown,points:0n}],0n);
  assert.deepEqual(result.active,[]);
  assert.equal(result.rows[0].percent,0);
});

test('invalid, duplicate and incomplete registries cannot publish an allocation breakdown', () => {
  assert.throws(() => rewardAllocation([{address:unknown,points:1n}],2n),/total/);
  assert.throws(() => rewardAllocation([{address:unknown,points:-1n}],-1n),/total/);
  assert.throws(() => rewardAllocation([{address:'bad',points:1n}],1n),/invalid/);
  assert.throws(() => rewardAllocation([{address:unknown,points:1n},{address:unknown,points:1n}],2n),/duplicate/);
});

test('large uint256 allocation points retain small pool percentages without overflowing', () => {
  const scale = 10n**70n;
  const result = rewardAllocation([{address:unknown,points:scale},{address:TIME_MINER_CONTRACTS[0].address,points:9999n*scale}],10000n*scale);
  assert.equal(result.rows[0].percent,0.01);
  assert.equal(result.rows[1].percent,99.99);
});
