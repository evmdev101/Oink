import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,ZeroAddress,formatUnits,keccak256,toQuantity,getAddress} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const engine=await import('../src/lib/positionTransactions.ts');
const {previewAbi}=await import('../src/lib/positionPreviews.ts');
const {readMinerRolloverOptions}=await import('../src/lib/minerRollover.ts');
const {farmTokenSafetyAbi}=await import('../src/lib/farmTokenSafety.ts');
const {MINER_PREVIEW_SPECS:miners}=await import('../src/config/minerPreviewVerification.ts');
const {VERIFIED_FARM_WRITES:farms}=await import('../src/config/farmWriteVerification.ts');
const catalog=await import('../src/lib/farmCatalog.ts');
const {referralLink}=await import('../src/lib/miningOffers.ts');
const {estimateMinerValue}=await import('../src/lib/minerLive.ts');
const {decodeActivity}=await import('../src/lib/treasuryActivity.ts');
const U=10n**18n,account=getAddress('0x0000000000000000000000000000000000000011'),recipient=getAddress('0x0000000000000000000000000000000000000012'),core=farms[0],hash='0x'+'ab'.repeat(32),blockHash='0x'+'cd'.repeat(32),code='0x6000',codeHash=keccak256(code);
// Test-local allowlists only. No network calls or real wallet provider.
for(const m of miners)m.runtimeCodeHash=codeHash;
for(const f of farms)for(const field of ['runtimeCodeHash','tokenRuntimeCodeHash','masterchefRuntimeCodeHash','governorRuntimeCodeHash','rewardTokenRuntimeCodeHash'])if(f[field]!==null)f[field]=codeHash;
for(const f of farms)if(f.tokenPolicy?.implementation)f.tokenPolicy.implementation.runtimeCodeHash=codeHash;
const minerAbi=new Interface([...previewAbi.fragments,'function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)','function balanceOf() view returns(uint256)']);
const farmAbi=new Interface(['function vaultBalance() view returns(uint256)',...previewAbi.fragments,...farmTokenSafetyAbi.fragments,'function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256)']);
const assetUnit=farm=>10n**BigInt(farm.decimals);
const atAddress=(address,expected)=>getAddress(address)===getAddress(expected);
function fixture(options={}){
 const activeFarms=options.extraFarm?[...farms,options.extraFarm]:farms;
 const calls=[],now=Math.floor(Date.now()/1000),block={number:'0x100',timestamp:toQuantity(now),hash:blockHash};
 const rpc={async send(method,params){calls.push([method,params]);
  if(method==='eth_chainId')return options.chain??'0x171';
  if(method==='eth_getBlockByNumber')return block;
  if(method==='eth_getCode'){
   if(atAddress(params[0],account))return options.contractWallet?code:'0x';
   if(options.badTokenCode&&activeFarms.some(f=>f.tokenAddress&&atAddress(params[0],f.tokenAddress)))return '0x60ff';
   if(options.badImplementationCode&&activeFarms.some(f=>f.tokenPolicy?.implementation&&atAddress(params[0],f.tokenPolicy.implementation.address)))return '0x60ff';
   return options.badCode?'0x60ff':code;
  }
  if(method==='eth_getStorageAt'){
   const farm=activeFarms.find(f=>f.tokenAddress&&atAddress(params[0],f.tokenAddress));
   assert.ok(farm?.tokenPolicy?.implementation);assert.equal(params[1],farm.tokenPolicy.implementation.slot);
   return '0x'+'0'.repeat(24)+(options.badImplementation?recipient:farm.tokenPolicy.implementation.address).slice(2).toLowerCase();
  }
  if(method==='eth_getBalance')return options.noGas? '0x0':toQuantity(getAddress(params[0])===account?10000n*U:options.liquidity??10000n*U);
  if(method==='eth_gasPrice')return '0x3b9aca00';
  if(method==='eth_estimateGas'){assert.notEqual(params[0].gas,'0x0');return '0x186a0';}
  if(method!=='eth_call')throw Error('Forbidden test RPC '+method);
  const [tx]=params,miner=miners.find(m=>getAddress(m.address)===getAddress(tx.to)),farm=activeFarms.find(f=>getAddress(f.address)===getAddress(tx.to)),tokenFarm=activeFarms.find(f=>f.tokenAddress&&atAddress(tx.to,f.tokenAddress)),unit=assetUnit(farm??tokenFarm??core),abi=miner?minerAbi:farmAbi,p=abi.parseTransaction(tx);
  if(!p)throw Error('Unknown call');
  const name=p.name;
  if(['deposit','giftDeposit','withdrawAll','transferStakeToAnotherWallet','hopStakeToAnotherPool','selfHarvest','withdraw','stakeRollover','emergencyWithdraw'].includes(name)){if(options.revert || name==='stakeRollover'&&options.revertTarget&&atAddress(p.args[0],options.revertTarget))throw Error('simulated revert');return '0x';}
  if(options.rewardUnavailable&&['credit','pendingDtx','accDtxPerShare','lastCredit','defaultDirectPayout'].includes(name))throw Error('Reward accounting unavailable');
  let result;
  switch(name){
   case 'token':case 'dtx':result=[core.rewardToken];break;
   case 'masterchef':result=[core.masterchef];break;
   case 'owner':result=[getAddress(tx.to)===getAddress(core.rewardToken)?core.masterchef:core.governor];break;
   case 'treasury':case 'admin':case 'governor':case 'feeAddress':result=[core.governor];break;
   case 'treasuryWallet':result=[core.treasuryWallet];break;
   case 'poolID':result=[BigInt(miner?.poolId??farm.poolId)];break;
   case 'poolInfo':{const pool=[...miners,...activeFarms].find(candidate=>BigInt(candidate.poolId)===p.args[0]);assert.ok(pool,'registered pool id must exist');result=[100n,0n,pool.address];break;}
   case 'withdrawFeePeriod':result=[options.durationById?.[miner.id]??BigInt(miner.durationDays)*86400n];break;
   case 'gracePeriod':result=[BigInt(miner.graceDays)*86400n];break;
   case 'totalShares':result=[options.totalById?.[miner?.id]??100n*U];break;
   case 'vaultBalance':result=[options.rewardBalance??options.liquidity??10000n*unit];break;
   case 'balanceOf':result=[miner?options.balanceById?.[miner.id]??options.minerBalance??10000n*U:p.args.length&&getAddress(p.args[0])===getAddress(core.governor)?options.reserve??10000n*U:options.liquidity??10000n*unit];break;
   case 'migrationPool':result=[options.migration??ZeroAddress];break;
   case 'minimumGift':result=[options.minimumGift??1n];break;
   case 'partialTransfers':result=[options.partialTransfers??true];break;
   case 'partialWithdrawals':result=[options.partialWithdrawals??true];break;
   case 'getNrOfStakes':result=[options.countById?.[miner?.id]??(options.missing?0n:1n)];break;
   case 'userInfo':result=miner?[options.shares??10n*U,BigInt(now)-(options.depositedAgo??BigInt(miner.durationDays+1)*86400n),10n*U,BigInt(now)-86400n,options.locked?100n*86400n:0n]:[options.principal??10n*unit,0n,0n,BigInt(now)-(options.farmAge??3600n)];break;
   case 'allowStakeTransfer':result=[!options.untrusted];break;
   case 'trustedPool':case 'trustedSender':result=[options.trust?.(miner.id,name,p.args[0])??!options.untrusted];break;
   case 'stakeToken':result=[farm.tokenAddress];break;
   case 'decimals':result=[BigInt(tokenFarm?.decimals??18)];break;
   case 'lockedAmount':result=[options.tokenLocked??0n];break;
   case 'paused':result=[options.tokenPaused??false];break;
   case 'deprecated':result=[options.tokenDeprecated??false];break;
   case 'basisPointsRate':result=[options.tokenRate??0n];break;
   case 'maximumFee':result=[options.tokenMax??0n];break;
   case 'isBlackListed':case 'isBlacklisted':result=[Boolean(options.tokenBlocked&&atAddress(p.args[0],options.tokenBlocked))];break;
   case 'fundingRate':result=[options.fee??10n];break;
   case 'lastFundingChangeTimestamp':result=[BigInt(now)-(options.fundingAge??86400n)];break;
   case 'getRollBonus':{const target=miners.find(m=>atAddress(m.address,p.args[0]));if(target?.id===options.bonusUnavailable)throw Error('Bonus read unavailable');result=[options.bonusById?.[target?.id]??options.bonusBps??100n];break;}
   case 'defaultDirectPayout':result=[50n];break;
   case 'viewPoolPayout':result=[options.inactive?0n:10000n];break;
   case 'viewPoolMinServe':result=[365n*86400n];break;
   case 'accDtxPerShare':result=[U*1000000000000n/unit];break;
   case 'lastCredit':result=[0n];break;
   case 'credit':result=[miners.some(m=>atAddress(m.address,p.args[0]))?options.minerCredit??10000n*U:100n*U];break;
   case 'pendingDtx':result=[100n*U];break;
   default:throw Error('Missing mock: '+name);
  }
  return abi.encodeFunctionResult(p.fragment,result);
 }};return {rpc,calls,block};
}
const deploy={type:'miner',id:'one-month',action:{kind:'deploy',amount:'1',recipient:account}};
test('deployment is burn/share route with no token approval or broadcast',async()=>{const {rpc,calls}=fixture();const r=await engine.preparePositionTransaction(rpc,account,deploy);assert.equal(minerAbi.parseTransaction(r.transaction).name,'deposit');assert.equal(r.transaction.value,'0x0');assert(!calls.some(([m])=>m==='eth_sendTransaction'));assert.equal(r.quote.execution.amount,U.toString());});
test('gift deployment preserves the explicitly selected recipient',async()=>{const {rpc}=fixture();const r=await engine.preparePositionTransaction(rpc,account,{...deploy,action:{...deploy.action,recipient}});const p=minerAbi.parseTransaction(r.transaction);assert.equal(p.name,'giftDeposit');assert.equal(p.args[1],recipient);assert.equal(p.args[2],0n);});
for(const kind of ['transfer','upgrade','withdraw'])test(kind+' uses full selected position and verified route',async()=>{const {rpc}=fixture();const r=await engine.preparePositionTransaction(rpc,account,{type:'miner',id:'one-month',action:kind==='transfer'?{kind,index:0,recipient}:kind==='upgrade'?{kind,index:0,target:'three-month'}:{kind,index:0}});assert(r.quote.execution.shares==='10000000000000000000');assert(r.transaction.data.startsWith('0x'));});
for(const kind of ['transfer','upgrade','withdraw'])test(kind+' supports exact partial shares and retains the remaining position',async()=>{
 const chosen=U*25n/10n+1n,{rpc,calls}=fixture({minerBalance:10001n*U+7n,totalById:{'one-month':101n*U+3n}});
 const action={kind,index:0,shares:formatUnits(chosen,18),...(kind==='transfer'?{recipient}:kind==='upgrade'?{target:'three-month'}:{})};
 const review=await engine.preparePositionTransaction(rpc,account,{type:'miner',id:'one-month',action}),e=review.quote.execution,parsed=minerAbi.parseTransaction(review.transaction),gross=chosen*(10001n*U+7n)/(101n*U+3n);
 assert.equal(parsed.name,kind==='withdraw'?'withdraw':kind==='transfer'?'transferStakeToAnotherWallet':'hopStakeToAnotherPool');
 assert.equal(parsed.args[0],chosen);assert.equal(parsed.args[1],0n);assert.equal(e.shares,chosen.toString());assert.equal(e.positionShares,(10n*U).toString());assert.equal(e.amount,gross.toString());
 assert.equal(Object.fromEntries(review.quote.facts)['Shares remaining'],formatUnits(10n*U-chosen,18));
 assert(!calls.some(([method])=>method==='eth_sendTransaction'));
});
test('partial actions honor live permissions, mandatory service, minimum transfer and exact share boundaries',async()=>{
 const request=kind=>({type:'miner',id:'one-month',action:{kind,index:0,shares:'1',...(kind==='transfer'?{recipient}:kind==='upgrade'?{target:'three-month'}:{})}});
 await assert.rejects(engine.preparePositionTransaction(fixture({partialTransfers:false}).rpc,account,request('transfer')),/Partial miner transfers.*disabled/);
 for(const kind of ['withdraw','upgrade'])await assert.rejects(engine.preparePositionTransaction(fixture({partialWithdrawals:false}).rpc,account,request(kind)),/Partial miner .*disabled/);
 await assert.rejects(engine.preparePositionTransaction(fixture({locked:true}).rpc,account,request('withdraw')),/mandatory service/);
 await assert.rejects(engine.preparePositionTransaction(fixture({minimumGift:101n*U}).rpc,account,request('transfer')),/transfer minimum/);
 for(const shares of ['0','-1','10.000000000000000001','0.0000000000000000001','1e2'])await assert.rejects(engine.preparePositionTransaction(fixture().rpc,account,{...request('withdraw'),action:{...request('withdraw').action,shares}}));
 const max=await engine.preparePositionTransaction(fixture({partialWithdrawals:false}).rpc,account,{...request('withdraw'),action:{...request('withdraw').action,shares:'10'}});assert.equal(minerAbi.parseTransaction(max.transaction).name,'withdrawAll');
});
test('a changed partial selection, disabled flag or changed position blocks the final wallet request',async()=>{
 const request={type:'miner',id:'one-month',action:{kind:'transfer',index:0,shares:'2.5',recipient}},review=await engine.preparePositionTransaction(fixture().rpc,account,request);
 const changed=await engine.preparePositionTransaction(fixture().rpc,account,{...request,action:{...request.action,shares:'2'}});assert.throws(()=>engine.assertSamePositionTerms(review,changed),/terms changed/);
 let sends=0;const provider={request:async q=>q.method==='eth_accounts'?[account]:q.method==='eth_chainId'?'0x171':(++sends,hash)};
 await assert.rejects(engine.requestPositionTransaction(review,provider,fixture({partialTransfers:false}).rpc,()=>true),/disabled/);
 await assert.rejects(engine.requestPositionTransaction(review,provider,fixture({shares:9n*U}).rpc,()=>true),/terms changed/);assert.equal(sends,0);
});
for(const farm of farms)for(const kind of ['claim','withdraw'])test(farm.id+' '+kind+' preserves asset precision and separate 18-decimal OINK rewards',async()=>{
 const unit=assetUnit(farm),principal=10n*unit+1n,{rpc,calls}=fixture({principal}),r=await engine.preparePositionTransaction(rpc,account,{type:'farm',id:farm.id,index:0,kind,destination:'wallet'}),facts=Object.fromEntries(r.quote.facts);
 const funding=principal*10n/1000000n,accumulator=U*1000000000000n/unit+200n*U*1000000000000n/(10000n*unit),gross=principal*accumulator/1000000000000n,received=gross*50n/10000n;
 const parsed=farmAbi.parseTransaction(r.transaction);
 assert.equal(parsed.name,kind==='claim'?'selfHarvest':'withdraw');
 if(kind==='claim')assert.deepEqual([...parsed.args[0]],[0n]);else assert.equal(parsed.args[0],0n);
 assert.equal(parsed.args[1],account);assert.equal(getAddress(r.transaction.to),getAddress(farm.address));assert.equal(r.transaction.value,'0x0');
 assert.equal(r.quote.execution.amount,principal.toString());assert.equal(r.quote.execution.minimumOutput,received.toString());assert.equal(r.quote.execution.recipient,account);
 assert.equal(facts['Recorded stake'],formatUnits(principal,farm.decimals)+' '+farm.symbol);
 assert.equal(facts['Accrued funding deduction'],formatUnits(funding,farm.decimals)+' '+farm.symbol);
 assert.equal(facts[kind==='claim'?'Stake remaining after claim':farm.tokenPolicy?.kind==='variable-transfer'?'Nominal principal before token transfer effects':'Estimated principal returned'],formatUnits(principal-funding,farm.decimals)+' '+farm.symbol);
 assert.equal(facts['Gross OINK rewards'],formatUnits(gross,18)+' OINK');
 assert.equal(facts['OINK received in wallet'],formatUnits(received,18)+' OINK (at snapshot)');assert.equal(facts['Destination payout rate'],'0.5%');
 assert(!calls.some(([m])=>m==='eth_sendTransaction'));
});
test('locked destination payout and service are read from the source vault',async()=>{const {rpc}=fixture();const r=await engine.preparePositionTransaction(rpc,account,{type:'farm',id:'pls',index:0,kind:'claim',destination:'five-year'});assert.equal(r.quote.execution.recipient,getAddress(miners[5].address));assert(r.quote.facts.some(([k,v])=>k==='Mandatory service at destination'&&v==='365 days'));});
test('fee review separates hourly funding, reward deduction, received amount and future miner penalties',async()=>{
  for(const kind of ['claim','withdraw'])for(const destination of ['wallet','five-year']){
    const r=await engine.preparePositionTransaction(fixture().rpc,account,{type:'farm',id:'pls',index:0,kind,destination});
    const facts=Object.fromEntries(r.quote.facts);
    assert.equal(facts['Funding rate'],'0.001% / hour'); // Fixture rate is 10, not a hard-coded live rate.
    assert.match(facts['Accrued funding deduction'],/ PLS$/);
    assert.match(facts[kind==='claim'?'Stake remaining after claim':'Estimated principal returned'],/ PLS$/);
    assert.match(facts['Reward deduction to Governor'],destination==='wallet'?/ OINK · 99\.5%$/:/ OINK · 0\.0%$/);
    assert.match(facts[destination==='wallet'?'OINK received in wallet':'OINK committed to locked miner'],/ OINK \(at snapshot\)$/);
    assert.equal(facts['Miner exit penalty'],destination==='wallet'?'Not applicable to this farm action':'Not charged now; future miner withdrawal has separate lock and penalty rules');
  }
});
for(const [options,request,pattern] of [[{chain:'0x1'},deploy,/PulseChain/],[{noGas:true},deploy,/gas/],[{contractWallet:true},deploy,/externally/],[{revert:true},deploy,/not pass/],[{migration:recipient},deploy,/Migration/],[{locked:true},{type:'miner',id:'one-month',action:{kind:'withdraw',index:0}},/mandatory/],[{untrusted:true},{type:'miner',id:'one-month',action:{kind:'upgrade',index:0,target:'three-month'}},/trusted/],[{missing:true},{type:'miner',id:'one-month',action:{kind:'withdraw',index:0}},/no longer exists/],[{inactive:true},{type:'farm',id:'pls',index:0,kind:'claim',destination:'five-year'},/not an active/]])test('fails closed '+Object.keys(options)[0],async()=>{await assert.rejects(engine.preparePositionTransaction(fixture(options).rpc,account,request),pattern);});
test('one explicit wallet send after account/network and fresh terms recheck',async()=>{const {rpc}=fixture(),review=await engine.preparePositionTransaction(rpc,account,deploy),calls=[];const provider={request:async q=>{calls.push(q);return q.method==='eth_accounts'?[account]:q.method==='eth_chainId'?'0x171':hash;}};assert.equal(await engine.requestPositionTransaction(review,provider,rpc,()=>true),hash);assert.equal(calls.filter(q=>q.method==='eth_sendTransaction').length,1);});
test('wallet/session changes and stale review prevent sending',async()=>{const {rpc}=fixture(),r=await engine.preparePositionTransaction(rpc,account,deploy);let sends=0;const provider={request:async q=>q.method==='eth_accounts'?[recipient]:q.method==='eth_chainId'?'0x171':++sends};await assert.rejects(engine.requestPositionTransaction(r,provider,rpc,()=>true));await assert.rejects(engine.requestPositionTransaction({...r,createdAt:Date.now()-61000},provider,rpc,()=>false));assert.equal(sends,0);});
test('changed position fingerprint and reduced payouts require another review',async()=>{const {rpc}=fixture(),r=await engine.preparePositionTransaction(rpc,account,deploy);const fresh=structuredClone(r);fresh.quote.execution.fingerprint+='changed';assert.throws(()=>engine.assertSamePositionTerms(r,fresh));fresh.quote.execution.fingerprint=r.quote.execution.fingerprint;r.quote.execution.minimumOutput='2';fresh.quote.execution.minimumOutput='1';assert.throws(()=>engine.assertSamePositionTerms(r,fresh));});
test('persistent pending journal roundtrips and corrupt storage fails closed',async()=>{const {rpc}=fixture(),review=await engine.preparePositionTransaction(rpc,account,deploy);let raw=null;const storage={getItem:()=>raw,setItem:(_k,v)=>{raw=v;}};const entry={review,hash,state:'pending',message:'pending'};engine.writePositionJournal(entry,storage);assert.deepEqual(engine.readPositionJournal(account,storage),entry);assert(engine.positionJournalBlocks(entry));raw='{';assert.throws(()=>engine.readPositionJournal(account,storage));});
test('dropped journal writes are detected',async()=>{const review=await engine.preparePositionTransaction(fixture().rpc,account,deploy);assert.throws(()=>engine.writePositionJournal({review,hash:null,state:'requesting',message:''},{getItem:()=>null,setItem:()=>{}}));});
test('receipt matches sender target calldata canonical block and expected event',async()=>{const review=await engine.preparePositionTransaction(fixture().rpc,account,deploy);const log=engine.minerEvents.encodeEventLog(engine.minerEvents.getEvent('Deposit'),[account,U,10n,1n]);const receipt={transactionHash:hash,from:account,to:review.transaction.to,blockHash,blockNumber:'0x101',status:'0x1',logs:[{...log,address:review.transaction.to}]};const tx={...review.transaction,hash,input:review.transaction.data,blockHash,blockNumber:'0x101'};const rpc={send:async m=>m==='eth_chainId'?'0x171':m==='eth_getTransactionReceipt'?receipt:m==='eth_getTransactionByHash'?tx:{hash:blockHash}};assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'confirmed');tx.input='0x';assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'uncertain');tx.input=review.transaction.data;receipt.status='0x0';assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'failed');receipt.transactionHash='0x'+'ef'.repeat(32);assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'uncertain');});
test('original referral numeric base58 roundtrip includes leading-zero addresses',()=>{const alphabet='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';for(const address of [account,recipient,miners[0].address]){const str=referralLink(address).split('=')[1];let n=0n;for(const c of str)n=n*58n+BigInt(alphabet.indexOf(c));assert.equal(n,BigInt(address));}assert.throws(()=>referralLink(ZeroAddress));});
test('gross tick clamps elapsed time and never invents negative growth',()=>{assert.equal(estimateMinerValue(U,U,U,86400n,9999),U+60n);assert.equal(estimateMinerValue(U,U,U,86400n,-1),U);});
test('activity decoder ignores unknown and removed logs',()=>{const log=engine.minerEvents.encodeEventLog(engine.minerEvents.getEvent('Deposit'),[account,U,1n,1n]);const row={...log,address:miners[0].address,transactionHash:hash,blockNumber:'0x100',logIndex:'0x0'};assert.match(decodeActivity(row).label,/Miner deployed/);assert.equal(decodeActivity({...row,removed:true}),null);assert.equal(decodeActivity({...row,address:recipient}),null);});
for(const kind of ['transfer','upgrade','withdraw','claim','farm-withdraw','gift'])test(kind+' receipt verifies its own action event',async()=>{
 const request=kind==='claim'||kind==='farm-withdraw'?{type:'farm',id:'pls',index:0,kind:kind==='claim'?'claim':'withdraw',destination:'wallet'}:kind==='gift'?{...deploy,action:{...deploy.action,recipient}}:{type:'miner',id:'one-month',action:kind==='transfer'?{kind,index:0,recipient}:kind==='upgrade'?{kind,index:0,target:'three-month'}:{kind,index:0}};
 const review=await engine.preparePositionTransaction(fixture().rpc,account,request),e=review.quote.execution,abi=request.type==='miner'?engine.minerEvents:engine.farmExitEvents;
 const name=kind==='transfer'?'TransferStake':kind==='upgrade'?'HopPool':kind==='gift'?'GiftDeposit':kind==='claim'?'SelfHarvest':'Withdraw';
 const args=kind==='transfer'?[account,recipient,BigInt(e.shares),0n]:kind==='upgrade'?[account,U,BigInt(e.shares),e.recipient]:kind==='gift'?[account,recipient,U,10n,1n]:kind==='claim'?[account,account,BigInt(e.minimumOutput),1n]:kind==='farm-withdraw'?[account,0n,BigInt(e.minimumOutput),1n]:[account,BigInt(e.minimumOutput),1n,BigInt(e.shares)];
 const event=abi.encodeEventLog(abi.getEvent(name),args),receipt={transactionHash:hash,from:account,to:review.transaction.to,blockHash,blockNumber:'0x101',status:'0x1',logs:[{...event,address:review.transaction.to}]},tx={...review.transaction,hash,input:review.transaction.data,blockHash,blockNumber:'0x101'};
 const rpc={send:async m=>m==='eth_chainId'?'0x171':m==='eth_getTransactionReceipt'?receipt:m==='eth_getTransactionByHash'?tx:{hash:blockHash}};
 assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'confirmed');receipt.logs[0].removed=true;assert.equal((await engine.verifyPositionReceipt(rpc,review,hash)).state,'uncertain');
});

