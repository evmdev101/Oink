import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFarmDisplayLoader } from '../src/lib/farmDisplayLoader.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const account = '0x' + '1'.repeat(40);
const snapshot = (extra = {}) => ({ account, timestamp: 1800000000, rows: ['PLSX'], complete: true, ...extra });
const quote = { usd: '1', pair: '0x' + '2'.repeat(40), fetchedAt: 1800000000000 };
function setup(cached = null) {
  const farms = deferred(), prices = deferred();
  let listener, subscribed = false;
  const loader = createFarmDisplayLoader({
    readSnapshot: () => farms.promise,
    peekSnapshot: () => cached,
    subscribe: (_, next) => { listener = next; subscribed = true; return () => { subscribed = false; }; },
    readPrices: () => prices.promise,
    peekPrices: () => ({ oink: quote }),
    mapPrices: (_, values) => values,
    hasValues: value => value.rows.length > 0,
    now: () => 1800000000000,
  });
  return { loader, farms, prices, progress: value => listener(value), subscribed: () => subscribed };
}

test('verified farm cards render before optional discovery and slow prices finish', async () => {
  const f = setup(), updates = [];
  let finished = false;
  const loading = f.loader.load(account, new AbortController().signal, value => updates.push(value)).then(value => { finished = true; return value; });
  f.progress(snapshot({ complete: false }));
  await flush();
  assert.equal(finished, false);
  assert.deepEqual(updates.at(-1).snapshot.rows, ['PLSX']);
  assert.equal(updates.at(-1).snapshot.complete, false, 'never represent incomplete discovery as complete');
  f.farms.resolve(snapshot({ rows: ['PLSX', 'New farm'] }));
  await flush();
  assert.deepEqual(updates.at(-1).snapshot.rows, ['PLSX', 'New farm']);
  assert.equal(finished, false, 'market prices are still pending');
  f.prices.resolve({ plsx: quote });
  const result = await loading;
  assert.equal(result.prices.plsx, quote);
  assert.equal(f.subscribed(), false);
});

test('a failed quote does not discard balances or force an all-farm retry', async () => {
  const f = setup();
  const loading = f.loader.load(account, new AbortController().signal);
  f.farms.resolve(snapshot());
  f.prices.reject(new Error('Price service offline'));
  const result = await loading;
  assert.deepEqual(result.snapshot.rows, ['PLSX']);
  assert.match(result.priceError, /market prices/);
  assert.equal(result.prices.oink, quote, 'retain the existing quote with its original fetchedAt');
});

test('last-known values render immediately and a new skeleton never erases them', async () => {
  const cached = snapshot({ timestamp: 1799999000 });
  const f = setup(cached), updates = [];
  assert.equal(f.loader.peek(account).snapshot, cached, 'stale display cache remains usable and keeps its real timestamp');
  const controller = new AbortController();
  const loading = f.loader.load(account, controller.signal, value => updates.push(value));
  assert.equal(updates[0].snapshot, cached);
  f.progress(snapshot({ rows: [], complete: false }));
  assert.equal(updates.at(-1).snapshot, cached);
  f.progress(snapshot({ rows: ['Updated PLSX'], complete: false }));
  assert.equal(updates.at(-1).snapshot, cached, 'a partial refresh does not erase other cached cards or label their old data as fresh');
  controller.abort(new Error('Page changed'));
  await assert.rejects(loading, /Page changed/);
  assert.equal(f.subscribed(), false);
});

test('wallet changes cannot display another account and cancellation blocks late updates', async () => {
  const f = setup(snapshot({ account: '0x' + '3'.repeat(40) })), updates = [];
  assert.equal(f.loader.peek(account), null);
  const controller = new AbortController();
  const loading = f.loader.load(account, controller.signal, value => updates.push(value));
  f.progress(snapshot({ account: '0x' + '3'.repeat(40) }));
  assert.equal(updates.at(-1).snapshot, null);
  controller.abort();
  await assert.rejects(loading);
  const count = updates.length;
  f.farms.resolve(snapshot());
  f.prices.resolve({ plsx: quote });
  await flush();
  assert.equal(updates.length, count);
});

test('a final snapshot for the wrong wallet fails instead of committing', async () => {
  const f = setup();
  const loading = f.loader.load(account, new AbortController().signal);
  f.farms.resolve(snapshot({ account: '0x' + '3'.repeat(40) }));
  f.prices.resolve({});
  await assert.rejects(loading, /selected wallet/);
  assert.equal(f.subscribed(), false);
});
