import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256, toQuantity, zeroPadValue } from 'ethers';

registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { COMMUNITY_DEPLOYMENTS: deployments } = await import('../src/config/communityMaintenanceVerification.ts');
const { OINK_TOKEN, TREASURY_WALLET } = await import('../src/config/contracts.ts');
const { readBuybacks, aggregateBuybacks, OINK_BUYBACK_FROM_BLOCK } = await import('../src/lib/oinkBuybacks.ts');
const { buybackChartSeries } = await import('../src/lib/buybackChartData.ts');

const BUYBACK = deployments.buyback.address;
const PAIR = deployments.pair.address;
const ROUTER = deployments.router.address;
const WPLS = deployments.wpls.address;
const EOA = '0x1111111111111111111111111111111111111111';
const DEGEN_BUYBACK = '0xCbC05cCC8257A085bC55e2EF184e16cd3ECD462A';
const code = '0x60016000';
for (const item of Object.values(deployments)) item.runtimeCodeHash = keccak256(code);
const unit = 10n ** 18n;
const DAY = 86400;
const HEAD = 30000000;
const HISTORICAL = 22000000;
const NOW = Math.floor(Date.now() / 1000);
const hash = (number, variant = 0) => '0x' + (BigInt(number) + BigInt(variant) * 10000000n).toString(16).padStart(64, '0');
const stamp = number => NOW - (HEAD - number) * 12;
const block = (number, variant = 0) => ({ number: toQuantity(number), hash: hash(number, variant), timestamp: toQuantity(stamp(number)) });
const abi = new Interface([
  'function DTX() view returns(address)', 'function wPLS() view returns(address)',
  'function PAIR_ADDRESS() view returns(address)', 'function UNISWAP_ROUTER_ADDRESS() view returns(address)',
  'function token0() view returns(address)', 'function token1() view returns(address)',
  'function treasury() view returns(address)', 'function buyWithPLS()',
  'event Transfer(address indexed from,address indexed to,uint256 value)',
  'event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)',
]);

function seedAt(number = HEAD - 10) {
  return { contracts: [{ address: BUYBACK, fromBlock: OINK_BUYBACK_FROM_BLOCK }], block: number, hash: hash(number), timestamp: stamp(number),
    rows: [{ address: BUYBACK, key: `${hash(900000)}:3`, tx: hash(900000), block: HISTORICAL, blockHash: hash(HISTORICAL), index: 3,
      timestamp: stamp(HISTORICAL), spentRaw: String(100n * unit), oinkRaw: String(50n * unit) }] };
}

function purchase(number = HEAD - 1, options = {}) {
  const txHash = hash(number + 1000000), received = options.received ?? 7n * unit + 123n, spent = options.spent ?? 20n * unit;
  const common = { blockNumber: toQuantity(number), blockHash: hash(number), transactionHash: txHash, removed: false };
  const log = { ...common, ...abi.encodeEventLog(abi.getEvent('Swap'), [ROUTER, spent, 0n, 0n, received, BUYBACK]), address: PAIR, logIndex: '0x3', ...options.log };
  const transfer = { ...common, ...abi.encodeEventLog(abi.getEvent('Transfer'), [PAIR, BUYBACK, received]), address: OINK_TOKEN, logIndex: '0x1', ...options.transfer };
  const inputTransfer = { ...common, ...abi.encodeEventLog(abi.getEvent('Transfer'), [ROUTER, PAIR, spent]), address: WPLS, logIndex: '0x0', ...options.inputTransfer };
  // The forward can include previously donated OINK. Only the swap output was purchased.
  const forward = { ...common, ...abi.encodeEventLog(abi.getEvent('Transfer'), [BUYBACK, TREASURY_WALLET, received + 999n * unit]), address: OINK_TOKEN, logIndex: '0x4' };
  const receipt = { status: '0x1', transactionHash: txHash, blockNumber: toQuantity(number), blockHash: hash(number), from: EOA, to: BUYBACK,
    logs: [inputTransfer, transfer, log, forward], ...options.receipt };
  // Contract funds the purchase; transaction value need not equal actual WPLS spent.
  const transaction = { hash: txHash, blockNumber: toQuantity(number), blockHash: hash(number), from: EOA, to: BUYBACK,
    input: abi.encodeFunctionData('buyWithPLS'), value: '0x0', ...options.transaction };
  return { log, receipt, transaction };
}