const rollover={type:'miner',id:'one-month',action:{kind:'rollover',index:0}};
const emergency={type:'farm',id:'pls',index:0,kind:'emergency',destination:'wallet'};

for(const miner of miners)test(miner.id+' rollover recommits in the same pool with a Governor-funded bonus',async()=>{
 const {rpc,calls}=fixture(),review=await engine.preparePositionTransaction(rpc,account,{...rollover,id:miner.id}),parsed=minerAbi.parseTransaction(review.transaction),facts=Object.fromEntries(review.quote.facts);
 assert.equal(parsed.name,'stakeRollover');assert.equal(parsed.args[0],getAddress(miner.address));assert.equal(parsed.args[1],0n);
 assert.equal(review.quote.execution.minimumOutput,(10n*U).toString());assert.equal(review.quote.execution.event,'MinerRollover');
 assert.equal(facts['Rollover bonus rate'],'1.0%');assert.equal(facts['OINK received in wallet'],'0 OINK');assert.equal(facts['Rollover penalty'],'0 OINK');assert.match(facts['New duration'],new RegExp('^'+miner.durationDays+' days'));
 assert(!calls.some(([method])=>method==='eth_sendTransaction'));
});

test('rollover requires strictly past maturity and cannot use a zero bonus or insufficient reserve',async()=>{
 const duration=30n*86400n;
 for(const depositedAgo of [duration-1n,duration])await assert.rejects(engine.preparePositionTransaction(fixture({depositedAgo}).rpc,account,rollover),/past maturity/);
 await engine.preparePositionTransaction(fixture({depositedAgo:duration+1n,locked:true}).rpc,account,rollover);
 for(const [options,pattern] of [[{bonusBps:0n},/bonus is zero/],[{reserve:10n*U-1n},/insufficient OINK/],[{minerBalance:0n},/bonus is zero/],[{shares:1n,bonusBps:1n},/bonus is zero/],[{badCode:true},/runtime/],[{revert:true},/not pass/]])await assert.rejects(engine.preparePositionTransaction(fixture(options).rpc,account,rollover),pattern);
});

