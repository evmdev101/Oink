import assert from "node:assert/strict";
import { test } from "node:test";
import { Contract, Interface } from "ethers";
import { PublicRpcProvider } from "../src/lib/publicRpcProvider.ts";
import { snapshotRunner } from "../src/lib/governanceReadSafety.ts";

const urls = ["https://primary.test", "https://backup.test", "https://third.test"];
const account = "0x0000000000000000000000000000000000000001";
const request = (id, method = "eth_blockNumber", params = []) => ({ id, jsonrpc: "2.0", method, params });
const defaultResult = payload => payload.method === "eth_chainId" ? "0x171" : "0x1234";
function response(payloads, result = defaultResult) {
  return { ok: true, status: 200, json: async () => payloads.map(payload => ({ id: payload.id, jsonrpc: "2.0", result: result(payload) })) };
}
function fixture(handler, options = {}) {
  const calls = [];
  const provider = new PublicRpcProvider(urls, 369n, {
    timeoutMs: 1000,
    fetch: async (url, options) => {
      const payloads = JSON.parse(options.body);
      calls.push({ url, payloads, signal: options.signal });
      return handler?.(url, payloads, options) ?? response(payloads);
    },
    ...options,
  });
  return { provider, calls };
}

test("a previously working endpoint outage fails over and later reads use the healthy endpoint", async () => {
  let outage = false;
  const { provider, calls } = fixture((url, payloads) => {
    if (url === urls[0] && outage) throw new TypeError("Failed to fetch");
    return response(payloads);
  });
  try {
    assert.equal(await provider.send("eth_blockNumber", []), "0x1234");
    outage = true;
    assert.equal(await provider.send("eth_blockNumber", []), "0x1234");
    assert.equal(await provider.send("eth_getBalance", [account, "latest"]), "0x1234");
    assert.deepEqual(calls.map(call => call.url), [urls[0], urls[0], urls[1], urls[1]]);
    assert.ok(calls.every(call => call.payloads.some(payload => payload.method === "eth_chainId")));
  } finally { provider.destroy(); }
});

test("a hung endpoint has a bounded deadline, aborts its request, and tries the backup", async () => {
  const { provider, calls } = fixture((url, payloads) => url === urls[0] ? new Promise(() => {}) : response(payloads), { timeoutMs: 20 });
  try {
    const started = Date.now();
    assert.equal(await provider.send("eth_blockNumber", []), "0x1234");
    assert.ok(Date.now() - started < 1000);
    assert.equal(calls[0].signal.aborted, true);
    assert.deepEqual(calls.map(call => call.url), [urls[0], urls[1]]);
  } finally { provider.destroy(); }
});

test("wrong-chain responses are never returned, including after the endpoint worked earlier", async () => {
  let wrongChain = false;
  const { provider, calls } = fixture((url, payloads) => response(payloads, payload => {
    if (payload.method === "eth_chainId") return url === urls[0] && wrongChain ? "0x1" : "0x171";
    return url === urls[0] && wrongChain ? "0xbad" : "0x1234";
  }));
  try {
    assert.equal(await provider.send("eth_getBalance", [account, "0x100"]), "0x1234");
    wrongChain = true;
    assert.equal(await provider.send("eth_getBalance", [account, "0x100"]), "0x1234");
    assert.deepEqual(calls.map(call => call.url), [urls[0], urls[0], urls[1]]);
  } finally { provider.destroy(); }
});

test("contract reverts and unsupported RPC methods are propagated without endpoint retries", async () => {
  const { provider, calls } = fixture((_url, payloads) => ({
    ok: true, status: 200, json: async () => payloads.map(payload => payload.method === "eth_chainId"
      ? { id: payload.id, result: "0x171" }
      : { id: payload.id, error: payload.method === "eth_call"
        ? { code: 3, message: "execution reverted: request timeout", data: "0x" }
        : { code: -32601, message: "method not found" } }),
  }));
  try {
    await assert.rejects(provider.send("eth_call", [{ to: account, data: "0x1234" }, "0x100"]), error => error.code === "CALL_EXCEPTION");
    await assert.rejects(provider.send("eth_feeHistory", [1, "latest", []]), /method not found|unsupported/i);
    assert.deepEqual(calls.map(call => call.url), [urls[0], urls[0]]);
  } finally { provider.destroy(); }
});

test("a mixed batch retries only rate-limited reads, preserving completed values and logical errors", async () => {
  const revert = { code: -32000, message: "execution reverted", data: "0x" };
  const { provider, calls } = fixture((url, payloads) => ({
    ok: true, status: 200, json: async () => payloads.map(payload => {
      if (payload.method === "eth_chainId") return { id: payload.id, result: "0x171" };
      if (url === urls[0] && payload.id === 1) return { id: payload.id, error: revert };
      if (url === urls[0] && payload.id === 2) return { id: payload.id, error: { code: -32005, message: "Rate limit exceeded" } };
      return { id: payload.id, result: "0x1234" };
    }),
  }));
  try {
    const result = await provider._send([request(1, "eth_call", [{ to: account }, "0x100"]), request(2), request(3)]);
    assert.deepEqual(result, [{ id: 1, error: revert }, { id: 2, result: "0x1234" }, { id: 3, result: "0x1234" }]);
    assert.deepEqual(calls[1].payloads.filter(payload => payload.id >= 0).map(payload => payload.id), [2]);
  } finally { provider.destroy(); }
});

