import assert from 'node:assert/strict';import{test}from'node:test';import{registerHooks}from'node:module';import fs from'node:fs';import{Interface,ZeroAddress,keccak256,getAddress,parseEther,parseUnits,toQuantity}from'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const{HEX_SHARE_WRITE:h,DISTRIBUTIONS}=await import('../src/config/accessVerification.ts');const{VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');const{MINER_PREVIEW_SPECS:miners}=await import('../src/config/minerPreviewVerification.ts');const{PARTICIPATION_CONTRACTS}=await import('../src/config/participationVerification.ts');const{accessAbi}=await import('../src/lib/accessSnapshot.ts');const{hexShareAbi,hexShareAdapter,readHexSharePosition,calculateHexRewards}=await import('../src/lib/hexShareActions.ts');const{distributionAbi,distributionAdapter,validateDistributionProof,readDistribution}=await import('../src/lib/distributionClaims.ts');
const code='0x6001600055',hash=keccak256(code),common=VERIFIED_FARM_WRITES[0];common.masterchefRuntimeCodeHash=hash;common.governorRuntimeCodeHash=hash;common.rewardTokenRuntimeCodeHash=hash;h.runtimeCodeHash=hash;h.hexRuntimeCodeHash=hash;for(const m of miners)m.runtimeCodeHash=hash;for(const d of DISTRIBUTIONS)d.runtimeCodeHash=hash;PARTICIPATION_CONTRACTS.credit.runtimeCodeHash=hash;
const data=JSON.parse(fs.readFileSync(new URL('../public/data/distribution-claims.json',import.meta.url),'utf8'));const contributor=Object.keys(data.distributions.contributors.entries)[0];const rewardAccount=Object.keys(data.distributions.rewards.entries)[0];const U=10n**18n,S=10n**12n;const blockHash='0x'+'ab'.repeat(32);
globalThis.fetch=async()=>({ok:true,json:async()=>data});
const equal=(a,b)=>a.toLowerCase()===b.toLowerCase();
function mock(options={}){const calls=[],timestamp=Math.floor(Date.now()/1000),block={number:'0x100',hash:blockHash,timestamp:toQuantity(timestamp)};return {calls,timestamp,async send(method,params=[]){calls.push([method,params]);if(method==='eth_chainId')return options.chain??'0x171';if(method==='eth_getBlockByNumber')return options.reorg&&params[0]!=='latest'?{...block,hash:'0x'+'cd'.repeat(32)}:block;if(method==='eth_getCode')return options.code?'0x6000':code;if(method!=='eth_call')throw Error('Unexpected RPC '+method);assert.equal(params[1],'0x100');const to=params[0].to;let parsed,abi;for(const a of[accessAbi,hexShareAbi,distributionAbi]){try{parsed=a.parseTransaction(params[0]);if(parsed){abi=a;break}}catch{}}assert.ok(parsed,'known method');const name=parsed.name,args=parsed.args;const distribution=DISTRIBUTIONS.find(d=>equal(d.address,to));const miner=miners.find(d=>equal(d.address,to));let values;
switch(name){case'owner':values=[equal(to,common.rewardToken)?common.masterchef:common.governor];break;case'governor':case'feeAddress':case'treasury':case'admin':values=[common.governor];break;case'masterchef':values=[common.masterchef];break;case'token':case'XPD':case'dtx':values=[options.token??common.rewardToken];break;case'treasuryWallet':values=[common.treasuryWallet];break;case'poolInfo':values=[100n,1n,Number(args[0])===10?h.address:miners[Number(args[0])].address];break;case'poolID':values=[equal(to,h.address)?10n:BigInt(miner.poolId)];break;case'hexC':values=[h.hex];break;case'totalTshares':values=[10n*S+100000000n];break;case'safePeriod':values=[43200n];break;case'maxStakes':values=[options.cap??150n];break;case'accDtxPerShare':values=[U];break;case'lastCredit':values=[0n];break;case'credit':values=[options.credit??(DISTRIBUTIONS.some(d=>equal(d.address,args[0]))?100000000n*U:0n)];break;case'pendingDtx':values=[0n];break;case'defaultDirectPayout':values=[options.payout??50n];break;case'userInfo':values=[options.register?0n:2n*S,options.debt??0n,BigInt(timestamp)-(options.safeBoundary?43200n:43201n)];break;case'stakeCount':values=[options.count??2n];break;case'stakeLists':values=[1n,1n,(args[1]+2n)*S,1n,1n,0n,false];break;case'referredBy':values=[ZeroAddress];break;case'viewPoolPayout':case'payout':values=[options.payout??10000n];break;case'viewPoolMinServe':case'minToServe':values=[86400n];break;case'migrationPool':values=[ZeroAddress];break;case'withdrawFeePeriod':values=[BigInt(miner.durationDays)*86400n];break;case'minimumGift':values=[options.minimum??1n];break;case'merkleRoot':values=[options.root??distribution.root];break;case'directPayout':values=[options.payout??(distribution.id==='contributors'?8000n:250n)];break;case'totalRedeemed':values=[0n];break;case'amountRedeemed':values=[options.redeemed??0n];break;case'isValid':values=[options.valid??true];break;case'startTime':values=[1695976455n];break;case'CLAIM_PERIOD_DAYS':values=[180n];break;case'votingCreditContract':values=[PARTICIPATION_CONTRACTS.credit.address];break;case'airdropContract':values=[DISTRIBUTIONS[0].address];break;case'airdropContractLocked':values=[DISTRIBUTIONS[1].address];break;default:if(/^acPool[1-6]$/.test(name))values=[miners[Number(name.slice(-1))-1].address];else throw Error('Unhandled '+name)}return abi.encodeFunctionResult(name,values)}}}
const hexRequest=(action,args={})=>({module:'hex-shares',action,args});const claimRequest=(id='contributors',destination='wallet',amount='1')=>({module:'distribution',action:'claim',args:{distribution:id,destination,amount}});
function receiptLog(abi,event,address,args){const l=abi.encodeEventLog(abi.getEvent(event),args);return{address,topics:l.topics,data:l.data}}
function review(quote,request){return{quote,request,transaction:{data:quote.data,to:quote.to},createdAt:Date.now()}}
function receipt(logs){return{blockNumber:'0x100',blockHash,logs}}
// Older versions could save claim/unregister reviews. Receipt monitoring still
// verifies those records, even though new preparation is registration-only.
function savedHexReview(action, destination='wallet') {
  assert.ok(['claim','unregister'].includes(action));
  const into=destination==='wallet'?contributor:miners.find(miner=>miner.id===destination).address;
  const request=hexRequest(action,{destination});
  return review({
    title:action==='claim'?'Claim HEX share rewards':'Unregister HEX shares',
    account:getAddress(contributor),block:256,blockHash,timestamp:1700000000,
    to:h.address,data:hexShareAbi.encodeFunctionData(action==='claim'?'selfHarvest':'withdraw',[into]),value:'0x0',
    facts:[['OINK received',destination==='wallet'?'0.01':'2.0'],['Destination payout',destination==='wallet'?'0.5%':'100%']],
    warnings:[],fingerprint:'saved-hex-review-fixture',
  },request);
}
test('every bundled allocation proof reconstructs the on-chain root',()=>{let count=0;for(const[id,row]of Object.entries(data.distributions))for(const[account,proof]of Object.entries(row.entries)){assert.deepEqual(validateDistributionProof(account,proof,DISTRIBUTIONS.find(v=>v.id===id).root),proof);count++}assert.equal(count,4288)});
test('proof validation rejects another wallet, wrong root, malformed node, overflow, missing and zero allocation',()=>{const proof=data.distributions.contributors.entries[contributor];for(const value of[null,{...proof,amount:'0'},{...proof,amount:(1n<<256n).toString()},{...proof,proof:['bad']},{...proof,proof:new Array(65).fill('0x'+'00'.repeat(32))}])assert.throws(()=>validateDistributionProof(contributor,value,DISTRIBUTIONS[0].root));assert.throws(()=>validateDistributionProof(rewardAccount,proof,DISTRIBUTIONS[0].root));assert.throws(()=>validateDistributionProof(contributor,proof,DISTRIBUTIONS[1].root))});
test('HEX rewards include credited-but-uncollected rewards with integer precision and reject inconsistent debt',()=>{assert.equal(calculateHexRewards(1n*S,0n,2n*S,1n*S,100n*U,2n*U,1n*U),1n*S+101n*U/2n);assert.throws(()=>calculateHexRewards(S,100n*U,2n*S,0n,0n,0n,0n));assert.throws(()=>calculateHexRewards(S,0n,S,0n,0n,0n,0n));assert.throws(()=>calculateHexRewards(S,0n,2n*S,0n,0n,0n,1n))});
test('HEX registration counts exact capped shares without approval, native value or HEX transfer',async()=>{const rpc=mock({register:true,cap:1n});const q=await hexShareAdapter.prepare(rpc,contributor,hexRequest('register'));const tx=hexShareAbi.parseTransaction({data:q.data});assert.equal(tx.name,'stakeHexShares');assert.equal(tx.args[0],ZeroAddress);assert.equal(q.value,'0x0');assert.equal(q.facts.find(v=>v[0]==='T-shares registered')[1],'2.0');assert.equal(rpc.calls.filter(v=>v[0]==='eth_call'&&hexShareAbi.parseTransaction(v[1][0])?.name==='stakeLists').length,1)});
test('HEX registration rejects existing stake, no shares, self-referral and excessive configured count',async()=>{await assert.rejects(hexShareAdapter.prepare(mock(),contributor,hexRequest('register')),/already/);await assert.rejects(hexShareAdapter.prepare(mock({register:true,count:0n}),contributor,hexRequest('register')),/No HEX/);await assert.rejects(hexShareAdapter.prepare(mock({register:true}),contributor,hexRequest('register',{referral:contributor})),/own wallet/);await assert.rejects(readHexSharePosition(mock({cap:501n}),contributor),/new review/)});
test('HEX preparation rejects unavailable actions before RPC access regardless of destination or wait',async()=>{
  for(const action of ['claim','unregister','recalculate','unknown']) for(const destination of ['wallet','five-year','other']) for(const safeBoundary of [true,false]) {
    const rpc=mock({safeBoundary});
    await assert.rejects(hexShareAdapter.prepare(rpc,contributor,hexRequest(action,{destination})),/Unsupported HEX share action/);
    assert.deepEqual(rpc.calls,[]);
  }
  const rpc=mock({register:true});
  await assert.rejects(hexShareAdapter.prepare(rpc,contributor,{module:'other',action:'register',args:{}}),/Unsupported HEX share action/);
  assert.deepEqual(rpc.calls,[]);
});
test('HEX position reads retain exact wait and destination payout settings',async()=>{
  for(const safeBoundary of [true,false]) {
    const rpc=mock({safeBoundary}),position=await readHexSharePosition(rpc,contributor);
    assert.equal(position.safePeriod,'43200');
    assert.equal(BigInt(position.lastAction)+BigInt(position.safePeriod),BigInt(rpc.timestamp)-(safeBoundary?0n:1n));
    assert.equal(position.gross,String(2n*U));
    assert.equal(position.direct,'50');
    assert.deepEqual(position.destinations.map(row=>[row.id,row.days,row.payout,row.minServe]),miners.map(miner=>[miner.id,miner.durationDays,'10000','86400']));
  }
  await assert.rejects(readHexSharePosition(mock({payout:10001n}),contributor),/new review/);
});
test('changed chain, token, bytecode, root, rejected proof and reorg block readers',async()=>{for(const options of[{chain:'0x1'},{token:ZeroAddress},{code:true},{reorg:true}])await assert.rejects(readHexSharePosition(mock(options),contributor));for(const options of[{root:'0x'+'00'.repeat(32)},{valid:false},{reorg:true}])await assert.rejects(readDistribution(mock(options),'contributors',contributor,data.distributions.contributors.entries[contributor]))});
test('distribution claims use exact 18-decimal allocation and do not spend native or ERC20 balance',async()=>{const request=claimRequest('contributors','wallet','1.000000000000000001');const q=await distributionAdapter.prepare(mock(),contributor,request),tx=distributionAbi.parseTransaction({data:q.data});assert.equal(tx.name,'claimAirdrop');assert.equal(tx.args[0],U+1n);assert.equal(tx.args[1],BigInt(data.distributions.contributors.entries[contributor].amount));assert.equal(tx.args[2],getAddress(contributor));assert.equal(q.value,'0x0');assert.equal(q.facts.find(v=>v[0]==='OINK received')[1],'0.8')});
test('contributor credit must cover gross amount; reward distribution only spends net payout',async()=>{await assert.rejects(distributionAdapter.prepare(mock({credit:8n*U/10n}),contributor,claimRequest()),/insufficient reward credit/);const q=await distributionAdapter.prepare(mock({credit:25n*U/1000n}),rewardAccount,claimRequest('rewards'));assert.equal(q.facts.find(v=>v[0]==='OINK received')[1],'0.025');assert.ok(q.warnings.some(v=>v.includes('elapsed')))});
test('distribution claims enforce proof allocation, valid amount and destination',async()=>{await assert.rejects(distributionAdapter.prepare(mock(),contributor,claimRequest('contributors','wallet','0')),/greater|positive/);await assert.rejects(distributionAdapter.prepare(mock({redeemed:BigInt(data.distributions.contributors.entries[contributor].amount)}),contributor,claimRequest()),/exceeds/);await assert.rejects(distributionAdapter.prepare(mock(),contributor,claimRequest('contributors','bogus')),/supported/);await assert.rejects(distributionAdapter.prepare(mock(),contributor,claimRequest('contributors','wallet','0.0000000000000000001')),/decimal|precision/)});
for(const miner of miners)test('distribution '+miner.id+' validates miner + voting-credit dependencies and encodes the destination',async()=>{const q=await distributionAdapter.prepare(mock(),contributor,claimRequest('contributors',miner.id));assert.equal(distributionAbi.parseTransaction({data:q.data}).args[2],getAddress(miner.address));assert.equal(q.facts.find(v=>v[0]==='Mandatory service')[1],'0 days')});
test('HEX receipts require the exact sender, action event, registered shares and saved reward floor',async()=>{
  const request=hexRequest('register'),q=await hexShareAdapter.prepare(mock({register:true}),contributor,request),r=review(q,request);
  const good=receiptLog(hexShareAbi,'Deposit',h.address,[contributor,5n*S,123n,ZeroAddress]);
  assert.equal(await hexShareAdapter.verify(mock(),r,receipt([good])),true);
  for(const logs of [[],[good,good],
    [receiptLog(hexShareAbi,'Deposit',h.address,[contributor,4n*S,123n,ZeroAddress])],
    [receiptLog(hexShareAbi,'Deposit',h.address,[common.governor,5n*S,123n,ZeroAddress])],
    [receiptLog(hexShareAbi,'Deposit',h.address,[contributor,5n*S,123n,common.governor])],
  ]) assert.equal(await hexShareAdapter.verify(mock(),r,receipt(logs)),false);
  const saved=savedHexReview('claim');
  const claimLogs=(received,penalty)=>[
    receiptLog(hexShareAbi,'Harvest',h.address,[contributor,contributor,received,penalty]),
    receiptLog(hexShareAbi,'Transfer',common.rewardToken,[ZeroAddress,contributor,received]),
    receiptLog(hexShareAbi,'Transfer',common.rewardToken,[ZeroAddress,common.governor,penalty]),
  ];
  assert.equal(await hexShareAdapter.verify(mock(),saved,receipt(claimLogs(U/100n,199n*U/100n))),true);
  const reducedGross=2n*U-200n,reducedPayout=reducedGross*50n/10000n;
  assert.equal(await hexShareAdapter.verify(mock(),saved,receipt(claimLogs(reducedPayout,reducedGross-reducedPayout))),false);
});
test('distribution wallet receipts require claim event and matching minted payout',async()=>{const request=claimRequest(),q=await distributionAdapter.prepare(mock(),contributor,request),r=review(q,request),spec=DISTRIBUTIONS[0];const event=receiptLog(distributionAbi,'RedeemCredit',spec.address,[U,contributor,contributor]),mint=receiptLog(distributionAbi,'Transfer',common.rewardToken,[ZeroAddress,contributor,8n*U/10n]);assert.equal(await distributionAdapter.verify(mock(),r,receipt([event,mint])),true);assert.equal(await distributionAdapter.verify(mock(),r,receipt([event])),false);assert.equal(await distributionAdapter.verify(mock(),r,receipt([event,mint,event])),false)});
test('locked distribution receipts require mint, burn, gifted miner and voting credit',async()=>{const request=claimRequest('contributors','five-year'),q=await distributionAdapter.prepare(mock(),contributor,request),r=review(q,request),spec=DISTRIBUTIONS[0],miner=miners[5];const logs=[receiptLog(distributionAbi,'RedeemCredit',spec.address,[U,contributor,miner.address]),receiptLog(distributionAbi,'Transfer',common.rewardToken,[ZeroAddress,spec.address,U]),receiptLog(distributionAbi,'Transfer',common.rewardToken,[spec.address,ZeroAddress,U]),receiptLog(distributionAbi,'GiftDeposit',miner.address,[spec.address,contributor,U,U,1n]),receiptLog(distributionAbi,'AddCredit',PARTICIPATION_CONTRACTS.credit.address,[contributor,U])];assert.equal(await distributionAdapter.verify(mock(),r,receipt(logs)),true);for(let i=0;i<logs.length;i++)assert.equal(await distributionAdapter.verify(mock(),r,receipt(logs.filter((_,index)=>index!==i))),false)});


