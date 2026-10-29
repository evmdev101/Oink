import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUnits, MaxUint256, formatUnits } from 'ethers';
import { farmQuickAmount } from '../src/lib/farmQuickAmounts.ts';

const now=2_000_000_000_000;
const account='0x1111111111111111111111111111111111111111';
const token='0x2222222222222222222222222222222222222222';
const farm='0x3333333333333333333333333333333333333333';
const session={account,chainId:369n};
const spec={address:farm,tokenAddress:token,decimals:8};
const snapshot={balance:'123.12345679',account,timestamp:now/1000-10,farmAddress:farm,tokenAddress:token,decimals:8};
const read=(percent,changed={},wallet=session,asset=spec,at=now)=>farmQuickAmount(percent,{...snapshot,...changed},wallet,asset,at);

test('quick amounts use exact integer units and floor eight-decimal HEX fractions',()=>{
  const balance=parseUnits(snapshot.balance,8);
  for(const percent of [25,50,75,100]){
    const amount=parseUnits(read(percent),8);
    assert.equal(amount,balance*BigInt(percent)/100n);
    assert.ok(amount<=balance);
    assert.ok((balance*BigInt(percent)-amount*100n)<100n);
  }
  assert.equal(read(25),'30.78086419');
  assert.equal(read(100),'123.12345679');
});

test('six- and eighteen-decimal discovered assets never pass through floating point',()=>{
  for(const decimals of [6,18]){
    const balance='987654321098765432109.123456';
    const raw=parseUnits(balance,decimals);
    for(const percent of [25,50,75,100]){
      const result=read(percent,{balance,decimals},session,{...spec,decimals});
      assert.equal(parseUnits(result,decimals),raw*BigInt(percent)/100n);
    }
  }
  const largest=formatUnits(MaxUint256,18);
  assert.equal(parseUnits(read(100,{balance:largest,decimals:18},session,{...spec,decimals:18}),18),MaxUint256);
});

test('wrong wallet, wrong chain, stale and future snapshots cannot fill an amount',()=>{
  assert.equal(read(100,{}, {...session,account:token}),null);
  assert.equal(read(100,{}, {...session,account:null}),null);
  assert.equal(read(100,{}, {...session,chainId:1n}),null);
  assert.equal(read(100,{}, {...session,chainId:null}),null);
  assert.equal(read(100,{timestamp:now/1000-120}),null);
  assert.equal(read(100,{timestamp:now/1000+1}),null);
  assert.equal(read(100,{timestamp:NaN}),null);
  assert.equal(read(100,{timestamp:now/1000-119}),snapshot.balance);
});

test('native PLS and changed token, farm or precision never reuse a token balance',()=>{
  assert.equal(read(100,{},session,{...spec,tokenAddress:null}),null);
  assert.equal(read(100,{tokenAddress:null}),null);
  assert.equal(read(100,{tokenAddress:account}),null);
  assert.equal(read(100,{farmAddress:account}),null);
  assert.equal(read(100,{decimals:18}),null);
  assert.equal(farmQuickAmount(100,snapshot,session,undefined,now),null);
});

test('zero, invalid, excessive precision and zero-rounded percentages remain disabled',()=>{
  for(const balance of ['0','bad','1e3','-1','1.000000001',formatUnits(MaxUint256+1n,8)])assert.equal(read(100,{balance}),null);
  assert.equal(read(25,{balance:'0.00000001'}),null);
  assert.equal(read(100,{balance:'0.00000001'}),'0.00000001');
  assert.equal(read(101),null);assert.equal(read(20),null);
});
