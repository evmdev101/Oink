import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CHAIN_ID, shortAddress, getPublicProvider } from "../lib/chain";
import { WALLET_PREFERENCE, watchWallets, type WalletChoice } from "../lib/walletDiscovery";
import { WalletSession } from "../lib/walletSession";
import { savedWallet, rememberedChoice } from "../lib/walletPreference";
import { WalletContext, useWallet } from "./walletContext";
import "./wallet.css";

export { useWallet } from "./walletContext";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new WalletSession(selection => {
    if (selection) localStorage.setItem(WALLET_PREFERENCE, JSON.stringify(selection));
    else localStorage.removeItem(WALLET_PREFERENCE);
  }));
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const [choices, setChoices] = useState<WalletChoice[]>([]);
  useEffect(() => {
    let restored = false;
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    let discovered: WalletChoice[] = [];
    const restore = () => {
      if (restored || session.getSnapshot().busy) return;
      let saved = null;
      try { saved = savedWallet(localStorage.getItem(WALLET_PREFERENCE)); } catch { /* Optional preference. */ }
      const choice = rememberedChoice(discovered, saved);
      if (!choice || !saved) return;
      restored = true;
      void session.restore(choice, saved.account);
    };
    const stop = watchWallets(rows => {
      discovered = rows;
      setChoices(rows);
      // Let extension announcements settle before resolving a saved selection.
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(restore, 180);
    });
    return () => { clearTimeout(restoreTimer); stop(); session.dispose(); };
  }, [session]);
  const value = useMemo(() => ({ ...state, choices, connect: session.connect, disconnect: session.disconnect, switchToPulseChain: session.switchToPulseChain }), [state, choices, session]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletControl() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [balance, setBalance] = useState<{ account: string; text: string } | null>(null);
  const picker = useRef<HTMLDialogElement>(null);
  const accountDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { setCopied(false); setCopyError(""); }, [wallet.account, open]);
  const wrongNetwork = wallet.account !== null && wallet.chainId !== CHAIN_ID;
  useEffect(() => {
    if (picking && !picker.current?.open) picker.current?.showModal();
    if (!picking && picker.current?.open) picker.current.close();
  }, [picking]);
  const openPicker = () => { setOpen(false); setSearch(""); setPicking(true); window.dispatchEvent(new Event("eip6963:requestProvider")); };
  const selectWallet = async (choice: WalletChoice) => {
    // CashX closes the picker as the selected extension takes over.
    setPicking(false);
    await wallet.connect(choice);
  };
  useEffect(() => { if (wallet.account && !wallet.busy) setPicking(false); }, [wallet.account, wallet.busy]);
  useEffect(() => {
    if (open && wallet.account && !accountDialog.current?.open) accountDialog.current?.showModal();
    if ((!open || !wallet.account) && accountDialog.current?.open) accountDialog.current.close();
  }, [open, wallet.account]);
  useEffect(() => {
    if (!open && !picking) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open, picking]);
  useEffect(() => {
    let active = true;
    setBalance(null);
    const account = wallet.account;
    if (!open || !account || wallet.chainId !== CHAIN_ID) return;
    const readBalance = async () => {
      try {
        const rpc = await getPublicProvider();
        if (BigInt(await rpc.send("eth_chainId", [])) !== CHAIN_ID) throw new Error("Wrong balance network");
        const raw = BigInt(await rpc.send("eth_getBalance", [account, "latest"]));
        // Format exact integer units; never round a large balance through Number.
        const whole = (raw / 10n ** 18n).toLocaleString("en-US");
        const cents = ((raw % (10n ** 18n)) / 10n ** 16n).toString().padStart(2, "0");
        const text = raw > 0n && raw < 10n ** 16n ? "<0.01 PLS" : `${whole}.${cents} PLS`;
        if (active) setBalance({ account, text });
      } catch { if (active) setBalance({ account, text: "Balance unavailable" }); }
    };
    void readBalance();
    return () => { active = false; };
  }, [open, wallet.account, wallet.chainId, wallet.revision]);
  const copyAddress = async () => {
    if (!wallet.account) return;
    try { await navigator.clipboard.writeText(wallet.account); setCopied(true); setCopyError(""); }
    catch { setCopyError("Copy unavailable. Select the address above to copy it manually."); }
  };

  return <div className="wallet-control">
    <button className={`wallet-button${wrongNetwork ? " wallet-wrong-network" : ""}`} type="button"
      aria-expanded={open || picking} aria-haspopup="dialog" aria-controls={wallet.account ? "wallet-session-panel" : "wallet-picker"}
      title={wallet.account ? `${wallet.account}${wrongNetwork ? " — switch to PulseChain" : ""}` : "Connect your browser wallet"}
      onClick={() => { if (wallet.busy) setPicking(true); else if (wallet.account) setOpen((current) => !current); else openPicker(); }}>
      {wallet.busy ? "Connecting…" : wallet.account ? shortAddress(wallet.account) : "Connect Wallet"}
      {wrongNetwork && <span className="wallet-network-warning" aria-label="Wrong network">!</span>}
    </button>
    <dialog className="wallet-account-modal" id="wallet-session-panel" ref={accountDialog} aria-label="Connected wallet" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
    }}>
      <button className="wallet-account-close" type="button" onClick={() => setOpen(false)} aria-label="Close wallet panel"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 5 6 6m0-6-6 6" /></svg></button>
      <button className="wallet-account-avatar" type="button" disabled={wallet.busy} onClick={openPicker} aria-label="Change wallet" title={`${wallet.selectedName} · Change wallet`} />
      <p className="wallet-account-address" title={wallet.account ?? ""}><span aria-hidden="true">{shortAddress(wallet.account)}</span><span className="wallet-visually-hidden">{wallet.account}</span></p>
      <button className="wallet-change-wallet" type="button" onClick={openPicker}>{wallet.selectedName} · Change wallet</button>
      <p className="wallet-account-balance" role="status" title="Native wallet balance on PulseChain, read when this popup opens">{wrongNetwork ? "Switch to PulseChain" : balance?.account === wallet.account ? balance?.text : "Loading PLS balance…"}</p>
      {wrongNetwork && <button className="wallet-account-switch" type="button" disabled={wallet.busy} onClick={() => void wallet.switchToPulseChain()}>Switch / add PulseChain</button>}
      <div className="wallet-account-actions">
        <button type="button" onClick={() => void copyAddress()} disabled={!wallet.account}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9h11v12H9zM15 9V3H4v12h5" /></svg><span>{copied ? "Copied" : "Copy Address"}</span></button>
        <button type="button" onClick={() => { wallet.disconnect(); setOpen(false); }} title="Disconnect this site only. Token approvals and wallet permissions are unchanged."><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 8l4 4-4 4M21 12H9a5 5 0 0 1 0-10" /></svg><span>Disconnect</span></button>
      </div>
      <button className="wallet-change-wallet wallet-manage-transactions" type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event("oink-open-request-recovery")); }}>Transactions</button>
      {copyError && <p className="wallet-account-error" role="alert">{copyError}<span className="wallet-account-copy-fallback">{wallet.account}</span></p>}
      {wallet.error && <p className="wallet-account-error" role="alert">{wallet.error}</p>}
    </dialog>
    {wallet.error && !open && !picking && <div className="wallet-connection-notice" role="alert">{wallet.error}<button type="button" onClick={openPicker}>Try again</button></div>}
    <dialog className="wallet-picker" id="wallet-picker" ref={picker} aria-labelledby="wallet-picker-title" onCancel={() => setPicking(false)} onClose={() => setPicking(false)} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setPicking(false);
    }}>
      <div className="wallet-picker-head"><div className="wallet-picker-heading"><h2 id="wallet-picker-title">Connect Wallet</h2><p>PulseChain · {wallet.choices.filter((choice) => choice.provider).length} detected</p></div><button className="wallet-picker-close" type="button" onClick={() => setPicking(false)} aria-label="Close wallet picker">×</button></div>
      <label className="wallet-picker-search"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="5"/><path d="m12 12 5 5"/></svg><input type="search" aria-label="Search wallets" placeholder="Search wallets" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <div className="wallet-picker-list">
        {wallet.choices.filter((choice) => choice.name.toLowerCase().includes(search.toLowerCase())).map((choice, index) => <button className="wallet-option" key={choice.key + index} type="button" disabled={!choice.provider || wallet.busy} onClick={() => void selectWallet(choice)}>
          <span className={"wallet-option-icon wallet-icon-" + choice.key} aria-hidden="true">{choice.icon ? <img src={choice.icon} alt="" /> : choice.name.slice(0,1).toUpperCase()}</span><span className="wallet-option-copy"><strong>{choice.name}</strong><small>{choice.provider ? "Ready to connect" : choice.description || "Browser wallet"}</small></span><span className={"wallet-option-badge" + (choice.provider ? "" : " muted")}>{choice.provider ? "Installed" : "Not detected"}</span>
        </button>)}
        {!wallet.choices.some((choice) => choice.name.toLowerCase().includes(search.toLowerCase())) && <p>No matching wallets.</p>}
      </div>
      <p className="wallet-picker-footer">{wallet.choices.some((choice) => choice.provider) ? "Supported browser wallets are detected automatically and connect directly." : "On desktop, open this site in a browser with your wallet extension. On a phone, open it in your wallet app's built-in browser."}</p>
      {wallet.busy && <div className="wallet-connect-pending" role="status"><p>Check {wallet.selectedName} to finish connecting.</p><button type="button" onClick={() => wallet.disconnect()}>Cancel connection</button></div>}
      {wallet.error && <p className="wallet-session-error" role="alert">{wallet.error}</p>}
    </dialog>
  </div>;
}
