import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, ZeroAddress, keccak256, parseEther, toQuantity } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { SENATE_ACTION_ABI, CONSENSUS_ACTION_ABI, SENATE_PIN, TREASURY_PIN } = await import('../src/config/advancedGovernanceVerification.ts');
const { PARTICIPATION_CONTRACTS } = await import('../src/config/participationVerification.ts');
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { participationAbi } = await import('../src/lib/participationTransactions.ts');
const { prepareAdvancedGovernance, advancedGovernanceAdapter, treasuryApprovalPasses, governorVetoPasses } = await import('../src/lib/advancedGovernanceActions.ts');
const common=VERIFIED_FARM_WRITES[0], {consensus,credit}=PARTICIPATION_CONTRACTS;
const wallet='0x1111111111111111111111111111111111111111', candidate='0x2222222222222222222222222222222222222222', code='0x60016000', hash='0x'+'a'.repeat(64);
for(const pin of [consensus,credit,SENATE_PIN,TREASURY_PIN])pin.runtimeCodeHash=keccak256(code);
for(const key of ['governorRuntimeCodeHash','masterchefRuntimeCodeHash','rewardTokenRuntimeCodeHash'])common[key]=keccak256(code);
const senate=new Interface(SENATE_ACTION_ABI), con=new Interface(CONSENSUS_ACTION_ABI);
const extra=new Interface([
 ...['senateContract','treasuryWallet','eligibleNewGovernor','feeAddress','devaddr'].map(n=>`function ${n}() view returns(address)`),
 ...['costToVote','delayBeforeEnforce','newGovernorRequestBlock','newGovernorBlockDelay'].map(n=>`function ${n}() view returns(uint256)`),
 'function changeGovernorActivated() view returns(bool)','function deductingContract(address) view returns(bool)','function decimals() view returns(uint8)',
 'function governorRejected()', 'event EnforceGovernor(address indexed newGovernor,address indexed enforcer)',
 'event ExecuteTransaction(address indexed token,address indexed receiver,uint256 value)','event Transfer(address indexed from,address indexed to,uint256 value)',
]);
function fixture(o={}) {
 const now=BigInt(Math.floor(Date.now()/1000));
 const rpc={async send(method,params){
  if(method==='eth_chainId')return o.chain??'0x171';
  if(method==='eth_getBlockByNumber')return{number:'0x64',timestamp:toQuantity(now),hash:o.reorg&&params[0]!=='latest'?'0x'+'b'.repeat(64):hash};
  if(method==='eth_getCode')return o.badCode?'0x6002':code;
  if(method==='eth_getBalance')return toQuantity(parseEther('100'));
  assert.equal(method,'eth_call');assert.equal(params[1],'0x64');
  const tx=params[0];let abi,p;
  for(const it of [senate,con,extra,participationAbi]){try{const parsed=it.parseTransaction(tx);if(parsed){abi=it;p=parsed;break}}catch{}}
  assert.ok(p,tx.data);let value;const name=p.name;
  if(name==='owner'&&tx.to===TREASURY_PIN.address)throw Error('Treasury has no owner getter; authority follows token.governor');
  if(name==='owner')value=tx.to===common.rewardToken?common.masterchef:tx.to===common.masterchef&&o.enforced?candidate:common.governor;
  else if(name==='token'||name==='dtx')value=common.rewardToken;
  else if(name==='governor')value=common.governor;
  else if(name==='masterchef')value=common.masterchef;
  else if(name==='creditContract')value=credit.address;
  else if(name==='consensusContract')value=consensus.address;
  else if(name==='senateContract')value=SENATE_PIN.address;
  else if(name==='treasuryWallet')value=TREASURY_PIN.address;
  else if(['trustedContract','deductingContract','creditingContract'].includes(name))value=!o.permission;
  else if(name==='costToVote')value=parseEther('1');
  else if(name==='delayBeforeEnforce')value=100n;
  else if(name==='userCredit')value=o.credit??parseEther('1000');
  else if(name==='balanceOf')value=parseEther('100');
  else if(name==='decimals')value=18;
  else if(name==='proposalLengths')return abi.encodeFunctionResult(name,[1n,5n]);
  else if(name==='consensusProposal')return abi.encodeFunctionResult(name,[o.kind==='governor'?0:1,o.kind==='governor'?candidate:consensus.address,o.proposedAt??1n]);
  else if(name==='treasuryProposal')return abi.encodeFunctionResult(name,[!o.closed, o.open?now:1n,parseEther('100'),o.creditNo??0n,0n,o.token??ZeroAddress,candidate,parseEther('1'),1n]);
  else if(name==='tokensCastedPerVote')value=p.args[0]%2n===1n?(o.yes??300n):(o.no??0n);
  else if(name==='totalDTXStaked')value=1000n;
  else if(name==='highestConsensusVotes')value=0n;
  else if(name==='isGovInvalidated')return abi.encodeFunctionResult(name,[!!o.invalidated,!!o.passed]);
  else if(name==='changeGovernorActivated')value=!!o.active;
  else if(name==='eligibleNewGovernor'||name==='feeAddress'||name==='devaddr')value=candidate;
  else if(name==='newGovernorRequestBlock')value=o.requestBlock??1n;
  else if(name==='newGovernorBlockDelay')value=10n;
  else if(name==='multiCall'){const members=o.members??[wallet];return abi.encodeFunctionResult(name,[members,members.map(()=>o.ballots??[]),members.map(()=>0n),o.reward??100n,members.map(()=>0n)]);}
  else if(name==='isSenator')value=(o.members??[wallet]).includes(p.args[0]);
  else if(name==='addedSenator')value=!!o.added||(o.members??[wallet]).includes(p.args[0]);
  else if(name==='maxSenators')value=100n;
  else if(name==='minSenators')value=0n;
  else if(name==='votesForProposal')value=o.votes??1n;
  else throw Error('Missing fixture '+name);
  return abi.encodeFunctionResult(name,[value]);
 }};return {rpc,o};
}
const req=(action,args={})=>({module:'advanced-governance',action,args:{id:'0',kind:'treasury',candidate,token:ZeroAddress,recipient:candidate,amount:'1',credit:'100',delay:'0',outcome:'add',ballot:'99',...args}});
const review=async(f,r)=>{const quote=await prepareAdvancedGovernance(f.rpc,wallet,r);return{request:r,quote,transaction:{to:quote.to,data:quote.data}};};
const event=(abi,to,name,values)=>({...abi.encodeEventLog(abi.getEvent(name),values),address:to});
test('treasury percentage boundaries follow Solidity truncation',()=>{
 assert.equal(treasuryApprovalPasses(1n,1n,150n,48n,1000n),true);
 assert.equal(treasuryApprovalPasses(1n,1n,150n,49n,1000n),false);
 assert.equal(treasuryApprovalPasses(0n,1n,300n,0n,1000n),false);
 assert.equal(treasuryApprovalPasses(1n,0n,0n,0n,0n),false);
 assert.equal(governorVetoPasses('ratio',101n,20n,1000n),true);
 assert.equal(governorVetoPasses('total',101n,249n,1000n),false);
});
for(const [action,args,opts,method] of [
 ['treasury-create',{}, {},'initiateTreasuryTransferProposal'],
 ['treasury-support',{}, {open:true},'voteTreasuryTransferProposalY'],
 ['treasury-oppose',{}, {open:true},'voteTreasuryTransferProposalN'],
 ['treasury-veto',{}, {open:true,creditNo:parseEther('101')},'vetoTreasuryTransferProposal'],
 ['treasury-kill',{}, {no:150n},'killTreasuryTransferProposal'],
 ['treasury-approve',{}, {},'approveTreasuryTransfer'],
 ['treasury-close',{}, {no:100n},'approveTreasuryTransfer'],
 ['senate-vote',{}, {},'vote'],['senate-remove-vote',{}, {ballots:[99n]},'removeVote'],
 ['senate-veto',{}, {},'vetoProposal'],['senate-membership-vote',{}, {},'vote'],['senate-add',{}, {},'expandSenate'],
 ['senate-expel',{candidate:wallet}, {},'expellSenator'],['senate-replace',{}, {},'selfReplaceSenator'],['senate-credit',{}, {},'grantVotingCredit'],
 ['governor-propose',{}, {kind:'governor'},'proposeGovernor'],['governor-activate',{id:'1'}, {kind:'governor'},'changeGovernor'],
 ['governor-reject-first',{id:'1'}, {kind:'governor',no:100n},'changeGovernor'],
 ['governor-veto',{id:'1'}, {kind:'governor',passed:true,active:true,no:60n},'vetoGovernor'],
 ['governor-veto-total',{id:'1'}, {kind:'governor',no:250n},'vetoGovernor2'],
 ['governor-enforce',{id:'1'}, {kind:'governor',passed:true,active:true},'enforceGovernor'],
 ['governor-clear',{}, {kind:'governor',invalidated:true,active:true},'governorRejected'],
]) test(action+' prepares the verified call',async()=>{
 const f=fixture(opts),q=await prepareAdvancedGovernance(f.rpc,wallet,req(action,args));
 const abi=action.startsWith('senate-')?senate:action==='governor-clear'?extra:con;
 assert.equal(abi.parseTransaction({data:q.data}).name,method);
 if(action==='governor-veto')assert.equal(con.parseTransaction({data:q.data}).args[1],true);
 if(action==='governor-veto-total')assert.equal(con.parseTransaction({data:q.data}).args[1],false);
});
for(const [action,args,opts,pattern] of [
 ['senate-vote',{}, {members:[]},/Only a current/],['senate-vote',{}, {ballots:[1n]},/already voted/],
 ['senate-veto',{}, {votes:0n},/more than half/],['senate-remove-vote',{}, {ballots:[98n]},/not recorded/],
 ['senate-replace',{}, {ballots:[1n]},/Replacing your seat/],['senate-add',{}, {added:true},/eligibility/],
 ['senate-credit',{}, {reward:0n},/No distributable/],['treasury-approve',{}, {no:100n},/would be rejected/],
 ['treasury-close',{}, {},/would transfer/],['treasury-support',{}, {},/voting is closed/],
 ['treasury-create',{credit:'99'}, {},/100 times/],['governor-propose',{}, {credit:0n},/sufficient voting credit/],
 ['governor-veto',{id:'1'}, {kind:'governor',passed:true,no:59n},/threshold/],
 ['governor-veto-total',{id:'1'}, {kind:'governor',no:249n},/threshold/],
 ['governor-enforce',{id:'1'}, {kind:'governor',passed:true,active:true,requestBlock:90n},/waiting period/],
 ['governor-activate',{id:'1'}, {kind:'governor',no:100n},/thresholds/],
 ['senate-vote',{}, {reorg:true},/block changed/],['senate-vote',{}, {badCode:true},/runtime/],
]) test(action+' rejects '+pattern,async()=>assert.rejects(prepareAdvancedGovernance(fixture(opts).rpc,wallet,req(action,args)),pattern));
test('treasury success alone cannot confirm a token that returned false',async()=>{
 const f=fixture({token:common.rewardToken}),r=await review(f,req('treasury-approve'));f.o.closed=true;
 const logs=[event(con,consensus.address,'TreasuryEnforce',[0,wallet,true])];
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),false);
 logs.push(event(extra,common.rewardToken,'Transfer',[TREASURY_PIN.address,candidate,parseEther('1')]));
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),true);
 logs[0]=event(con,consensus.address,'TreasuryEnforce',[0,wallet,false]);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),false);
});
test('native treasury transfer verifies indexed treasury event',async()=>{
 const f=fixture(),r=await review(f,req('treasury-approve'));f.o.closed=true;
 const logs=[event(con,consensus.address,'TreasuryEnforce',[0,wallet,true]),event(extra,TREASURY_PIN.address,'ExecuteTransaction',[ZeroAddress,candidate,parseEther('1')])];
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),true);
});
test('Governor silent no-op cannot pass receipt verification',async()=>{
 const f=fixture({kind:'governor',passed:true,no:60n}),r=await review(f,req('governor-veto',{id:'1'}));
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[]}),false);
 f.o.invalidated=true;
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[event(con,consensus.address,'ChangeGovernor',[1,wallet,false])]}),true);
});
test('Governor finalization checks indexed event, three authorities and token transfer',async()=>{
 const f=fixture({kind:'governor',passed:true,active:true}),r=await review(f,req('governor-enforce',{id:'1'}));f.o.enforced=true;
 const logs=[event(extra,common.governor,'EnforceGovernor',[candidate,consensus.address]),event(extra,common.rewardToken,'Transfer',[common.governor,candidate,parseEther('100')])];
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),true);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:logs.slice(0,1)}),false);
 f.o.enforced=false;
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs}),false);
});
test('create receipts require both exact terms and actual credit deduction',async()=>{
 const deduct=new Interface(['event DeductCredit(address indexed from,uint256 amount)']);
 for(const action of ['treasury-create','governor-propose']){
  const f=fixture(),r=await review(f,req(action));
  const created=action==='treasury-create'?event(con,consensus.address,'TreasuryProposal',[0,parseEther('100'),ZeroAddress,candidate,parseEther('1'),1,wallet,0]):event(con,consensus.address,'ProposeGovernor',[1,candidate,wallet]);
  const spent=event(deduct,credit.address,'DeductCredit',[wallet,parseEther('100')]);
  assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[created]}),false);
  assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[created,spent]}),true);
  spent.removed=true;assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[created,spent]}),false);
 }
});
test('Senate membership replacement and distributions need every recipient event',async()=>{
 const f=fixture(),r=await review(f,req('senate-replace'));
 const added=event(senate,SENATE_PIN.address,'AddSenator',[candidate]),removed=event(senate,SENATE_PIN.address,'RemoveSenator',[wallet]);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[added]}),false);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,r,{blockNumber:'0x64',logs:[added,removed]}),true);
 const reward=await review(f,req('senate-credit')),creditAbi=new Interface(['event AddCredit(address indexed depositor,uint256 amount)']);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,reward,{blockNumber:'0x64',logs:[event(creditAbi,credit.address,'AddCredit',[candidate,100])]}),false);
 assert.equal(await advancedGovernanceAdapter.verify(f.rpc,reward,{blockNumber:'0x64',logs:[event(creditAbi,credit.address,'AddCredit',[wallet,100])]}),true);
});
