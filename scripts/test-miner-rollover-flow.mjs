import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (error) { if (s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw error; } } });
const { submitMinerRollover } = await import('../src/lib/minerRolloverFlow.ts');
const account = '0x0000000000000000000000000000000000000011';
const target = '0x0000000000000000000000000000000000000022';
const other = '0x0000000000000000000000000000000000000033';
const hash = '0x' + 'ab'.repeat(32);
const clone = (value) => structuredClone(value);
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const quote = {
    title: 'Rollover', account, block: 100, timestamp: Math.floor(Date.now() / 1000),
    facts: [], warnings: [], simulation: 'Passed at this snapshot.', source: target,
    execution: { to: target, data: '0x12345678', fingerprint: 'position-terms', minimumOutput: '150', event: 'MinerRollover', shares: '1000', recipient: account, amount: '1000' },
  };
  const request = { type: 'miner', id: 'three-month', action: { kind: 'rollover', index: 0, target: 'three-month' } };
  const review = {
    request, quote: clone(quote), transaction: { from: account, to: target, data: quote.execution.data, value: '0x0', chainId: '0x171', gas: '0x100' },
    gasCost: '1', createdAt: Date.now(), blockHash: '0x' + 'cd'.repeat(32),
  };
  const writes = [], stages = [], events = [];
  let active = true, held = false, stored = null, sends = 0;
  const options = {
    request, displayedQuote: quote,
    provider: { request() { throw Error('No wallet requests allowed in the test fixture.'); } },
    rpc: { send() { throw Error('No network allowed in the test fixture.'); } },
    current: () => active, onStage: (...args) => stages.push(args),
  };
  const deps = {
    async withLock(lockAccount, run) {
      assert.equal(lockAccount, account);
      if (held) throw Error('Another wallet request is open in this app.');
      held = true; events.push('lock');
      try { return await run(); } finally { held = false; events.push('unlock'); }
    },
    assertNoPendingPosition() { if (stored && ['requesting', 'pending', 'uncertain'].includes(stored.state)) throw Error('Previous request unresolved.'); },
    assertNoPendingFarm() {},
    async prepare(_rpc, reviewedAccount, selected) { assert.equal(reviewedAccount, account); assert.deepEqual(selected, request); events.push('prepare'); return clone(review); },
    async send(_review, _provider, _rpc, current, onWallet) {
      if (!current()) throw Object.assign(Error('Context changed before send.'), { walletRequestStarted: false });
      onWallet?.(); sends++; events.push('send'); return hash;
    },
    write(entry) { stored = clone(entry); writes.push(clone(entry)); events.push('write:' + entry.state); },
  };
  return { options, deps, review, writes, stages, events, close() { active = false; }, sends: () => sends, stored: () => stored };
}

test('rollover sends once under the shared lock and saves requesting before send and pending afterward', async () => {
  const f = fixture(), result = await submitMinerRollover(f.options, f.deps);
  assert.equal(result.state, 'pending'); assert.equal(result.hash, hash); assert.equal(f.sends(), 1);
  assert.deepEqual(f.events, ['lock', 'prepare', 'write:requesting', 'send', 'write:pending', 'unlock']);
  assert.deepEqual(f.stages.map(([stage]) => stage), ['checking', 'wallet', 'pending']);
  await assert.rejects(submitMinerRollover(f.options, f.deps), /unresolved/);
  assert.equal(f.sends(), 1);
});

for (const [label, change] of [
  ['account', (r) => { r.quote.account = other; }],
  ['contract target', (r) => { r.transaction.to = other; }],
  ['duration calldata', (r) => { r.transaction.data = '0x87654321'; }],
  ['position shares or lock terms', (r) => { r.quote.execution.fingerprint = 'different'; }],
  ['lower bonus', (r) => { r.quote.execution.minimumOutput = '149'; }],
]) test('changed displayed ' + label + ' stops before journal or wallet send', async () => {
  const f = fixture(); change(f.review);
  await assert.rejects(submitMinerRollover(f.options, f.deps), /terms changed/);
  assert.equal(f.sends(), 0); assert.deepEqual(f.writes, []);
});

test('an increased bonus with unchanged selected position and duration may proceed', async () => {
  const f = fixture(); f.review.quote.execution.minimumOutput = '151';
  assert.equal((await submitMinerRollover(f.options, f.deps)).state, 'pending');
});

test('failed displayed simulation stops even if a new preparation succeeds', async () => {
  const f = fixture(); f.options.displayedQuote.simulation = 'Did not pass.';
  await assert.rejects(submitMinerRollover(f.options, f.deps), /terms changed/); assert.equal(f.sends(), 0);
});

