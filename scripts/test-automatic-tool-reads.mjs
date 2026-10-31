import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { formatEther, formatUnits, parseEther } from 'ethers';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree)
  ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
let serial = 0;

// Run the actual component hooks with controlled public reads and browser time.
// No wallet, network, CSS engine or production transaction code is invoked.
async function mount(file, exported, props, dependencies = {}) {
  const slots = [], effects = [], timers = new Map(), events = new Map();
  let cursor = 0, dirty = true, mounted = true, tree, timer = 0, lateUpdates = 0;
  const setTimer = (callback, delay) => { const id = ++timer; timers.set(id, { callback, delay }); return id; };
  const clearTimer = id => timers.delete(id);
  const bindings = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { if (!mounted) lateUpdates++; slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
    useId: () => 'test-id',
    useSyncExternalStore: () => 0,
    useMemo: factory => factory(), memo: component => component,
    jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment',
    createPortal: node => node,
    setTimeout: setTimer, clearTimeout: clearTimer,
    useNftCardMotion: () => ({ stage: { current: null }, card: { current: null } }),
    assetUrl: path => path,
    formatEther, formatUnits, parseEther, displayFarmAmount: String,
    isCancelledFeedback: () => false, isRecoveryFeedback: () => false,
    ...dependencies,
  };
  const previous = { window: globalThis.window, document: globalThis.document };
  globalThis.window = {
    setTimeout: setTimer, clearTimeout: clearTimer, setInterval: setTimer, clearInterval: clearTimer,
    addEventListener(name, callback) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(callback); },
    removeEventListener(name, callback) { events.get(name)?.delete(callback); },
  };
  globalThis.document = { body: {} };
  const key = '__automaticToolReads' + serial++;
  globalThis[key] = bindings;
  const source = await readFile(new URL('../src/components/' + file, import.meta.url), 'utf8');
  let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  code = code.replace(/import\s*\{([^}]+)\}\s*from\s*["'][^"']+["'];?/g, (_, names) => `const {${names.replace(/\s+as\s+/g, ':')}}=globalThis[${JSON.stringify(key)}];`)
    .replace(/import\s*["'][^"']+["'];?/g, '');
  code = `const {setTimeout,clearTimeout,fetch}=globalThis[${JSON.stringify(key)}];\n` + code;
  const component = (await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64')))[exported];
  const render = () => {
    let turns = 0;
    while (mounted && dirty) {
      assert.ok(++turns < 30, 'Hooks settle without an update loop');
      cursor = 0; dirty = false; tree = component(props);
      while (effects.length) effects.shift()();
    }
    return tree;
  };
  render();
  return {
    tree: () => render(), timers, events,
    async flush() { await new Promise(resolve => setImmediate(resolve)); render(); },
    fire(delay) {
      const entry = [...timers].find(([, task]) => task.delay === delay);
      assert.ok(entry, `Automatic read scheduled after ${delay}ms`);
      timers.delete(entry[0]); entry[1].callback(); render();
    },
    update(next) { props = next; dirty = true; render(); },
    unmount() { if (mounted) { mounted = false; for (const slot of slots) slot?.cleanup?.(); } },
    lateUpdates: () => lateUpdates,
    dispose() { this.unmount(); globalThis.window = previous.window; globalThis.document = previous.document; delete globalThis[key]; },
  };
}

test('candidate discovery retries failed reads and preserves existing rows during automatic updates', async () => {
  const requests = [];
  const f = await mount('GovernanceCandidates.tsx', 'GovernanceCandidates', { kind: 'nft', active: true, onSelect() {} }, {
    readGovernanceCandidates(kind, signal) { const request = { ...deferred(), kind, signal }; requests.push(request); return request.promise; },
  });
  try {
    requests[0].reject(Error('offline')); await f.flush(); f.fire(10000);
    requests[1].resolve({ rows: [{ address: '0xAlice', kind: 'allocation', status: 'Approved' }] }); await f.flush();
    f.fire(60000);
    assert.ok(nodes(f.tree()).some(node => node.type === 'option' && node.props.children?.includes('0xAlice')));
    f.update({ kind: 'senate', active: true, onSelect() {} });
    assert.equal(requests[2].signal.aborted, true);
    requests[2].resolve({ rows: [{ address: '0xOld', kind: 'allocation', status: 'Approved' }] }); await f.flush();
    assert.equal(nodes(f.tree()).some(node => node.type === 'option' && node.props.children?.includes('0xOld')), false);
    f.unmount(); requests[3].resolve({ rows: [] }); await f.flush();
    assert.equal(f.timers.size, 0); assert.equal(f.lateUpdates(), 0);
  } finally { f.dispose(); }
});