function fixture(purchases = [], options = {}) {
  const ranges = [], calls = [];
  const rpc = { async send(method, params) {
    calls.push([method, params]);
    if (method === 'eth_chainId') return toQuantity(options.chain ?? 369);
    if (method === 'eth_getBlockByNumber') {
      const number = params[0] === 'latest' ? options.head ?? HEAD : Number(BigInt(params[0]));
      return options.readBlock?.(number, params[0]) ?? block(number);
    }
    if (method === 'eth_getCode') return options.code ?? code;
    if (method === 'eth_call') {
      const name = abi.parseTransaction({ data: params[0].data }).name;
      const identities = { DTX: OINK_TOKEN, wPLS: WPLS, PAIR_ADDRESS: PAIR, UNISWAP_ROUTER_ADDRESS: ROUTER, token0: WPLS, token1: OINK_TOKEN, treasury: TREASURY_WALLET };
      assert.ok(name in identities, `Unexpected identity read ${name}`);
      return abi.encodeFunctionResult(name, [options.wrongIdentity ? EOA : identities[name]]);
    }
    if (method === 'eth_getLogs') {
      const filter = params[0], from = Number(BigInt(filter.fromBlock)), to = Number(BigInt(filter.toBlock));
      assert.equal(filter.address.toLowerCase(), PAIR.toLowerCase());
      assert.equal(filter.topics[0], abi.getEvent('Swap').topicHash);
      assert.equal(filter.topics[2].toLowerCase(), zeroPadValue(BUYBACK, 32).toLowerCase());
      assert.ok(to - from < 25000, 'Live scan requests remain bounded');
      ranges.push([from, to]);
      if (options.readLogs) return options.readLogs(from, to);
      return purchases.map(item => item.log).filter(log => Number(BigInt(log.blockNumber)) >= from && Number(BigInt(log.blockNumber)) <= to);
    }
    if (method === 'eth_getTransactionReceipt') return purchases.find(item => item.transaction.hash === params[0])?.receipt ?? null;
    if (method === 'eth_getTransactionByHash') return purchases.find(item => item.transaction.hash === params[0])?.transaction ?? null;
    throw Error(`Unexpected RPC method: ${method}`);
  }};
  return { rpc, ranges, calls };
}

test('buyback totals combine canonical archive and purchases using actual Swap spend and received OINK', async () => {
  const data = purchase(), f = fixture([data, data]);
  const result = await readBuybacks(f.rpc, null, seedAt());
  assert.equal(result.rows.length, 2, 'Duplicate RPC logs do not duplicate a purchase');
  assert.equal(result.rows[0].spentRaw, 20n * unit, 'Spend is Swap input, not zero transaction value');
  assert.equal(result.rows[0].oinkRaw, 7n * unit + 123n, 'Treasury forwards of older OINK are not counted');
  assert.equal(result.totalOinkRaw, 57n * unit + 123n);
  assert.equal(result.totalSpentRaw, 120n * unit);
  assert.deepEqual(aggregateBuybacks(result, DAY), { count: 1, oinkRaw: 7n * unit + 123n, spentRaw: 20n * unit });
  assert.deepEqual(f.ranges, [[HEAD - 9, HEAD]]);
  assert.ok(f.calls.every(([method]) => !/sendTransaction|sign/.test(method)));
});

test('live refresh reads only newly added blocks and preserves all prior confirmed purchases', async () => {
  const first = await readBuybacks(fixture([purchase()]).rpc, null, seedAt());
  const next = fixture([purchase(HEAD + 1)], { head: HEAD + 2 });
  const result = await readBuybacks(next.rpc, first, seedAt());
  assert.deepEqual(next.ranges, [[HEAD + 1, HEAD + 2]]);
  assert.equal(result.rows.length, 3);
  const same = fixture([], { head: HEAD + 2 });
  assert.equal((await readBuybacks(same.rpc, result, seedAt())).totalOinkRaw, result.totalOinkRaw);
  assert.equal(same.ranges.length, 0);
});

test('a changed previous anchor falls back to archive instead of retaining orphaned purchases', async () => {
  const first = await readBuybacks(fixture([purchase()]).rpc, null, seedAt());
  const next = fixture([purchase(HEAD + 1)], { head: HEAD + 2, readBlock: number => block(number, number === HEAD ? 1 : 0) });
  const result = await readBuybacks(next.rpc, first, seedAt());
  assert.deepEqual(next.ranges, [[HEAD - 9, HEAD + 2]]);
  assert.deepEqual(result.rows.map(row => row.block), [HEAD + 1, HISTORICAL]);
});

test('empty current windows are genuine zero totals, while failed scans reject instead of publishing zeros', async () => {
  const result = await readBuybacks(fixture().rpc, null, seedAt());
  assert.deepEqual(aggregateBuybacks(result, 30 * DAY), { count: 0, oinkRaw: 0n, spentRaw: 0n });
  await assert.rejects(readBuybacks(fixture([], { readLogs: () => { throw Error('Offline'); } }).rpc, null, seedAt()), /Offline/);
});

