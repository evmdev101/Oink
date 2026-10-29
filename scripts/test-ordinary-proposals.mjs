import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256, parseEther, toQuantity, getAddress, ZeroAddress } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { ORDINARY_DEPLOYMENTS }=await import('../src/config/ordinaryGovernanceVerification.ts');
const { PARTICIPATION_CONTRACTS }=await import('../src/config/participationVerification.ts');
const { VERIFIED_FARM_WRITES }=await import('../src/config/farmWriteVerification.ts');
const { MINER_PREVIEW_SPECS }=await import('../src/config/minerPreviewVerification.ts');
const { ordinaryCreateArguments, prepareOrdinaryProposal, ordinaryProposalAdapter, ORDINARY_MODELS, ordinaryReadAbi }=await import('../src/lib/ordinaryProposalActions.ts');
const wallet='0x1111111111111111111111111111111111111111',code='0x60016000',runtime=keccak256(code),hash='0x'+'a'.repeat(64),common=VERIFIED_FARM_WRITES[0],credit=PARTICIPATION_CONTRACTS.credit;
for(const c of Object.values(ORDINARY_DEPLOYMENTS))c.runtimeCodeHash=runtime;
credit.runtimeCodeHash=runtime;for(const k of ['governorRuntimeCodeHash','masterchefRuntimeCodeHash','rewardTokenRuntimeCodeHash'])common[k]=runtime;
for(const miner of MINER_PREVIEW_SPECS)miner.runtimeCodeHash=runtime;
function fixture(family,changes={}){
 const m=ORDINARY_MODELS[family],d=ORDINARY_DEPLOYMENTS[m.deployment],abi=new Interface(d.abi),now=Math.floor(Date.now()/1000),timestamp=BigInt(now);
 const row={newPool:common.address,valid:true,firstCallTimestamp:timestamp-1800n,delay:3600n,valueSacrificedForVote:parseEther('20'),valueSacrificedAgainst:parseEther('1'),proposedValue:100n,proposedType:0n,poolid:6n,newAllocation:100n,newDepositFee:0n,poolAddress:MINER_PREVIEW_SPECS[0].address,newBonus:100n,isBurn:false,startTimestamp:0n,rewardPerBlock:parseEther('1'),duration:100n,startTime:timestamp+100000n,...changes.row};
 const rpc={async send(method,params){
  if(method==='eth_chainId')return '0x171';
  if(method==='eth_getBlockByNumber')return{number:'0x10',timestamp:toQuantity(timestamp),hash:changes.reorg&&params[0]!=='latest'?'0x'+'b'.repeat(64):hash};
  if(method==='eth_getCode')return changes.runtimeChange?'0x6002':code;
  if(method!=='eth_call')throw Error('Unexpected '+method);
  const tx=params[0],target=tx.to.toLowerCase();let iface,parsed;for(const candidate of [ordinaryReadAbi,abi]){try{const p=candidate.parseTransaction(tx);if(p){iface=candidate;parsed=p;break}}catch{}}
  if(!parsed)throw Error('Unknown call');const name=parsed.name;let value;
  if(name===m.getter)return abi.encodeFunctionResult(name,abi.getFunction(name).outputs.map(o=>row[o.name]));
  if(name==='costToVote')value=changes.executed&&family==='Voting cost'?row.proposedValue:parseEther('1');else if(name==='delayBeforeEnforce')value=changes.executed&&family==='Enforcement delay'?row.proposedValue:3600n;
  else if(name==='userCredit')value=changes.credit??parseEther('1000');
  else if(name==='deductingContract'||name==='trustedContract')value=!changes.permissionChange;
  else if(name==='owner')value=target===common.rewardToken.toLowerCase()?common.masterchef:common.governor;
  else if(name==='token'||name==='dtx')value=common.rewardToken;
  else if(name==='governor')value=common.governor;
  else if(name==='masterchef')value=common.masterchef;
  else if(name==='creditContract')value=credit.address;
  else if(name==='basicContract')value=ORDINARY_DEPLOYMENTS.basic.address;
  else if(name==='farmContract')value=ORDINARY_DEPLOYMENTS.farms.address;
  else if(name==='fibonacceningContract')value=ORDINARY_DEPLOYMENTS.reward.address;
  else if(name==='treasuryWallet')value=common.treasuryWallet;
  else if(name==='thresholdFibonaccening')value=changes.executed&&family==='Reward-event threshold'?row.proposedValue:parseEther('10');
  else if(name==='eventFibonacceningActive')value=!!changes.executed;
  else if(name==='balanceOf')value=parseEther('100');
  else if(name==='DTXPerBlock')value=row.rewardPerBlock;
  else if(name==='fibonacceningActiveID')value=0n;
  else if(name==='fibonacceningActivatedBlock')value=16n;
  else if(name==='depositFee'||name==='fundingRate'||name==='referralBonus'||name==='governorFee'||name==='callFee')value=changes.badOutcome?row.proposedValue+1n:row.proposedValue;
  else if(name==='getRollBonus')value=changes.badOutcome?row.newBonus+1n:row.newBonus;
  else if(/^acPool[1-6]$/.test(name))value=MINER_PREVIEW_SPECS[Number(name.slice(-1))-1].address;
  else if(name==='poolLength')value=changes.executed?26n:25n;
  else if(name==='poolAllocationPercentage')value=changes.badOutcome?row.newAllocation+1n:row.newAllocation;
  else if(name==='percentageAllocatedToPulseEcosystem')value=2000n;
  else if(name==='poolInfo')return iface.encodeFunctionResult(name,[parsed.args[0]<6n?1000n:75n,0n,parsed.args[0]<6n?MINER_PREVIEW_SPECS[Number(parsed.args[0])].address:common.address]);
  else throw Error('Missing fixture '+name);
  return iface.encodeFunctionResult(name,[value]);
 }};
 return{rpc,abi,d,m,row,timestamp,changes};
}
const spent=(amount=parseEther('2'))=>({...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('DeductCredit'),[wallet,amount]),address:credit.address});
const transfer=(from,to,amount)=>({...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('Transfer'),[from,to,amount]),address:common.rewardToken});
const request=(family,action='support',args={})=>({module:'ordinary',action,args:{family,id:'0',credit:family==='New pool'&&action==='create'?'500':'2',poolAddress:common.address,delay:'0',value:'1',pool:'6',miner:'one-month',vaultType:'0',burn:'false',duration:'100',start:'9999999999',...args}});
for(const family of Object.keys(ORDINARY_MODELS)){
 test(family+' support/oppose consume exact credit and cannot automatically veto',async()=>{
  const f=fixture(family);for(const action of ['support','oppose']){const q=await prepareOrdinaryProposal(f.rpc,wallet,request(family,action));const tx=f.abi.parseTransaction({data:q.data});assert.equal(tx.args[1],parseEther('2'));if(action==='oppose')assert.equal(tx.args[2],false);assert.ok(q.warnings.some(w=>w.includes('without a token approval')));}
 });
 test(family+' refuses a losing execution and closed votes',async()=>{
  await assert.rejects(prepareOrdinaryProposal(fixture(family,{row:{firstCallTimestamp:0n,valueSacrificedAgainst:parseEther('21')}}).rpc,wallet,request(family,'execute')),/support at least/);
  await assert.rejects(prepareOrdinaryProposal(fixture(family,{row:{valid:false}}).rpc,wallet,request(family)),/already closed/);
  await assert.rejects(prepareOrdinaryProposal(fixture(family,{row:{firstCallTimestamp:0n}}).rpc,wallet,request(family)),/Voting is closed/);
 });
 test(family+' verifies exact source event family, voter, amount and outcome',async()=>{
  const f=fixture(family),r=request(family),q=await prepareOrdinaryProposal(f.rpc,wallet,r),review={request:r,quote:q,transaction:{to:q.to,data:q.data}};
  const event=(type=f.m.eventType,amount=parseEther('2'),voter=wallet,stance=true)=>({...f.abi.encodeEventLog(f.abi.getEvent('AddVotes'),[type,0,voter,amount,stance]),address:f.d.address});
  const receipt=logs=>({blockNumber:'0x10',logs:[...logs,spent()]});
  assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt([event()])),true);
  assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt([event(f.m.eventType+1)])),false);
  assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt([event(f.m.eventType,parseEther('3'))])),false);
  assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt([event(f.m.eventType,parseEther('2'),wallet,false)])),false);
 });
 test(family+' creation event matches every encoded parameter',async()=>{
  const f=fixture(family),r=request(family,'create'),q=await prepareOrdinaryProposal(f.rpc,wallet,r),tx=f.abi.parseTransaction({data:q.data});
  const review={request:r,quote:q,transaction:{to:q.to,data:q.data}},eventFragment=f.abi.getEvent(f.m.event);
  let i=0;const parameters=eventFragment.inputs.map((p,index)=>index===0?17n:p.name==='enforcer'?wallet:tx.args[f.m.eventOrder[i++]]);
  const logs=[{...f.abi.encodeEventLog(eventFragment,parameters),address:f.d.address},spent(tx.args[0])];
  assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs}),true);
  parameters[1]=parseEther('3');assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[{...f.abi.encodeEventLog(eventFragment,parameters),address:f.d.address},spent(tx.args[0])]}),false);
 });
}
test('exact percentage units, integer-only windows and no unknown vault fields',()=>{
 assert.equal(ordinaryCreateArguments('Vault setting',request('Vault setting','create',{vaultType:'1',value:'0.025'}).args)[2],250n);
 assert.equal(ordinaryCreateArguments('Governor tax',request('Governor tax','create',{value:'9.99'}).args)[1],999n);
 assert.throws(()=>ordinaryCreateArguments('Governor tax',request('Governor tax','create',{value:'1.001'}).args));
 assert.throws(()=>ordinaryCreateArguments('Vault setting',request('Vault setting','create',{vaultType:'3'}).args),/supported vault/);
 assert.throws(()=>ordinaryCreateArguments('Voting cost',request('Voting cost','create',{delay:'-1'}).args),/whole nonnegative/);
 assert.throws(()=>ordinaryCreateArguments('New pool',{credit:'500',poolAddress:ZeroAddress,delay:'0'}),/nonzero/);
});
test('runtime, permission, credit and canonical-block changes block preparation',async()=>{
 for(const [change,message]of [[{runtimeChange:true},/runtime/],[{permissionChange:true},/permissions/],[{credit:0n},/Deposit enough/],[{reorg:true},/Snapshot changed/]])await assert.rejects(prepareOrdinaryProposal(fixture('Voting cost',change).rpc,wallet,request('Voting cost')),message);
});

