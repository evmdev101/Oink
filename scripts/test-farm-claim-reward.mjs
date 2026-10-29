import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, ZeroAddress, getAddress, keccak256, parseEther, toQuantity } from 'ethers';

registerHooks({
  resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}},
  load(url,context,next){
    if(url===new URL('../src/lib/chain.ts',import.meta.url).href) return {format:'module',source:'export async function getPublicProvider(){ return globalThis.__farmClaimRewardRpc; }',shortCircuit:true};
    return next(url,context);
  },
});
const { loadFarmClaimReward, readFarmClaimReward, farmClaimRewardAbi } = await import('../src/lib/farmClaimReward.ts');
const { accessAbi } = await import('../src/lib/accessSnapshot.ts');
const { VERIFIED_FARM_WRITES: farms } = await import('../src/config/farmWriteVerification.ts');
const { sharedDisplayReads } = await import('../src/lib/sharedReadCache.ts');
const code='0x60006000',hash=keccak256(code),blockHash='0x'+'ab'.repeat(32),account='0x'+'11'.repeat(20),other='0x'+'22'.repeat(20),U=10n**18n;
for(const farm of farms) for(const key of ['runtimeCodeHash','masterchefRuntimeCodeHash','governorRuntimeCodeHash','rewardTokenRuntimeCodeHash']) farm[key]=hash;
const core=farms[0],abi=new Interface([...accessAbi.fragments,...farmClaimRewardAbi.fragments]);

function fixture(options={}) {
  const farm=farms.find(row=>row.id===(options.farmId??'pls')),calls=[],timestamp=Math.floor(Date.now()/1000)+(options.future?31:options.stale?-121:0);
  let heads=0;
  const rpc={async send(method,params){
    calls.push([method,params]);
    if(options.hang) return new Promise(()=>{});
    if(method==='eth_chainId')return options.wrongChain?'0x1':'0x171';
    if(method==='eth_getBlockByNumber'){heads++;return {number:'0x100',hash:options.reorg&&heads>1?'0x'+'cd'.repeat(32):blockHash,timestamp:toQuantity(timestamp)};}
    if(method==='eth_getCode')return options.badRuntime?'0x6001':code;
    if(method==='eth_getBalance')return toQuantity(options.balance??100n*U);
    assert.equal(method,'eth_call','No signing, simulation or transaction is permitted');
    assert.equal(params[1],'0x100');
    const tx=params[0],to=getAddress(tx.to),parsed=abi.parseTransaction(tx);let result;
    switch(parsed.name){
      case'owner':result=[to===getAddress(core.rewardToken)?core.masterchef:core.governor];break;
      case'governor':case'feeAddress':case'treasury':result=[options.badWiring?other:core.governor];break;
      case'token':case'dtx':result=[core.rewardToken];break;
      case'masterchef':result=[core.masterchef];break;
      case'treasuryWallet':result=[core.treasuryWallet];break;
      case'poolID':result=[options.badPool?999n:BigInt(farm.poolId)];break;
      case'poolInfo':result=[1n,0n,options.badPoolParticipant?other:farm.address];break;
      case'getNrOfStakes':result=[options.count??2n];break;
      case'userInfo':result=[options.amount??20n*U,options.debt??1000000000000n,0n,0n];break;
      case'accDtxPerShare':result=[options.accumulator??3000000000000n];break;
      case'lastCredit':result=[options.lastCredit??20n*U];break;
      case'credit':result=[options.credit??50n*U];break;
      case'pendingDtx':result=[options.pending??10n*U];break;
      case'balanceOf':result=[options.balance??100n*U];break;
      default:throw Error('Unexpected read '+parsed.name);
    }
    return abi.encodeFunctionResult(parsed.fragment,result);
  }};
  return {rpc,calls,farm,timestamp};
}

test('claim reward includes credited-but-uncollected rewards at one canonical block',async()=>{
  const f=fixture(),value=await loadFarmClaimReward(f.rpc,'pls',account,0);
  assert.deepEqual(value,{farmId:'pls',account,index:0,gross:'48.0',timestamp:f.timestamp});
  // The card's virtual accumulator would show 42 OINK, not the 48 harvested.
  assert.notEqual(value.gross,'42.0');
  assert.ok(f.calls.every(([method])=>['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_getBalance'].includes(method)));
  for(const [method,params] of f.calls)if(['eth_getCode','eth_getBalance'].includes(method))assert.equal(params[1],'0x100');
});

test('ERC20 farms use actual vault token balance instead of native balance',async()=>{
  const f=fixture({farmId:'plsx'}),value=await loadFarmClaimReward(f.rpc,'plsx',account,1);
  assert.equal(value.gross,'48.0');assert.ok(!f.calls.some(([method])=>method==='eth_getBalance'));
  const balanceCall=f.calls.find(([method,params])=>method==='eth_call'&&getAddress(params[0].to)===getAddress(f.farm.tokenAddress));
  assert.equal(abi.parseTransaction(balanceCall[1][0]).name,'balanceOf');
});

test('previously credited reward can meet a miner minimum while card pending is zero',async()=>{
  const f=fixture({amount:U,balance:U,debt:0n,accumulator:0n,credit:100n*U,pending:0n,lastCredit:0n});
  assert.equal((await loadFarmClaimReward(f.rpc,'pls',account,0)).gross,'100.0');
});

test('invalid identity and position are rejected before RPC access',async()=>{
  const rpc={async send(){throw Error('No RPC expected');}};
  for(const [id,owner,index]of[['unknown',account,0],['pls',ZeroAddress,0],['pls',account,-1],['pls',account,1.5],['pls','invalid',0]])await assert.rejects(loadFarmClaimReward(rpc,id,owner,index));
});

test('changed contracts, stale blocks, missing positions and inconsistent accounting are rejected',async()=>{
  for(const options of [{wrongChain:true},{badRuntime:true},{badWiring:true},{badPool:true},{badPoolParticipant:true},{future:true},{stale:true},{reorg:true},{count:0n},{amount:0n},{balance:0n},{amount:101n*U},{lastCredit:61n*U},{debt:999999999999999999n}]){
    const f=fixture(options);await assert.rejects(loadFarmClaimReward(f.rpc,'pls',account,0));
  }
});

test('shared reward reads cache by account, farm and index and support cancellation',async()=>{
  sharedDisplayReads.clear('369:farm-claim-reward:');
  const f=fixture();globalThis.__farmClaimRewardRpc=f.rpc;
  const first=await readFarmClaimReward('pls',account,0),calls=f.calls.length;
  assert.equal(await readFarmClaimReward('pls',account,0),first);assert.equal(f.calls.length,calls);
  assert.equal((await readFarmClaimReward('pls',other,0)).account,other);assert.ok(f.calls.length>calls);
  const beforeIndex=f.calls.length;assert.equal((await readFarmClaimReward('pls',account,1)).index,1);assert.ok(f.calls.length>beforeIndex);
  const controller=new AbortController();controller.abort(Error('Read cancelled'));
  await assert.rejects(readFarmClaimReward('pls',account,0,controller.signal),/Read cancelled/);
  delete globalThis.__farmClaimRewardRpc;
});
