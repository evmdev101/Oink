import { JsonRpcProvider, Network, type JsonRpcError, type JsonRpcPayload, type JsonRpcResult } from "ethers";

type RpcResponse = JsonRpcResult | JsonRpcError;
type Endpoint = { url: string; retryAfter: number; failureVersion: number };
type PublicRpcOptions = {
  timeoutMs?: number;
  cooldownMs?: number;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
};

// These methods read or simulate state. Signing, broadcasting, unlocked-node
// accounts and stateful filters must never be routed through public failover.
const READ_METHODS = new Set([
  "eth_chainId", "eth_blockNumber", "eth_call", "eth_estimateGas",
  "eth_getBalance", "eth_getCode", "eth_getStorageAt", "eth_getTransactionCount",
  "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getTransactionByHash",
  "eth_getTransactionReceipt", "eth_getLogs", "eth_gasPrice",
  "eth_maxPriorityFeePerGas", "eth_feeHistory", "net_version",
]);

function transientRpcError(response: RpcResponse, method: string) {
  if (!("error" in response)) return false;
  const { code, message = "" } = response.error;
  // A revert is a contract result, even if its reason mentions a timeout.
  if (code === 3 || /^0x[0-9a-f]*$/i.test(String(response.error.data ?? ""))
    || /revert|insufficient funds|invalid (?:argument|params)|unsupported|method not found/i.test(message)) return false;
  if (code === -32005) return true;
  // Calls can return arbitrary contract-defined text. Do not reinterpret a
  // contract's "service unavailable" reason as a transport failure.
  if (method === "eth_call" || method === "eth_estimateGas") return false;
  return /rate.?limit|too many requests|temporarily unavailable|service unavailable|request timed out|request timeout|upstream.*(?:timeout|unavailable)/i.test(message);
}

function rpcResponse(value: unknown): value is RpcResponse {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "number") return false;
  if ("result" in value && !("error" in value)) return true;
  if (!("error" in value) || "result" in value || !value.error || typeof value.error !== "object") return false;
  return "code" in value.error && typeof value.error.code === "number"
    && (!("message" in value.error) || typeof value.error.message === "string");
}

/** An ethers provider whose read-only HTTP batches recover from endpoint outages. */
export class PublicRpcProvider extends JsonRpcProvider {
  readonly snapshotBatching = true;
  private endpoints: Endpoint[];
  private preferred = 0;
  private timeoutMs: number;
  private cooldownMs: number;
  private fetchRead: typeof globalThis.fetch;
  private now: () => number;
  private requests = new Set<AbortController>();
  private chain: bigint;

  constructor(urls: readonly string[], chainId: bigint, options: PublicRpcOptions = {}) {
    // ethers still handles batching, Contract calls, block formatting and errors.
    // Our transport verifies the actual chain on every HTTP response batch.
    super(urls[0], new Network("pulsechain", chainId), { staticNetwork: true, batchMaxCount: 6 });
    if (!urls.length) throw new Error("At least one public RPC endpoint is required.");
    this.endpoints = urls.map(url => ({ url, retryAfter: 0, failureVersion: 0 }));
    this.chain = chainId;
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.cooldownMs = options.cooldownMs ?? 30000;
    if (!Number.isFinite(this.timeoutMs) || !(this.timeoutMs > 0)
      || !Number.isFinite(this.cooldownMs) || !(this.cooldownMs >= 0)) throw new Error("Invalid public RPC timing options.");
    this.fetchRead = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
  }

