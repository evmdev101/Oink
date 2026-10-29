import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { isCancelledFeedback, isRecoveryFeedback, isRoutineRecoveryResult } from '../src/lib/transactionFeedback.ts';
import { isGovernanceActionDisabled, actionPauseNotice } from '../src/config/publicPreview.ts';

const sources = Object.fromEntries(await Promise.all(['PositionTransaction', 'ProtocolAction', 'FarmDepositActions'].map(async name => [name, await readFile(new URL('../src/components/' + name + '.tsx', import.meta.url), 'utf8')])));
const owner = '0x' + '11'.repeat(20);
const blockingStates = ['requesting', 'pending', 'uncertain', 'unverified'];
let sequence = 0;

// Exercise the real controls without a wallet connection or network. Stored
// journals remain blocking; opening recovery must never acknowledge or resend.
async function control(name, initial = {}) {
  const slots = [], effects = [], listeners = new Map(), dispatched = [];
  let cursor = 0, dirty = true, tree, sends = 0;
  const wallet = { account: owner, chainId: 369n, provider: {}, revision: 1 };
  const request = name === 'PositionTransaction' ? { type: 'miner', id: 'one-month', action: { kind: 'deploy', amount: '1', recipient: owner } } : initial.request ?? { module: 'sale', amount: '1' };
  const props = name === 'FarmDepositActions' ? { farmId: 'plsx', onConfirmed() {} } : { request, label: 'Continue', adapter: {} };
  const state = { journal: null, ...initial };
  if (state.journal) state.journal = { ...state.journal, hash: state.journal.hash ?? null, review: { account: owner, request, kind: 'deposit' } };
  const jsx = (type, props) => ({ type, props });
  const bindings = {
    positionScope:r=>JSON.stringify([r.type,r.id,r.action.kind]),protocolScope:r=>r.module+":"+r.action,
    Fragment: 'fragment', jsx, jsxs: jsx,
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(slots[i], next)) { slots[i] = next; dirty = true; } }]; },
    useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect(effect, deps) { const i = cursor++, previous = slots[i]; if (!previous || deps.some((value, index) => !Object.is(value, previous.deps[index]))) { slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); }); } },
    useSyncExternalStore: () => 0,
    useWallet: () => wallet, getPublicProvider: async () => ({}),
    readPositionJournal: () => state.journal, readProtocolJournal: () => state.journal,
    readFarmJournal: () => { if (state.journalError) throw Error(state.journalError); return state.journal; },
    positionJournalBlocks: entry => !!entry?.hash && blockingStates.includes(entry.state),
    protocolJournalBlocks: entry => !!entry?.hash && blockingStates.includes(entry.state),
    journalBlocks: entry => !!entry?.hash && blockingStates.includes(entry.state),
    submitPositionDirect: async options => { sends++; return state.submit(options); },
    submitProtocolDirect: async options => { sends++; return state.submit(options); },
    isGovernanceActionDisabled, actionPauseNotice,
    isCancelledFeedback, isRecoveryFeedback, isRoutineRecoveryResult,
    listPendingTransactions: () => state.recoverableRequests ?? (state.journal && blockingStates.includes(state.journal.state) ? [state.journal] : []),
    assertCurrentFarmSpec() {}, farmSpecIdentity: () => 'plsx', getFarmCatalogRevision: () => 0,
    getFarmWriteSpec: () => ({ id: 'plsx', symbol: 'PLSX', tokenAddress: owner, decimals: 18 }),
    subscribeFarmCatalog: () => () => {}, FARM_CHAIN_ID: 369n,
    parseFarmDepositAmount: value => { if (!value) throw Error('Enter an amount.'); return 1n; },
    prepareFarmTransaction() { throw Error('No transaction may start in this fixture.'); },
    requestReviewedFarmTransaction() { sends++; throw Error('No wallet may open in this fixture.'); },
    writeFarmJournal() { throw Error('No journal may change in this fixture.'); },
    assertNoPendingFarm() {}, assertNoPendingPosition() { if (state.guardError) throw Error(state.guardError); }, positionLock: () => 'lock',
    useReferralSelection: () => ({ referral: null, error: '' }),
    FARM_QUICK_PERCENTAGES: [25, 50, 75, 100], farmQuickAmount: () => null,
    ZeroAddress: '0x' + '00'.repeat(20), InfoTooltip: function InfoTooltip() {},
  };
  const key = '__quietTransactionControls' + sequence++;
  const previousWindow = globalThis.window;
  const previousStorage=globalThis.localStorage;globalThis.localStorage={};
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis[key] = bindings;
  globalThis.window = {
    addEventListener(name, callback) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(callback); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    dispatchEvent(event) { dispatched.push(event.type); for (const callback of listeners.get(event.type) ?? []) callback(event); return true; },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request() { throw Error('No wallet lock may be acquired in this fixture.'); } } } });
  const data = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
  const mock = data('const b=globalThis[' + JSON.stringify(key) + '];' + Object.keys(bindings).map(name => `export const ${name}=b.${name};`).join(''));
  let compiled = ts.transpileModule(sources[name], { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  compiled = compiled.replace(/import\s+["'][^"']+\.css["'];?/g, '').replace(/import\s+([^;]+?)\s+from\s+["'][^"']+["'];?/g, (_, spec) => `import ${spec} from ${JSON.stringify(mock)};`);
  const component = (await import(data(compiled)))[name];
  const render = () => { let rounds = 0; while (dirty) { assert.ok(rounds++ < 20, 'Effects settle'); cursor = 0; dirty = false; tree = component(props); while (effects.length) effects.shift()(); } return tree; };
  const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node == null || typeof node === 'boolean' ? '' : String(node);
  const nodes = () => { render(); const found = []; const visit = node => { if (Array.isArray(node)) return node.forEach(visit); if (!node || typeof node !== 'object') return; found.push(node); visit(node.props?.children); }; visit(tree); return found; };
  render();
  return {
    state, props, render, text: () => text(render()), sends: () => sends, dispatched,
    button: label => nodes().find(node => node.type === 'button' && text(node) === label),
    alerts: () => nodes().filter(node => node.props?.role === 'alert').map(text),
    links: () => nodes().filter(node => node.type === 'a'),
    setAmount(value) { const input = nodes().find(node => node.type === 'input' && node.props.id === 'farm-amount-plsx'); assert.ok(input); input.props.onChange({ target: { value } }); render(); },
    async click(label) { const button = this.button(label); assert.ok(button); assert.equal(button.props.disabled, false); await button.props.onClick(); await new Promise(resolve => setImmediate(resolve)); render(); },
    openRecovery() { const button = this.button('Resolve request'); assert.ok(button); button.props.onClick(); render(); },
    updateJournal(entry) { state.journal = { ...entry, hash: entry.hash ?? null, review: { account: owner, request, kind: 'deposit' } }; for (const name of ['oink-position-journal', 'oink-protocol-journal', 'oink-farm-journal']) for (const callback of listeners.get(name) ?? []) callback(new Event(name)); render(); },
    settleOtherFamily() { state.recoverableRequests = []; const name = nameForOtherFamily(); for (const callback of listeners.get(name) ?? []) callback(new Event(name)); render(); },
    dispose() { for (const slot of slots) slot?.cleanup?.(); globalThis.window = previousWindow;globalThis.localStorage=previousStorage; if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator); else delete globalThis.navigator; delete globalThis[key]; },
  };

  function nameForOtherFamily() { return name === 'FarmDepositActions' ? 'oink-position-journal' : 'oink-farm-journal'; }
}

