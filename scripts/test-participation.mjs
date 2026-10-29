import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, ZeroAddress, getAddress, keccak256 } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {prepareParticipation,participationAdapter,participationAbi,participationUint,participationVoters,readParticipationPositions}=await import('../src/lib/participationTransactions.ts');
const {PARTICIPATION_CONTRACTS}=await import('../src/config/participationVerification.ts');
const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const common=VERIFIED_FARM_WRITES[0],{credit,consensus}=PARTICIPATION_CONTRACTS;
const code='0x60006000',hash=keccak256(code),U=10n**18n;
for(const target of [credit,consensus,...MINER_PREVIEW_SPECS])target.runtimeCodeHash=hash;
common.masterchefRuntimeCodeHash=common.governorRuntimeCodeHash=common.rewardTokenRuntimeCodeHash=hash;
const account=getAddress('0x'+'11'.repeat(20)),other=getAddress('0x'+'22'.repeat(20)),third=getAddress('0x'+'33'.repeat(20));
const blockHash='0x'+'aa'.repeat(32),now=Date.now(),timestamp=Math.floor(now/1000),tag='0x100';
const poolAbi=new Interface(['function balanceOf() view returns(uint256)']);
const request=(action,args={})=>({module:'participation',action,args:{minerId:'one-month',...args}});
const opts=()=>({walletBalance:100n*U,credit:50n*U,currentVote:1n,shares:5n*U,delegate:account,total:20n*U,poolBalance:40n*U,chefCredit:40n*U,position:[5n*U,1n,5n*U,2n,300n],count:1n});
function mock(overrides={}){
 const o={...opts(),...overrides},calls=[];let blocks=0;
 return {calls,o,async send(method,args){calls.push([method,args]);
  if(method==='eth_chainId')return o.wrongChain?'0x1':'0x171';
  if(method==='eth_getCode')return o.badCode?'0x6001':code;
  if(method==='eth_getBlockByNumber')return {number:tag,hash:o.reorg&&blocks++?'0x'+'bb'.repeat(32):blockHash,timestamp:'0x'+(timestamp+(o.timestampDelta??0)).toString(16)};
  if(method!=='eth_call')throw Error('Unexpected method '+method);
  assert.equal(args[1],tag,'all calls use snapshot/receipt block');
  const to=getAddress(args[0].to);let decoded,abi=participationAbi;
  try{decoded=abi.parseTransaction(args[0]);}catch{}
  if(!decoded){abi=poolAbi;decoded=abi.parseTransaction(args[0]);}
  const name=decoded.name;
  let value;
  const miner=MINER_PREVIEW_SPECS.find(row=>getAddress(row.address)===to);
  switch(name){
   case 'token':case 'dtx':value=common.rewardToken;break;
   case 'masterchef':value=common.masterchef;break;
   case 'owner':value=to===getAddress(common.rewardToken)?common.masterchef:common.governor;break;
   case 'governor':case 'admin':case 'treasury':value=common.governor;break;
   case 'creditContract':case 'votingCreditAddress':value=o.badCreditWiring?other:credit.address;break;
   case 'consensusContract':value=consensus.address;break;
   case 'migrationPool':value=o.migration?other:ZeroAddress;break;
   case 'trustedContract':value=!o.untrusted;break;
   case 'creditingContract':value=!o.notCrediting;break;
   case 'poolID':value=o.wrongPool?99n:BigInt(miner.poolId);break;
   case 'poolInfo':return abi.encodeFunctionResult(name,[1n,1n,o.wrongParticipant?other:MINER_PREVIEW_SPECS[Number(decoded.args[0])].address]);
   case 'userCredit':value=o.credit;break;
   case 'balanceOf':value=decoded.args.length?o.walletBalance:o.poolBalance;break;
   case 'credit':value=o.chefCredit;break;
   case 'totalShares':value=o.total;break;
   case 'getNrOfStakes':value=o.count;break;
   case 'userInfo':return abi.encodeFunctionResult(name,o.position);
   case 'getUserTotalShares':value=o.shares;break;
   case 'userVote':value=o.currentVote;break;
   case 'userDelegate':value=o.delegate;break;
   case 'proposalLengths':return abi.encodeFunctionResult(name,[3n,7n]);
   case 'consensusProposal':return abi.encodeFunctionResult(name,[decoded.args[0]<3n?0n:1n,decoded.args[0]<3n?other:consensus.address,o.badPair&&decoded.args[0]===4n?999n:1n]);
   case 'isGovInvalidated':return abi.encodeFunctionResult(name,[!!o.invalidGovernor,false]);
   case 'treasuryProposal':return abi.encodeFunctionResult(name,[!o.closed,1n,0n,0n,1n,common.rewardToken,third,25n*U,o.badMapping?1n:3n]);
   default:throw Error('Unexpected read '+name);
  }
  return abi.encodeFunctionResult(name,[value]);
 }};
}
const prepare=(r,o={})=>prepareParticipation(mock(o),account,r,now);
test('uint and delegated address input reject unsafe, duplicate, malformed and empty values',()=>{
 for(const input of ['', '-1','1.0','1e18','01',(2n**256n).toString()])assert.throws(()=>participationUint(input,'ID'));
 assert.equal(participationUint('0','ID'),0n);
 for(const input of ['',account+' '+account,ZeroAddress,'hello'])assert.throws(()=>participationVoters(input));
 assert.deepEqual(participationVoters(account+',\n'+other),[account,other]);
});
test('credit deposit is exact, burns wallet OINK without an approval and clearly states irreversibility',async()=>{
 const q=await prepare(request('credit-deposit',{amount:'1.000000000000000001'}));
 const decoded=participationAbi.parseTransaction(q);assert.equal(decoded.name,'depositCredit');assert.equal(decoded.args[0],U+1n);
 assert.equal(q.to,credit.address);assert.match(q.warnings.join(' '),/permanently burns/);assert.match(q.warnings.join(' '),/No token approval/);
});
test('credit burn does not silently burn wallet tokens or pretend to cast a proposal vote',async()=>{
 const q=await prepare(request('credit-burn',{amount:'2',forId:'9007199254740993'}));
 const d=participationAbi.parseTransaction(q);assert.equal(d.args[1],9007199254740993n);assert.match(q.warnings.join(' '),/without.*casting a proposal vote/);
 await assert.rejects(prepare(request('credit-burn',{amount:'51',forId:'0'})),/existing voting credit/);
 await assert.rejects(prepare(request('credit-deposit',{amount:'101'})),/wallet's OINK/);
});
for(const [name,o,match] of [['wrong chain',{wrongChain:true},/PulseChain/],['stale snapshot',{timestampDelta:-121},/stale/],['future snapshot',{timestampDelta:31},/stale/],['changed runtime',{badCode:true},/runtime/],['changed credit wiring',{badCreditWiring:true},/changed/],['revoked burner',{untrusted:true},/authorized/],['migration',{migration:true},/changed/],['changed pool',{wrongPool:true},/pool ID/],['changed registration',{wrongParticipant:true},/changed/],['reorg',{reorg:true},/block changed/]])test(name+' blocks review',async()=>{await assert.rejects(prepare(request('delegate',{delegate:other}),o),match);});
for(const miner of MINER_PREVIEW_SPECS)test(miner.id+' casts explicit direct votes and manages delegate without proxy origin',async()=>{
 const q=await prepare(request('miner-vote',{minerId:miner.id,targetKind:'treasury',targetId:'0',stance:'oppose'}));
 const d=participationAbi.parseTransaction(q);assert.equal(d.name,'voteForProposal');assert.equal(d.args[0],4n);assert.equal(d.args[1],false);
 const set=await prepare(request('delegate',{minerId:miner.id,delegate:other}));assert.equal(participationAbi.parseTransaction(set).args[1],false);
});
test('proposal mapping verifies paired record, kind, open status and invalidated Governor',async()=>{
 const treasury=request('miner-vote',{targetKind:'treasury',targetId:'0',stance:'support'});
 await assert.rejects(prepare(treasury,{closed:true}),/closed/);
 await assert.rejects(prepare(treasury,{badPair:true}),/positions do not match/);
 await assert.rejects(prepare(treasury,{badMapping:true}),/not a treasury/);
 await assert.rejects(prepare(request('miner-vote',{targetKind:'governor',targetId:'1',stance:'oppose'}),{invalidGovernor:true}),/invalidated/);
 await assert.rejects(prepare(request('miner-vote',{targetKind:'governor',targetId:'2',stance:'support'})),/mapping/);
 const q=await prepare(request('miner-vote',{targetKind:'governor',targetId:'1',stance:'oppose'}));assert.equal(participationAbi.parseTransaction(q).args[0],2n);
});
test('no-op and zero-power votes cannot produce misleading success',async()=>{
 const r=request('miner-vote',{targetKind:'neutral'});
 await assert.rejects(prepare(r,{currentVote:0n}),/already holds/);await assert.rejects(prepare(r,{shares:0n}),/no shares/);
 await assert.rejects(prepare(request('delegate',{delegate:account})),/own vote/);
 await assert.rejects(prepare(request('delegate',{delegate:other}),{delegate:other}),/already selected/);
});
test('delegated vote requires every address to authorize the signer and retains exact voter shares',async()=>{
 const r=request('delegated-vote',{voters:other+' '+third,targetKind:'neutral'});
 await assert.rejects(prepare(r,{delegate:third}),/has not delegated/);
 const q=await prepare(r);const d=participationAbi.parseTransaction(q);assert.equal(d.name,'delegateeVote');assert.deepEqual([...d.args[0]],[other,third]);assert.equal(d.args[1],0n);
 assert.equal(JSON.parse(q.fingerprint).voters.length,2);
});
test('conversion preserves raw share precision, identifies Governor destination, and requires spendable miner credit',async()=>{
 const r=request('convert',{stakeId:'0',shares:(U+1n).toString()});
 const q=await prepare(r);assert.equal(participationAbi.parseTransaction(q).args[0],U+1n);assert.ok(q.facts.some(([key,value])=>key==='OINK received in wallet'&&value==='0'));
 assert.ok(q.facts.some(([key,value])=>key==='OINK recipient'&&value.includes(common.governor)));
 assert.match(q.warnings.join(' '),/irreversibly/);
 await assert.rejects(prepare(r,{chefCredit:1n}),/Harvest/);
 await assert.rejects(prepare(r,{notCrediting:true}),/cannot issue/);
 await assert.rejects(prepare(request('convert',{stakeId:'1',shares:'1'})),/no longer exists/);
 await assert.rejects(prepare(request('convert',{stakeId:'0',shares:(6n*U).toString()})),/exceeds/);
});
test('conversion fingerprint catches position index reuse and share changes, while dynamic reward estimates may vary',async()=>{
 const r=request('convert',{stakeId:'0',shares:U.toString()});const initial=await prepare(r);
 assert.notEqual((await prepare(r,{position:[5n*U,3n,5n*U,2n,300n]})).fingerprint,initial.fingerprint);
 assert.notEqual((await prepare(r,{position:[4n*U,1n,5n*U,2n,300n]})).fingerprint,initial.fingerprint);
 assert.equal((await prepare(r,{poolBalance:41n*U})).fingerprint,initial.fingerprint);
});
test('position reader paginates without converting shares through Number',async()=>{
 const r=await readParticipationPositions(mock({count:25n,position:[9007199254740993n,1n,0n,1n,0n]}),account,'one-month',20,now);
 assert.equal(r.positions.length,5);assert.equal(r.positions[0].index,20);assert.equal(r.positions[0].shares,'9007199254740993');
 await assert.rejects(readParticipationPositions(mock(),account,'one-month',1,now),/no longer exists/);
});
const log=(address,name,args)=>({address,...participationAbi.encodeEventLog(participationAbi.getEvent(name),args)});
const review=async r=>({request:r,quote:await prepare(r)});
const receipt=logs=>({blockNumber:tag,logs});
test('deposit confirmation requires matching OINK burn and credit issue events',async()=>{
 const r=await review(request('credit-deposit',{amount:'1'}));const logs=[log(credit.address,'AddCredit',[account,U]),log(common.rewardToken,'Transfer',[account,ZeroAddress,U])];
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs)),true);
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs.slice(0,1))),false);
 assert.equal(await participationAdapter.verify(mock(),r,receipt([log(credit.address,'AddCredit',[other,U]),logs[1]])),false);
 assert.equal(await participationAdapter.verify(mock({badCode:true}),r,receipt(logs)),false);
});
test('credit destruction verifies exact wallet, amount and burn reference',async()=>{
 const r=await review(request('credit-burn',{amount:'1',forId:'42'}));
 assert.equal(await participationAdapter.verify(mock(),r,receipt([log(credit.address,'BurnCredit',[account,U,42n])])),true);
 assert.equal(await participationAdapter.verify(mock(),r,receipt([log(credit.address,'BurnCredit',[account,U,43n])])),false);
});
test('vote receipt requires exact added/removed shares and current selection',async()=>{
 const r=await review(request('miner-vote',{targetKind:'treasury',targetId:'0',stance:'support'}));const miner=MINER_PREVIEW_SPECS[0];
 const logs=[log(miner.address,'RemoveVotes',[account,1n,5n*U]),log(miner.address,'AddVotes',[account,3n,5n*U])];
 assert.equal(await participationAdapter.verify(mock({currentVote:3n}),r,receipt(logs)),true);
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs)),false);
 assert.equal(await participationAdapter.verify(mock({currentVote:3n}),r,receipt(logs.slice(1))),false);
});
test('delegate receipt cannot confuse event-only success with a different final delegate',async()=>{
 const r=await review(request('delegate',{delegate:other}));const logs=[log(MINER_PREVIEW_SPECS[0].address,'SetDelegate',[account,other])];
 assert.equal(await participationAdapter.verify(mock({delegate:other}),r,receipt(logs)),true);
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs)),false);
});
test('conversion receipt matches removed shares, new credit and Governor mint, never wallet payment',async()=>{
 const r=await review(request('convert',{stakeId:'0',shares:U.toString()})),miner=MINER_PREVIEW_SPECS[0],amount=2n*U+9n;
 const logs=[log(miner.address,'Withdraw',[common.governor,amount,0n,U]),log(credit.address,'AddCredit',[account,amount]),log(common.rewardToken,'Transfer',[ZeroAddress,common.governor,amount])];
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs)),true);
 assert.equal(await participationAdapter.verify(mock(),r,receipt(logs.slice(0,2))),false);
 assert.equal(await participationAdapter.verify(mock(),r,receipt([log(miner.address,'Withdraw',[common.governor,amount,1n,U]),...logs.slice(1)])),false);
});
