import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import {Interface,ZeroAddress,formatEther,getAddress,getCreateAddress,keccak256,toQuantity,toUtf8Bytes} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {minerDonationAdapter:adapter,minerDonationAbi:abi,donationRuntime,donationInitCode,donationMandatorySeconds,readMinerDonation}=await import('../src/lib/minerDonationTransactions.ts');
const {prepareProtocolTransaction,requestProtocolTransaction,assertSameProtocolTerms,verifyProtocolReceipt}=await import('../src/lib/protocolTransactions.ts');
const {advancedGovernanceAdapter}=await import('../src/lib/advancedGovernanceActions.ts');
const {minerEvents}=await import('../src/lib/positionTransactions.ts');
const {MINER_PREVIEW_SPECS:miners}=await import('../src/config/minerPreviewVerification.ts');
const {VERIFIED_FARM_WRITES:farms}=await import('../src/config/farmWriteVerification.ts');
const build=JSON.parse(fs.readFileSync('src/config/minerDonationBuild.json','utf8'));
const U=10n**18n,account=getAddress('0x'+'11'.repeat(20)),recipient=getAddress('0x'+'22'.repeat(20)),callback=getAddress('0x'+'33'.repeat(20)),other=getAddress('0x'+'44'.repeat(20)),core=farms[0],miner=miners[3],code='0x6000',codeHash=keccak256(code),blockHash='0x'+'bb'.repeat(32),hash='0x'+'cc'.repeat(32);
for(const m of miners)m.runtimeCodeHash=codeHash;
for(const f of farms)for(const key of ['masterchefRuntimeCodeHash','governorRuntimeCodeHash','rewardTokenRuntimeCodeHash'])f[key]=codeHash;
const callsAbi=new Interface([...abi.fragments,'function balanceOf() view returns(uint256)']);
const deploy={module:'miner-donation',action:'deploy',args:{recipient,miner:miner.id,mandatoryDays:'365'}};
function fixture(options={}){
 const timestamp=options.timestamp??Math.floor(Date.now()/1000),block={number:options.block??'0x100',timestamp:toQuantity(timestamp),hash:blockHash},calls=[];
 const fixed={recipient:options.recipient??recipient,pool:options.pool??miner.address,mandatory:options.mandatory??365n*86400n};
 const runtime=donationRuntime(fixed.recipient,fixed.pool,fixed.mandatory),nonce=options.nonce??'0x0',created=getCreateAddress({from:account,nonce:BigInt(nonce)});
 const rpc={async send(method,params){calls.push([method,params]);
  if(method==='eth_chainId')return options.chain??'0x171';
  if(method==='eth_getBlockByNumber')return block;
  if(method==='eth_getTransactionCount')return params[1]==='pending'?options.pendingNonce??nonce:nonce;
  if(method==='eth_getCode'){
   const to=getAddress(params[0]);if(to===account||to===created&&!options.mined)return '0x';
   if(to===callback||to===created&&options.mined)return options.changedRuntime?'0x6001':runtime;
   return options.changedDependency?'0x6001':code;
  }
  if(method==='eth_getBalance')return toQuantity(options.noGas?0n:1000000n*U);
  if(method==='eth_gasPrice')return '0x2';if(method==='eth_estimateGas')return '0x186a0';
  if(method!=='eth_call')throw Error('Unexpected RPC '+method);
  const tx=params[0];if(!tx.to){assert.equal(tx.data,donationInitCode(recipient,miner.address,365n*86400n));return options.badSimulation?'0x6001':runtime;}
  const to=getAddress(tx.to),p=callsAbi.parseTransaction(tx),name=p?.name;
  if(name==='giftStake')return '0x';
  let result;
  switch(name){
   case'token':result=[options.oldToken&&to===callback?other:core.rewardToken];break;
   case'pool':result=[fixed.pool];break;case'recipient':result=[fixed.recipient];break;case'minServe':result=[fixed.mandatory];break;
   case'masterchef':result=[core.masterchef];break;
   case'owner':result=[to===getAddress(core.rewardToken)?core.masterchef:core.governor];break;
   case'admin':case'treasury':case'feeAddress':case'governor':result=[options.badWiring?other:core.governor];break;
   case'dtx':result=[core.rewardToken];break;case'migrationPool':result=[ZeroAddress];break;
   case'poolID':result=[BigInt(miner.poolId)];break;case'poolInfo':result=[1n,0n,miner.address];break;case'trustedContract':result=[!options.untrusted];break;
   case'withdrawFeePeriod':result=[BigInt(miner.durationDays)*86400n];break;case'gracePeriod':result=[BigInt(miner.graceDays)*86400n];break;
   case'minimumGift':result=[options.minimumGift??U];break;
   case'totalShares':result=[100n*U];break;
   case'balanceOf':result=[p.args.length?options.balance??20n*U:options.poolBalance??200n*U];break;
   default:throw Error('Missing read '+name);
  }
  return callsAbi.encodeFunctionResult(p.fragment,result);
 }};
 return {rpc,calls,block,runtime,created};
}
test('corrected helper source, public copy, compiler build and immutable runtime are reproducible',()=>{
 const source=fs.readFileSync('evidence/miner-donation/IssueStake.sol','utf8');assert.equal(fs.readFileSync('public/contracts/IssueStake.sol','utf8'),source);assert.equal(keccak256(toUtf8Bytes(source)),build.sourceHash);
 assert.match(source,new RegExp(core.rewardToken));assert.equal(build.compiler,'0.8.20+commit.a1b79de6');assert.equal(build.evmVersion,'paris');
 const code=donationRuntime(recipient,miner.address,365n*86400n);assert.notEqual(code,donationRuntime(other,miner.address,365n*86400n));assert.notEqual(code,donationRuntime(recipient,miners[5].address,365n*86400n));assert.notEqual(code,donationRuntime(recipient,miner.address,0n));
 const args=abi.deploy.inputs,encoded=donationInitCode(recipient,miner.address,365n*86400n).slice(build.creationCode.length);assert.equal(encoded.length,args.length*64);
 for(const days of ['-1','1.5','1e2','',String(2n**256n)])assert.throws(()=>donationMandatorySeconds(days));assert.equal(donationMandatorySeconds('365'),31536000n);assert.equal(donationMandatorySeconds('0'),0n);
});
test('donation deployment reviews current token, fixed wallet/pool, mandatory days in seconds and exact runtime without sending',async()=>{
 const f=fixture(),r=await prepareProtocolTransaction(f.rpc,account,deploy,adapter);assert.equal(r.quote.kind,'creation');assert.equal(r.quote.to,f.created);assert.equal(r.quote.creation.runtime,f.runtime);assert.equal(r.transaction.data,donationInitCode(recipient,miner.address,31536000n));
 const facts=Object.fromEntries(r.quote.facts);assert.equal(facts['OINK token'],core.rewardToken);assert.match(facts['Mandatory service'],/365 days \(31536000 seconds\)/);assert.equal(facts['Nominal miner duration'],miner.durationDays+' days');assert.equal(facts['Grace period'],miner.graceDays+' days');assert.equal(facts['Helper source hash'],build.sourceHash);assert.equal(facts['Expected runtime hash'],keccak256(f.runtime));assert(!f.calls.some(([m])=>m==='eth_sendTransaction'));
});
test('donation dependency changes, pending nonces, wrong chain, simulations and invalid recipients block deployment',async()=>{
 for(const options of [{changedDependency:true},{badWiring:true},{untrusted:true},{pendingNonce:'0x1'},{chain:'0x1'},{noGas:true},{badSimulation:true}])await assert.rejects(prepareProtocolTransaction(fixture(options).rpc,account,deploy,adapter));
 for(const input of [ZeroAddress,core.rewardToken,miner.address])await assert.rejects(prepareProtocolTransaction(fixture().rpc,account,{...deploy,args:{...deploy.args,recipient:input}},adapter));
});
test('callback inspection verifies current token, entire runtime and official miner before activation',async()=>{
 const f=fixture(),state=await readMinerDonation(f.rpc,callback);assert.equal(state.recipient,recipient);assert.equal(state.mandatorySeconds,'31536000');assert.equal(state.balance,(20n*U).toString());
 for(const options of [{oldToken:true},{changedRuntime:true},{changedDependency:true},{badWiring:true},{untrusted:true}])await assert.rejects(readMinerDonation(fixture(options).rpc,callback));
 for(const balance of [0n,U-1n])await assert.rejects(adapter.prepare(fixture({balance}).rpc,account,{module:'miner-donation',action:'activate',args:{callback}}),/at least/);
 await assert.rejects(adapter.prepare(fixture({balance:U,poolBalance:10n**70n}).rpc,account,{module:'miner-donation',action:'activate',args:{callback}}),/zero miner shares/);
});
test('unchanged donation terms across later blocks preserve approval, while recipient, service and funding changes invalidate it',async()=>{
 const req={module:'miner-donation',action:'activate',args:{callback}},now=Math.floor(Date.now()/1000),first=await prepareProtocolTransaction(fixture({timestamp:now-10}).rpc,account,req,adapter),later=await prepareProtocolTransaction(fixture({timestamp:now,block:'0x101'}).rpc,account,req,adapter);assert.doesNotThrow(()=>assertSameProtocolTerms(first,later));
 const accruing=await prepareProtocolTransaction(fixture({poolBalance:201n*U}).rpc,account,req,adapter);assert.doesNotThrow(()=>assertSameProtocolTerms(first,accruing));assert.notEqual(Object.fromEntries(first.quote.facts)['Estimated new shares'],Object.fromEntries(accruing.quote.facts)['Estimated new shares']);
 for(const options of [{recipient:other},{mandatory:1n},{balance:21n*U}]){const changed=await prepareProtocolTransaction(fixture(options).rpc,account,req,adapter);assert.throws(()=>assertSameProtocolTerms(first,changed),/terms changed/);}
 let sends=0;const provider={request:async q=>q.method==='eth_accounts'?[account]:q.method==='eth_chainId'?'0x171':(++sends,hash)};await assert.rejects(requestProtocolTransaction(first,adapter,fixture({recipient:other}).rpc,provider,()=>true),/terms changed/);assert.equal(sends,0);
});
test('treasury funding wrapper routes current OINK to the verified callback and preserves advanced governance authorization',async()=>{
 const original=advancedGovernanceAdapter.prepare;let delegated;
 advancedGovernanceAdapter.prepare=async(rpc,account,request)=>{delegated=request;const f=fixture();return {title:'Treasury request',account,block:256,blockHash,timestamp:Number(BigInt(f.block.timestamp)),to:core.governor,data:'0x12345678',value:'0x0',facts:[],warnings:['Voting credit spent'],fingerprint:'authorized-treasury-state'};};
 try{const req={module:'miner-donation',action:'propose',args:{callback,amount:'100',credit:'50',delay:'24'}},q=await adapter.prepare(fixture().rpc,account,req);assert.deepEqual(delegated,{module:'advanced-governance',action:'treasury-create',args:{token:core.rewardToken,recipient:callback,amount:'100',credit:'50',delay:'24'}});assert.equal(JSON.parse(q.fingerprint).advanced,'authorized-treasury-state');assert(!('block'in JSON.parse(q.fingerprint).donation));assert(q.warnings.includes('Voting credit spent'));}finally{advancedGovernanceAdapter.prepare=original;}
});
test('funding below the miner minimum is blocked before spending voting credit',async()=>{
 const original=advancedGovernanceAdapter.prepare;let checks=0;advancedGovernanceAdapter.prepare=async()=>{checks++;throw Error('Treasury review would start');};
 const req={module:'miner-donation',action:'propose',args:{callback,amount:'0.5',credit:'50',delay:'24'}};
 try{await assert.rejects(adapter.prepare(fixture({balance:0n,minimumGift:U}).rpc,account,req),/at least 1.0 OINK/);assert.equal(checks,0);await assert.rejects(adapter.prepare(fixture({balance:U/2n,minimumGift:U}).rpc,account,req),/Treasury review would start/);assert.equal(checks,1);}finally{advancedGovernanceAdapter.prepare=original;}
});
test('donation activation receipt needs the exact verified callback sender, recipient, amount and miner event',async()=>{
 const request={module:'miner-donation',action:'activate',args:{callback}},f=fixture(),review=await prepareProtocolTransaction(f.rpc,account,request,adapter),at=Number(BigInt(f.block.timestamp));
 const log=(sender=callback,to=recipient,amount=20n*U)=>({...minerEvents.encodeEventLog(minerEvents.getEvent('GiftDeposit'),[sender,to,amount,10n*U,at]),address:miner.address});
 const receipt={transactionHash:hash,from:account,to:callback,blockNumber:'0x100',blockHash,status:'0x1',logs:[log()]};assert.equal(await adapter.verify(f.rpc,review,receipt),true);
 for(const bad of [log(other),log(callback,other),log(callback,recipient,20n*U-1n),{...log(),address:other},{...log(),removed:true}])assert.equal(await adapter.verify(f.rpc,review,{...receipt,logs:[bad]}),false);
 assert.equal(await adapter.verify(fixture({changedRuntime:true}).rpc,review,receipt),false);
 assert.equal(await adapter.verify(f.rpc,review,{...receipt,logs:[log(),log()]}),false);
});