for(const name of Object.keys(sources)) {
 for(const state of ['pending','uncertain',...(name==='FarmDepositActions'?['unverified']:[])])test(name+': only its submitted action stays pending without a recovery workflow',async()=>{const c=await control(name,{journal:{state,hash:'0x'+'aa'.repeat(32),message:'Routine tracking sentence'}});try{assert.doesNotMatch(c.text(),/Routine tracking|Resolve request/);assert.equal(c.sends(),0);assert.equal(c.dispatched.length,0);const primary=c.button(state==='pending'?(name==='FarmDepositActions'?'Pending…':'Submitted'):(name==='FarmDepositActions'?'Stake':'Continue'));assert.ok(primary);assert.equal(primary.props.disabled,true);}finally{c.dispose();}});
 for(const state of ['requesting','resolved','confirmed'])test(name+': an old no-hash request or settled result does not lock the action',async()=>{const c=await control(name,{journal:{state,message:state==='resolved'?'':'Routine tracking sentence'}});try{assert.doesNotMatch(c.text(),/Routine tracking|Resolve request/);assert.equal(c.button(name==='FarmDepositActions'?'Stake':'Continue').props.disabled,name==='FarmDepositActions');}finally{c.dispose();}});
 test(name+': real failed receipts remain visible',async()=>{const c=await control(name,{journal:{state:'failed',hash:'0x'+'aa'.repeat(32),message:'Transaction reverted: insufficient balance.'}});try{assert.deepEqual(c.alerts(),['Transaction reverted: insufficient balance.']);}finally{c.dispose();}});
}
for(const name of ['PositionTransaction','ProtocolAction'])test(name+': cancelling is quiet and minimum errors remain visible',async()=>{const c=await control(name);try{c.state.submit=async()=>{throw Error('The wallet request was rejected.');};await c.click('Continue');assert.deepEqual(c.alerts(),[]);c.state.submit=async()=>{throw Error('Minimum amount is 100 OINK.');};await c.click('Continue');assert.deepEqual(c.alerts(),['Minimum amount is 100 OINK.']);}finally{c.dispose();}});

test('maintenance controls show the pause and cannot start a wallet request even if their handler is invoked',async()=>{
 const c=await control('ProtocolAction',{request:{module:'community-maintenance',action:'buyback',args:{}}});
 try{const button=c.button('Continue');assert.equal(button.props.disabled,true);assert.match(button.props.title,/Protocol maintenance actions are temporarily disabled/);assert.match(c.text(),/Maintenance actions are temporarily disabled/);await button.props.onClick();assert.equal(c.sends(),0);}finally{c.dispose();}
});
