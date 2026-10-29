import { sharedDisplayReads } from "./sharedReadCache.ts";
import { getAddress, type Eip1193Provider } from "ethers";
import type { WalletChoice } from "./walletDiscovery";
import type { WalletSelection } from "./walletPreference";

type Provider = NonNullable<WalletChoice["provider"]>;
export type WalletState = {
  account: string | null; chainId: bigint | null; provider: Eip1193Provider | null;
  revision: number; busy: boolean; error: string; selectedName: string;
};
const empty = { account: null, chainId: null, provider: null, revision: 0, busy: false, error: "", selectedName: "" };
type WalletTimeouts = { readMs: number; requestMs: number };
const defaultTimeouts: WalletTimeouts = { readMs: 15000, requestMs: 120000 };

export function walletError(reason: unknown) {
  const failure = reason as { code?: number; message?: string } | null;
  if (failure?.code === 4001) return "Wallet request cancelled. Try again when you're ready.";
  if (failure?.code === -32002) return "A request is already open in your wallet. Finish or cancel it there, then try again.";
  return failure?.message || "Unable to connect. Please try again.";
}
function accountFrom(value: unknown) {
  if (!Array.isArray(value)) throw new Error("Wallet returned an invalid account response.");
  if (!value.length) return null;
  if (typeof value[0] !== "string") throw new Error("Wallet returned an invalid account.");
  return getAddress(value[0]);
}
function chainFrom(value: unknown) {
  if (typeof value !== "string" || !/^0x[0-9a-f]+$/i.test(value)) throw new Error("Unable to read the wallet network.");
  return BigInt(value);
}

// One selected provider owns the session. Late responses/events cannot restore a
// disconnected wallet or overwrite a newer selection. No transaction methods here.
export class WalletSession {
  private state: WalletState = { ...empty };
  private listeners = new Set<() => void>();
  private choice: WalletChoice | null = null;
  private detach: (() => void) | null = null;
  private operation = 0;
  private read = 0;
  private eventRevision = 0;
  private refreshing = false;
  private manuallyDisconnected = false;
  private remember: (selection: WalletSelection | null) => void;
  private timeouts: WalletTimeouts;
  private pendingRequests = new Set<() => void>();

