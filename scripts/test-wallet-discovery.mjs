import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { watchWallets, walletRows } = await import("../src/lib/walletDiscovery.ts");

test("wallet picker retains distinct providers and removes duplicate references", () => {
  const a = { request() {} }, b = { request() {} };
  const rows = walletRows([{ key:"metamask", name:"MetaMask", provider:a }, { key:"metamask", name:"MetaMask", provider:b }, { key:"metamask", name:"Duplicate", provider:a }]);
  assert.equal(rows.filter(row => row.provider).length, 2);
  assert.equal(rows.filter(row => row.key === "metamask").length, 2);
});

test("discovery only detects wallets: no account, signature or chain requests", () => {
  const previous = globalThis.window;
  const host = new EventTarget();
  let calls = 0, rows = [];
  const rabby = { isRabby:true, isMetaMask:true, request() { calls++; } };
  host.ethereum = { providers:[rabby] };
  globalThis.window = host;
  try {
    const stop = watchWallets(next => { rows = next; });
    assert.equal(rows.find(row => row.key === "rabby").provider, rabby);
    assert.equal(rows.find(row => row.key === "metamask").provider, null);
    host.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail:{ provider:rabby, info:{name:"Rabby Wallet",rdns:"io.rabby",icon:"javascript:bad"} } }));
    assert.equal(rows.filter(row => row.provider).length, 1);
    assert.equal(rows.find(row => row.provider)?.icon, './img/wallets/rabby-clean.png');
    host.dispatchEvent(new CustomEvent("eip6963:announceProvider", { detail:{provider:{},info:{name:"Bad",rdns:"bad"}} }));
    assert.equal(rows.filter(row => row.provider).length, 1);
    assert.equal(calls, 0);
    stop();
    const before = rows;
    host.dispatchEvent(new CustomEvent("eip6963:announceProvider", {detail:{provider:{request() {}},info:{name:"New",rdns:"test"}}}));
    assert.equal(rows, before);
  } finally { globalThis.window = previous; }
});

test("picker re-discovers late legacy injections and handles an empty providers array", () => {
  const previous=globalThis.window, host=new EventTarget(); globalThis.window=host;
  let rows=[]; const stop=watchWallets(next=>{rows=next;});
  try {
    const provider={isMetaMask:true,providers:[],request(){throw Error('Discovery must not request accounts');}};
    host.ethereum=provider;
    host.dispatchEvent(new Event('eip6963:requestProvider'));
    assert.equal(rows.find(row=>row.key==='metamask').provider,provider);
    assert.ok(rows.filter(row=>!row.provider).every(row=>row.icon?.startsWith('./img/wallets/')));
  } finally {stop(); globalThis.window=previous;}
});