test('rollover selector returns target-specific live bonuses at one verified block',async()=>{
 const bonuses={'three-month':150n,'six-month':200n,'one-year':250n,'three-year':300n,'five-year':100n};
 const {rpc,calls}=fixture({bonusById:bonuses}),result=await readMinerRolloverOptions(rpc,'three-month',account,0);
 assert.equal(result.account,account);assert.equal(result.gross,(1000n*U).toString());assert.equal(result.source.shares,(10n*U).toString());assert.equal(result.source.index,0);
 assert.deepEqual(result.options.map(o=>o.id),Object.keys(bonuses));
 for(const option of result.options){
  assert.equal(option.available,true);assert.equal(option.bonusRate,bonuses[option.id].toString());assert.equal(option.bonusAmount,(1000n*U*bonuses[option.id]/10000n).toString());
  assert.equal(option.quote.block,result.block);assert.equal(option.quote.blockHash,result.blockHash);assert.equal(option.quote.execution.rollover.target,getAddress(option.address));
  const encoded=minerAbi.parseTransaction({data:option.quote.execution.data});assert.equal(encoded.name,'stakeRollover');assert.equal(encoded.args[0],getAddress(option.address));
 }
 assert(calls.filter(([method])=>['eth_call','eth_getCode'].includes(method)).every(([,params])=>params[1]==='0x100'));
 assert(!calls.some(([method])=>method==='eth_sendTransaction'));
});