test("concurrent batches preserve response IDs and share healthy endpoint selection", async () => {
  const { provider, calls } = fixture((url, payloads) => {
    if (url === urls[0]) throw new Error("Network disconnected");
    return response(payloads, payload => payload.method === "eth_chainId" ? "0x171" : payload.params[0]);
  });
  try {
    const values = await Promise.all(Array.from({ length: 20 }, (_, index) => provider.send("eth_getBalance", ["0x" + index.toString(16), "0x100"])));
    assert.deepEqual(values, Array.from({ length: 20 }, (_, index) => "0x" + index.toString(16)));
    const before = calls.length;
    assert.equal(await provider.send("eth_getBalance", ["0x99", "0x100"]), "0x99");
    assert.deepEqual(calls.slice(before).map(call => call.url), [urls[1]]);
  } finally { provider.destroy(); }
});

test("ethers Contract and snapshotRunner keep exact calldata and historical block through failover", async () => {
  const abi = new Interface(["function totalShares() view returns (uint256)"]);
  const { provider, calls } = fixture((url, payloads) => {
    if (url === urls[0] && payloads.some(payload => payload.method === "eth_call")) return { ok: false, status: 503 };
    // No Multicall deployment at this fixture block: exercise direct-read failover.
    return response(payloads, payload => payload.method === "eth_chainId" ? "0x171" : payload.method === "eth_getCode" ? "0x" : abi.encodeFunctionResult("totalShares", [987n]));
  });
  try {
    const contract = new Contract(account, abi, snapshotRunner(provider, 12345));
    assert.equal(await contract.totalShares({ blockTag: "latest" }), 987n);
    const reads = calls.flatMap(call => call.payloads.filter(payload => payload.method === "eth_call"));
    assert.equal(reads.length, 2);
    assert.deepEqual(reads[0], reads[1]);
    assert.equal(reads[0].params[1], "0x3039");
    assert.equal(reads[0].params[0].data, abi.encodeFunctionData("totalShares"));
  } finally { provider.destroy(); }
});

test("missing historical-state errors are not changed to latest or retried as an outage", async () => {
  const { provider, calls } = fixture((_url, payloads) => ({
    ok: true, status: 200, json: async () => payloads.map(payload => payload.method === "eth_chainId"
      ? { id: payload.id, result: "0x171" }
      : { id: payload.id, error: { code: -32000, message: "missing trie node" } }),
  }));
  try {
    await assert.rejects(provider.send("eth_call", [{ to: account }, "0x100"]), error => error.info?.error?.message === "missing trie node");
    assert.equal(calls.length, 1);
  } finally { provider.destroy(); }
});

test("contract-defined timeout text is not classified as a network error", async () => {
  const { provider, calls } = fixture((_url, payloads) => ({
    ok: true, status: 200, json: async () => payloads.map(payload => payload.method === "eth_chainId"
      ? { id: payload.id, result: "0x171" }
      : { id: payload.id, error: { code: -32000, message: "service unavailable" } }),
  }));
  try {
    await assert.rejects(provider.send("eth_call", [{ to: account }, "0x100"]), error => error.code === "CALL_EXCEPTION");
    assert.equal(calls.length, 1);
  } finally { provider.destroy(); }
});

test("incomplete or malformed responses recover without returning a missing result", async () => {
  const { provider, calls } = fixture((url, payloads) => {
    if (url === urls[0]) return { ok: true, status: 200, json: async () => [{ id: -1, result: "0x171" }] };
    if (url === urls[1]) return { ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected HTML"); } };
    return response(payloads);
  });
  try {
    assert.equal(await provider.send("eth_blockNumber", []), "0x1234");
    assert.deepEqual(calls.map(call => call.url), urls);
  } finally { provider.destroy(); }
});

test("exhausted call transport failures stay network errors, not fabricated contract reverts", async () => {
  const { provider, calls } = fixture(() => new Promise(() => {}), { timeoutMs: 10 });
  try {
    const started = Date.now();
    await assert.rejects(provider.send("eth_call", [{ to: account }, "0x100"]), error => error.code === "NETWORK_ERROR" && /temporarily unavailable/.test(error.message));
    assert.deepEqual(calls.map(call => call.url), urls);
    assert.ok(Date.now() - started < 1000);
    assert.ok(calls.every(call => call.signal.aborted));
  } finally { provider.destroy(); }
});

test("destroy immediately cancels reads even when the HTTP implementation ignores abort", async () => {
  let release;
  const { provider, calls } = fixture((_url, payloads) => new Promise(resolve => { release = () => resolve(response(payloads)); }));
  const read = provider._send(request(1));
  assert.equal(calls.length, 1);
  provider.destroy();
  release();
  await assert.rejects(read, /closed/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].signal.aborted, true);
});

test("total outage visits each endpoint once and a later retry can recover", async () => {
  let outage = true;
  const { provider, calls } = fixture((_url, payloads) => {
    if (outage) return { ok: false, status: 502 };
    return response(payloads);
  });
  try {
    await assert.rejects(provider.send("eth_blockNumber", []), /temporarily unavailable/);
    assert.deepEqual(calls.map(call => call.url), urls);
    outage = false;
    assert.equal(await provider.send("eth_blockNumber", []), "0x1234");
    assert.equal(calls.length, 4);
  } finally { provider.destroy(); }
});

test("signing, broadcasting and wallet permission requests never reach a public endpoint", async () => {
  const { provider, calls } = fixture();
  try {
    for (const method of ["eth_sendTransaction", "eth_sendRawTransaction", "eth_sign", "personal_sign", "eth_requestAccounts", "eth_accounts", "wallet_switchEthereumChain"]) {
      await assert.rejects(provider.send(method, []), /read-only/);
    }
    assert.equal(calls.length, 0);
  } finally { provider.destroy(); }
});