  constructor(remember: (selection: WalletSelection | null) => void, timeouts: Partial<WalletTimeouts> = {}) {
    this.remember = remember;
    this.timeouts = { ...defaultTimeouts, ...timeouts };
    if (Object.values(this.timeouts).some(value => !Number.isFinite(value) || value <= 0)) throw new Error("Wallet timeouts must be positive finite durations.");
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<WalletState>) {
    if (("account" in patch && patch.account !== this.state.account) || ("chainId" in patch && patch.chainId !== this.state.chainId)) sharedDisplayReads.clear();
    this.state = { ...this.state, ...patch, revision: this.state.revision + 1 };
    this.listeners.forEach(listener => listener());
  }
  private valid(source: Provider, operation: number) { return this.choice?.provider === source && this.operation === operation; }
  private save(account: string | null) {
    const choice = this.choice;
    const selection = account && choice?.identity ? { key: choice.key, identity: choice.identity, account } : null;
    try { this.remember(selection); } catch { /* Storage is optional. */ }
  }
  private clear() {
    ++this.operation; ++this.read;
    this.refreshing = false;
    this.pendingRequests.forEach(cancel => cancel());
    this.detach?.(); this.detach = null; this.choice = null;
  }
  private request(source: Provider, request: { method: string; params?: unknown[] }, interactive = false): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (failed: boolean, value: unknown) => {
        if (settled) return;
        settled = true; clearTimeout(timer); this.pendingRequests.delete(cancel);
        if (failed) reject(value); else resolve(value);
      };
      const cancel = () => finish(true, new Error("Wallet request cancelled."));
      const timer = setTimeout(() => finish(true, new Error(interactive
        ? "The wallet request timed out. Finish or cancel any open request in your wallet, then connect again."
        : "The wallet did not respond. Unlock it and connect again.")), interactive ? this.timeouts.requestMs : this.timeouts.readMs);
      this.pendingRequests.add(cancel);
      // Provider requests cannot be revoked, but expired or cancelled responses
      // must never resume this session or trigger another wallet request.
      try { Promise.resolve(source.request(request)).then(value => finish(false, value), error => finish(true, error)); }
      catch (error) { finish(true, error); }
    });
  }
  disconnect = () => {
    this.manuallyDisconnected = true;
    this.clear(); this.save(null); this.update(empty);
  };
  dispose = () => { this.clear(); this.update(empty); };
  private attach(choice: WalletChoice) {
    this.clear(); this.choice = choice;
    const source = choice.provider!;
    const changed = () => {
      if (this.choice?.provider !== source) return;
      ++this.eventRevision;
      if (!this.state.busy || this.refreshing) void this.refresh(source);
    };
    const disconnected = () => { if (this.choice?.provider === source) this.disconnect(); };
    source.on?.("accountsChanged", changed);
    source.on?.("chainChanged", changed);
    source.on?.("disconnect", disconnected);
    this.detach = () => {
      source.removeListener?.("accountsChanged", changed);
      source.removeListener?.("chainChanged", changed);
      source.removeListener?.("disconnect", disconnected);
    };
  }
  private async readAccounts(source: Provider) {
    const eventRevision = this.eventRevision;
    const [accounts, chain] = await Promise.all([
      this.request(source, { method: "eth_accounts" }), this.request(source, { method: "eth_chainId" }),
    ]);
    return { account: accountFrom(accounts), chainId: chainFrom(chain), eventRevision };
  }
  private async refresh(source: Provider) {
    const version = ++this.read, operation = this.operation;
    this.refreshing = true;
    this.update({ account: null, chainId: null, provider: null, busy: true, error: "" });
    try {
      const next = await this.readAccounts(source);
      if (!this.valid(source, operation) || version !== this.read) return;
      if (next.eventRevision !== this.eventRevision) throw new Error("The wallet changed while its account was being checked. Connect again.");
      if (!next.account) { this.disconnect(); return; }
      this.save(next.account);
      this.refreshing = false;
      this.update({ account: next.account, chainId: next.chainId, provider: source, busy: false });
    } catch (reason) {
      if (this.valid(source, operation) && version === this.read) {
        this.clear(); this.save(null); this.update({ ...empty, error: walletError(reason) });
      }
    }
  }
  private async pulseChain(source: Provider, operation: number) {
    try {
      await this.request(source, { method: "wallet_switchEthereumChain", params: [{ chainId: "0x171" }] }, true);
    } catch (reason) {
      if (!this.valid(source, operation)) return;
      if ((reason as { code?: number })?.code !== 4902) throw reason;
      await this.request(source, { method: "wallet_addEthereumChain", params: [{
        chainId: "0x171", chainName: "PulseChain", nativeCurrency: { name: "Pulse", symbol: "PLS", decimals: 18 },
        rpcUrls: ["https://rpc.pulsechain.com"], blockExplorerUrls: ["https://scan.pulsechain.com"],
      }] }, true);
      if (!this.valid(source, operation)) return;
      // Some wallets add a chain without selecting it.
      if (chainFrom(await this.request(source, { method: "eth_chainId" })) !== 369n && this.valid(source, operation)) {
        await this.request(source, { method: "wallet_switchEthereumChain", params: [{ chainId: "0x171" }] }, true);
      }
    }
  }
  private async open(choice: WalletChoice, mode: "connect" | "restore" | "switch", expectedAccount?: string) {
    const source = choice.provider;
    if (!source || this.state.busy) return;
    this.attach(choice);
    const operation = this.operation;
    this.update({ account: null, chainId: null, provider: source, selectedName: choice.name, busy: true, error: "" });
    try {
      let selectedAccount = expectedAccount;
      if (mode === "connect") {
        const account = accountFrom(await this.request(source, { method: "eth_requestAccounts" }, true));
        if (!this.valid(source, operation)) return;
        if (!account) throw new Error("No wallet account was selected.");
        selectedAccount = account;
      }
      let next = await this.readAccounts(source);
      if (!this.valid(source, operation)) return;
      if (next.eventRevision !== this.eventRevision) throw new Error("The wallet changed while its account was being checked. Connect again.");
      if (mode === "restore" && (!expectedAccount || next.account?.toLowerCase() !== expectedAccount.toLowerCase())) {
        // The extension now exposes a different account. Require an explicit choice.
        this.clear(); this.save(null); this.update(empty); return;
      }
      if (next.account && selectedAccount && next.account.toLowerCase() !== selectedAccount.toLowerCase()) throw new Error("The wallet account changed while connecting. Choose your account and connect again.");
      if (next.account && mode !== "restore" && next.chainId !== 369n) {
        await this.pulseChain(source, operation);
        if (!this.valid(source, operation)) return;
        next = await this.readAccounts(source);
        if (!this.valid(source, operation)) return;
        if (next.eventRevision !== this.eventRevision) throw new Error("The wallet changed while its account was being checked. Connect again.");
        if (next.chainId !== 369n) throw new Error("Select PulseChain in your wallet, then connect again.");
        if (next.account && selectedAccount && next.account.toLowerCase() !== selectedAccount.toLowerCase()) throw new Error("The wallet account changed while switching networks. Choose your account and connect again.");
      }
      if (!next.account) { this.clear(); this.save(null); this.update(empty); return; }
      this.save(next.account);
      this.update({ account: next.account, chainId: next.chainId, busy: false });
    } catch (reason) {
      if (!this.valid(source, operation)) return;
      this.clear(); this.save(null);
      this.update({ ...empty, error: walletError(reason) });
    }
  }
  connect = async (choice: WalletChoice) => { this.manuallyDisconnected = false; await this.open(choice, "connect"); };
  restore = async (choice: WalletChoice, expectedAccount: string) => {
    if (!choice.identity || !expectedAccount) return;
    if (!this.manuallyDisconnected && !this.choice && !this.state.account) await this.open(choice, "restore", expectedAccount);
  };
  switchToPulseChain = async () => { if (this.choice && this.state.account) await this.open(this.choice, "switch", this.state.account); };
}
