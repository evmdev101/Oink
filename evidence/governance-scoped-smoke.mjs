// src/lib/governanceSections.ts
var GOVERNANCE_FAMILIES = ["Pool allocation", "Voting cost", "Enforcement delay", "Rollover bonus", "Harvest call fee", "Reward-event threshold", "New pool", "Vault setting", "Governor tax", "Governor transfer or burn", "Reward boost"];
function governanceReadPlan(scope) {
  const family = scope.startsWith("ordinary:") ? scope.slice(9) : null;
  if (family !== null && !GOVERNANCE_FAMILIES.some((value) => value === family)) throw new Error("Unknown proposal family.");
  return {
    ordinary: scope === "all" ? [...GOVERNANCE_FAMILIES] : family ? [family] : [],
    treasury: scope === "all" || scope === "treasury" || scope === "miner-voting",
    upgrades: scope === "all" || scope === "upgrades" || scope === "miner-voting"
  };
}
async function readGovernanceSections(scope, readers) {
  const coverage = governanceReadPlan(scope);
  const [families, treasury, upgrades] = await Promise.all([
    Promise.all(coverage.ordinary.map((family) => readers.ordinary(family))),
    coverage.treasury ? readers.treasury() : Promise.resolve([]),
    coverage.upgrades ? readers.upgrades() : Promise.resolve([])
  ]);
  return { history: families.flat(), treasury, upgrades, coverage };
}

// src/lib/sharedReadCache.ts
var SharedReadCache = class {
  entries = /* @__PURE__ */ new Map();
  maxEntries;
  constructor(maxEntries = 32) {
    this.maxEntries = maxEntries;
  }
  peek(key, maxAge = 18e5) {
    const entry = this.entries.get(key);
    return entry?.value !== void 0 && Date.now() - entry.savedAt < maxAge ? entry.value : null;
  }
  clear(prefix = "") {
    for (const [key, entry] of this.entries) {
      if (!key.startsWith(prefix)) continue;
      this.entries.delete(key);
      entry.controller?.abort();
    }
  }
  read(key, load, options = {}) {
    if (options.signal?.aborted) return Promise.reject(options.signal.reason);
    let entry = this.entries.get(key);
    if (entry?.value !== void 0 && Date.now() < entry.freshUntil) return Promise.resolve(entry.value);
    if (!entry?.pending) {
      if (!entry) {
        if (this.entries.size >= this.maxEntries) {
          const oldest = this.entries.keys().next().value;
          this.entries.get(oldest)?.controller?.abort();
          this.entries.delete(oldest);
        }
        entry = { savedAt: 0, freshUntil: 0 };
        this.entries.set(key, entry);
      }
      const current = entry;
      const controller = new AbortController();
      current.controller = controller;
      const timer = setTimeout(() => controller.abort(new Error("Shared read timed out")), options.timeout ?? 6e4);
      const work = Promise.resolve().then(() => {
        controller.signal.throwIfAborted();
        return load(controller.signal);
      });
      current.pending = this.observe(work, controller.signal).then((value) => {
        if (this.entries.get(key) === current) {
          current.value = value;
          current.savedAt = Date.now();
          current.freshUntil = current.savedAt + (options.cacheable?.(value) === false ? 0 : options.ttl ?? 2e4);
        }
        return value;
      }).finally(() => {
        clearTimeout(timer);
        current.pending = void 0;
        current.controller = void 0;
      });
      void current.pending.catch(() => {
      });
    }
    return this.observe(entry.pending, options.signal);
  }
  observe(promise, signal) {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(signal.reason);
    return new Promise((resolve, reject) => {
      const aborted = () => {
        cleanup();
        reject(signal.reason ?? new Error("Read cancelled"));
      };
      const cleanup = () => signal.removeEventListener("abort", aborted);
      signal.addEventListener("abort", aborted, { once: true });
      promise.then((value) => {
        cleanup();
        resolve(value);
      }, (error) => {
        cleanup();
        reject(error);
      });
    });
  }
};
var sharedDisplayReads = new SharedReadCache();
if (typeof window !== "undefined") window.addEventListener("oink-positions-changed", () => sharedDisplayReads.clear());

// src/lib/governance.ts
import { Contract, formatEther, formatUnits, getAddress as getAddress2, ZeroAddress } from "ethers";

