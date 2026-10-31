import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,keccak256,parseEther,parseUnits} from 'ethers';

registerHooks({
  resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}},
  load(url,c,next){
    if(url.endsWith('/src/lib/chain.ts'))return {format:'module',shortCircuit:true,source:'export async function getPublicProvider(){return globalThis.farmProgressiveRpc;}'};
    if(url.endsWith('/src/lib/farmYield.ts'))return {format:'module',shortCircuit:true,source:'export async function readFarmYield(id){return globalThis.farmProgressiveYield(id);}'};
    if(url.endsWith('/src/lib/farmDiscovery.ts'))return {format:'module',shortCircuit:true,source:'export async function discoverFarmPools(){return {discoveries:[],partial:false};}'};
    if(url.endsWith('/src/lib/specialFarms.ts'))return {format:'module',shortCircuit:true,source:'export async function readSpecialFarm(id){return {kind:id,yieldEstimate:null};}'};
    return next(url,c);
  },
});
const {ECOSYSTEM_MINER_CONTRACTS}=await import('../src/config/contracts.ts');
const {VERIFIED_FARM_READS}=await import('../src/config/farmReadVerification.ts');
const {readEcosystemVaults,subscribeEcosystemVaults,peekEcosystemVaults}=await import('../src/lib/miningAccounts.ts');
const {sharedDisplayReads}=await import('../src/lib/sharedReadCache.ts');
const account='0x0000000000000000000000000000000000000001';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const abi=new Interface([
  'function lockedAmount(address) view returns(uint256)', 'function vaultBalance() view returns(uint256)', 'function stakeToken() view returns(address)','function depositFee() view returns(uint256)',
  'function fundingRate() view returns(uint256)','function poolID() view returns(uint256)',
  'function publicBalanceOf() view returns(uint256)','function decimals() view returns(uint8)',
  'function symbol() view returns(string)','function balanceOf(address) view returns(uint256)',
  'function getNrOfStakes(address) view returns(uint256)',
  'function multiCall(address,uint256) view returns(uint256,uint256,uint256,uint256)',
]);
function fixture({yieldRead=async()=>null,failedPool}={}){
  sharedDisplayReads.clear();
  const counts={calls:0,blocks:0,yields:0};let canonical=true;
  for(const spec of VERIFIED_FARM_READS)spec.runtimeCodeHash=keccak256('0x00');
  globalThis.farmProgressiveYield=id=>{counts.yields++;return yieldRead(id);};
  globalThis.farmProgressiveRpc={
    async send(method){assert.equal(method,'eth_chainId');return '0x171';},
    async getBlock(tag){counts.blocks++;return {number:1000,timestamp:1000000,hash:tag==='latest'||canonical?'canonical':'reorg'};},
    async getCode(address){return VERIFIED_FARM_READS.find(spec=>spec.address.toLowerCase()===address.toLowerCase())?.id===failedPool?'0x01':'0x00';},
    async getBalance(_address,block){assert.equal(block,1000);return parseEther('100');},
    async call(tx){
      counts.calls++;assert.equal(tx.blockTag,1000);
      const fragment=abi.getFunction(tx.data.slice(0,10));
      const vault=VERIFIED_FARM_READS.find(spec=>spec.address.toLowerCase()===tx.to.toLowerCase());
      const token=VERIFIED_FARM_READS.find(spec=>spec.tokenAddress?.toLowerCase()===tx.to.toLowerCase());
      let values;
      if(fragment.name==='lockedAmount')values=[parseEther('25')];
      else if(fragment.name==='vaultBalance')values=[parseUnits('100',vault.decimals)];
      else if(fragment.name==='stakeToken')values=[vault.tokenAddress];
      else if(fragment.name==='depositFee'||fragment.name==='fundingRate')values=[0n];
      else if(fragment.name==='poolID')values=[BigInt(vault.poolId)];
      else if(fragment.name==='publicBalanceOf')values=[parseEther('5')];
      else if(fragment.name==='decimals')values=[BigInt(token.decimals)];
      else if(fragment.name==='symbol')values=[token.id.toUpperCase()];
      else if(fragment.name==='balanceOf')values=[parseUnits('100',token.decimals)];
      else if(fragment.name==='getNrOfStakes')values=[1n];
      else if(fragment.name==='multiCall')values=[parseUnits('2',vault.decimals),0n,0n,parseEther('3')];
      else throw Error('Unexpected getter '+fragment.name);
      return abi.encodeFunctionResult(fragment,values);
    },
  };
  return {counts,reorg(){canonical=false;}};
}

