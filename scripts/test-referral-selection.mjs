import {test}from'node:test';
import assert from'node:assert/strict';
import{registerHooks}from'node:module';
import{ZeroAddress}from'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const{captureReferralLink,readSelectedReferral,saveSelectedReferral,effectiveReferral,REFERRAL_SELECTION_KEY}=await import('../src/lib/referralSelection.ts');
const{encodeReferralCode}=await import('../src/lib/referralCodes.ts');
const account='0x0000000000000000000000000000000000000123',referrer='0x0000000000000000000000000000000000000456',existing='0x0000000000000000000000000000000000000789';
function memory(){const data=new Map();return{data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('a canonical referral link is saved and cleaned without losing subpath, other query or route',()=>{
 const store=memory(),url='https://example.com/oink/?foo=bar&r='+encodeReferralCode(referrer)+'#/farms',result=captureReferralLink(url,store);
 assert.equal(result.captured,true);assert.equal(readSelectedReferral(store),referrer);assert.equal(result.cleanUrl,'https://example.com/oink/?foo=bar#/farms');
 assert.equal(captureReferralLink(result.cleanUrl,store).captured,false);assert.equal(readSelectedReferral(store),referrer);
});
test('clearing persists and an already-cleaned URL cannot reselect the referral',()=>{
 const store=memory(),r=captureReferralLink('https://example.com/?r='+encodeReferralCode(referrer),store);saveSelectedReferral(null,store);assert.equal(readSelectedReferral(store),null);captureReferralLink(r.cleanUrl,store);assert.equal(readSelectedReferral(store),null);
});
test('invalid, ambiguous and overlong referral codes do not replace a saved address',()=>{
 const store=memory();saveSelectedReferral(existing,store);
 for(const query of ['r=','r=0','r=1','r='+encodeReferralCode(referrer)+'&r='+encodeReferralCode(account),'r='+'z'.repeat(29)]){assert.throws(()=>captureReferralLink('https://example.com/?'+query,store));assert.equal(readSelectedReferral(store),existing);}
});
test('corrupt, unavailable or silently dropped storage fails visibly',()=>{
 for(const value of ['invalid',ZeroAddress,'']){const store=memory();store.data.set(REFERRAL_SELECTION_KEY,value);assert.throws(()=>readSelectedReferral(store),/invalid/);}
 assert.throws(()=>saveSelectedReferral(ZeroAddress,memory()));
 const dropped={getItem:()=>null,setItem(){},removeItem(){}};assert.throws(()=>saveSelectedReferral(referrer,dropped),/could not be saved/);
 const unreadable={getItem(){throw Error('blocked');}};assert.throws(()=>readSelectedReferral(unreadable),/blocked/);
});
test('existing on-chain referral always wins; self-selection never creates a new referral',()=>{
 assert.deepEqual(effectiveReferral(account,ZeroAddress,referrer),{requested:referrer,existing:ZeroAddress,actual:referrer,calldata:referrer});
 assert.deepEqual(effectiveReferral(account,existing,referrer),{requested:referrer,existing,actual:existing,calldata:ZeroAddress});
 assert.deepEqual(effectiveReferral(account,ZeroAddress,account),{requested:ZeroAddress,existing:ZeroAddress,actual:ZeroAddress,calldata:ZeroAddress});
 assert.equal(effectiveReferral(account,existing,account).actual,existing);
 assert.throws(()=>effectiveReferral(account,ZeroAddress,'bad address'));
});