test('unavailable rollover choices never fabricate a bonus and other choices can still load',async()=>{
 const {rpc}=fixture({bonusUnavailable:'six-month',revertTarget:miners.find(v=>v.id==='one-year').address});
 const result=await readMinerRolloverOptions(rpc,'three-month',account,0),missing=result.options.find(o=>o.id==='six-month'),reverted=result.options.find(o=>o.id==='one-year');
 assert.equal(missing.available,false);assert.equal(missing.bonusRate,null);assert.equal(missing.bonusAmount,null);assert.match(missing.error,/unavailable/);
 assert.equal(reverted.available,false);assert.equal(reverted.bonusAmount,(10n*U).toString());assert.match(reverted.error,/not pass/);
 assert.equal(result.options.find(o=>o.id==='five-year').available,true);
 let blockReads=0;const reorg={send:async(method,params)=>method==='eth_getBlockByNumber'&&++blockReads>1?{hash:'0x'+'ef'.repeat(32)}:rpc.send(method,params)};
 await assert.rejects(readMinerRolloverOptions(reorg,'three-month',account,0),/Snapshot changed/);
});

test('cross-pool rollover verifies credit, share issuance, target locks and reciprocal trust',async()=>{
 const request={type:'miner',id:'three-month',action:{kind:'rollover',index:0,target:'one-year'}};
 const r=await engine.preparePositionTransaction(fixture({locked:true}).rpc,account,request),terms=r.quote.execution.rollover;
 assert.equal(terms.target,getAddress(miners.find(m=>m.id==='one-year').address));assert.equal(terms.mandatorySeconds,(100n*86400n).toString());
 assert.equal(terms.targetIndex,'1');assert.equal(terms.targetDuration,(365n*86400n).toString());assert.equal(terms.resetHopTime,false);
 const invalid=[
  [{minerCredit:999n*U},/harvested/],
  [{durationById:{'one-year':364n*86400n}},/lock rules/],
  [{balanceById:{'one-year':0n}},/accounting/],
  [{totalById:{'one-year':1n},balanceById:{'one-year':100000n*U}},/zero shares/],
  [{untrusted:true},/trusted/],
  [{trust:(id)=>id==='one-year'?false:true},/does not trust/],
 ];
 for(const [options,pattern] of invalid)await assert.rejects(engine.preparePositionTransaction(fixture(options).rpc,account,request),pattern);
 await assert.rejects(engine.preparePositionTransaction(fixture().rpc,account,{...request,action:{...request.action,target:'unverified-pool'}}),/Unknown rollover/);
 const changed=await engine.preparePositionTransaction(fixture({countById:{'one-year':2n}}).rpc,account,request);
 assert.throws(()=>engine.assertSamePositionTerms(r,changed),/terms changed/);
});

