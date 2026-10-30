import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/useDeferredDisplayRead.ts', import.meta.url), 'utf8');
let sequence = 0;
async function fixture(t, { hidden = false, observer = true } = {}) {
  const slots = [], effects = [], reads = [], observers = [];
  let cursor = 0, dirty = true, mounted = true, output;
  const doc = new EventTarget(); doc.hidden = hidden;
  const section = { tagName: 'SECTION' };
  const bindings = {
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) {
      const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { assert.ok(mounted, 'unmounted sections cannot update'); const next = typeof value === 'function' ? value(slots[i]) : value; if (next !== slots[i]) { slots[i] = next; dirty = true; } }];
    },
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i];
      if (!previous || deps.some((value, j) => !Object.is(value, previous.deps[j]))) {
        slots[i] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = effect(); });
      }
    },
    waitForForegroundDisplayReads(signal) {
      return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener('abort', abort, { once: true });
        reads.push({ signal, release() { signal.removeEventListener('abort', abort); resolve(); } });
      });
    },
  };
  const key = `__deferredDisplay${sequence++}`;
  globalThis[key] = bindings;
  const previous = new Map(['document', 'IntersectionObserver'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true });
  Object.defineProperty(globalThis, 'IntersectionObserver', { value: observer ? class {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { assert.equal(target, section); }
    disconnect() { this.disconnected = true; }
  } : undefined, configurable: true });
  let code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  code = code.replace(/^import .*;\r?$/gm, '');
  code = `const {useEffect,useRef,useState,waitForForegroundDisplayReads}=globalThis[${JSON.stringify(key)}];\n${code}`;
  const { useDeferredDisplayRead } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const render = () => {
    let rounds = 0;
    while (dirty && mounted) {
      assert.ok(rounds++ < 15); dirty = false; cursor = 0;
      output = useDeferredDisplayRead(); output.sectionRef.current = section;
      while (effects.length) effects.shift()();
    }
    return output;
  };
  const unmount = () => { if (!mounted) return; mounted = false; for (const slot of slots) slot?.cleanup?.(); };
  t.after(() => {
    unmount(); delete globalThis[key];
    for (const [name, descriptor] of previous) if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
  });
  render();
  return {
    reads, observers, state: render, unmount,
    approach() { observers[0].callback([{ isIntersecting: true }]); render(); },
    visibility(hidden) { doc.hidden = hidden; doc.dispatchEvent(new Event('visibilitychange')); render(); },
    async flush() { await new Promise(resolve => setImmediate(resolve)); return render(); },
  };
}

test('offscreen sections render without requests, then wait for balances before reading', async t => {
  const f = await fixture(t);
  assert.equal(f.state().sectionRef.current.tagName, 'SECTION');
  assert.equal(f.reads.length, 0);
  assert.equal(f.state().readReady, false);
  assert.equal(f.observers[0].options.rootMargin, '600px');
  f.approach(); assert.equal(f.reads.length, 1); assert.equal(f.state().readReady, false);
  f.reads[0].release(); assert.equal((await f.flush()).readReady, true);
  f.visibility(true); f.visibility(false);
  assert.equal(f.reads.length, 1, 'visibility changes cannot duplicate a started reader');
});

test('hidden pages do not start deferred reads until visible', async t => {
  const f = await fixture(t, { hidden: true });
  f.approach(); assert.equal(f.reads.length, 0);
  f.visibility(false); assert.equal(f.reads.length, 1);
  f.reads[0].release(); assert.equal((await f.flush()).readReady, true);
});

test('leaving a route cancels a waiting section and disconnects its observer', async t => {
  const f = await fixture(t); f.approach(); f.unmount();
  assert.equal(f.reads[0].signal.aborted, true);
  assert.equal(f.observers[0].disconnected, true);
  await f.flush();
});

test('browsers without IntersectionObserver still receive section data', async t => {
  const f = await fixture(t, { observer: false });
  assert.equal(f.reads.length, 1);
  f.reads[0].release(); assert.equal((await f.flush()).readReady, true);
});