test('closing or changing wallets during preparation prevents a later wallet prompt', async () => {
  const f = fixture(), wait = deferred();
  f.deps.prepare = async () => { await wait.promise; return f.review; };
  const pending = submitMinerRollover(f.options, f.deps); f.close(); wait.resolve();
  await assert.rejects(pending, /wallet or selected miner changed/);
  assert.equal(f.sends(), 0); assert.deepEqual(f.writes, []);
});

test('closing while the wallet prompt is open still saves its returned transaction hash', async () => {
  const f = fixture(), started = deferred(), wallet = deferred();
  f.deps.send = async (_review, _provider, _rpc, _current, onWallet) => { onWallet(); started.resolve(); await wallet.promise; return hash; };
  const pending = submitMinerRollover(f.options, f.deps);
  await started.promise; f.close(); wallet.resolve();
  assert.equal((await pending).hash, hash); assert.equal(f.stored().state, 'pending');
  assert.deepEqual(f.stages.map(([stage]) => stage), ['checking', 'wallet']);
});

test('a simultaneous second click cannot start another prepare or send', async () => {
  const f = fixture(), wait = deferred(), started = deferred();
  const prepare = f.deps.prepare;
  f.deps.prepare = async (...args) => { started.resolve(); await wait.promise; return prepare(...args); };
  const pending = submitMinerRollover(f.options, f.deps); await started.promise;
  await assert.rejects(submitMinerRollover(f.options, f.deps), /Another wallet request/);
  wait.resolve(); await pending; assert.equal(f.sends(), 1);
});

for (const [label, fields, expected] of [
  ['wallet rejection', { code: 4001, walletRequestStarted: true }, 'resolved'],
  ['pre-wallet revalidation failure', { walletRequestStarted: false }, 'resolved'],
  ['unknown wallet error', { code: -32002, walletRequestStarted: true }, 'uncertain'],
  ['unclassified error', {}, 'uncertain'],
]) test(label + ' is journaled without retrying', async () => {
  const f = fixture(); let calls = 0;
  f.deps.send = async () => { calls++; throw Object.assign(Error(label), fields); };
  const result = await submitMinerRollover(f.options, f.deps);
  assert.equal(result.state, expected); assert.equal(f.stored().state, expected); assert.equal(calls, 1);
  assert.match(result.message, expected === 'resolved' && fields.walletRequestStarted === false ? /No transaction was requested/ : /No automatic retry/);
});

test('failure to save the requesting journal prevents any wallet request', async () => {
  const f = fixture(); f.deps.write = () => { throw Error('Storage unavailable.'); };
  await assert.rejects(submitMinerRollover(f.options, f.deps), /Storage unavailable/); assert.equal(f.sends(), 0);
});

test('a hash returned before a pending write failure is retained in the uncertain journal', async () => {
  const f = fixture(), write = f.deps.write;
  f.deps.write = (entry) => { if (entry.state === 'pending') throw Error('Storage write failed.'); write(entry); };
  const result = await submitMinerRollover(f.options, f.deps);
  assert.equal(result.state, 'uncertain'); assert.equal(result.hash, hash); assert.equal(f.stored().hash, hash); assert.equal(f.sends(), 1);
});

test('persistent storage failure after submission exposes the hash for recovery and never retries', async () => {
  const f = fixture(), write = f.deps.write;
  f.deps.write = (entry) => { if (entry.state !== 'requesting') throw Error('Storage write failed.'); write(entry); };
  await assert.rejects(submitMinerRollover(f.options, f.deps), (error) => error.hash === hash && error.message.includes(hash));
  assert.equal(f.sends(), 1); assert.equal(f.stored().state, 'requesting');
});

test('UI callback failures cannot discard or alter transaction outcomes', async () => {
  const f = fixture(); f.options.onStage = () => { throw Error('UI gone.'); };
  const result = await submitMinerRollover(f.options, f.deps); assert.equal(result.hash, hash); assert.equal(f.stored().state, 'pending');
});

test('another unresolved farm request blocks rollover before prepare', async () => {
  const f = fixture(); f.deps.assertNoPendingPosition = () => { throw Error('This miner action is pending.'); };
  await assert.rejects(submitMinerRollover(f.options, f.deps), /miner action is pending/);
  assert.deepEqual(f.events, ['lock', 'unlock']); assert.equal(f.sends(), 0);
});

test('the dedicated engine rejects unrelated position actions', async () => {
  const f = fixture(); f.options.request = { ...f.options.request, action: { kind: 'withdraw', index: 0 } };
  await assert.rejects(submitMinerRollover(f.options, f.deps), /Select a miner rollover/); assert.equal(f.sends(), 0);
});