for(const family of Object.keys(ORDINARY_MODELS))test(family+' requires the reviewed execution outcome and a closed immutable proposal',async()=>{
 const f=fixture(family,{row:{firstCallTimestamp:0n,startTime:1n}}),r=request(family,'execute'),q=await prepareOrdinaryProposal(f.rpc,wallet,r),review={request:r,quote:q,transaction:{to:q.to,data:q.data}};
 const enforce={...f.abi.encodeEventLog(f.abi.getEvent('EnforceProposal'),[f.m.eventType,0n,wallet,true]),address:f.d.address};
 const logs=[enforce];
 if(family==='Governor transfer or burn')logs.push(transfer(common.governor,common.treasuryWallet,f.row.proposedValue));
 if(family==='Reward boost')logs.push(transfer(common.governor,f.d.address,parseEther('10')),transfer(f.d.address,ZeroAddress,parseEther('10')),{...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('SetInflation'),[f.row.rewardPerBlock]),address:common.governor},{...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('UpdateEmissions'),[wallet,f.row.rewardPerBlock]),address:common.masterchef});
 const receipt={blockNumber:'0x10',logs};
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt),false,'must be closed after execution');
 f.row.valid=false;f.changes.executed=true;
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt),true);
 f.row.delay+=1n;assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt),false,'immutable reviewed proposal terms must match');f.row.delay-=1n;
 if(['Vault setting','Governor tax','Rollover bonus','Harvest call fee','Pool allocation'].includes(family)){f.changes.badOutcome=true;assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,receipt),false,'event alone must not confirm wrong setting');}
 if(family==='Reward boost'){
   const withoutBurn={blockNumber:'0x10',logs:logs.filter(log=>log!==logs[2])};assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,withoutBurn),false,'must burn reviewed Governor amount');
   const wrongBurn={blockNumber:'0x10',logs:[logs[0],logs[1],transfer(f.d.address,ZeroAddress,parseEther('11')),...logs.slice(3)]};assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,wrongBurn),false,'changed threshold cannot silently confirm');
   const wrongOrigin={blockNumber:'0x10',logs:[logs[0],transfer(wallet,f.d.address,parseEther('10')),...logs.slice(2)]};assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,wrongOrigin),false,'threshold must come from Governor');
   const governorAsOrigin={blockNumber:'0x10',logs:[...logs.slice(0,4),{...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('UpdateEmissions'),[common.governor,f.row.rewardPerBlock]),address:common.masterchef}]};assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,governorAsOrigin),false,'UpdateEmissions must identify the reviewed EOA tx.origin, not Governor');
   const wrongEmission={blockNumber:'0x10',logs:[...logs.slice(0,4),{...ordinaryReadAbi.encodeEventLog(ordinaryReadAbi.getEvent('UpdateEmissions'),[wallet,f.row.rewardPerBlock+1n]),address:common.masterchef}]};assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,wrongEmission),false,'the correct origin does not excuse an incorrect emission amount');
 }
 if(family==='Governor transfer or burn')assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[enforce,transfer(common.governor,wallet,f.row.proposedValue)]}),false,'recipient must be reviewed treasury');
});