// src/config/contracts.ts
var CORE_CONTRACTS = [
  {
    id: "oink-token",
    label: "OINK token",
    address: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
    source: "contracts/XPD.sol"
  },
  {
    id: "governor",
    label: "Governing contract",
    address: "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16",
    source: "contracts/governor.sol"
  },
  {
    id: "inflation",
    label: "Inflation",
    address: "0x486fEa20eA242456b450B005ED7D019E3E984f28",
    source: "contracts/masterchef.sol"
  },
  {
    id: "senate",
    label: "Senate",
    address: "0x147B43930283d1DDe43d805B7f17E4604b7ca493",
    source: "contracts/senate.sol"
  }
];
var TIME_MINER_CONTRACTS = [
  {
    id: "one-month",
    label: "1 month",
    address: "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8",
    source: "contracts/mining/1Month.sol"
  },
  {
    id: "three-month",
    label: "3 months",
    address: "0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4",
    source: "contracts/mining/3month.sol"
  },
  {
    id: "six-month",
    label: "6 months",
    address: "0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67",
    source: "contracts/mining/6month.sol"
  },
  {
    id: "one-year",
    label: "1 year",
    address: "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1",
    source: "contracts/mining/1year.sol"
  },
  {
    id: "three-year",
    label: "3 years",
    address: "0x15b51Ece819f3B51ce814de67bB2419660701a3c",
    source: "contracts/mining/3year.sol"
  },
  {
    id: "five-year",
    label: "5 years",
    address: "0xf3E82f4123d4262a2baEC25b03652f3932A91739",
    source: "contracts/mining/5year.sol"
  }
];
var ECOSYSTEM_MINER_CONTRACTS = [
  ["pls", "PLS", "0xE145932f6b010B0166aA6860D56b2730744B7d6f", "contracts/pulse-ecosystem/plsVault.sol"],
  ["plsx", "PLSX", "0x16233F6d7398f134EbCec11101e792c03ED296a4", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["inc", "INC", "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["hex", "HEX", "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["t-share", "HEX T-Share", "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85", "contracts/pulse-ecosystem/hexSharesVault.sol"],
  ["hoa", "HOA", "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pdai", "pDAI", "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["atropa", "ATROPA", "0x7c61919AccF037975bbD3a91b0F5811c640018b1", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["solidx", "SolidX", "0x2057dd1687eafCD809386a41012748AC509df542", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["treasury", "Treasury miner", "0x96185280d32184C847580c35eaB77affaC835d98", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pusdt", "pUSDT", "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pusdc", "pUSDC", "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pdrip", "PDRIP", "0xc49EF441FFb79108047E4dF812F375A7E48FD3De", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["emit", "EMIT", "0x1aB20028a50477e11bC4066047D8942De1375eF7", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["communitas", "Communitas", "0x4441c3bDB96139A45dF653Ec0432d076631A6D9F", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["ptgc", "pTGC", "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["ufo", "UFO", "0xce34298e7456fd748e432e02cc4f107ac864c739", "contracts/pulse-ecosystem/tokenVault.sol"]
].map(([id2, label, address2, source]) => ({ id: id2, label, address: address2, source }));
var GOVERNANCE_CONTRACTS = [
  {
    id: "consensus",
    label: "Consensus",
    address: "0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3",
    source: "contracts/consensus.sol"
  },
  {
    id: "reward-boost",
    label: "Reward boost",
    address: "0xc77c66913B5f60522Ccb98857228511930da7403",
    source: "contracts/rewardBoost.sol"
  },
  {
    id: "basic-settings",
    label: "Basic settings",
    address: "0x5DebADaf41ED55270e0F9944FD389745e73d29B9",
    source: "contracts/basicSettings.sol"
  },
  {
    id: "allocation-settings",
    label: "Allocation settings",
    address: "0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E",
    source: "contracts/farms.sol"
  },
  {
    id: "voting-credit",
    label: "Voting credit",
    address: "0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A",
    source: "contracts/votingCredit.sol"
  },
  {
    id: "referral-rewards",
    label: "Referral rewards",
    address: "0xf69357627d6dcc463ac30273Aae13fDB49B07C15",
    source: "contracts/referralRewards.sol"
  }
];
var TREASURY_AND_HELPER_CONTRACTS = [
  {
    id: "treasury-wallet",
    label: "Treasury wallet",
    address: "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69",
    source: "contracts/wallets/treasuryWallet.sol"
  },
  {
    id: "treasury-miner",
    label: "Treasury locked miner",
    address: "0x4807bdD7039a1fc236c14dc60D73a64eEa450731",
    source: "contracts/helper/treasuryMiner.sol"
  },
  {
    id: "nft-wallet",
    label: "NFT wallet",
    address: "0x26E6e614C46dA4c459d0dB2121A986672F603c00",
    source: "contracts/wallets/NFTwallet.sol"
  },
  {
    id: "nft-mining",
    label: "NFT mining module",
    address: "0x140f16365d05DcC84Fa489194CD022d5CBee4cb2",
    source: "contracts/NFT/NFTmining.sol"
  },
  {
    id: "nft-allocation",
    label: "NFT allocation",
    address: "0xD8508461e8134e25dc630871566B1551e797E1a7",
    source: "contracts/NFT/allocationNFT.sol"
  },
  {
    id: "buyback",
    label: "Buy-back",
    address: "0xa36d037B01C148025C54e4f86C0032F05a93D4Ce",
    source: "contracts/helper/buyBackAndBurn.sol"
  },
  {
    id: "proxy-voting",
    label: "Proxy voting",
    address: "0x003F5d5bB97028AF17B0925B08cb184a74F9030f",
    source: "contracts/helper/proxyVoting.sol"
  },
  {
    id: "contract-sync",
    label: "Contract sync",
    address: "0x506D24B519AC4Af9724Cc5F9eaf006e987e753d6",
    source: "contracts/helper/contractSync.sol"
  }
];
var OINK_TOKEN = CORE_CONTRACTS[0].address;
var TREASURY_WALLET = TREASURY_AND_HELPER_CONTRACTS[0].address;

// src/lib/publicRpcProvider.ts
import { JsonRpcProvider, Network } from "ethers";
var READ_METHODS = /* @__PURE__ */ new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_call",
  "eth_estimateGas",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_getTransactionCount",
  "eth_getBlockByNumber",
  "eth_getBlockByHash",
  "eth_getTransactionByHash",
  "eth_getTransactionReceipt",
  "eth_getLogs",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "net_version"
]);
function transientRpcError(response, method) {
  if (!("error" in response)) return false;
  const { code, message = "" } = response.error;
  if (code === 3 || /^0x[0-9a-f]*$/i.test(String(response.error.data ?? "")) || /revert|insufficient funds|invalid (?:argument|params)|unsupported|method not found/i.test(message)) return false;
  if (code === -32005) return true;
  if (method === "eth_call" || method === "eth_estimateGas") return false;
  return /rate.?limit|too many requests|temporarily unavailable|service unavailable|request timed out|request timeout|upstream.*(?:timeout|unavailable)/i.test(message);
}
function rpcResponse(value) {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "number") return false;
  if ("result" in value && !("error" in value)) return true;
  if (!("error" in value) || "result" in value || !value.error || typeof value.error !== "object") return false;
  return "code" in value.error && typeof value.error.code === "number" && (!("message" in value.error) || typeof value.error.message === "string");
}
var PublicRpcProvider = class extends JsonRpcProvider {
  snapshotBatching = true;
  endpoints;
  preferred = 0;
  timeoutMs;
  cooldownMs;
  fetchRead;
  now;
  requests = /* @__PURE__ */ new Set();
  chain;
  constructor(urls, chainId, options = {}) {
    super(urls[0], new Network("pulsechain", chainId), { staticNetwork: true, batchMaxCount: 6 });
    if (!urls.length) throw new Error("At least one public RPC endpoint is required.");
    this.endpoints = urls.map((url) => ({ url, retryAfter: 0, failureVersion: 0 }));
    this.chain = chainId;
    this.timeoutMs = options.timeoutMs ?? 8e3;
    this.cooldownMs = options.cooldownMs ?? 3e4;
    if (!Number.isFinite(this.timeoutMs) || !(this.timeoutMs > 0) || !Number.isFinite(this.cooldownMs) || !(this.cooldownMs >= 0)) throw new Error("Invalid public RPC timing options.");
    this.fetchRead = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.now = options.now ?? Date.now;
  }
  async readBatch(endpoint, payloads) {
    const controller = new AbortController();
    this.requests.add(controller);
    let timer;
    let abortRead = () => {
    };
    let chainProbeId = -1;
    while (payloads.some((payload) => payload.id === chainProbeId)) chainProbeId--;
    const chainProbe = { id: chainProbeId, jsonrpc: "2.0", method: "eth_chainId", params: [] };
    try {
      return await Promise.race([
        (async () => {
          const response = await this.fetchRead(endpoint.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify([...payloads, chainProbe]),
            credentials: "omit",
            signal: controller.signal
          });
          if (!response.ok) throw new Error(`Public RPC HTTP ${response.status}`);
          const body = await response.json();
          controller.signal.throwIfAborted();
          if (!Array.isArray(body)) throw new Error("Invalid public RPC batch response.");
          const values = body.filter(rpcResponse);
          const probes = values.filter((value) => value.id === chainProbeId);
          if (probes.length !== 1 || !("result" in probes[0]) || typeof probes[0].result !== "string" || !/^0x[0-9a-f]+$/i.test(probes[0].result) || BigInt(probes[0].result) !== this.chain) throw new Error("Public RPC did not verify PulseChain.");
          return values.filter((value) => value.id !== chainProbeId);
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error("Public RPC request timed out."));
            controller.abort();
          }, this.timeoutMs);
          abortRead = () => reject(new Error("Public RPC request was cancelled."));
          controller.signal.addEventListener("abort", abortRead, { once: true });
        })
      ]);
    } finally {
      clearTimeout(timer);
      controller.signal.removeEventListener("abort", abortRead);
      this.requests.delete(controller);
    }
  }
  async _send(payload) {
    const originals = Array.isArray(payload) ? payload : [payload];
    for (const request of originals) {
      if (!READ_METHODS.has(request.method)) throw new Error(`Public RPC is read-only; ${request.method} is not allowed.`);
    }
    const completed = /* @__PURE__ */ new Map();
    let pending = originals;
    const attempted = /* @__PURE__ */ new Set();
    while (pending.length && attempted.size < this.endpoints.length) {
      if (this.destroyed) throw new Error("Public RPC provider was closed.");
      const available = this.endpoints.map((endpoint2, index2) => ({ endpoint: endpoint2, index: index2 })).filter(({ index: index2 }) => !attempted.has(index2));
      const healthy = available.filter(({ endpoint: endpoint2 }) => endpoint2.retryAfter <= this.now());
      const candidates = healthy.length ? healthy : available.sort((a, b) => a.endpoint.retryAfter - b.endpoint.retryAfter);
      const selected = candidates.find(({ index: index2 }) => index2 === this.preferred) ?? candidates[0];
      const { endpoint, index } = selected;
      const version = endpoint.failureVersion;
      attempted.add(index);
      try {
        const results = await this.readBatch(endpoint, pending);
        if (this.destroyed) throw new Error("Public RPC provider was closed.");
        const retry = [];
        for (const request of pending) {
          const matches = results.filter((result) => result.id === request.id);
          if (matches.length !== 1 || transientRpcError(matches[0], request.method)) retry.push(request);
          else completed.set(request.id, matches[0]);
        }
        pending = retry;
        if (!pending.length) {
          if (endpoint.failureVersion === version) {
            endpoint.retryAfter = 0;
            this.preferred = index;
          }
          break;
        }
      } catch {
      }
      endpoint.failureVersion++;
      endpoint.retryAfter = this.now() + this.cooldownMs;
    }
    for (const request of pending) completed.set(request.id, {
      id: request.id,
      error: { code: -32098, message: "PulseChain RPC is temporarily unavailable. Please retry." }
    });
    return originals.map((request) => completed.get(request.id));
  }
  getRpcError(payload, response) {
    if (response.error.code === -32098) return Object.assign(new Error(response.error.message), { code: "NETWORK_ERROR" });
    return super.getRpcError(payload, response);
  }
  destroy() {
    for (const controller of this.requests) controller.abort();
    this.requests.clear();
    super.destroy();
  }
};

