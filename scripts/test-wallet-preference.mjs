import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savedWallet, rememberedChoice } from '../src/lib/walletPreference.ts';
const selected={key:'metamask',identity:'eip6963:io.metamask',account:'0x'+'1'.repeat(40)};
const provider={request(){throw Error('Preference lookup must never query a wallet');}};
const choice={key:'metamask',identity:'eip6963:io.metamask',name:'MetaMask',provider};
test('old provider-only preferences and invalid selections cannot restore a session',()=>{
  for(const input of [null,'metamask','"metamask"','{}','null','{"key":"metamask"}',JSON.stringify({...selected,account:'bad'}),JSON.stringify({...selected,identity:''})]) {
    assert.equal(savedWallet(input),null);
  }
  assert.deepEqual(savedWallet(JSON.stringify(selected)),selected);
});
test('restore requires the exact announced extension, never a same-brand legacy fallback',()=>{
  assert.equal(rememberedChoice([choice],selected),choice);
  assert.equal(rememberedChoice([{...choice,identity:undefined}],selected),null);
  assert.equal(rememberedChoice([{...choice,identity:'eip6963:another.extension'}],selected),null);
  assert.equal(rememberedChoice([{...choice,provider:null}],selected),null);
  assert.equal(rememberedChoice([choice,{...choice,provider:{request(){}}}],selected),null);
  assert.equal(rememberedChoice([choice],null),null);
});
