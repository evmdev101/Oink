import { assetUrl } from "./assets";
// Adapted from CashX's browser-wallet picker (index.html / CashXWallets).
// Discovery never asks for accounts, signs, switches chains or sends transactions.
export type BrowserWalletProvider = NonNullable<Window["ethereum"]> & Record<string, unknown>;
export type WalletChoice = { key: string; name: string; provider: BrowserWalletProvider | null; icon?: string; description?: string; identity?: string };
// Ignore the old brand-only preference: it cannot identify the selected account.
export const WALLET_PREFERENCE = "oink_wallet_session_v2";
const catalog = [
  ["metamask", "MetaMask", "metamask-wallet-icon.svg", "MetaMask browser wallet"],
  ["internet-money", "Internet Money Wallet", "internetmoneywallet.png", "Internet Money browser wallet"],
  ["rabby", "Rabby Wallet", "rabby-clean.png", "Rabby browser wallet"],
  ["safepal", "SafePal", "safepal-wallet.svg", "SafePal browser wallet"],
  ["zkx", "ZKX Wallet", "zkx-wallet.svg", "ZKX browser wallet"],
  ["coinbase", "Coinbase Wallet", "coinbase-wallet.svg", "Coinbase browser wallet"],
  ["uniswap", "Uniswap Extension", "uniswap-wallet.svg", "Uniswap browser wallet"],
] as const;
export function isWalletProvider(value: unknown): value is BrowserWalletProvider {
  return !!value && typeof value === "object" && typeof (value as BrowserWalletProvider).request === "function";
}
function identity(provider: BrowserWalletProvider): [string, string] {
  const flags: [string[], string, string][] = [
    [["isRabby"], "rabby", "Rabby Wallet"], [["isInternetMoney", "isInternetMoneyWallet", "isIMWallet"], "internet-money", "Internet Money Wallet"],
    [["isSafePal", "isSafePalWallet"], "safepal", "SafePal"], [["isZKXWallet", "isZkxWallet"], "zkx", "ZKX Wallet"],
    [["isCoinbaseWallet"], "coinbase", "Coinbase Wallet"], [["isUniswapWallet"], "uniswap", "Uniswap Extension"],
    [["isPhantom"], "phantom", "Phantom"], [["isBraveWallet"], "brave", "Brave Wallet"],
    [["isTrust", "isTrustWallet"], "trust", "Trust Wallet"], [["isOkxWallet", "isOKXWallet"], "okx", "OKX Wallet"],
    [["isZerion", "isZerionWallet"], "zerion", "Zerion Wallet"], [["isMetaMask"], "metamask", "MetaMask"],
  ];
  const match = flags.find(([keys]) => keys.some((key) => provider[key] === true));
  return match ? [match[1], match[2]] : ["browser", "Browser wallet"];
}
export function walletRows(detected: WalletChoice[]): WalletChoice[] {
  const unique = detected.filter((entry, i) => detected.findIndex((other) => other.provider === entry.provider) === i);
  const selected = new Set<WalletChoice>();
  const rows: WalletChoice[] = catalog.map(([key, name, icon, description]) => {
    const detected = unique.find(entry => entry.key === key);
    if (detected) selected.add(detected);
    return { key, name, provider: null, description, ...detected, icon: detected?.icon || assetUrl("img/wallets/" + icon) };
  });
  return [...rows, ...unique.filter(entry => !selected.has(entry))];
}
export function watchWallets(onChange: (wallets: WalletChoice[]) => void): () => void {
  const announcements: WalletChoice[] = [];
  const legacyIds = new WeakMap<object, number>();
  let nextId = 0;
  const publish = () => {
    const host = window as unknown as Record<string, unknown>;
    const ethereum = host.ethereum as BrowserWalletProvider | undefined;
    const sources = [...(Array.isArray(ethereum?.providers) && ethereum.providers.length ? ethereum.providers : [ethereum]), host.rabby, host.internetMoney, host.okxwallet, host.safepalProvider, host.safepal, host.zkx];
    const entries = [...announcements];
    for (const source of sources) {
      if (!isWalletProvider(source) || entries.some((entry) => entry.provider === source)) continue;
      let [key, name] = identity(source);
      if (key === "browser" && source === host.rabby) [key, name] = ["rabby", "Rabby Wallet"];
      if (key === "browser" && source === host.internetMoney) [key, name] = ["internet-money", "Internet Money Wallet"];
      if (key === "phantom") continue; // CashX excludes Phantom from its PulseChain picker.
      if (!legacyIds.has(source)) legacyIds.set(source, ++nextId);
      entries.push({ key: key === "browser" ? "browser:" + legacyIds.get(source) : key, name, provider: source });
    }
    onChange(walletRows(entries));
  };
  const announced = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail || !isWalletProvider(detail.provider) || !detail.info || typeof detail.info.name !== "string" || typeof detail.info.rdns !== "string") return;
    const name = detail.info.name.slice(0,80), rdns = detail.info.rdns.slice(0,160);
    const label = (name + " " + rdns).toLowerCase();
    if (label.includes("phantom")) return;
    const aliases: [string, string][] = [["internetmoney", "internet-money"], ["internet money", "internet-money"], ["rabby", "rabby"], ["safepal", "safepal"], ["zkx", "zkx"], ["coinbase", "coinbase"], ["uniswap", "uniswap"], ["metamask", "metamask"]];
    const key = aliases.find(([text]) => label.includes(text))?.[1] ?? "eip6963:" + rdns;
    if (announcements.some((entry) => entry.provider === detail.provider)) return;
    // Render only bounded image data in an <img>; never insert extension SVG as HTML.
    const icon = typeof detail.info.icon === "string" && detail.info.icon.length < 150_000 && /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/i.test(detail.info.icon) ? detail.info.icon : undefined;
    announcements.push({ key, name, provider: detail.provider, icon, identity: "eip6963:" + rdns });
    publish();
  };
  window.addEventListener("eip6963:announceProvider", announced);
  window.addEventListener("ethereum#initialized", publish);
  // Re-scan legacy globals when the picker opens, including delayed injections.
  const requested = () => { publish(); };
  window.addEventListener("eip6963:requestProvider", requested);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  publish();
  const timers = [180, 1000, 3000].map(delay => setTimeout(publish, delay));
  return () => {
    timers.forEach(clearTimeout);
    window.removeEventListener("eip6963:announceProvider", announced);
    window.removeEventListener("ethereum#initialized", publish);
    window.removeEventListener("eip6963:requestProvider", requested);
  };
}