test('saved HEX claim and unregister receipts verify complete wallet mint and Governor deduction',async()=>{
  for(const action of ['claim','unregister']) {
    const r=savedHexReview(action);
    const args=action==='claim'?[contributor,contributor,U/100n,199n*U/100n]:[contributor,U/100n,199n*U/100n];
    const logs=[receiptLog(hexShareAbi,action==='claim'?'Harvest':'Withdraw',h.address,args),receiptLog(hexShareAbi,'Transfer',common.rewardToken,[ZeroAddress,contributor,U/100n]),receiptLog(hexShareAbi,'Transfer',common.rewardToken,[ZeroAddress,common.governor,199n*U/100n])];
    assert.equal(await hexShareAdapter.verify(mock(),r,receipt(logs)),true);
    for(let i=0;i<logs.length;i++) assert.equal(await hexShareAdapter.verify(mock(),r,receipt(logs.filter((_,n)=>n!==i))),false);
  }
});
test('saved HEX miner receipts verify exact payout, burn and recipient of gifted shares',async()=>{
  for(const action of ['claim','unregister']) {
    const r=savedHexReview(action,'five-year'),miner=miners[5];
    const args=action==='claim'?[contributor,miner.address,2n*U,0n]:[contributor,2n*U,0n];
    const logs=[receiptLog(hexShareAbi,action==='claim'?'Harvest':'Withdraw',h.address,args),receiptLog(hexShareAbi,'Transfer',common.rewardToken,[ZeroAddress,h.address,2n*U]),receiptLog(hexShareAbi,'Transfer',common.rewardToken,[h.address,ZeroAddress,2n*U]),receiptLog(hexShareAbi,'GiftDeposit',miner.address,[h.address,contributor,2n*U,U,1n])];
    assert.equal(await hexShareAdapter.verify(mock(),r,receipt(logs)),true);
    for(let i=0;i<logs.length;i++) assert.equal(await hexShareAdapter.verify(mock(),r,receipt(logs.filter((_,n)=>n!==i))),false);
    const wrongRecipient=receiptLog(hexShareAbi,'GiftDeposit',miner.address,[h.address,common.governor,2n*U,U,1n]);
    assert.equal(await hexShareAdapter.verify(mock(),r,receipt([...logs.slice(0,3),wrongRecipient])),false);
  }
});
