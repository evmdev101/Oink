import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, toQuantity, zeroPadValue } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { readTreasuryInflows } = await import('../src/lib/treasuryInflows.ts');
const { inflowWindowSummary } = await import('../src/lib/dashboardStats.ts');
const { OINK_TOKEN, TREASURY_WALLET } = await import('../src/config/contracts.ts');
const abi = new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)']);
const sender = '0x1111111111111111111111111111111111111111';
const head = 300000, now = Math.floor(Date.now()/1000), month = 30*86400;
const hash = (number, variant = 0) => '0x' + (BigInt(number) + BigInt(variant)*1000000n).toString(16).padStart(64,'0');
const timestamp = number => now - (head-number)*12;
const block = (number, variant = 0) => ({number:toQuantity(number),timestamp:toQuantity(timestamp(number)),hash:hash(number,variant)});
const transfer = (number, index = 0, overrides = {}) => ({
  ...abi.encodeEventLog(abi.getEvent('Transfer'), [sender, TREASURY_WALLET, 2n*10n**18n]),
  address:OINK_TOKEN,blockNumber:toQuantity(number),blockHash:hash(number),
  transactionHash:hash(number+1000000),logIndex:toQuantity(index),...overrides,
});
function fixture(logs = [], options = {}) {
  const ranges = [];
  const rpc = { async send(method,params) {
    if (method === 'eth_chainId') return toQuantity(options.chain ?? 369);
    if (method === 'eth_getBlockByNumber') {
      const number = params[0] === 'latest' ? options.head ?? head : Number(BigInt(params[0]));
      return options.readBlock?.(number,params[0]) ?? block(number);
    }
    assert.equal(method, 'eth_getLogs');
    const filter = params[0], from = Number(BigInt(filter.fromBlock)), to = Number(BigInt(filter.toBlock));
    assert.equal(filter.topics[0], abi.getEvent('Transfer').topicHash);
    assert.equal(filter.topics[2].toLowerCase(),zeroPadValue(TREASURY_WALLET,32).toLowerCase());
    assert.ok(filter.address.some(address => address.toLowerCase() === OINK_TOKEN.toLowerCase()));
    assert.ok(to-from < 25000);
    ranges.push([from,to]);
    return options.readLogs ? options.readLogs(from,to) : logs.filter(log => Number(BigInt(log.blockNumber)) >= from && Number(BigInt(log.blockNumber)) <= to);
  }};
  return {rpc,ranges};
}

test('inflow reader covers every block in 30 days and timestamps every retained transfer', async () => {
  const atCutoff = head-month/12;
  const {rpc,ranges} = fixture([transfer(head-1),transfer(head-20000),transfer(atCutoff),transfer(atCutoff-1)]);
  const result = await readTreasuryInflows(rpc);
  assert.equal(result.partial,false);
  assert.ok(result.fromTimestamp <= now-month);
  assert.equal(result.toTimestamp,now);
  assert.ok(ranges.length > 1);
  assert.equal(ranges[0][1],head);
  for (let i=1;i<ranges.length;i++) assert.equal(ranges[i][1],ranges[i-1][0]-1);
  assert.deepEqual(result.rows.map(row=>row.block),[head-1,head-20000,atCutoff]);
  assert.ok(result.rows.every(row=>row.timestamp===timestamp(row.block)));
  assert.deepEqual(inflowWindowSummary(result.rows,result,month,now,()=> '3'),{complete:true,count:3,usd:18});
});

test('refresh reads only new blocks, preserves earlier inflows and ignores duplicate logs', async () => {
  const first = await readTreasuryInflows(fixture([transfer(head-100)]).rpc);
  const nextLog = transfer(head+1);
  const next = fixture([nextLog,nextLog],{head:head+2});
  const result = await readTreasuryInflows(next.rpc,first);
  assert.deepEqual(next.ranges,[[head+1,head+2]]);
  assert.deepEqual(result.rows.map(row=>row.block),[head+1,head-100]);
  const unchanged = fixture([],{head:head+2});
  assert.deepEqual((await readTreasuryInflows(unchanged.rpc,result)).rows,result.rows);
  assert.equal(unchanged.ranges.length,0);
});

test('a reorganization discards the saved history and reads the month again', async () => {
  const first = await readTreasuryInflows(fixture([transfer(head-100)]).rpc);
  const next = fixture([transfer(head-50)],{head:head+1,readBlock:number=>block(number,number===head?1:0)});
  const result = await readTreasuryInflows(next.rpc,first);
  assert.ok(next.ranges.length > 1);
  assert.deepEqual(result.rows.map(row=>row.block),[head-50]);
});

test('zero-value and treasury self-transfers do not inflate counts or totals', async () => {
  const zero = transfer(head-2,0,abi.encodeEventLog(abi.getEvent('Transfer'),[sender,TREASURY_WALLET,0n]));
  const self = transfer(head-3,0,abi.encodeEventLog(abi.getEvent('Transfer'),[TREASURY_WALLET,TREASURY_WALLET,10n**18n]));
  const result = await readTreasuryInflows(fixture([transfer(head-1),zero,self]).rpc);
  assert.equal(result.rows.length,1);
  assert.equal(result.rows[0].block,head-1);
});

test('missing ranges and potentially truncated log responses cannot publish a complete month', async () => {
  await assert.rejects(readTreasuryInflows(fixture([],{readLogs:from=>{if(from<head-25000)throw Error('RPC unavailable');return []}}).rpc),/RPC unavailable/);
  await assert.rejects(readTreasuryInflows(fixture([],{readLogs:()=>Array(1000).fill(transfer(head-1))}).rpc),/incomplete/);
});

test('wrong-chain, stale, removed, changed-block and wrong-recipient data fail closed', async () => {
  await assert.rejects(readTreasuryInflows(fixture([],{chain:1}).rpc),/Wrong chain/);
  await assert.rejects(readTreasuryInflows(fixture([],{head:head-100}).rpc),/stale/);
  await assert.rejects(readTreasuryInflows(fixture([transfer(head-1,0,{removed:true})]).rpc),/changed/);
  await assert.rejects(readTreasuryInflows(fixture([transfer(head-1,0,{blockHash:hash(head-1,1)})]).rpc),/block changed/);
  const outgoing = transfer(head-1,0,abi.encodeEventLog(abi.getEvent('Transfer'),[TREASURY_WALLET,sender,10n**18n]));
  await assert.rejects(readTreasuryInflows(fixture([outgoing]).rpc),/Unexpected/);
});

test('a changed snapshot tip and cancellation prevent publishing results', async () => {
  let reads = 0;
  const changed = fixture([],{readBlock:(number)=>block(number,number===head&&++reads>1?1:0)});
  await assert.rejects(readTreasuryInflows(changed.rpc),/snapshot changed/);
  const controller = new AbortController();
  controller.abort();
  const aborted = fixture();
  await assert.rejects(readTreasuryInflows(aborted.rpc,null,controller.signal),{name:'AbortError'});
  assert.equal(aborted.ranges.length,0);
});