test('Governor burn requires the exact reviewed burn and never mistakes a treasury transfer for a burn',async()=>{
 const f=fixture('Governor transfer or burn',{row:{firstCallTimestamp:0n,isBurn:true}}),r=request('Governor transfer or burn','execute'),q=await prepareOrdinaryProposal(f.rpc,wallet,r),review={request:r,quote:q,transaction:{to:q.to,data:q.data}};
 f.row.valid=false;
 const enforce={...f.abi.encodeEventLog(f.abi.getEvent('EnforceProposal'),[2n,0n,wallet,true]),address:f.d.address};
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[enforce,transfer(common.governor,ZeroAddress,f.row.proposedValue)]}),true);
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[enforce,transfer(common.governor,common.treasuryWallet,f.row.proposedValue)]}),false);
});

test('a veto confirms rejection only, and requires the proposal to have closed',async()=>{
 const f=fixture('Voting cost',{row:{firstCallTimestamp:0n,valueSacrificedAgainst:parseEther('30')}}),r=request('Voting cost','veto'),q=await prepareOrdinaryProposal(f.rpc,wallet,r),review={request:r,quote:q,transaction:{to:q.to,data:q.data}};
 const event=success=>({...f.abi.encodeEventLog(f.abi.getEvent('EnforceProposal'),[0n,0n,wallet,success]),address:f.d.address});
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[event(false)]}),false);
 f.row.valid=false;assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[event(false)]}),true);
 assert.equal(await ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[event(true)]}),false);
});

test('credit spend verifies the deployed fallback-burn event semantics without accepting an excessive burn',async()=>{
 const f=fixture('Voting cost'),r=request('Voting cost'),q=await prepareOrdinaryProposal(f.rpc,wallet,r),review={request:r,quote:q,transaction:{to:q.to,data:q.data}};
 const vote={...f.abi.encodeEventLog(f.abi.getEvent('AddVotes'),[0n,0n,wallet,parseEther('2'),true]),address:f.d.address};
 const check=logs=>ordinaryProposalAdapter.verify(f.rpc,review,{blockNumber:'0x10',logs:[vote,...logs]});
 assert.equal(await check([]),false);
 assert.equal(await check([spent()]),true);
 assert.equal(await check([spent(parseEther('0.5')),transfer(wallet,ZeroAddress,parseEther('0.5'))]),true);
 assert.equal(await check([spent(parseEther('2')),transfer(wallet,ZeroAddress,parseEther('2'))]),true);
 assert.equal(await check([spent(parseEther('3')),transfer(wallet,ZeroAddress,parseEther('3'))]),false);
 assert.equal(await check([spent(parseEther('0.5'))]),false);
 assert.equal(await check([spent(),transfer(wallet,ZeroAddress,parseEther('0.5'))]),false);
});