// src/lib/chain.ts
var CHAIN_ID = 369n;
var RPCS = [
  "https://rpc.pulsechain.com",
  "https://pulsechain.publicnode.com",
  "https://rpc-pulsechain.g4mm4.io"
];
var cachedProvider = null;
async function getPublicProvider() {
  if (!cachedProvider || cachedProvider.destroyed) cachedProvider = new PublicRpcProvider(RPCS, CHAIN_ID);
  return cachedProvider;
}

// src/lib/snapshotMulticall.ts
import { Interface, id, keccak256, makeError } from "ethers";
var MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
var MULTICALL_RUNTIME_HASH = "0xd5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891";
var multicallInterface = new Interface(["function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)"]);
var getters = new Set([
  "DTXPerBlock()",
  "balanceOf()",
  "balanceOf(address)",
  "basicContract()",
  "callFee()",
  "callFeeProposal(uint256)",
  "changeGovernorActivated()",
  "consensusContract()",
  "consensusProposal(uint256)",
  "costToVote()",
  "creditContract()",
  "decimals()",
  "defaultDirectPayout()",
  "delayBeforeEnforce()",
  "delayProposals(uint256)",
  "depositFee()",
  "dtx()",
  "eligibleNewGovernor()",
  "eventFibonacceningActive()",
  "farmContract()",
  "fibonacceningActiveID()",
  "fibonacceningContract()",
  "fibonacceningProposals(uint256)",
  "fundingRate()",
  "getNrOfStakes(address)",
  "getPricePerFullShare()",
  "getRollBonus(address)",
  "getUserTotalShares(address)",
  "govTaxProposals(uint256)",
  "governor()",
  "governorCount()",
  "governorFee()",
  "governorTransferProposals(uint256)",
  "gracePeriod()",
  "hexC()",
  "highestConsensusVotes(uint256)",
  "isGovInvalidated(address)",
  "isSenator(address)",
  "masterchef()",
  "maxNftAllocation()",
  "maxPulseEcoAllocation()",
  "maxPulseEcoTotalAllocation()",
  "maxSenators()",
  "maxStakes()",
  "minDepositProposals(uint256)",
  "minSenators()",
  "minThresholdFibonacceningProposal(uint256)",
  "multiCall()",
  "multiCall(address)",
  "multiCall(address,uint256)",
  "newGovernorBlockDelay()",
  "newGovernorRequestBlock()",
  "newPoolProposal(uint256)",
  "owner()",
  "percentageAllocatedToPulseEcosystem()",
  "poolID()",
  "poolInfo(uint256)",
  "proposalFarmUpdate(uint256)",
  "proposalLengths()",
  "publicBalanceOf()",
  "referralBonus()",
  "rolloverBonuses(uint256)",
  "safePeriod()",
  "senateContract()",
  "senatorCount()",
  "stakeToken()",
  "startBlock()",
  "symbol()",
  "thresholdFibonaccening()",
  "token()",
  "tokensCastedPerVote(uint256)",
  "totalAllocPoint()",
  "totalDTXStaked()",
  "totalShares()",
  "totalTshares()",
  "treasury()",
  "treasuryProposal(uint256)",
  "userCredit(address)",
  "userDelegate(address)",
  "userInfo(address,uint256)",
  "userVote(address)",
  "vaultProposals(uint256)",
  "viewSenators()",
  "withdrawFeePeriod()"
].map((signature) => id(signature).slice(0, 10)));
function snapshotBatchCall(provider, direct, block, signal) {
  let queued = [];
  let scheduled = false;
  let supported;
  const memo = /* @__PURE__ */ new Map();
  const flush = async () => {
    scheduled = false;
    const items = queued.splice(0, 40);
    if (queued.length) {
      scheduled = true;
      setTimeout(() => {
        void flush();
      }, 0);
    }
    try {
      signal?.throwIfAborted();
      supported ??= provider.getCode(MULTICALL_ADDRESS, block).then((code) => keccak256(code) === MULTICALL_RUNTIME_HASH).catch(() => false);
      if (!await supported) {
        await Promise.all(items.map((item) => direct(item.tx).then(item.resolve, item.reject)));
        return;
      }
      signal?.throwIfAborted();
      let results;
      try {
        const data = multicallInterface.encodeFunctionData("aggregate3", [items.map(({ tx }) => [tx.to, true, tx.data])]);
        const raw = await direct({ to: MULTICALL_ADDRESS, data, blockTag: block });
        results = multicallInterface.decodeFunctionResult("aggregate3", raw)[0];
        if (results.length !== items.length) throw Error("Incomplete Multicall response");
      } catch {
        signal?.throwIfAborted();
        await Promise.all(items.map((item) => direct(item.tx).then(item.resolve, item.reject)));
        return;
      }
      signal?.throwIfAborted();
      items.forEach((item, index) => {
        const row = results[index];
        if (row[0]) item.resolve(row[1]);
        else item.reject(makeError("Snapshot getter reverted", "CALL_EXCEPTION", { action: "call", data: row[1], reason: null, invocation: null, revert: null, transaction: { to: String(item.tx.to), data: String(item.tx.data) } }));
      });
    } catch (error) {
      items.forEach((item) => item.reject(error));
    }
  };
  return (tx) => {
    if (signal?.aborted) return Promise.reject(signal.reason);
    const keys = Object.keys(tx).filter((key2) => tx[key2] != null);
    if (typeof tx.to !== "string" || !/^0x[0-9a-f]{40}$/i.test(tx.to) || typeof tx.data !== "string" || !getters.has(tx.data.slice(0, 10)) || keys.some((key2) => !["to", "data", "blockTag"].includes(key2))) return direct(tx);
    const key = tx.to.toLowerCase() + ":" + tx.data;
    let result = memo.get(key);
    if (!result) {
      result = new Promise((resolve, reject) => {
        queued.push({ tx, resolve, reject });
        if (!scheduled) {
          scheduled = true;
          setTimeout(() => {
            void flush();
          }, 0);
        }
      });
      memo.set(key, result);
      void result.catch(() => {
        memo.delete(key);
      });
    }
    return result;
  };
}