test('wrong chain, stale tip, changed archive and unverified contract data reject', async () => {
  await assert.rejects(readBuybacks(fixture([], { chain: 1 }).rpc, null, seedAt()), /PulseChain required/);
  await assert.rejects(readBuybacks(fixture([], { head: HEAD - 100 }).rpc, null, seedAt()), /Current buyback block unavailable/);
  await assert.rejects(readBuybacks(fixture([], { readBlock: number => block(number, number === HEAD - 10 ? 1 : 0) }).rpc, null, seedAt()), /archive anchor changed/);
  await assert.rejects(readBuybacks(fixture([], { code: '0x60026000' }).rpc, null, seedAt()), /contract code changed/);
  await assert.rejects(readBuybacks(fixture([], { wrongIdentity: true }).rpc, null, seedAt()), /contract identity changed/);
});

test('a changed head or removed event cannot become a complete snapshot', async () => {
  let reads = 0;
  const changing = fixture([], { readBlock: number => block(number, number === HEAD && ++reads > 1 ? 1 : 0) });
  await assert.rejects(readBuybacks(changing.rpc, null, seedAt()), /head changed/);
  await assert.rejects(readBuybacks(fixture([purchase(HEAD - 1, { log: { removed: true } })]).rpc, null, seedAt()), /Unexpected buyback record/);
});

test('cancellation makes no RPC request and cannot publish partial history', async () => {
  const controller = new AbortController(); controller.abort();
  const f = fixture();
  await assert.rejects(readBuybacks(f.rpc, null, seedAt(), controller.signal), { name: 'AbortError' });
  assert.equal(f.calls.length, 0);
});

test('cancellation during a pending log request aborts the refresh before publication', async () => {
  const controller = new AbortController();
  const f = fixture([], { readLogs: () => {
    queueMicrotask(() => controller.abort());
    return new Promise(() => {});
  }});
  await assert.rejects(readBuybacks(f.rpc, null, seedAt(), controller.signal), { name: 'AbortError' });
  assert.equal(f.calls.at(-1)[0], 'eth_getLogs');
});

test('an unsolicited swap from DEGEN or a different call does not count as an OINK protocol purchase', async () => {
  for (const options of [
    { transaction: { to: DEGEN_BUYBACK } },
    { transaction: { input: '0x12345678' } },
  ]) {
    const f = fixture([purchase(HEAD - 1, options)]);
    const result = await readBuybacks(f.rpc, null, seedAt());
    assert.equal(result.totalOinkRaw, 50n * unit);
    assert.equal(result.rows.length, 1);
  }
});

test('a failed or changed receipt or missing OINK transfer cannot count as a verified purchase', async () => {
  for (const [options, message] of [
    [{ receipt: { status: '0x0' } }, /transaction unavailable/],
    [{ receipt: { blockHash: hash(HEAD - 1, 1) } }, /transaction unavailable/],
    [{ transfer: { removed: true } }, /receipt changed|receipt log|transaction unavailable/],
    [{ inputTransfer: { blockHash: hash(HEAD - 1, 1) } }, /receipt changed|receipt log|transaction unavailable/],
    [{ transfer: abi.encodeEventLog(abi.getEvent('Transfer'), [PAIR, EOA, 7n * unit + 123n]) }, /OINK transfer unavailable/],
    [{ inputTransfer: abi.encodeEventLog(abi.getEvent('Transfer'), [ROUTER, PAIR, 999n * unit]) }, /PLS payment unavailable/],
    [{ log: abi.encodeEventLog(abi.getEvent('Swap'), [ROUTER, 0n, 1n, 2n, 0n, BUYBACK]) }, /Invalid buyback amounts/],
  ]) await assert.rejects(readBuybacks(fixture([purchase(HEAD - 1, options)]).rpc, null, seedAt()), message);
});

test('potentially truncated responses split down to complete ranges before publishing totals', async () => {
  let scans = 0;
  const f = fixture([], { readLogs: (from, to) => {
    scans++;
    return from === to ? [] : Array(1000).fill(purchase().log);
  }});
  const result = await readBuybacks(f.rpc, null, seedAt(HEAD - 2));
  assert.equal(result.totalOinkRaw, 50n * unit);
  assert.equal(scans, 3);
  const truncated = fixture([], { readLogs: () => Array(1000).fill(purchase().log) });
  await assert.rejects(readBuybacks(truncated.rpc, null, seedAt(HEAD - 1)), /history incomplete/);
});