test('rollover follows contract grace boundaries and carries or resets mandatory service accurately',async()=>{
 const from=miners.find(m=>m.id==='six-month'),duration=BigInt(from.durationDays)*86400n,grace=BigInt(from.graceDays)*86400n;
 const down={type:'miner',id:'six-month',action:{kind:'rollover',index:0,target:'three-month'}};
 const trust=(id,name)=>id==='six-month'?name==='trustedSender':true;
 const permitted=await engine.preparePositionTransaction(fixture({trust,depositedAgo:duration+1n,locked:true}).rpc,account,down);
 assert.equal(permitted.quote.execution.rollover.mandatorySeconds,'0');
 for(const age of [duration+grace,duration+grace+1n])await assert.rejects(engine.preparePositionTransaction(fixture({trust,depositedAgo:age}).rpc,account,down),/grace period/);
 const up={type:'miner',id:'three-month',action:{kind:'rollover',index:0,target:'one-year'}},late=await engine.preparePositionTransaction(fixture({depositedAgo:100n*86400n,locked:true}).rpc,account,up);
 assert.equal(late.quote.execution.rollover.resetHopTime,true);assert.equal(late.quote.execution.rollover.carriedStart,late.quote.timestamp.toString());assert.equal(late.quote.execution.rollover.mandatorySeconds,(100n*86400n).toString());
 const same=await engine.preparePositionTransaction(fixture({depositedAgo:100n*86400n,locked:true}).rpc,account,{...up,action:{kind:'rollover',index:0}});
 assert.equal(same.quote.execution.rollover.mandatorySeconds,'0');
});