// src/lib/governanceReadSafety.ts
import { getAddress } from "ethers";
function snapshotRunner(provider, blockNumber, signal) {
  let active = 0;
  const queue = [];
  const direct = async (transaction) => {
    signal?.throwIfAborted();
    if (active >= 12) await new Promise((resolve) => queue.push(resolve));
    else active++;
    try {
      signal?.throwIfAborted();
      return await provider.call({ ...transaction, blockTag: blockNumber });
    } finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
  return { provider: null, call: provider.snapshotBatching && provider.getCode ? snapshotBatchCall({ getCode: provider.getCode.bind(provider) }, direct, blockNumber, signal) : direct };
}
function allProposalIds(count) {
  if (!Number.isSafeInteger(count) || count < 0 || count > 5e3) {
    throw new Error("Proposal count exceeds the supported scan size; coverage is incomplete.");
  }
  return Array.from({ length: count }, (_, index) => count - index - 1);
}
function decodeSenateBallots(members, returnedMembers, ballots) {
  if (returnedMembers.length !== members.length || ballots.length !== members.length) {
    throw new Error("Senate ballot response does not match the member registry.");
  }
  return members.map((member, index) => {
    if (getAddress(returnedMembers[index]) !== getAddress(member)) {
      throw new Error("Senate ballot order does not match the member registry.");
    }
    return ballots[index].map((ballot) => ballot.toString());
  });
}

// src/lib/governance.ts
var address = (records, id2) => records.find((record) => record.id === id2).address;
var ADDRESSES = {
  token: address(CORE_CONTRACTS, "oink-token"),
  governor: address(CORE_CONTRACTS, "governor"),
  senate: address(CORE_CONTRACTS, "senate"),
  consensus: address(GOVERNANCE_CONTRACTS, "consensus"),
  basic: address(GOVERNANCE_CONTRACTS, "basic-settings"),
  farms: address(GOVERNANCE_CONTRACTS, "allocation-settings"),
  reward: address(GOVERNANCE_CONTRACTS, "reward-boost"),
  credit: address(GOVERNANCE_CONTRACTS, "voting-credit")
};
var tokenAbi = ["function governor() view returns (address)", "function owner() view returns (address)"];
var governorAbi = [
  ...["basicContract", "farmContract", "fibonacceningContract", "consensusContract", "creditContract", "senateContract", "masterchef"].map((name) => `function ${name}() view returns (address)`),
  "function costToVote() view returns (uint256)",
  "function delayBeforeEnforce() view returns (uint256)",
  "function thresholdFibonaccening() view returns (uint256)",
  "function depositFee() view returns (uint256)",
  "function fundingRate() view returns (uint256)",
  "function referralBonus() view returns (uint256)",
  "function eventFibonacceningActive() view returns (bool)",
  "function getRollBonus(address) view returns (uint256)",
  "function eligibleNewGovernor() view returns (address)",
  "function changeGovernorActivated() view returns (bool)",
  "function newGovernorRequestBlock() view returns (uint256)",
  "function newGovernorBlockDelay() view returns (uint256)"
];
var senateAbi = [
  "function senatorCount() view returns (uint256)",
  "function minSenators() view returns (uint256)",
  "function maxSenators() view returns (uint256)",
  "function viewSenators() view returns (address[])",
  "function isSenator(address) view returns (bool)",
  "function multiCall() view returns (address[],uint256[][],uint256[],uint256,uint256[])"
];
var consensusAbi = [
  "function proposalLengths() view returns (uint256 treasuryCount,uint256 consensusCount)",
  "function governorCount() view returns (uint256)",
  "function totalDTXStaked() view returns (uint256)",
  "function consensusProposal(uint256) view returns (uint16 typeOfChange,address beneficiaryAddress,uint256 timestamp)",
  "function treasuryProposal(uint256) view returns (bool valid,uint256 firstCallTimestamp,uint256 valueSacrificedForVote,uint256 valueSacrificedAgainst,uint256 delay,address tokenAddress,address beneficiary,uint256 amountToSend,uint256 consensusProposalID)",
  "function tokensCastedPerVote(uint256) view returns (uint256)",
  "function highestConsensusVotes(uint256) view returns (uint256)",
  "function isGovInvalidated(address) view returns (bool isInvalidated,bool hasPassed)"
];
var basicAbi = [
  "function proposalLengths() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  "function minDepositProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function newPoolProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,address)",
  "function delayProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function callFeeProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function rolloverBonuses(uint256) view returns (bool,uint256,uint256,uint256,uint256,address,uint256)",
  "function minThresholdFibonacceningProposal(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)"
];
var farmsAbi = [
  "function proposalLengths() view returns (uint256,uint256,uint256,uint256)",
  "function proposalFarmUpdate(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256,uint16)",
  "function vaultProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function governorTransferProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,bool,uint256)",
  "function govTaxProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256)",
  "function percentageAllocatedToPulseEcosystem() view returns (uint256)",
  "function maxNftAllocation() view returns (uint256)",
  "function maxPulseEcoAllocation() view returns (uint256)",
  "function maxPulseEcoTotalAllocation() view returns (uint256)"
];
var rewardAbi = [
  "function proposalLengths() view returns (uint256)",
  "function fibonacceningProposals(uint256) view returns (bool,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function fibonacceningActiveID() view returns (uint256)"
];
var creditAbi = ["function userCredit(address) view returns (uint256)"];
var erc20Abi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
var minerAbi = [
  "function totalShares() view returns (uint256)",
  "function getPricePerFullShare() view returns (uint256)",
  "function callFee() view returns (uint256)",
  "function getUserTotalShares(address) view returns (uint256)",
  "function userVote(address) view returns (uint256)",
  "function userDelegate(address) view returns (address)"
];
var toNumber = (value) => Number(value);
var tokens = (value) => formatEther(value);
var pct = (value) => Number(value) / 100;
function proposalStatus(valid, openedAt, delay, globalDelay, now) {
  if (!valid) return "Closed on-chain";
  if (now < openedAt + delay) return "Voting open \u2014 requested delay";
  if (now < openedAt + delay + globalDelay) return "Voting open \u2014 review window";
  return "Voting ended \u2014 execution not verified";
}
async function fetchGovernanceBase(onProgress = () => {
}, signal, selectedAccount = null) {
  onProgress("Reading contract configuration");
  const rpc = await getPublicProvider();
  const block = await rpc.getBlock("latest");
  const walletAddress = selectedAccount ? getAddress2(selectedAccount) : null;
  if (!block?.hash) throw new Error("Unable to verify the snapshot block. Refresh to retry.");
  const blockNumber = block.number;
  const now = block.timestamp;
  const provider = snapshotRunner(rpc, blockNumber, signal);
  const token = new Contract(ADDRESSES.token, tokenAbi, provider);
  const deployedGovernor = getAddress2(await token.governor());
  if (deployedGovernor !== getAddress2(ADDRESSES.governor)) {
    throw new Error(`Governor changed to ${deployedGovernor}. Contract mappings must be reviewed before displaying governance state.`);
  }
  const chef = new Contract(await token.owner(), ["function governorFee() view returns (uint256)"], provider);
  const governorShare = await chef.governorFee();
  const governor = new Contract(ADDRESSES.governor, governorAbi, provider);
  const links = {
    basicContract: ADDRESSES.basic,
    farmContract: ADDRESSES.farms,
    fibonacceningContract: ADDRESSES.reward,
    consensusContract: ADDRESSES.consensus,
    creditContract: ADDRESSES.credit,
    senateContract: ADDRESSES.senate,
    masterchef: address(CORE_CONTRACTS, "inflation")
  };
  await Promise.all(Object.entries(links).map(async ([getter, expected]) => {
    if (getAddress2(await governor[getter]()) !== getAddress2(expected)) {
      throw new Error(`${getter} mapping changed; contract review required.`);
    }
  }));
  const senate = new Contract(ADDRESSES.senate, senateAbi, provider);
  const consensus = new Contract(ADDRESSES.consensus, consensusAbi, provider);
  const basic = new Contract(ADDRESSES.basic, basicAbi, provider);
  const farms = new Contract(ADDRESSES.farms, farmsAbi, provider);
  const reward = new Contract(ADDRESSES.reward, rewardAbi, provider);
  const credit = new Contract(ADDRESSES.credit, creditAbi, provider);
  const [
    currentGovernor,
    costToVote,
    delayBeforeEnforce,
    thresholdFibonaccening,
    depositFee,
    fundingRate,
    referralBonus,
    rewardEventActive,
    rollBonuses,
    basicLengths,
    farmLengths,
    rewardLength,
    pulseAllocation,
    maxNftAllocation,
    maxPulseAllocation,
    maxPulseTotalAllocation,
    senatorCount,
    minSenators,
    maxSenators,
    members,
    consensusLengths,
    governorCount,
    totalLocked,
    eligibleGovernor,
    activationPending,
    requestBlock,
    blockDelay,
    walletCredit
  ] = await Promise.all([
    token.governor(),
    governor.costToVote(),
    governor.delayBeforeEnforce(),
    governor.thresholdFibonaccening(),
    governor.depositFee(),
    governor.fundingRate(),
    governor.referralBonus(),
    governor.eventFibonacceningActive(),
    Promise.all(TIME_MINER_CONTRACTS.map((miner) => governor.getRollBonus(miner.address))),
    basic.proposalLengths(),
    farms.proposalLengths(),
    reward.proposalLengths(),
    farms.percentageAllocatedToPulseEcosystem(),
    farms.maxNftAllocation(),
    farms.maxPulseEcoAllocation(),
    farms.maxPulseEcoTotalAllocation(),
    senate.senatorCount(),
    senate.minSenators(),
    senate.maxSenators(),
    senate.viewSenators(),
    consensus.proposalLengths(),
    consensus.governorCount(),
    consensus.totalDTXStaked(),
    governor.eligibleNewGovernor(),
    governor.changeGovernorActivated(),
    governor.newGovernorRequestBlock(),
    governor.newGovernorBlockDelay(),
    walletAddress ? credit.userCredit(walletAddress) : Promise.resolve(null)
  ]);
  const globalDelay = toNumber(delayBeforeEnforce);
  const basicCounts = Array.from(basicLengths, toNumber);
  const farmCounts = Array.from(farmLengths, toNumber);
  const rewardCount = toNumber(rewardLength);
  const minerWeights = [20, 30, 50, 75, 115, 150];
  const miners = await Promise.all(TIME_MINER_CONTRACTS.map(async (record, index) => {
    const miner = new Contract(record.address, minerAbi, provider);
    const [totalShares, price, callFee, walletShares, selectedPosition, delegate] = await Promise.all([
      miner.totalShares(),
      miner.getPricePerFullShare(),
      miner.callFee(),
      walletAddress ? miner.getUserTotalShares(walletAddress) : Promise.resolve(null),
      walletAddress ? miner.userVote(walletAddress) : Promise.resolve(null),
      walletAddress ? miner.userDelegate(walletAddress) : Promise.resolve(null)
    ]);
    const weighted = walletShares === null ? null : BigInt(walletShares.toString()) * BigInt(price.toString()) * BigInt(minerWeights[index]) / (100n * 10n ** 18n);
    return {
      label: record.label,
      address: record.address,
      weight: minerWeights[index],
      totalShares: tokens(totalShares),
      pricePerShare: tokens(price),
      callFee: pct(callFee).toString(),
      walletShares: walletShares === null ? void 0 : tokens(walletShares),
      walletWeightedPower: weighted === null ? void 0 : tokens(weighted),
      selectedPosition: selectedPosition === null ? void 0 : toNumber(selectedPosition),
      delegate: delegate === null ? void 0 : getAddress2(delegate)
    };
  }));
  const memberAddresses = members.map(getAddress2);
  let memberVotes = [];
  if (memberAddresses.length) {
    try {
      const senateData = await senate.multiCall();
      memberVotes = decodeSenateBallots(memberAddresses, senateData[0], senateData[1]);
    } catch {
      memberVotes = null;
    }
  }
  const walletIsMember = walletAddress ? Boolean(await senate.isSenator(walletAddress)) : null;
  onProgress("Verifying the completed governance snapshot");
  const confirmedBlock = await rpc.getBlock(blockNumber);
  if (!confirmedBlock || confirmedBlock.hash !== block.hash) {
    throw new Error("Snapshot block changed during loading. Refresh to read a consistent snapshot.");
  }
  return {
    blockNumber,
    blockHash: block.hash,
    coverage: { ordinary: [], treasury: false, upgrades: false },
    registryCounts: { treasury: toNumber(consensusLengths[0]), consensus: toNumber(consensusLengths[1]), upgrades: toNumber(governorCount) },
    blockTimestamp: now,
    walletAddress,
    settings: {
      currentGovernor: getAddress2(currentGovernor),
      votingCost: tokens(costToVote),
      delaySeconds: globalDelay,
      rewardThreshold: tokens(thresholdFibonaccening),
      depositFee: pct(depositFee),
      fundingRate: Number(formatUnits(fundingRate, 4)),
      governorShare: pct(governorShare),
      referralBonus: pct(referralBonus),
      rewardEventActive: Boolean(rewardEventActive),
      rollBonuses: rollBonuses.map((value) => pct(value)),
      pulseAllocation: pct(pulseAllocation),
      maxNftAllocation: pct(maxNftAllocation),
      maxPulseAllocation: pct(maxPulseAllocation),
      maxPulseTotalAllocation: pct(maxPulseTotalAllocation)
    },
    counts: {
      "Voting cost": basicCounts[0],
      "New pool": basicCounts[1],
      "Enforcement delay": basicCounts[2],
      "Harvest call fee": basicCounts[3],
      "Rollover bonus": basicCounts[4],
      "Reward-event threshold": basicCounts[5],
      "Pool allocation": farmCounts[0],
      "Vault setting": farmCounts[1],
      "Governor transfer or burn": farmCounts[2],
      "Governor tax": farmCounts[3],
      "Reward boost": rewardCount
    },
    history: [],
    miners,
    walletCredit: walletCredit === null ? null : tokens(walletCredit),
    totalLocked: tokens(totalLocked),
    senate: {
      count: toNumber(senatorCount),
      minimum: toNumber(minSenators),
      maximum: toNumber(maxSenators),
      majority: Math.floor(toNumber(senatorCount) / 2) + 1,
      members: memberAddresses,
      memberVotes,
      walletIsMember
    },
    treasury: [],
    upgrades: [],
    upgrade: {
      supportPosition: 0,
      oppositionPosition: 0,
      proposedGovernor: ZeroAddress,
      proposedAt: 0,
      currentSupport: "0",
      currentOpposition: "0",
      highestSupport: "0",
      invalidated: false,
      passedFirstStage: false,
      proposalCount: toNumber(governorCount),
      eligibleGovernor: getAddress2(eligibleGovernor),
      activationPending: Boolean(activationPending),
      requestBlock: toNumber(requestBlock),
      blockDelay: toNumber(blockDelay)
    }
  };
}
async function fetchGovernanceSection(scope, base, onProgress, signal) {
  if (scope === "base") return base;
  const rpc = await getPublicProvider();
  const provider = snapshotRunner(rpc, base.blockNumber, signal);
  const consensus = new Contract(ADDRESSES.consensus, consensusAbi, provider);
  const basic = new Contract(ADDRESSES.basic, basicAbi, provider);
  const farms = new Contract(ADDRESSES.farms, farmsAbi, provider);
  const reward = new Contract(ADDRESSES.reward, rewardAbi, provider);
  const globalDelay = base.settings.delaySeconds;
  const now = base.blockTimestamp;
  const sections = await readGovernanceSections(scope, {
    ordinary: async (selectedFamily) => {
      const history = [];
      const addStandard = async (family, count, getter, change, layout = { opened: 1, support: 2, opposition: 3, delay: 4 }) => {
        if (family !== selectedFamily) return;
        const rows = await Promise.all(allProposalIds(count).map(async (id2) => ({ id: id2, row: await getter(id2) })));
        rows.forEach(({ id: id2, row }) => {
          const openedAt = toNumber(row[layout.opened]);
          const delay = toNumber(row[layout.delay]);
          history.push({
            key: `${family}-${id2}`,
            family,
            reference: `${family} proposal ${id2}`,
            change: change(row),
            valid: Boolean(row[0]),
            openedAt,
            votingDeadline: openedAt + delay + globalDelay,
            support: tokens(row[layout.support]),
            opposition: tokens(row[layout.opposition]),
            status: proposalStatus(Boolean(row[0]), openedAt, delay, globalDelay, now)
          });
        });
      };
      onProgress(`Reading ${selectedFamily.toLowerCase()} proposals`);
      await Promise.all([
        addStandard("Voting cost", base.counts["Voting cost"], (id2) => basic.minDepositProposals(id2), (r) => `Set minimum voting cost to ${tokens(r[5])} OINK`),
        addStandard("New pool", base.counts["New pool"], (id2) => basic.newPoolProposal(id2), (r) => `Add pool contract ${getAddress2(r[5])}`),
        addStandard("Enforcement delay", base.counts["Enforcement delay"], (id2) => basic.delayProposals(id2), (r) => `Set global enforcement delay to ${toNumber(r[5])} seconds`),
        addStandard("Harvest call fee", base.counts["Harvest call fee"], (id2) => basic.callFeeProposal(id2), (r) => `Set miner call fee to ${pct(r[5])}%`),
        addStandard("Rollover bonus", base.counts["Rollover bonus"], (id2) => basic.rolloverBonuses(id2), (r) => `Set ${getAddress2(r[5])} rollover bonus to ${pct(r[6])}%`),
        addStandard("Reward-event threshold", base.counts["Reward-event threshold"], (id2) => basic.minThresholdFibonacceningProposal(id2), (r) => `Set reward-event threshold to ${tokens(r[5])} OINK`),
        addStandard("Pool allocation", base.counts["Pool allocation"], (id2) => farms.proposalFarmUpdate(id2), (r) => `Set pool ${toNumber(r[1])} allocation to ${pct(r[2])}%`, { opened: 6, support: 3, opposition: 4, delay: 5 }),
        addStandard("Vault setting", base.counts["Vault setting"], (id2) => farms.vaultProposals(id2), (r) => toNumber(r[2]) === 1 ? `Set vault funding rate to ${formatUnits(r[3], 4)}% per hour` : toNumber(r[2]) === 0 ? `Set vault deposit fee to ${pct(r[3])}%` : toNumber(r[2]) === 2 ? `Set vault referral bonus to ${pct(r[3])}%` : `Unknown vault field ${r[2]}: raw value ${r[3]}`, { opened: 1, support: 4, opposition: 5, delay: 6 }),
        addStandard("Governor transfer or burn", base.counts["Governor transfer or burn"], (id2) => farms.governorTransferProposals(id2), (r) => `${r[6] ? "Burn" : "Transfer to treasury"} ${tokens(r[2])} OINK`, { opened: 1, support: 3, opposition: 4, delay: 5 }),
        addStandard("Governor tax", base.counts["Governor tax"], (id2) => farms.govTaxProposals(id2), (r) => `Set Governor inflation share to ${pct(r[2])}%`, { opened: 1, support: 3, opposition: 4, delay: 5 }),
        addStandard("Reward boost", base.counts["Reward boost"], (id2) => reward.fibonacceningProposals(id2), (r) => `Schedule ${tokens(r[5])} OINK per block for ${toNumber(r[6])} blocks`)
      ]);
      history.sort((a, b) => b.openedAt - a.openedAt);
      return history;
    },
    treasury: async () => {
      const treasuryCount = base.registryCounts.treasury;
      const metadataCache = /* @__PURE__ */ new Map();
      const tokenMetadata = (tokenAddress) => {
        const checksum = getAddress2(tokenAddress);
        const cached = metadataCache.get(checksum);
        if (cached) return cached;
        const pending = (async () => {
          try {
            const erc20 = new Contract(checksum, erc20Abi, provider);
            const [decimals, symbol] = await Promise.all([erc20.decimals(), erc20.symbol()]);
            return { decimals: toNumber(decimals), symbol: String(symbol) };
          } catch {
            return null;
          }
        })();
        metadataCache.set(checksum, pending);
        return pending;
      };
      onProgress(`Scanning all ${treasuryCount} treasury requests and their voting power`);
      let treasuryLoaded = 0;
      const treasury = await Promise.all(allProposalIds(treasuryCount).map(async (id2) => {
        const row = await consensus.treasuryProposal(id2);
        const supportPosition = toNumber(row[8]);
        const tokenAddress = getAddress2(row[5]);
        const [minerSupport, minerOpposition, metadata] = await Promise.all([
          consensus.tokensCastedPerVote(supportPosition),
          consensus.tokensCastedPerVote(supportPosition + 1),
          tokenMetadata(tokenAddress)
        ]);
        treasuryLoaded++;
        onProgress(`Read ${treasuryLoaded} of ${treasuryCount} treasury requests and their voting power`);
        const openedAt = toNumber(row[1]);
        const requestedDelay = toNumber(row[4]);
        return {
          id: id2,
          valid: Boolean(row[0]),
          openedAt,
          votingDeadline: openedAt + requestedDelay + globalDelay,
          finalizationAfter: openedAt + requestedDelay + globalDelay * 2,
          token: tokenAddress,
          beneficiary: getAddress2(row[6]),
          amountRaw: row[7].toString(),
          amount: metadata ? formatUnits(row[7], metadata.decimals) : null,
          assetSymbol: metadata?.symbol ?? null,
          creditSupport: tokens(row[2]),
          creditOpposition: tokens(row[3]),
          supportPosition,
          oppositionPosition: supportPosition + 1,
          minerSupport: tokens(minerSupport),
          minerOpposition: tokens(minerOpposition)
        };
      }));
      return treasury;
    },
    upgrades: async () => {
      onProgress("Discovering Governor proposals from the consensus registry");
      const consensusCount = base.registryCounts.consensus;
      const positions = allProposalIds(consensusCount).filter((id2) => id2 > 0 && id2 % 2 === 1);
      const candidates = await Promise.all(positions.map(async (id2) => ({ id: id2, row: await consensus.consensusProposal(id2) })));
      const upgrades = await Promise.all(candidates.filter(({ row }) => toNumber(row[0]) === 0).map(async ({ id: id2, row }) => {
        const pair = await consensus.consensusProposal(id2 + 1);
        if (toNumber(pair[0]) !== 0 || getAddress2(pair[1]) !== getAddress2(row[1]) || pair[2] !== row[2]) {
          throw new Error("Governor proposal pair mismatch; discovery is incomplete.");
        }
        const candidate = getAddress2(row[1]);
        const [support, opposition, highest, invalidation] = await Promise.all([
          consensus.tokensCastedPerVote(id2),
          consensus.tokensCastedPerVote(id2 + 1),
          consensus.highestConsensusVotes(id2),
          consensus.isGovInvalidated(candidate)
        ]);
        return {
          supportPosition: id2,
          oppositionPosition: id2 + 1,
          proposedGovernor: candidate,
          proposedAt: toNumber(row[2]),
          currentSupport: tokens(support),
          currentOpposition: tokens(opposition),
          highestSupport: tokens(highest),
          invalidated: Boolean(invalidation[0]),
          passedFirstStage: Boolean(invalidation[1])
        };
      }));
      if (upgrades.length !== base.registryCounts.upgrades) throw new Error("Governor proposal count mismatch; discovery is incomplete.");
      return upgrades;
    }
  });
  signal?.throwIfAborted();
  if ((await rpc.getBlock(base.blockNumber))?.hash !== base.blockHash) throw new Error("Snapshot block changed during loading. Refresh to read a consistent snapshot.");
  const selected = sections.upgrades.find((row) => base.upgrade.activationPending && row.proposedGovernor === base.upgrade.eligibleGovernor) ?? sections.upgrades.find((row) => !row.invalidated) ?? sections.upgrades[0];
  return { ...base, ...sections, upgrade: { ...base.upgrade, ...selected } };
}
var governanceKey = (account, scope) => "369:governance:" + (account ? getAddress2(account).toLowerCase() : "public") + ":" + scope;
function loadGovernanceSnapshot(onProgress = () => {
}, signal, selectedAccount = null, scope = "all") {
  const loadBase = () => sharedDisplayReads.read(governanceKey(selectedAccount, "base"), (child) => fetchGovernanceBase(onProgress, child, selectedAccount), { signal, ttl: 3e4, timeout: 45e3 });
  if (scope === "base") return loadBase();
  return sharedDisplayReads.read(governanceKey(selectedAccount, scope), async (child) => {
    const base = await loadGovernanceSnapshot(onProgress, child, selectedAccount, "base");
    return fetchGovernanceSection(scope, base, onProgress, child);
  }, { signal, ttl: 6e4, timeout: 12e4 });
}

// <stdin>
var started = performance.now();
await Promise.all(["base", "ordinary:Pool allocation"].map(async (scope) => {
  const row = await loadGovernanceSnapshot(() => {
  }, void 0, null, scope);
  console.log(JSON.stringify({ scope, ms: Math.round(performance.now() - started), block: row.blockNumber, coverage: row.coverage, ordinaryRows: row.history.length, treasuryRows: row.treasury.length, upgradeRows: row.upgrades.length, treasuryCount: row.registryCounts.treasury }));
}));
var revisit = performance.now();
await loadGovernanceSnapshot(() => {
}, void 0, null, "ordinary:Pool allocation");
console.log(JSON.stringify({ scope: "ordinary-revisit", ms: Math.round(performance.now() - revisit) }));
process.exit(0);