test('a duplicate with conflicting amounts and a query range with missing history fail closed', async () => {
  const data = purchase(), conflict = purchase(HEAD - 1, { received: 99n * unit });
  await assert.rejects(readBuybacks(fixture([data, conflict]).rpc, null, seedAt()), /Conflicting buyback record/);
  const f = fixture([], { readLogs: from => {
    if (from > HEAD - 25000) throw Error('Later range unavailable');
    return [];
  }});
  await assert.rejects(readBuybacks(f.rpc, null, seedAt(HEAD - 25001)), /Later range unavailable/);
  assert.deepEqual(f.ranges, [[HEAD - 25000, HEAD - 1], [HEAD, HEAD]]);
});

test('archive rows cannot include an untracked contract, predeployment purchase or conflicting key', async () => {
  for (const mutate of [
    seed => { seed.rows[0].address = DEGEN_BUYBACK; },
    seed => { seed.rows[0].block = OINK_BUYBACK_FROM_BLOCK - 1; },
    seed => { seed.rows.push({ ...seed.rows[0], oinkRaw: '1' }); },
    seed => { seed.rows[0].timestamp = NOW + 1; },
  ]) {
    const seed = seedAt(); mutate(seed);
    await assert.rejects(readBuybacks(fixture().rpc, null, seed), /Invalid buyback|Conflicting buyback/);
  }
});

function chartSnapshot(timestamp, entries) {
  return { block: HEAD, hash: hash(HEAD), timestamp, totalOinkRaw: 0n, totalSpentRaw: 0n,
    rows: entries.map(([time, amount], index) => ({ address: BUYBACK, key: `${hash(index + 1)}:${index}`, tx: hash(index + 1), block: index,
      blockHash: hash(index), index, timestamp: time, oinkRaw: amount, spentRaw: 0n })) };
}

for (const [range, seconds, step, bins] of [['24H', DAY, 3600, 24], ['7D', 7 * DAY, 6 * 3600, 28], ['30D', 30 * DAY, DAY, 30]]) {
  test(`${range} chart agrees with exact window totals, including a purchase on the cutoff`, () => {
    const to = Date.parse('2026-11-01T19:17:34Z') / 1000;
    const snapshot = chartSnapshot(to, [[to - seconds - 1, 99n * unit], [to - seconds, unit + 7n], [to - seconds + step, 2n * unit + 3n], [to, 3n * unit + 1n], [to + 1, 77n * unit]]);
    const series = buybackChartSeries(snapshot, range);
    assert.equal(series.points.length, bins);
    assert.equal(series.count, 3);
    assert.equal(series.totalRaw, 6n * unit + 11n);
    assert.deepEqual(series.points[0], { timestamp: to - seconds + step, oinkRaw: unit + 7n, count: 1 });
    assert.equal(series.points[1].oinkRaw, 2n * unit + 3n);
    assert.equal(series.points.at(-1).oinkRaw, 3n * unit + 1n);
    assert.equal(series.points.reduce((sum, point) => sum + point.oinkRaw, 0n), series.totalRaw);
    assert.equal(aggregateBuybacks(snapshot, seconds).oinkRaw, series.totalRaw);
  });
}

test('all-history chart uses UTC months, combines each purchase once and preserves genuine empty months', () => {
  const date = value => Date.parse(value) / 1000;
  const to = date('2026-02-15T10:15:00Z');
  const series = buybackChartSeries(chartSnapshot(to, [
    [date('2025-11-30T23:59:59Z'), 1n], [date('2025-12-01T00:00:00Z'), 2n],
    [date('2025-12-31T23:59:59Z'), 3n], [to, 4n], [to + 1, 100n],
  ]), 'ALL');
  assert.deepEqual(series.points, [
    { timestamp: date('2025-12-01T00:00:00Z'), oinkRaw: 1n, count: 1 },
    { timestamp: date('2026-01-01T00:00:00Z'), oinkRaw: 5n, count: 2 },
    { timestamp: date('2026-02-01T00:00:00Z'), oinkRaw: 0n, count: 0 },
    { timestamp: to, oinkRaw: 4n, count: 1 },
  ]);
  assert.equal(series.totalRaw, 10n);
  assert.equal(series.count, 4);
});

test('every chart range represents an empty history as zero rather than inventing purchases', () => {
  for (const range of ['24H', '7D', '30D', 'ALL']) {
    const series = buybackChartSeries(chartSnapshot(NOW, [[NOW + 1, 10n]]), range);
    assert.equal(series.totalRaw, 0n);
    assert.equal(series.count, 0);
    assert.ok(series.points.length > 0);
    assert.ok(series.points.every(point => point.oinkRaw === 0n && point.count === 0));
    assert.equal(series.points.at(-1).timestamp, NOW);
  }
});