test('wallet stage fires exactly before the single wallet transaction request, after fresh checks',async()=>{
 const {rpc}=fixture(),review=await engine.preparePositionTransaction(rpc,account,rollover),events=[];
 const provider={request:async request=>{events.push(request.method);return request.method==='eth_accounts'?[account]:request.method==='eth_chainId'?'0x171':hash;}};
 await engine.requestPositionTransaction(review,provider,rpc,()=>true,()=>events.push('wallet-stage'));
 assert.deepEqual(events.slice(-2),['wallet-stage','eth_sendTransaction']);assert.equal(events.filter(e=>e==='eth_sendTransaction').length,1);
 events.length=0;await assert.rejects(engine.requestPositionTransaction(review,provider,rpc,()=>false,()=>events.push('wallet-stage')));assert(!events.includes('wallet-stage'));assert(!events.includes('eth_sendTransaction'));
});

for(const farm of farms)test(farm.id+' emergency withdrawal returns net principal without reading reward state',async()=>{
 const unit=assetUnit(farm),principal=10n*unit+1n,{rpc,calls}=fixture({rewardUnavailable:true,principal}),review=await engine.preparePositionTransaction(rpc,account,{...emergency,id:farm.id}),parsed=farmAbi.parseTransaction(review.transaction),facts=Object.fromEntries(review.quote.facts),funding=principal*10n/1000000n;
 assert.equal(parsed.name,'emergencyWithdraw');assert.equal(parsed.args[0],0n);assert.equal(review.quote.execution.event,'FarmEmergencyWithdraw');assert.equal(review.quote.execution.recipient,account);
 assert.equal(review.quote.execution.amount,principal.toString());assert.equal(BigInt(review.quote.execution.minimumOutput),principal-funding);
 assert.equal(facts['Recorded stake'],formatUnits(principal,farm.decimals)+' '+farm.symbol);assert.equal(facts['Accrued funding deduction'],formatUnits(funding,farm.decimals)+' '+farm.symbol);assert.equal(facts[farm.tokenPolicy?.kind==='variable-transfer'?'Nominal principal before token transfer effects':'Estimated principal returned'],formatUnits(principal-funding,farm.decimals)+' '+farm.symbol);assert.equal(facts['OINK rewards received'],'0 OINK');assert.match(facts['Pending rewards'],/forfeited/);
 const reads=calls.filter(([method])=>method==='eth_call').map(([,params])=>{try{return farmAbi.parseTransaction(params[0]).name;}catch{return ''}});
 assert(!reads.some(name=>['credit','pendingDtx','accDtxPerShare','lastCredit','defaultDirectPayout','selfHarvest'].includes(name)));
 assert(!calls.some(([method])=>method==='eth_sendTransaction'));
});

test('emergency funding is zero when disabled, capped at20%, and requires liquidity for fees plus principal',async()=>{
 const zero=await engine.preparePositionTransaction(fixture({fee:0n}).rpc,account,emergency);assert.equal(zero.quote.execution.minimumOutput,(10n*U).toString());
 const cap=await engine.preparePositionTransaction(fixture({fee:250n,farmAge:3600000n,fundingAge:3600000n}).rpc,account,emergency);assert.equal(cap.quote.execution.minimumOutput,(8n*U).toString());
 for(const farm of farms)await assert.rejects(engine.preparePositionTransaction(fixture({liquidity:10n*assetUnit(farm)-1n}).rpc,account,{...emergency,id:farm.id}),/liquidity/);
 await assert.rejects(engine.preparePositionTransaction(fixture().rpc,account,{...emergency,destination:'five-year'}),/wallet only/);
 await assert.rejects(engine.preparePositionTransaction(fixture({badCode:true}).rpc,account,emergency),/runtime/);
 await assert.rejects(engine.preparePositionTransaction(fixture({revert:true}).rpc,account,emergency),/not pass/);
});

test('new rollover rate or emergency funding terms require another review',async()=>{
 const original=await engine.preparePositionTransaction(fixture().rpc,account,rollover),changed=await engine.preparePositionTransaction(fixture({bonusBps:200n}).rpc,account,rollover);
 assert.throws(()=>engine.assertSamePositionTerms(original,changed),/terms changed/);
 const firstExit=await engine.preparePositionTransaction(fixture({fee:0n}).rpc,account,emergency),changedExit=await engine.preparePositionTransaction(fixture({fee:10n}).rpc,account,emergency);
 assert.throws(()=>engine.assertSamePositionTerms(firstExit,changedExit),/terms changed/);
});

