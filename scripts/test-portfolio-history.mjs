import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEther } from 'ethers';
import { portfolioMinerEvents as miners, portfolioFarmEvents as farms, decodeWalletActivity as decode, mergeWalletActivity, cumulativeHistory } from '../src/lib/portfolioHistoryModel.ts';
const account='0x'+'1'.repeat(40), other='0x'+'2'.repeat(40), contract='0x'+'3'.repeat(40);
const source={address:contract,id:'test',label:'Test miner',kind:'miners',decimals:18,symbol:'OINK'};
function log(abi,name,args,index=0) { const encoded=abi.encodeEventLog(abi.getEvent(name),args); return { address:contract, ...encoded,topics:[...encoded.topics,null],transactionHash:'0x'+'a'.repeat(64),blockNumber:'0x10',logIndex:'0x'+index.toString(16),timeStamp:'0x65000000' }; }
test('history rejects unrelated wallets, emitters, removed logs and invalid dates',()=>{
 const entry=log(miners,'Deposit',[account,parseEther('10'),1n,1n]);
 assert.equal(decode(entry,source,other),null);
 assert.equal(decode({...entry,address:other},source,account),null);
 assert.equal(decode({...entry,removed:true},source,account),null);
 assert.equal(decode({...entry,timeStamp:'0x0'},source,account),null);
});
test('gifts count only for the recipient deposit total and duplicate indexed matches count once',()=>{
 const entry=log(miners,'GiftDeposit',[other,account,parseEther('10'),1n,1n]);
 const received=decode(entry,source,account), sent=decode(entry,source,other);
 assert.equal(received.deposited,'10.0'); assert.equal(sent.deposited,'0');
 assert.equal(mergeWalletActivity([received,received]).length,1);
 assert.equal(cumulativeHistory([received,received],'deposited')[0].value,parseEther('10').toString());
});
test('upgrades and extensions do not duplicate deposited principal',()=>{
 assert.equal(decode(log(miners,'HopDeposit',[account,parseEther('10'),1n,1n,1n]),source,account).deposited,'0');
 assert.equal(decode(log(miners,'AddAndExtendStake',[other,account,parseEther('10'),0n,1n,1n]),source,account).deposited,'0');
});
test('farm withdrawals never classify the asset principal slot as an OINK penalty',()=>{
 const row=decode(log(farms,'Withdraw',[account,0n,parseEther('2'),parseEther('100')]),{...source,kind:'farms'},account);
 assert.equal(row.harvested,'2.0'); assert.equal(row.penalty,'0'); assert.equal(row.withdrawn,'0');
});
test('cumulative history orders events and preserves wei precision',()=>{
 const first=decode(log(miners,'Deposit',[account,parseEther('9007199254740993'),1n,1n],0),source,account);
 const second=decode(log(miners,'Deposit',[account,1n,1n,1n],1),source,account);
 assert.equal(cumulativeHistory([second,first],'deposited').at(-1).value,(parseEther('9007199254740993')+1n).toString());
});