test('all verified balances appear while optional APR reads are still delayed, without extra balance calls',async t=>{
  const apr=deferred(),allBalances=deferred(),updates=[];
  const rpc=fixture({yieldRead:()=>apr.promise});let elapsed=0,finished=false;
  const stop=subscribeEcosystemVaults(account,snapshot=>{
    updates.push({snapshot,elapsed});
    if(snapshot.rows.filter(row=>row.data).length===VERIFIED_FARM_READS.length)allBalances.resolve(snapshot);
  });
  const work=readEcosystemVaults(undefined,account).then(value=>{finished=true;return value;});
  try{
    const early=await allBalances.promise;
    assert.equal(elapsed,0);assert.equal(finished,false);assert.equal(early.complete,false);
    assert.equal(early.account,account);assert.ok(early.rows.filter(row=>row.data).every(row=>row.loading===false&&row.data.yieldEstimate===null));
    const ptgc=early.rows.find(row=>row.id==='ptgc');assert.equal(ptgc.data.walletBalance,'100.0');assert.equal(ptgc.data.walletAvailableBalance,'75.0');assert.equal(ptgc.data.walletLockedBalance,'25.0');
    const native=early.rows.find(row=>row.id==='pls');assert.equal(native.data.balance,'100.0');assert.equal(native.data.positions[0].amount,'2.0');assert.equal(native.data.positions[0].pending,'3.0');
    assert.equal(peekEcosystemVaults(account).complete,false,'the complete shared cache must not accept partial coverage');
    const balanceCalls=rpc.counts.calls;
    const revisits=[];const stopRevisit=subscribeEcosystemVaults(account,value=>revisits.push(value));
    assert.equal(revisits.length,1,'a returning tab sees the in-flight balances synchronously');stopRevisit();
    elapsed=5000;apr.resolve({dailyPool:'1',directBps:'10000',secondsPerBlock:10,allocation:'1'});
    const final=await work;assert.equal(final.complete,true);assert.equal(final.rows.length,ECOSYSTEM_MINER_CONTRACTS.length);
    assert.ok(final.rows.filter(row=>row.data).every(row=>row.data.yieldEstimate?.dailyPool==='1'));
    assert.equal(rpc.counts.calls,balanceCalls,'APR layering does not repeat the balance or wallet-position reads');
    const beforeRevisit=rpc.counts.calls;assert.equal(await readEcosystemVaults(undefined,account),final);assert.equal(rpc.counts.calls,beforeRevisit);
    t.diagnostic(`Synthetic APR delay: 5000 ms; all ${VERIFIED_FARM_READS.length} base farm rows available before that delay; ${balanceCalls} balance/position contract calls, unchanged after APR completion.`);
  }finally{apr.resolve(null);await work.catch(()=>{});stop();sharedDisplayReads.clear();}
});

test('a failing farm does not suppress readable farm balances or convert its failure to zero',async()=>{
  fixture({failedPool:'inc'});const final=await readEcosystemVaults(undefined,account);
  assert.equal(final.complete,true);assert.match(final.rows.find(row=>row.id==='inc').error,/runtime/i);assert.equal(final.rows.find(row=>row.id==='inc').data,null);
  assert.equal(final.rows.find(row=>row.id==='pls').data.balance,'100.0');sharedDisplayReads.clear();
});

test('a reorg during delayed APR never publishes estimates from the replaced snapshot',async()=>{
  const apr=deferred(),first=deferred(),updates=[];const rpc=fixture({yieldRead:()=>apr.promise});
  const stop=subscribeEcosystemVaults(account,value=>{updates.push(value);if(value.rows.some(row=>row.data))first.resolve();});
  const work=readEcosystemVaults(undefined,account);void work.catch(()=>{});
  try{await first.promise;rpc.reorg();const before=updates.length;apr.resolve({dailyPool:'1'});await assert.rejects(work,/Snapshot block changed/);assert.equal(updates.length,before);}
  finally{apr.resolve(null);await work.catch(()=>{});stop();sharedDisplayReads.clear();}
});

test('account isolation and read invalidation prevent late APR from reaching another or invalidated view',async()=>{
  const apr=deferred(),first=deferred(),alice=[],bob=[];fixture({yieldRead:()=>apr.promise});
  const stopAlice=subscribeEcosystemVaults(account,value=>{alice.push(value);if(value.rows.some(row=>row.data))first.resolve();});
  const stopBob=subscribeEcosystemVaults('0x0000000000000000000000000000000000000002',value=>bob.push(value));
  const work=readEcosystemVaults(undefined,account);void work.catch(()=>{});
  try{await first.promise;sharedDisplayReads.clear();const before=alice.length;apr.resolve({dailyPool:'1'});await assert.rejects(work);await new Promise(resolve=>setImmediate(resolve));assert.equal(alice.length,before);assert.equal(bob.length,0);}
  finally{apr.resolve(null);await work.catch(()=>{});stopAlice();stopBob();sharedDisplayReads.clear();}
});