function receiptFixture(review,logs,options={}){
 const timestamp=review.quote.timestamp+12,receipt={transactionHash:hash,from:account,to:review.transaction.to,blockHash,blockNumber:'0x101',status:'0x1',logs},tx={...review.transaction,hash,input:review.transaction.data,blockHash,blockNumber:'0x101'};
 const block={number:'0x101',hash:blockHash,timestamp:toQuantity(timestamp)},base=fixture(options);
 const rpc={send:async(method,params)=>method==='eth_getTransactionReceipt'?receipt:method==='eth_getTransactionByHash'?tx:method==='eth_getBlockByNumber'?block:base.rpc.send(method,params)};
 return {rpc,receipt,tx,block,timestamp,calls:base.calls};
}
test('partial withdrawal and transfer receipts bind the selected share amount, owner and recipient/index',async()=>{
 for(const kind of ['withdraw','transfer']){
  const request={type:'miner',id:'one-month',action:{kind,index:0,shares:'2.5',...(kind==='transfer'?{recipient}:{})}},review=await engine.preparePositionTransaction(fixture().rpc,account,request),e=review.quote.execution;
  const event=(shares=BigInt(e.shares),sender=account,receiver=recipient,id=0n,amount=BigInt(e.minimumOutput))=>({...engine.minerEvents.encodeEventLog(engine.minerEvents.getEvent(kind==='withdraw'?'Withdraw':'TransferStake'),kind==='withdraw'?[sender,amount,0n,shares]:[sender,receiver,shares,id]),address:review.transaction.to});
  const mined=receiptFixture(review,[event()]);assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');
  const bad=[event(10n*U),event(BigInt(e.shares),recipient),{...event(),address:recipient},{...event(),removed:true}];
  if(kind==='transfer')bad.push(event(BigInt(e.shares),account,account),event(BigInt(e.shares),account,recipient,1n));
  else bad.push(event(BigInt(e.shares),account,recipient,0n,BigInt(e.minimumOutput)-1n));
  for(const log of bad){mined.receipt.logs=[log];assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain');}
 }
});

test('emergency receipt treats the last Withdraw field as returned principal, not rewards',async()=>{
 const review=await engine.preparePositionTransaction(fixture().rpc,account,emergency),minimum=BigInt(review.quote.execution.minimumOutput);
 const event=(id=0n,rewards=0n,principal=minimum)=>({...engine.farmExitEvents.encodeEventLog(engine.farmExitEvents.getEvent('Withdraw'),[account,id,rewards,principal]),address:review.transaction.to});
 const mined=receiptFixture(review,[event()]);assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');
 for(const bad of [event(1n),event(0n,1n),event(0n,0n,minimum-1n),event(0n,0n,BigInt(review.quote.execution.amount)+1n),{...event(),removed:true},{...event(),address:recipient}]){mined.receipt.logs=[bad];assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain');}
});

test('rollover receipt requires the exact miner extension and matching Governor bonus',async()=>{
 const review=await engine.preparePositionTransaction(fixture().rpc,account,rollover),amount=BigInt(review.quote.execution.minimumOutput),timestamp=BigInt(review.quote.timestamp+12);
 const extension=(sender=core.governor,index=0n,bonus=amount,shares=1n,at=timestamp)=>({...engine.minerEvents.encodeEventLog(engine.minerEvents.getEvent('AddAndExtendStake'),[sender,account,bonus,index,shares,at]),address:review.transaction.to});
 const bonus=(value=amount,to=review.transaction.to)=>({...engine.governorRolloverEvents.encodeEventLog(engine.governorRolloverEvents.getEvent('GiveRolloverBonus'),[account,value,to]),address:core.governor});
 const mined=receiptFixture(review,[extension(),bonus()]);assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');
 for(const logs of [[extension()],[bonus()],[extension(account),bonus()],[extension(core.governor,1n),bonus()],[extension(core.governor,0n,amount-1n),bonus(amount-1n)],[extension(core.governor,0n,amount,0n),bonus()],[extension(core.governor,0n,amount,1n,timestamp-1n),bonus()],[extension(),bonus(amount+1n)],[extension(),bonus(amount,recipient)],[extension(),{...bonus(),address:recipient}],[{...extension(),removed:true},bonus()]]){mined.receipt.logs=logs;assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain');}
});

test('cross-pool rollover receipt correlates both pools, bonus and the actual newly created position',async()=>{
 const request={type:'miner',id:'three-month',action:{kind:'rollover',index:0,target:'one-year'}};
 const review=await engine.preparePositionTransaction(fixture({locked:true}).rpc,account,request),e=review.quote.execution,t=e.rollover,target=t.target,timestamp=BigInt(review.quote.timestamp+12),gross=BigInt(t.gross),amount=BigInt(e.amount),newIndex=2n,hopShares=20n*U,bonusShares=U;
 const log=(name,args,address)=>({...engine.minerEvents.encodeEventLog(engine.minerEvents.getEvent(name),args),address});
 const hop=(to=target,shares=BigInt(e.shares),value=gross)=>log('HopPool',[account,value,shares,to],e.to);
 const deposit=(value=gross,start=BigInt(t.carriedStart))=>log('HopDeposit',[account,value,hopShares,start,BigInt(t.sourceMandatory)],target);
 const extension=(id=newIndex,value=amount)=>log('AddAndExtendStake',[core.governor,account,value,id,bonusShares,timestamp],target);
 const bonus=(value=amount,to=target)=>({...engine.governorRolloverEvents.encodeEventLog(engine.governorRolloverEvents.getEvent('GiveRolloverBonus'),[account,value,to]),address:core.governor});
 const original=[deposit(),hop(),extension(),bonus()],mined=receiptFixture(review,original),baseSend=mined.rpc.send;let alteredPosition=false,reads=0;
 mined.rpc.send=async(method,params)=>{
  if(method==='eth_call'&&atAddress(params[0].to,target)){
   assert.equal(params[1],'0x101');reads++;
   const parsed=minerAbi.parseTransaction(params[0]);
   if(parsed.name==='getNrOfStakes')return minerAbi.encodeFunctionResult(parsed.name,[3n]);
   if(parsed.name==='userInfo')return minerAbi.encodeFunctionResult(parsed.name,parsed.args[1]===newIndex?[hopShares+bonusShares,timestamp,gross+amount,timestamp,alteredPosition?1n:BigInt(t.mandatorySeconds)]:[0n,0n,0n,0n,0n]);
  }
  return baseSend(method,params);
 };
 assert.equal(t.targetIndex,'1','pre-send count intentionally differs from actual minted index');
 assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');assert.equal(reads,2);
 const invalid=[
  [deposit(),hop(recipient),extension(),bonus()],
  [deposit(),hop(target,BigInt(e.shares)-1n),extension(),bonus()],
  [deposit(gross-1n),hop(),extension(),bonus()],
  [deposit(gross,BigInt(t.carriedStart)+1n),hop(),extension(),bonus()],
  [deposit(),hop(),extension(1n),bonus()],
  [deposit(),hop(),extension(newIndex,amount+1n),bonus(amount+1n)],
  [deposit(),hop(),extension(),bonus(amount,recipient)],
  [deposit(),hop(),{...extension(),address:e.to},bonus()],
  [deposit(),{...hop(),removed:true},extension(),bonus()],
  [hop(),extension(),bonus()],
  [deposit(),hop(),extension(),bonus(),bonus()],
 ];
 for(const logs of invalid){mined.receipt.logs=logs;assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain');}
 mined.receipt.logs=original;alteredPosition=true;assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain');
});

function farmActionLog(review,amount=BigInt(review.quote.execution.minimumOutput)){
 const name=review.request.kind==='claim'?'SelfHarvest':'Withdraw';
 const args=review.request.kind==='claim'?[account,account,amount,0n]:review.request.kind==='emergency'?[account,BigInt(review.request.index),0n,amount]:[account,BigInt(review.request.index),amount,0n];
 return {...engine.farmExitEvents.encodeEventLog(engine.farmExitEvents.getEvent(name),args),address:review.transaction.to};
}

function discoveredFarm(){const address='0x0000000000000000000000000000000000000099';return {...structuredClone(farms.find(f=>f.id==='plsx')),id:'registry-'+address,address,poolId:'999',discoveryTemplateId:'token-vault-0.8.20-optimized',discoveryBlockHash:blockHash};}
for(const kind of ['claim','withdraw','emergency'])test('discovered farm '+kind+' uses its verified pool and target, with receipt recovery after rediscovery',async()=>{
 const spec=discoveredFarm(),f=fixture({extraFarm:spec}),request={type:'farm',id:spec.id,index:0,kind,destination:'wallet'};
 try{
  catalog.replaceDiscoveredFarmSpecs([spec]);
  const review=await engine.preparePositionTransaction(f.rpc,account,request);
  assert.equal(review.transaction.to,spec.address);assert.equal(review.farmSpecIdentity,catalog.farmSpecIdentity(spec));
  const poolReads=f.calls.filter(([m,p])=>m==='eth_call'&&atAddress(p[0].to,core.masterchef)).map(([,p])=>previewAbi.parseTransaction(p[0])).filter(p=>p?.name==='poolInfo');
  assert(poolReads.some(p=>p.args[0]===999n));
  let saved=null;const storage={getItem:()=>saved,setItem:(_key,value)=>{saved=value;}};
  engine.writePositionJournal({review,state:'pending',hash,message:'pending'},storage);
  catalog.replaceDiscoveredFarmSpecs([]);
  assert.equal(engine.readPositionJournal(account,storage).hash,hash,'a missing catalog does not hide the saved request');
  const calls=[];const provider={request:async q=>{calls.push(q);return q.method==='eth_accounts'?[account]:q.method==='eth_chainId'?'0x171':hash;}};
  await assert.rejects(engine.requestPositionTransaction(review,provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(calls.length,0);
  const mined=receiptFixture(review,[farmActionLog(review)],{extraFarm:spec});
  await assert.rejects(engine.verifyPositionReceipt(mined.rpc,review,hash),/unavailable or changed/);
  catalog.replaceDiscoveredFarmSpecs([{...spec,verifiedBlock:spec.verifiedBlock+1}]);
  assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');
  const altered={...spec,poolId:'1000'};catalog.replaceDiscoveredFarmSpecs([altered]);
  await assert.rejects(engine.requestPositionTransaction(review,provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(calls.length,0);
 }finally{catalog.replaceDiscoveredFarmSpecs([]);}
});

test('discovered farm removal while final wallet checks run stops before a send',async()=>{
 const spec=discoveredFarm(),f=fixture({extraFarm:spec});
 try{
  catalog.replaceDiscoveredFarmSpecs([spec]);const review=await engine.preparePositionTransaction(f.rpc,account,{type:'farm',id:spec.id,index:0,kind:'withdraw',destination:'wallet'});let sends=0;
  const provider={request:async q=>{if(q.method==='eth_accounts'){catalog.replaceDiscoveredFarmSpecs([]);return [account];}if(q.method==='eth_chainId')return '0x171';sends++;return hash;}};
  await assert.rejects(engine.requestPositionTransaction(review,provider,f.rpc,()=>true),/unavailable or changed/);assert.equal(sends,0);
 }finally{catalog.replaceDiscoveredFarmSpecs([]);}
});

for(const farm of farms)for(const kind of ['claim','withdraw','emergency'])test(farm.id+' '+kind+' receipt validates the correct raw output unit and pinned asset state',async()=>{
 const review=await engine.preparePositionTransaction(fixture().rpc,account,{type:'farm',id:farm.id,index:0,kind,destination:'wallet'}),minimum=BigInt(review.quote.execution.minimumOutput),mined=receiptFixture(review,[farmActionLog(review)]);
 assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'confirmed');
 if(farm.tokenAddress){
  const tokenReads=mined.calls.filter(([method,params])=>['eth_getCode','eth_call'].includes(method)&&(method==='eth_getCode'?atAddress(params[0],farm.tokenAddress):atAddress(params[0].to,farm.tokenAddress)));
  assert(tokenReads.length>0,'receipt must recheck the actual deposit-token deployment');
  assert(tokenReads.every(([,params])=>params[1]==='0x101'),'token health must use the receipt block');
  if(farm.tokenPolicy?.kind==='usdc')assert(mined.calls.some(([method,params])=>method==='eth_getStorageAt'&&params[2]==='0x101'),'proxy implementation must use the receipt block');
 }
 assert(minimum>0n);mined.receipt.logs=[farmActionLog(review,minimum-1n)];
 assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain','one raw unit below the reviewed output cannot confirm');
 if(farm.tokenAddress){const changed=receiptFixture(review,[farmActionLog(review)],{badTokenCode:true});assert.equal((await engine.verifyPositionReceipt(changed.rpc,review,hash)).state,'uncertain','a changed token runtime cannot confirm despite a valid vault event');}
});

for(const farm of farms.filter(candidate=>candidate.tokenPolicy&&candidate.tokenPolicy.kind!=='variable-transfer'))test(farm.id+' changed token policy prevents preparation, final send and receipt confirmation',async()=>{
 const request={type:'farm',id:farm.id,index:0,kind:'withdraw',destination:'wallet'},review=await engine.preparePositionTransaction(fixture().rpc,account,request);
 const invalid=[
  [{tokenPaused:true},/paused/],
  ...[account,farm.address,farm.treasuryWallet].map(tokenBlocked=>[{tokenBlocked},/blocks/]),
  ...(farm.tokenPolicy.kind==='usdt'?[[{tokenDeprecated:true},/implementation/],[{tokenRate:1n},/transfer-fee/],[{tokenMax:1n},/transfer-fee/]]:[[{badImplementation:true},/implementation/],[{badImplementationCode:true},/implementation runtime/]]),
 ];
 for(const [options,pattern]of invalid){
  await assert.rejects(engine.preparePositionTransaction(fixture(options).rpc,account,request),pattern);
  const mined=receiptFixture(review,[farmActionLog(review)],options);
  assert.equal((await engine.verifyPositionReceipt(mined.rpc,review,hash)).state,'uncertain','valid vault event cannot bypass changed token policy');
  let sends=0;const provider={request:async q=>q.method==='eth_accounts'?[account]:q.method==='eth_chainId'?'0x171':(++sends,hash)};
  await assert.rejects(engine.requestPositionTransaction(review,provider,fixture(options).rpc,()=>true),pattern);
  assert.equal(sends,0,'fresh token guard rejects before opening a transaction confirmation');
 }
});

for(const id of ['ptgc','ufo'])test(id+' claim quotes use the ledger despite a different reflection token balance',async()=>{
 const request={type:'farm',id,index:0,kind:'claim',destination:'wallet'};
 const ordinary=await engine.preparePositionTransaction(fixture().rpc,account,request);
 const reflected=await engine.preparePositionTransaction(fixture({liquidity:20000n*U,rewardBalance:10000n*U}).rpc,account,request);
 assert.equal(reflected.quote.execution.minimumOutput,ordinary.quote.execution.minimumOutput);
 assert.deepEqual(reflected.quote.facts,ordinary.quote.facts);
});
