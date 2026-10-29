import { test } from "node:test";
import assert from "node:assert/strict";
import { keccak256, zeroPadValue } from "ethers";
import { verifyFarmTokenState, verifyFarmApprovalResult, farmTokenSafetyAbi as abi } from "../src/lib/farmTokenSafety.ts";

// Recording mocks only. No provider, network or wallet requests.
const address = n => "0x" + n.toString(16).padStart(40, "0");
const account = address(1), token = address(2), vault = address(3), treasury = address(4), implementation = address(5);
const code = "0x6001", implementationCode = "0x6002", slot = "0x" + "ab".repeat(32), tag = "0x123";
function fixture(kind, options = {}) {
  const spec = {tokenAddress:token, tokenRuntimeCodeHash:keccak256(code), address:vault, treasuryWallet:treasury,
    ...(kind ? {tokenPolicy:kind === "usdc" ? {kind, implementation:{slot,address:implementation,runtimeCodeHash:keccak256(implementationCode)}} : {kind}} : {})};
  const calls = [];
  const rpc = {async send(method, params) {
    calls.push({method,params});
    if (method === "eth_getCode") return options.badCode === params[0] ? "0x6000" : params[0] === implementation ? implementationCode : code;
    if (method === "eth_getStorageAt") return options.word ?? zeroPadValue(implementation,32);
    assert.equal(method,"eth_call");
    const parsed = abi.parseTransaction(params[0]);
    const target = parsed.args.length ? parsed.args[0] : null;
    const values = {paused:false,deprecated:false,basisPointsRate:0n,maximumFee:0n,
      isBlackListed:options.blocked === target,isBlacklisted:options.blocked === target,...options.values};
    return abi.encodeFunctionResult(parsed.fragment,[values[parsed.name]]);
  }};
  return {rpc,spec,calls};
}

test("ordinary assets pin their token runtime without inventing optional token methods",async()=>{
  const f=fixture(); await verifyFarmTokenState(f.rpc,f.spec,account,tag);
  assert.deepEqual(f.calls,[{method:"eth_getCode",params:[token,tag]}]);
  await assert.rejects(verifyFarmTokenState(fixture(undefined,{badCode:token}).rpc,f.spec,account,tag),/runtime/);
});
test("native PLS never makes token calls",async()=>{
  const f=fixture(); await verifyFarmTokenState(f.rpc,{...f.spec,tokenAddress:null},account,tag);assert.equal(f.calls.length,0);
});
for(const kind of ["usdt","usdc"])test(kind+" checks transfer mode and all participants at the exact snapshot",async()=>{
  const f=fixture(kind);await verifyFarmTokenState(f.rpc,f.spec,account,tag);
  assert(f.calls.every(({method,params})=>params[method==="eth_getStorageAt"?2:1]===tag));
  const blocked=f.calls.filter(c=>c.method==="eth_call").map(c=>abi.parseTransaction(c.params[0])).filter(p=>p.name.startsWith("isBlack"));
  assert.deepEqual(blocked.map(p=>p.args[0]),[account,vault,treasury]);
  for(const blockedAddress of [account,vault,treasury]){
    const bad=fixture(kind,{blocked:blockedAddress});await assert.rejects(verifyFarmTokenState(bad.rpc,bad.spec,account,tag),/blocks/);
  }
  const paused=fixture(kind,{values:{paused:true}});await assert.rejects(verifyFarmTokenState(paused.rpc,paused.spec,account,tag),/paused/);
});
test("USDT rejects deprecation or any fee setting before an approval or exit review",async()=>{
  for(const [values,pattern] of [[{deprecated:true},/implementation/],[{basisPointsRate:1n},/transfer-fee/],[{maximumFee:1n},/transfer-fee/]]){
    const f=fixture("usdt",{values});await assert.rejects(verifyFarmTokenState(f.rpc,f.spec,account,tag),pattern);
  }
});
test("USDC requires both the exact implementation slot and implementation executable",async()=>{
  for(const word of [zeroPadValue(address(6),32),"0x", "0x"+"1".repeat(64)]){
    const f=fixture("usdc",{word});await assert.rejects(verifyFarmTokenState(f.rpc,f.spec,account,tag),/implementation changed/);
  }
  const f=fixture("usdc",{badCode:implementation});await assert.rejects(verifyFarmTokenState(f.rpc,f.spec,account,tag),/implementation runtime/);
  assert(f.calls.some(c=>c.method==="eth_getStorageAt"&&c.params[0]===token&&c.params[1]===slot));
});
test("only the explicitly modeled USDT token accepts empty approval return data",()=>{
  const yes="0x"+"0".repeat(63)+"1",no="0x"+"0".repeat(64);
  for(const kind of [undefined,"usdc"]){const {spec}=fixture(kind);verifyFarmApprovalResult(yes,spec);for(const value of ["0x",no,"0x01",yes+"00"])assert.throws(()=>verifyFarmApprovalResult(value,spec),/confirm/);}
  const {spec}=fixture("usdt");verifyFarmApprovalResult("0x",spec);for(const value of [yes,no,"0x01"])assert.throws(()=>verifyFarmApprovalResult(value,spec),/Unexpected/);
});
