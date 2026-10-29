import {registerHooks} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {Interface,parseEther,toQuantity} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const url='http://127.0.0.1:8547';
try{await fetch(url,{signal:AbortSignal.timeout(500)});throw Error('Fork port is already in use.');}catch(e){if(e.message==='Fork port is already in use.')throw e;}
const child=spawn('evidence/local-tools/anvil.exe',['--host','127.0.0.1','--port','8547','--fork-url','https://rpc.pulsechain.com','--chain-id','369','--silent'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',d=>logs+=d);child.stderr.on('data',d=>logs+=d);
let id=0;const rpc={async send(method,params){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++id,method,params}),signal:AbortSignal.timeout(60000)});const v=await r.json();if(v.error)throw Error(method+': '+JSON.stringify(v.error));return v.result}};
const receipt=async hash=>{for(let i=0;i<100;i++){const r=await rpc.send('eth_getTransactionReceipt',[hash]);if(r)return r;await new Promise(r=>setTimeout(r,100));}throw Error('Receipt timeout');};
const originalNow=Date.now;const results=[];
try{
 for(let i=0;i<60;i++){try{if((await rpc.send('web3_clientVersion',[])).toLowerCase().includes('anvil'))break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.match(await rpc.send('web3_clientVersion',[]),/anvil/i);assert.equal(await rpc.send('eth_chainId',[]),'0x171');
 const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
 const {ORDINARY_DEPLOYMENTS}=await import('../src/config/ordinaryGovernanceVerification.ts');
 const {prepareProtocolTransaction,verifyProtocolReceipt}=await import('../src/lib/protocolTransactions.ts');
 const {ordinaryProposalAdapter,ORDINARY_MODELS}=await import('../src/lib/ordinaryProposalActions.ts');
 const {participationAdapter}=await import('../src/lib/participationTransactions.ts');
 const {rewardMaintenanceAdapter}=await import('../src/lib/rewardMaintenanceActions.ts');
 const common=VERIFIED_FARM_WRITES[0],account=(await rpc.send('eth_accounts',[]))[0];
 const sync=async()=>{const b=await rpc.send('eth_getBlockByNumber',['latest',false]);Date.now=()=>Number(BigInt(b.timestamp))*1000;return b;};
 const tx=async(from,to,data)=>{assert.match(await rpc.send('web3_clientVersion',[]),/anvil/i);const hash=await rpc.send('eth_sendTransaction',[{from,to,data,gas:'0x989680'}]);const r=await receipt(hash);assert.equal(r.status,'0x1');return r;};
 await rpc.send('anvil_setBalance',[account,toQuantity(parseEther('1000000000'))]);
 const token=new Interface(['function mint(address,uint256)']);
 await rpc.send('anvil_impersonateAccount',[common.masterchef]);await rpc.send('anvil_setBalance',[common.masterchef,toQuantity(parseEther('1000000000'))]);
 await tx(common.masterchef,common.rewardToken,token.encodeFunctionData('mint',[account,parseEther('1000000')]));
 await rpc.send('anvil_stopImpersonatingAccount',[common.masterchef]);
 async function action(request,adapter){await sync();const review=await prepareProtocolTransaction(rpc,account,request,adapter);assert.match(await rpc.send('web3_clientVersion',[]),/anvil/i);const hash=await rpc.send('eth_sendTransaction',[review.transaction]);await receipt(hash);const result=await verifyProtocolReceipt(rpc,review,hash,adapter);assert.equal(result.state,'confirmed',JSON.stringify(result));results.push({action:request.action,family:request.args.family??request.module,hash,verified:true});console.log('PASS',request.action,request.args.family??request.module);return await rpc.send('eth_getTransactionReceipt',[hash]);}
 await action({module:'participation',action:'credit-deposit',args:{amount:'500000'}},participationAdapter);
 const create=async(family,args)=>{const created=await action({module:'ordinary',action:'create',args:{family,credit:'1000',delay:'0',...args}},ordinaryProposalAdapter);const m=ORDINARY_MODELS[family],abi=new Interface(ORDINARY_DEPLOYMENTS[m.deployment].abi);const event=created.logs.filter(l=>l.address.toLowerCase()===ORDINARY_DEPLOYMENTS[m.deployment].address.toLowerCase()).map(l=>{try{return abi.parseLog(l)}catch{return null}}).find(e=>e?.name===m.event);console.log('created',family,event?.args.toArray().map(String));return String(event.args[0]);};
 const vote=(family,id,actionName,credit='1')=>action({module:'ordinary',action:actionName,args:{family,id,credit}},ordinaryProposalAdapter);
 const advance=async(seconds)=>{await rpc.send('evm_increaseTime',[seconds]);await rpc.send('evm_mine',[]);await sync();};
 const first=await create('Voting cost',{value:'100'});await vote('Voting cost',first,'support');await advance(1209601);await vote('Voting cost',first,'execute');
 const rejected=await create('Voting cost',{value:'100'});await vote('Voting cost',rejected,'oppose','2000');await advance(2);await vote('Voting cost',rejected,'veto');
 await sync();const start=Math.floor(Date.now()/1000)+2500000;
 const boost=await create('Reward boost',{value:'1000',duration:'100',start:String(start)});await advance(2500001);await vote('Reward boost',boost,'execute');await rpc.send('anvil_mine',['0x65']);await action({module:'reward-maintenance',action:'end',args:{}},rewardMaintenanceAdapter);
 await fs.writeFile('evidence/governance-local-fork.json',JSON.stringify({localOnly:true,endpoint:url,fixtures:'Local impersonation of token owner to mint test OINK. No public-network transactions.',results},null,2));
}finally{Date.now=originalNow;child.kill();await fs.writeFile('evidence/governance-local-fork-anvil.log',logs);}
