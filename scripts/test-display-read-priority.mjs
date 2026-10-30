import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DisplayReadPriority } from '../src/lib/displayReadPriority.ts';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
test('history waits for visible balances, including readers registered in the same effect pass', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const queue = new DisplayReadPriority();
  let historyStarted = false;
  const wait = queue.wait(new AbortController().signal).then(() => { historyStarted = true; });
  const finishBalances = queue.begin();
  t.mock.timers.tick(1000); await flush();
  assert.equal(historyStarted, false);
  finishBalances(); t.mock.timers.tick(50); await wait;
  assert.equal(historyStarted, true);
});

test('slow or failed balances cannot permanently starve history', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const queue = new DisplayReadPriority();
  const finish = queue.begin();
  let ready = false;
  const wait = queue.wait(new AbortController().signal).then(() => { ready = true; });
  t.mock.timers.tick(2499); await flush(); assert.equal(ready, false);
  t.mock.timers.tick(1); await wait; assert.equal(ready, true);
  finish();
});

test('leaving the page cancels queued background work without waiting for balances', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const queue = new DisplayReadPriority(), controller = new AbortController();
  const finish = queue.begin();
  const check = assert.rejects(queue.wait(controller.signal), /Abort/);
  controller.abort(); await check;
  finish(); t.mock.timers.tick(5000);
});

test('canceled foreground readers release the queue; duplicate cleanup cannot release another reader', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const queue = new DisplayReadPriority(), controller = new AbortController();
  const finishFirst = queue.begin(controller.signal), finishSecond = queue.begin();
  let ready = false;
  const wait = queue.wait(new AbortController().signal).then(() => { ready = true; });
  controller.abort(); finishFirst(); finishFirst();
  t.mock.timers.tick(100); await flush(); assert.equal(ready, false);
  finishSecond(); t.mock.timers.tick(50); await wait;
  assert.equal(ready, true);
});

test('a page with no foreground work starts background reads without the full deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const queue = new DisplayReadPriority();
  const wait = queue.wait(new AbortController().signal);
  t.mock.timers.tick(50); await wait;
});