  private async readBatch(endpoint: Endpoint, payloads: JsonRpcPayload[]): Promise<RpcResponse[]> {
    const controller = new AbortController();
    this.requests.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortRead: () => void = () => {};
    // Append a probe to the same response batch; never trust an endpoint solely
    // because it used to be on PulseChain before a failover or configuration change.
    let chainProbeId = -1;
    while (payloads.some(payload => payload.id === chainProbeId)) chainProbeId--;
    const chainProbe: JsonRpcPayload = { id: chainProbeId, jsonrpc: "2.0", method: "eth_chainId", params: [] };
    try {
      return await Promise.race([
        (async () => {
          const response = await this.fetchRead(endpoint.url, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify([...payloads, chainProbe]), credentials: "omit", signal: controller.signal,
          });
          if (!response.ok) throw new Error(`Public RPC HTTP ${response.status}`);
          const body: unknown = await response.json();
          controller.signal.throwIfAborted();
          if (!Array.isArray(body)) throw new Error("Invalid public RPC batch response.");
          const values = body.filter(rpcResponse);
          const probes = values.filter(value => value.id === chainProbeId);
          if (probes.length !== 1 || !("result" in probes[0])
            || typeof probes[0].result !== "string" || !/^0x[0-9a-f]+$/i.test(probes[0].result)
            || BigInt(probes[0].result) !== this.chain) throw new Error("Public RPC did not verify PulseChain.");
          return values.filter(value => value.id !== chainProbeId);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => { reject(new Error("Public RPC request timed out.")); controller.abort(); }, this.timeoutMs);
          abortRead = () => reject(new Error("Public RPC request was cancelled."));
          controller.signal.addEventListener("abort", abortRead, { once: true });
        }),
      ]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", abortRead);
      this.requests.delete(controller);
    }
  }

  override async _send(payload: JsonRpcPayload | JsonRpcPayload[]): Promise<JsonRpcResult[]> {
    const originals = Array.isArray(payload) ? payload : [payload];
    for (const request of originals) {
      if (!READ_METHODS.has(request.method)) throw new Error(`Public RPC is read-only; ${request.method} is not allowed.`);
    }
    const completed = new Map<number, RpcResponse>();
    let pending = originals;
    const attempted = new Set<number>();
    while (pending.length && attempted.size < this.endpoints.length) {
      if (this.destroyed) throw new Error("Public RPC provider was closed.");
      // Concurrent reads share endpoint health. A failed node is avoided by new
      // batches, while a later retry can probe it again after the cooldown.
      const available = this.endpoints.map((endpoint, index) => ({ endpoint, index })).filter(({ index }) => !attempted.has(index));
      const healthy = available.filter(({ endpoint }) => endpoint.retryAfter <= this.now());
      const candidates = healthy.length ? healthy : available.sort((a, b) => a.endpoint.retryAfter - b.endpoint.retryAfter);
      const selected = candidates.find(({ index }) => index === this.preferred) ?? candidates[0];
      const { endpoint, index } = selected;
      const version = endpoint.failureVersion;
      attempted.add(index);
      try {
        const results = await this.readBatch(endpoint, pending);
        if (this.destroyed) throw new Error("Public RPC provider was closed.");
        const retry: JsonRpcPayload[] = [];
        for (const request of pending) {
          const matches = results.filter(result => result.id === request.id);
          if (matches.length !== 1 || transientRpcError(matches[0], request.method)) retry.push(request);
          else completed.set(request.id, matches[0]);
        }
        pending = retry;
        if (!pending.length) {
          // Do not let an older successful request undo a newer outage report.
          if (endpoint.failureVersion === version) { endpoint.retryAfter = 0; this.preferred = index; }
          break;
        }
      } catch {
        // Only HTTP, timeout, malformed-response and chain-verification failures
        // reach here. Valid JSON-RPC contract errors are returned unchanged above.
      }
      endpoint.failureVersion++;
      endpoint.retryAfter = this.now() + this.cooldownMs;
    }
    for (const request of pending) completed.set(request.id, {
      id: request.id, error: { code: -32098, message: "PulseChain RPC is temporarily unavailable. Please retry." },
    });
    // JsonRpcProvider declares JsonRpcResult[], but its batch dispatcher accepts
    // JsonRpcError responses too and maps them through ethers' getRpcError.
    return originals.map(request => completed.get(request.id)!) as JsonRpcResult[];
  }

  override getRpcError(payload: JsonRpcPayload, response: JsonRpcError): Error {
    // Exhausted transport recovery is not a contract revert. ethers otherwise
    // labels every eth_call RPC error as CALL_EXCEPTION / missing revert data.
    if (response.error.code === -32098) return Object.assign(new Error(response.error.message), { code: "NETWORK_ERROR" });
    return super.getRpcError(payload, response);
  }

  override destroy() {
    for (const controller of this.requests) controller.abort();
    this.requests.clear();
    super.destroy();
  }
}