test('the contract source recovers automatically and stops retrying after success or unmount', async () => {
  const requests = [];
  const f = await mount('OinkContractShowcase.tsx', 'OinkContractShowcase', {}, {
    fetch(url, { signal }) { const request = { ...deferred(), url, signal }; requests.push(request); return request.promise; },
  });
  try {
    requests[0].reject(Error('offline')); await f.flush(); f.fire(10000);
    requests[1].resolve({ ok: true, text: async () => 'contract XPD {}' }); await f.flush();
    const copy = nodes(f.tree()).find(node => node.type === 'button' && node.props.children === 'Copy code');
    assert.equal(copy.props.disabled, false); assert.equal(f.timers.size, 0);
    nodes(f.tree()).find(node => node.type === 'select').props.onChange({ target: { value: 'OINK-XPD.sol' } }); await f.flush();
    f.unmount(); assert.equal(requests[2].signal.aborted, true);
    requests[2].reject(Error('cancelled')); await f.flush();
    assert.equal(f.timers.size, 0); assert.equal(f.lateUpdates(), 0);
  } finally { f.dispose(); }
});

test('rollover bonuses update automatically without changing the chosen duration or sending a wallet request', async () => {
  const requests = [];
  const wallet = { account: 'alice', chainId: 369n, revision: 0, provider: { request() { throw Error('Unexpected wallet request'); } } };
  const row = { pool: { id: 'one-month', label: '1 month' }, index: 0, shares: '1', deposited: '1' };
  const result = bonus => ({ timestamp: Date.now() / 1000, source: { id: row.pool.id, index: 0, shares: parseEther('1').toString(), deposited: '1' }, options: ['one-month', 'five-year'].map(id => ({ id, label: id, available: true, quote: {}, bonusRate: '100', bonusAmount: bonus })) });
  const f = await mount('MinerRolloverDialog.tsx', 'MinerRolloverDialog', { row, onClose() {} }, {
    useWallet: () => wallet, getPublicProvider: async () => ({}),
    readMinerRolloverOptions() { const request = deferred(); requests.push(request); return request.promise; },
  });
  try {
    await f.flush(); requests[0].reject(Error('offline')); await f.flush(); f.fire(10000); await f.flush();
    requests[1].resolve(result('1')); await f.flush();
    nodes(f.tree()).find(node => node.type === 'select').props.onChange({ target: { value: 'five-year' } }); await f.flush();
    f.fire(45000); await f.flush();
    assert.equal(nodes(f.tree()).find(node => node.type === 'select').props.value, 'five-year');
    assert.ok(nodes(f.tree()).some(node => node.type === 'ul'), 'Previous bonuses stay visible during the read');
    requests[2].resolve(result('2')); await f.flush();
    assert.equal(nodes(f.tree()).find(node => node.type === 'select').props.value, 'five-year');
    f.fire(45000); await f.flush(); f.unmount(); requests[3].resolve(result('3')); await f.flush();
    assert.equal(f.timers.size, 0); assert.equal(f.lateUpdates(), 0);
  } finally { f.dispose(); }
});

test('the recovery farm catalog retries and updates without a refresh button, cancelling when closed', async () => {
  const requests = [];
  const f = await mount('FarmRecovery.tsx', 'FarmRecovery', {}, {
    useWallet: () => ({ account: null, chainId: null, revision: 0 }),
    getFarmWriteSpecs: () => [], getFarmWriteSpec: () => null,
    getPublicProvider: async () => ({}),
    refreshDiscoveredFarmCatalog(_rpc, signal) { const request = { ...deferred(), signal }; requests.push(request); return request.promise; },
  });
  try {
    await f.flush(); requests[0].reject(Error('offline')); await f.flush(); f.fire(10000); await f.flush();
    requests[1].resolve(); await f.flush(); f.fire(60000); await f.flush();
    f.unmount(); assert.equal(requests[2].signal.aborted, true);
    requests[2].reject(Error('cancelled')); await f.flush();
    assert.equal(f.timers.size, 0); assert.equal(f.lateUpdates(), 0);
  } finally { f.dispose(); }
});
