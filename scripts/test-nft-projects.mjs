import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NFT_PROJECTS,isNftDashboardPool,nftRewardStatus} from '../src/config/nftProjects.ts';
const addresses=NFT_PROJECTS[0].contracts.map(c=>c.address);
const pools=addresses.map((address,i)=>({address,poolId:String(i+24),allocPoint:'0'}));
test('NFT reward badge distinguishes active, zero and missing allocation',()=>{
 assert.equal(nftRewardStatus(addresses,pools,true),'none');
 assert.equal(nftRewardStatus(addresses,pools.slice(1),true),'unknown');
 assert.equal(nftRewardStatus(addresses,[{...pools[0],allocPoint:null}],true),'unknown');
 assert.equal(nftRewardStatus(addresses,[{...pools[0],allocPoint:'3503'}],true),'active');
});
test('stale NFT allocations never appear active',()=>{
 assert.equal(nftRewardStatus(addresses,[{...pools[0],allocPoint:'3503'}],false),'unknown');
});
test('unrelated contracts cannot activate or join a reviewed NFT project',()=>{
 const unknown='0x'+'1'.repeat(40);
 assert.equal(isNftDashboardPool(unknown),false);
 assert.equal(isNftDashboardPool(addresses[0].toLowerCase()),true);
 assert.equal(nftRewardStatus(addresses,[{address:unknown,poolId:'99',allocPoint:'99999'}],true),'unknown');
});
