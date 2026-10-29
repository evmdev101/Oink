import {test}from'node:test';
import assert from'node:assert/strict';
import {registerHooks}from'node:module';
import {Interface,ZeroAddress,formatEther,keccak256,toQuantity}from'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {offerAbi,prepareOffer,verifyOffer}=await import('../src/lib/offerTransactions.ts');
const {OFFER_DEPLOYMENTS,REFERRAL_POINT_VAULTS}=await import('../src/config/offerVerification.ts');
const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const {SALE_ADDRESS,REFERRAL_ADDRESS,OLD_REFERRAL,SALE_DESTINATIONS,referralLink,decodeReferralCode,encodeReferralCode}=await import('../src/lib/miningOffers.ts');
const code='0x6000',hash=keccak256(code),U=10n**18n,account='0x0000000000000000000000000000000000001234',other='0x0000000000000000000000000000000000005678',core=VERIFIED_FARM_WRITES[0];
for(const d of Object.values(OFFER_DEPLOYMENTS))d.runtimeHash=hash;
for(const v of REFERRAL_POINT_VAULTS)v.runtimeHash=hash;
for(const v of VERIFIED_FARM_WRITES){v.runtimeCodeHash=hash;v.tokenRuntimeCodeHash=hash;v.masterchefRuntimeCodeHash=hash;v.governorRuntimeCodeHash=hash;v.rewardTokenRuntimeCodeHash=hash;}
for(const v of MINER_PREVIEW_SPECS)v.runtimeCodeHash=hash;
const lower=v=>v.toLowerCase(),same=(a,b)=>lower(a)===lower(b),WPLS='0xA1077a294dDE1B09bB078844df40758a5D0f9a27';
const balanceAbi=new Interface(['function balanceOf() view returns(uint256)']);
const buy=(asset='PLS',destination='wallet',amount='1')=>({module:'offers',action:'sale',args:{asset,destination,amount}});
const ref=(destination='wallet',points='500')=>({module:'offers',action:'referral',args:{destination,points}});
function mock(opts={}){
 const calls=[],stamp=Math.floor(Date.now()/1000),block={number:'0x500',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(stamp)};let blocks=0;
 const rpc={async send(method,params){calls.push([method,params]);
  if(method==='eth_chainId')return opts.chain??'0x171';
  if(method==='eth_getBlockByNumber'){++blocks;return {...block,hash:opts.reorg&&blocks>1?'0x'+'cd'.repeat(32):block.hash,timestamp:toQuantity(stamp+(opts.age??0))};}
  if(method==='eth_getCode')return opts.badCode&&same(params[0],opts.badCode)?'0x6001':code;
  if(method!=='eth_call')throw Error('Unexpected '+method);
  assert.equal(params[1],block.number,'every adapter read must use snapshot block');
  const tx=params[0],to=tx.to;
  if(tx.data===balanceAbi.encodeFunctionData('balanceOf'))return balanceAbi.encodeFunctionResult('balanceOf',[opts.minerBalance??2n*U]);
  const p=offerAbi.parseTransaction(tx),name=p.name,args=p.args;
  const miner=MINER_PREVIEW_SPECS.find(v=>same(v.address,to)),token=VERIFIED_FARM_WRITES.find(v=>v.tokenAddress&&same(v.tokenAddress,to));
  let out;
  if(name==='approve')return opts.approveResult??offerAbi.encodeFunctionResult(name,[true]);
  if(name==='DTX'||name==='dtx'||name==='token')out=[opts.wrongToken&&same(to,SALE_ADDRESS)?other:core.rewardToken];
  else if(name==='masterchef')out=[core.masterchef];
  else if(name==='owner')out=[same(to,core.rewardToken)?core.masterchef:core.governor];
  else if(name==='governor'||name==='admin'||name==='feeAddress')out=[core.governor];
  else if(name==='treasury')out=[same(to,SALE_ADDRESS)?opts.treasury??core.treasuryWallet:core.governor];
  else if(name==='treasuryWallet')out=[core.treasuryWallet];
  else if(name==='decimals')out=[opts.decimals??token?.decimals??18];
  else if(name==='allowance')out=[opts.allowance??1000n*U];
  else if(name==='balanceOf')out=[same(args[0],SALE_ADDRESS)?opts.inventory??100000n*U:same(args[0],REFERRAL_ADDRESS)?opts.funding??100000n*U:opts.walletBalance??100000n*U];
  else if(name==='poolID')out=[miner.poolId];
  else if(name==='poolInfo')out=[1n,1n,MINER_PREVIEW_SPECS[Number(args[0])].address];
  else if(name==='migrationPool')out=[opts.migration??ZeroAddress];
  else if(name==='withdrawFeePeriod')out=[opts.duration??BigInt(miner.durationDays)*86400n];
  else if(name==='gracePeriod')out=[BigInt(miner.graceDays)*86400n];
  else if(name==='minimumGift')out=[opts.minimumGift??1n];
  else if(name==='totalShares')out=[opts.totalShares??U];
  else if(['token0','token1','getReserves'].includes(name)){
    const pair=Object.entries(OFFER_DEPLOYMENTS).find(([id,v])=>id.endsWith('Pair')&&same(v.address,to))[0];
    const id={oinkPair:null,plsxPair:'plsx',incPair:'inc',hexPair:'hex'}[pair],spec=id?VERIFIED_FARM_WRITES.find(v=>v.id===id):null;
    out=name==='token0'?[opts.pairToken??spec?.tokenAddress??core.rewardToken]:name==='token1'?[WPLS]:[pair==='oinkPair'?opts.oinkReserve??2n*U:10n**BigInt(spec.decimals),opts.plsReserve??U,1n];
  }else if(name==='minimumPrice')out=[100000000000000n];
  else if(name.startsWith('getWith')){
    const symbol=name.slice(7),dec=symbol==='HEX'?8:18,bonus=same(args[1],MINER_PREVIEW_SPECS[5].address)?125n:same(args[1],MINER_PREVIEW_SPECS[4].address)?118n:same(args[1],MINER_PREVIEW_SPECS[3].address)?111n:100n;
    out=[opts.quote??args[0]*10n**BigInt(18-dec)*2n*bonus/100n];
  }else if(name==='oldRewardContract')out=[OLD_REFERRAL];
  else if(name==='viewVaults')out=[opts.vaults??REFERRAL_POINT_VAULTS.map(v=>v.address)];
  else if(name==='totalUserRewards')out=[opts.total??1000n*U];
  else if(name==='amountRedeemed')out=[same(to,OLD_REFERRAL)?opts.legacy??200n*U:opts.current??300n*U];
  else if(name==='referralBonus')out=[opts.bonus??500n];
  else if(name==='viewPoolPayout')out=[same(args[0],account)?opts.walletPoolRate??0n:opts.rate??5000n];
  else if(name==='defaultDirectPayout')out=[opts.rate??100n];
  else if(name==='viewPoolMinServe')out=[opts.serve??10n*86400n];
  else throw Error('Unexpected call '+name);
  return offerAbi.encodeFunctionResult(name,out);
 }};return{rpc,calls,block};
}
test('sale exposes only wallet and destinations that really create a miner',()=>assert.deepEqual(SALE_DESTINATIONS.map(v=>v.id),['wallet','one-year','three-year','five-year']));
for(const asset of ['PLS','PLSX','INC','HEX'])for(const destination of ['wallet','one-year','three-year','five-year'])test(asset+' -> '+destination+' keeps exact payment units and destination',async()=>{
 const m=mock(),r=await prepareOffer(m.rpc,account,buy(asset,destination,'1.00000001')),tx=offerAbi.parseTransaction({data:r.data}),expected=asset==='HEX'?100000001n:1000000010000000000n;
 assert.equal(tx.name,'buyWith'+asset);assert.equal(tx.args[0],expected);assert.equal(tx.args[1],destination==='wallet'?account:MINER_PREVIEW_SPECS.find(v=>v.id===destination).address);
 assert.equal(BigInt(r.value),asset==='PLS'?expected:0n);assert.ok(r.warnings[0].includes('no on-chain minimum'));
 const terms=JSON.parse(r.fingerprint);assert.equal(terms.output,({wallet:'2000000020000000000','one-year':'2220000022200000000','three-year':'2360000023600000000','five-year':'2500000025000000000'})[destination]);
 assert.ok(m.calls.every(([name])=>!name.includes('sendTransaction')));
});
test('HEX excessive precision and unsupported payment or short miner are rejected',async()=>{
 for(const request of [buy('HEX','wallet','0.000000001'),buy('pUSDT'),buy('PLS','one-month')])await assert.rejects(prepareOffer(mock().rpc,account,request));
});
test('wrong network, stale/future, changed source, wiring, pair, quote and reorg are rejected',async()=>{
 for(const options of [{chain:'0x1'},{age:-121},{age:31},{badCode:SALE_ADDRESS},{wrongToken:true},{treasury:other},{pairToken:other},{quote:1n},{reorg:true}])await assert.rejects(prepareOffer(mock(options).rpc,account,buy()));
});
test('insufficient sale inventory, payment balance and allowance block purchases',async()=>{
 await assert.rejects(prepareOffer(mock({inventory:1n}).rpc,account,buy()),/inventory/);
 await assert.rejects(prepareOffer(mock({walletBalance:0n}).rpc,account,buy('PLSX')),/balance/);
 await assert.rejects(prepareOffer(mock({allowance:0n}).rpc,account,buy('HEX')),/Approve/);
 await assert.rejects(prepareOffer(mock({oinkReserve:1n}).rpc,account,buy()),/minimum/);
});
test('exact approval and zero reset cannot silently increase an existing allowance',async()=>{
 const request={...buy('HEX','wallet','1.12345678'),action:'sale-approve'},q=await prepareOffer(mock({allowance:0n}).rpc,account,request),call=offerAbi.parseTransaction({data:q.data});
 assert.equal(call.args[1],112345678n);assert.equal(call.args[0],SALE_ADDRESS);assert.equal(q.value,'0x0');
 await assert.rejects(prepareOffer(mock({allowance:1n}).rpc,account,request),/Reset/);
 const reset=await prepareOffer(mock({allowance:1n,walletBalance:0n}).rpc,account,{...request,action:'sale-reset',args:{...request.args,amount:''}});assert.equal(offerAbi.parseTransaction({data:reset.data}).args[1],0n);
 for(const result of ['0x','0x01','0x'+'0'.repeat(64)])await assert.rejects(prepareOffer(mock({allowance:0n,approveResult:result}).rpc,account,request),/rejected/);
 await assert.rejects(prepareOffer(mock({allowance:0n}).rpc,account,{...request,action:'sale-reset'}),/already zero/);
});
test('referral subtracts both claim contracts before exact bonus and payout math',async()=>{
 const q=await prepareOffer(mock().rpc,account,ref()),t=JSON.parse(q.fingerprint),call=offerAbi.parseTransaction({data:q.data});
 assert.equal(t.points,String(500n*U));assert.equal(t.output,String(U/4n));assert.equal(call.name,'redeemRewards');assert.equal(call.args[0],500n*U);assert.equal(call.args[1],account);
 assert.ok(q.warnings[0].includes('permanently consumed'));
 const locked=await prepareOffer(mock().rpc,account,ref('five-year','123.456789012345678901'));assert.equal(JSON.parse(locked.fingerprint).output,'3086419725308641972');assert.ok(locked.facts.some(([a,b])=>a==='Mandatory service'&&b==='864000 seconds'));
});
test('referral refuses exhausted, inconsistent, zero, underfunded and changed source payouts',async()=>{
 for(const options of [{current:900n*U},{funding:0n},{bonus:10001n},{rate:0n},{vaults:[]},{badCode:REFERRAL_POINT_VAULTS[5].address},{walletPoolRate:1n}])await assert.rejects(prepareOffer(mock(options).rpc,account,ref()));
 await assert.rejects(prepareOffer(mock().rpc,account,ref('wallet','501')),/sufficient/);
 await assert.rejects(prepareOffer(mock({rate:0n}).rpc,account,ref('five-year')),/inactive/);
});
test('gift destination migration, lock changes, minimum and zero shares block funds',async()=>{
 for(const options of [{migration:other},{duration:1n},{minimumGift:1000n*U},{minerBalance:0n},{totalShares:1n,minerBalance:1000000n*U}])await assert.rejects(prepareOffer(mock(options).rpc,account,buy('PLS','five-year')));
});
function log(address,name,args){return{address,...offerAbi.encodeEventLog(offerAbi.getEvent(name),args)};}
const review=(quote,request)=>({quote,request,transaction:{from:account,to:quote.to,data:quote.data,value:quote.value,chainId:'0x171',gas:'0x100'},gasCost:'1',createdAt:Date.now()});
test('wallet purchase receipts require matching BUY and exact transfer effects',async()=>{
 const m=mock(),request=buy(),q=await prepareOffer(m.rpc,account,request),r=review(q,request),receipt={blockNumber:m.block.number,logs:[log(SALE_ADDRESS,'BUY',[account,account,2n*U]),log(core.rewardToken,'Transfer',[SALE_ADDRESS,account,2n*U])]};
 assert.equal(await verifyOffer(m.rpc,r,receipt),true);
 assert.equal(await verifyOffer(m.rpc,r,{...receipt,logs:[receipt.logs[0]]}),false);
  assert.equal(await verifyOffer(m.rpc,r,{...receipt,logs:[log(SALE_ADDRESS,'BUY',[account,account,U]),log(core.rewardToken,'Transfer',[SALE_ADDRESS,account,U])]}),false);
  assert.equal(await verifyOffer(mock({treasury:other}).rpc,r,receipt),false);
});
test('token purchase receipts require exact payment transfer to the reviewed treasury',async()=>{
  const m=mock(),request=buy('HEX'),q=await prepareOffer(m.rpc,account,request),r=review(q,request),token=VERIFIED_FARM_WRITES.find(v=>v.symbol==='HEX').tokenAddress;
  const outputs=[log(SALE_ADDRESS,'BUY',[account,account,2n*U]),log(core.rewardToken,'Transfer',[SALE_ADDRESS,account,2n*U])],payment=(to=core.treasuryWallet,amount=100000000n)=>log(token,'Transfer',[account,to,amount]);
  assert.equal(await verifyOffer(m.rpc,r,{blockNumber:m.block.number,logs:[...outputs,payment()]}),true);
  for(const logs of [outputs,[...outputs,payment(other)],[...outputs,payment(core.treasuryWallet,99999999n)]])assert.equal(await verifyOffer(m.rpc,r,{blockNumber:m.block.number,logs}),false);
});
test('locked referral receipts require matched gift owner, positive shares and exact amount',async()=>{
 const m=mock(),request=ref('five-year'),q=await prepareOffer(m.rpc,account,request),r=review(q,request),amount=BigInt(JSON.parse(q.fingerprint).output),target=MINER_PREVIEW_SPECS[5].address;
 const claim=log(REFERRAL_ADDRESS,'ClaimReferralReward',[account,target,amount]);
 const gift=(owner=account,shares=1n)=>log(target,'GiftDeposit',[REFERRAL_ADDRESS,owner,amount,shares,BigInt(q.timestamp)]);
 assert.equal(await verifyOffer(m.rpc,r,{blockNumber:m.block.number,logs:[claim,gift()]}),true);
 for(const logs of [[claim],[claim,gift(other)],[claim,gift(account,0n)]])assert.equal(await verifyOffer(m.rpc,r,{blockNumber:m.block.number,logs}),false);
});
test('approval receipts require the exact spender and allowance',async()=>{
 const m=mock({allowance:0n}),request={...buy('HEX'),action:'sale-approve'},q=await prepareOffer(m.rpc,account,request),r=review(q,request);
 const receipt=(spender,amount)=>({blockNumber:m.block.number,logs:[log(q.to,'Approval',[account,spender,amount])]});
 assert.equal(await verifyOffer(m.rpc,r,receipt(SALE_ADDRESS,100000000n)),true);assert.equal(await verifyOffer(m.rpc,r,receipt(other,100000000n)),false);assert.equal(await verifyOffer(m.rpc,r,receipt(SALE_ADDRESS,100000001n)),false);
});
test('referral links remain on the current deployment, preserve subpaths and roundtrip exactly',()=>{
 for(const a of [account,'0x0000000000000000000000000000000000000001',core.rewardToken]){const url=new URL(referralLink(a,'https://example.com/new-oink/?junk=old#/miners'));assert.equal(url.origin,'https://example.com');assert.equal(url.pathname,'/new-oink/');assert.equal(url.hash,'');assert.equal(url.searchParams.size,1);assert.equal(decodeReferralCode(url.searchParams.get('r')),a);}
 for(const code of ['', '0', '1', '1'+encodeReferralCode(account),'z'.repeat(29)])assert.throws(()=>decodeReferralCode(code));
 assert.throws(()=>referralLink(ZeroAddress));assert.throws(()=>referralLink(account,'javascript:alert(1)'));
});
