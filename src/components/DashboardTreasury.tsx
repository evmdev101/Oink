import { useEffect, useMemo, useRef, useState } from "react";
import { readTreasuryHoldings, treasuryActivityAssets, treasuryAccounts } from "../lib/treasuryActivity";
import { treasuryWalletDisplayValues } from "../lib/treasuryValuation";
import { TreasuryStrategies } from "./TreasuryStrategies";
import { readTreasuryInflows, readOlderTreasuryInflows, type TreasuryInflows } from "../lib/treasuryInflows";
import { FARM_PRICE_TOKENS, freshFarmPrice, readFarmPrices, peekFarmPrices, type FarmPrices } from "../lib/farmPrices";
import { displayPrice, mergeDisplayPrices, mergeTreasuryHoldings } from "../lib/retainedPublicDisplay";
import { LiveNumber } from "./LiveNumber";
import { getPublicProvider } from "../lib/chain";
import { displayFarmAmount } from "../lib/farmDisplay";
import { assetUrl } from "../lib/assets";
import { Contract, formatEther } from "ethers";
import { LINKS } from "../config/links";
import { OINK_TOKEN, TREASURY_WALLET } from "../config/contracts";
import { inflowWindowSummary } from "../lib/dashboardStats";
import { OinkContractShowcase } from "./OinkContractShowcase";
import { InfoTooltip } from "./InfoTooltip";
import { beginForegroundDisplayRead, waitForForegroundDisplayReads } from "../lib/displayReadPriority";
import { readPublicRefreshDisplay, savePublicRefreshDisplay, publicDisplayRecord, publicDisplayAmount } from "../lib/publicRefreshDisplay";

type Holdings = Awaited<ReturnType<typeof readTreasuryHoldings>>;
type Liquidity = { pls: string | null; oink: string | null };
type RefreshTreasury = { holdings: Holdings; liquidity: Liquidity | null; prices: FarmPrices; liquidityTimestamp: number };
const restoredTreasury = readPublicRefreshDisplay("treasury", (value): value is RefreshTreasury => {
  if (!publicDisplayRecord(value) || !publicDisplayRecord(value.holdings) || !publicDisplayRecord(value.prices)) return false;
  const h = value.holdings;
  return Number.isSafeInteger(h.block) && Number.isFinite(h.timestamp) && Array.isArray(h.rows)
    && h.rows.every((row: unknown) => publicDisplayRecord(row) && typeof row.address === "string" && typeof row.label === "string" && Array.isArray(row.assets)
      && row.assets.every((a: unknown) => publicDisplayRecord(a) && typeof a.symbol === "string" && (a.address === null || typeof a.address === "string") && Number.isInteger(a.decimals) && (a.balance === null || publicDisplayAmount(a.balance))))
    && Object.values(value.prices).every(q => publicDisplayRecord(q) && publicDisplayAmount(q.usd) && typeof q.pair === "string" && Number.isFinite(q.fetchedAt))
    && (value.liquidity === null || publicDisplayRecord(value.liquidity) && [value.liquidity.pls, value.liquidity.oink].every(a => a === null || publicDisplayAmount(a)))
    && Number.isFinite(value.liquidityTimestamp);
});
const treasuryDisplay = { holdings:restoredTreasury?.holdings ?? null as Holdings|null, activity:null as TreasuryInflows|null, liquidity:restoredTreasury?.liquidity ?? null as Liquidity|null, prices:restoredTreasury?.prices ?? {} as FarmPrices, retained:!!restoredTreasury, liquidityTimestamp:restoredTreasury?.liquidityTimestamp ?? 0 };

const priceIds: Record<string, keyof FarmPrices> = { PLS: "pls", ...Object.fromEntries(treasuryActivityAssets.flatMap(asset => {
  const match = Object.entries(FARM_PRICE_TOKENS).find(([, address]) => address.toLowerCase() === asset.address.toLowerCase());
  return match ? [[asset.symbol, match[0]]] : [];
})) };

function compact(value: string | null | undefined) {
  if (value == null) return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return displayFarmAmount(value);
  return number >= 1_000_000
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(number)
    : displayFarmAmount(value);
}

function tokenIcon(symbol: string) {
  const icons: Record<string, string> = {
    OINK: "img/apple-touch-icon.png",
    PLS: "img/farms/pls.png",
    PLSX: "img/farms/plsx.png",
    INC: "img/farms/inc.png",
    HEX: "img/farms/hex.png",
    "HEX Time Token": "img/farms/hex.png",
    PRINT: "img/farms/print.png",
    EARN: "img/farms/earn.png",
    pDAI: "img/farms/pdai.png",
    HOA: "img/farms/hoa.png",
    ATROPA: "img/farms/atropa.png",
    SOLIDX: "img/farms/solidx.png",
    SolidX: "img/farms/solidx.png",
    COM: "img/farms/com.png",
    pUSDC: "img/farms/pusdc.png",
    pUSDT: "img/farms/pusdt.png",
  };
  return icons[symbol] ?? "img/apple-touch-icon.png";
}

function relativeAge(timestamp: number | undefined) {
  if (!timestamp) return null;
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  const days = Math.floor(seconds / 86400);
  if (days < 1) {
    const hours = Math.max(1, Math.floor(seconds / 3600));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function amountParts(amount: string) {
  const parts = amount.split(" ");
  return { value: parts[0] ?? "", symbol: parts.slice(1).join(" ") };
}

function usdValue(amount: number | null, symbol: string, prices: FarmPrices) {
  const price = displayPrice(prices[priceIds[symbol]]);
  if (amount == null || !price) return null;
  const value = amount * Number(price);
  if (!Number.isFinite(value)) return null;
  return value;
}

function displayUsd(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function DashboardTreasury() {
  const [holdings, setHoldings] = useState<Holdings | null>(treasuryDisplay.holdings);
  const [activity, setActivity] = useState<TreasuryInflows | null>(treasuryDisplay.activity);
  const [liquidity, setLiquidity] = useState<Liquidity | null>(treasuryDisplay.liquidity);
  const [prices, setPrices] = useState<FarmPrices>(() => mergeDisplayPrices(treasuryDisplay.prices,peekFarmPrices()));
  const [retainedBalances, setRetainedBalances] = useState(treasuryDisplay.retained);
  const [visibleInflows, setVisibleInflows] = useState(10);
  const [olderInflows, setOlderInflows] = useState<TreasuryInflows[]>([]);
  const [olderBusy, setOlderBusy] = useState(false);
  const [olderError, setOlderError] = useState("");
  const [walletCopy, setWalletCopy] = useState<"idle" | "copied" | "failed">("idle");
  const olderRequest = useRef<AbortController | null>(null);
  useEffect(() => () => olderRequest.current?.abort(), []);
  const [error, setError] = useState("");
  const [, setBusy] = useState(true);
  const [inflowBusy, setInflowBusy] = useState(true);
  const [inflowError, setInflowError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (holdings) savePublicRefreshDisplay("treasury", { holdings, liquidity, prices, liquidityTimestamp: treasuryDisplay.liquidityTimestamp }, holdings.timestamp * 1000);
  }, [holdings, liquidity, prices]);
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(clock);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let previous: TreasuryInflows | null = treasuryDisplay.activity;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      setInflowBusy(true);
      try {
        await waitForForegroundDisplayReads(controller.signal);
        const rpc = await getPublicProvider();
        const result = await readTreasuryInflows(rpc, previous, AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]), { includeBoundaryRows: true });
        if (!controller.signal.aborted) {
          previous = result;
          treasuryDisplay.activity = result;
          setActivity(result);
          setInflowError("");
          setNow(Date.now());
        }
      } catch {
        if (!controller.signal.aborted) setInflowError("Thirty-day inflow history is unavailable. Retrying automatically.");
      } finally {
        if (!controller.signal.aborted) {
          setInflowBusy(false);
          timer = setTimeout(load, 60000);
        }
      }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = () => {
    if (document.hidden) { timer = setTimeout(load,25000); return; }
    setBusy(true);
    const releasePriority = beginForegroundDisplayRead(controller.signal);
    void getPublicProvider().then(async rpc => {
      controller.signal.throwIfAborted();
      const nextHoldings = await readTreasuryHoldings(rpc, [treasuryAccounts[0]], controller.signal);
      const pair = LINKS.dexscreener.split("/").at(-1)!;
      const wpls = new Contract(FARM_PRICE_TOKENS.pls, ["function balanceOf(address) view returns(uint256)"], rpc);
      const oink = new Contract(OINK_TOKEN, ["function balanceOf(address) view returns(uint256)"], rpc);
      const lp = new Contract(pair, ["function balanceOf(address) view returns(uint256)", "function totalSupply() view returns(uint256)"], rpc);
      const blockOptions = { blockTag: nextHoldings.block };
      const ownedLiquidity = await Promise.all([
        wpls.balanceOf(pair, blockOptions),
        oink.balanceOf(pair, blockOptions),
        lp.balanceOf(TREASURY_WALLET, blockOptions),
        lp.totalSupply(blockOptions),
      ]).then(([pls, tokens, owned, supply]: bigint[]) => {
        if (supply <= 0n || owned > supply) throw new Error("Invalid liquidity ownership.");
        return { pls: formatEther(pls * owned / supply), oink: formatEther(tokens * owned / supply) };
      }).catch(() => ({ pls: null, oink: null }));
      controller.signal.throwIfAborted();
      if (active) {
        const merged = mergeTreasuryHoldings(treasuryDisplay.holdings,nextHoldings);
        treasuryDisplay.holdings = merged.value;
        treasuryDisplay.retained = merged.retained;
        setHoldings(merged.value);
        setRetainedBalances(merged.retained);
        if (ownedLiquidity.pls != null && ownedLiquidity.oink != null) {
          treasuryDisplay.liquidity = ownedLiquidity;
          treasuryDisplay.liquidityTimestamp = nextHoldings.timestamp;
          setLiquidity(ownedLiquidity);
        }
        setError("");
        setNow(Date.now());
      }
    }).catch(() => {
      if (active) setError("Live refresh delayed. Showing last known treasury values.");
    }).finally(() => {
      releasePriority();
      if (active) { setBusy(false); timer = setTimeout(load,25000); }
    });
    };
    load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = () => {
    if (document.hidden) { timer = setTimeout(load,30000); return; }
    void readFarmPrices(controller.signal).then(next => {
      if (!controller.signal.aborted) {
        setPrices(previous => {
          const merged = mergeDisplayPrices(previous,next);
          treasuryDisplay.prices = merged;
          return merged;
        });
        // Evaluate the new quotes against a clock at least as recent as their fetch.
        setNow(Date.now());
      }
    }).catch(() => { /* Keep last observed public display quotes with their original timestamps. */ })
      .finally(() => { if (!controller.signal.aborted) timer = setTimeout(load,30000); });
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  const holdingsFresh = holdings && now >= holdings.timestamp * 1000 && now - holdings.timestamp * 1000 < 120000;
  const valuation = useMemo(() => treasuryWalletDisplayValues(holdings?.rows[0]?.assets ?? [], prices, now), [holdings, prices, now]);
  const stalePrices = Object.values(prices).some(quote => !freshFarmPrice(quote,now));
  const lastKnown = !holdingsFresh || retainedBalances || stalePrices || !!error;
  const inflowRows = useMemo(() => [...new Map([...(activity?.rows ?? []), ...olderInflows.flatMap(page => page.rows)].map(row => [row.key, row])).values()]
    .filter(row => row.label === "Treasury received" && row.recipient?.toLowerCase() === TREASURY_WALLET.toLowerCase())
    .sort((a, b) => b.block - a.block || b.index - a.index), [activity, olderInflows]);
  const oldestInflows = olderInflows.at(-1) ?? activity;
  const allHistoryLoaded = oldestInflows?.from === 0;
  const showMoreInflows = async () => {
    if (!activity || olderRequest.current) return;
    if (visibleInflows < inflowRows.length) { setVisibleInflows(value => value + 10); return; }
    if (!oldestInflows || allHistoryLoaded) return;
    const controller = new AbortController();
    olderRequest.current = controller;
    setOlderBusy(true); setOlderError("");
    try {
      const page = await readOlderTreasuryInflows(await getPublicProvider(), oldestInflows, AbortSignal.any([controller.signal, AbortSignal.timeout(90000)]));
      if (!controller.signal.aborted && page) {
        setOlderInflows(pages => [...pages, page]);
        setVisibleInflows(value => Math.max(value, inflowRows.length) + 10);
      }
    } catch (reason) {
      if (!controller.signal.aborted) setOlderError(reason instanceof Error ? reason.message : "Older inflows could not load. Try again.");
    } finally {
      if (olderRequest.current === controller) olderRequest.current = null;
      if (!controller.signal.aborted) setOlderBusy(false);
    }
  };
  const inflowWindows = useMemo(() => {
    return [
      { label: "24h", seconds: 86400 },
      { label: "7d", seconds: 7 * 86400 },
      { label: "30d", seconds: 30 * 86400 },
    ].map(window => {
      return { ...window, ...inflowWindowSummary(inflowRows, activity, window.seconds, activity?.toTimestamp ?? now / 1000,
        symbol => displayPrice(prices[priceIds[symbol]], now)) };
    });
  }, [inflowRows, prices, activity, now]);
  const freshLiquidity = liquidity;
  const liquidityValue = liquidity?.pls != null && liquidity?.oink != null && displayPrice(prices.pls, now) && displayPrice(prices.oink, now)
    ? Number(liquidity.pls) * Number(prices.pls!.usd) + Number(liquidity.oink) * Number(prices.oink!.usd) : null;

  return <section className="dashboard-treasury" aria-label="Treasury overview">
    <div className="treasury-visual-grid">
      <div className="treasury-left-column">
      <article className="reference-panel treasury-flow-panel">
        <div className="treasury-inflows-heading"><h3>Piggy Bank treasury inflows</h3><InfoTooltip label="Where treasury inflows come from"><p>Receipts can include farm deposit and funding fees, OINK sale payments, Governor transfers of protocol rewards or penalties, and direct transfers from other wallets.</p><p>This list records token transfers into the treasury wallet, rather than identifying the purpose of each transfer. Click an inflow to view its transaction.</p><p>Totals use current token prices. Native PLS and untracked tokens are excluded.</p></InfoTooltip></div>
        <div className="treasury-inflow-summary" aria-label="Treasury inflow summary">
          {inflowWindows.map(row => <div key={row.label}>
            <span>{row.label}</span>
            <strong className={row.complete ? undefined : "inflow-status"}><LiveNumber value={row.complete ? row.usd : null} format={value => displayUsd(Number(value))} placeholder={inflowBusy && !activity ? "Loading…" : "—"}/></strong>
            <small>{row.complete ? `${row.count} inflow${row.count === 1 ? "" : "s"}` : inflowBusy ? "Reading history" : "History unavailable"}</small>
          </div>)}
        </div>
        <div className="treasury-flow-list">
          {inflowError && <p role="status">{inflowError}</p>}
          {!activity && !inflowError && <p className="treasury-flow-loading" role="status">Reading treasury inflows…</p>}
          {activity && !inflowRows.length && <p>No tracked inflows in the loaded period. Use Show more inflows to check earlier history.</p>}
          {inflowRows.slice(0, visibleInflows).map(row => {
            const amount = amountParts(row.amount);
            return <a href={"https://scan.pulsechain.com/tx/" + row.hash} target="_blank" rel="noreferrer" key={row.key}>
              <span>{row.label}</span>
              <strong><img src={assetUrl(tokenIcon(amount.symbol))} alt="" />{compact(amount.value)} {amount.symbol}</strong>
              <small>{relativeAge(row.timestamp) ?? "Recent inflow"}</small>
            </a>;
          })}
        </div>
        <div className="treasury-flow-actions">{olderError && <p role="alert">{olderError}</p>}<button className="treasury-show-more" type="button" disabled={!activity || olderBusy || allHistoryLoaded && visibleInflows >= inflowRows.length} onClick={() => void showMoreInflows()}>Show more inflows</button></div>
      </article>
      <article className="reference-panel treasury-assets-card treasury-strategies-panel">
        <TreasuryStrategies prices={prices} walletValue={valuation.total} walletComplete={valuation.complete} walletCurrent={!lastKnown}/>
      </article>
      </div>

      <div className="treasury-right-column">
        <article className="reference-panel treasury-holdings-panel treasury-assets-card">
          <div className="info-heading"><h3>Treasury Wallet Holdings</h3><InfoTooltip label="About treasury wallet holdings"><p>Balances held directly by the published treasury wallet. Assets deployed into farming strategies and protocol-owned liquidity are shown separately.</p><p>Dollar amounts use token prices and can differ from an eventual trade. A last-known value stays visible while a new read reconnects.</p></InfoTooltip></div>
          <div className="treasury-holdings-list treasury-wallet-scroll" role="region" aria-label="Treasury wallet assets" tabIndex={0}>
            {valuation.rows.map(row => <div className="treasury-holding-row" key={row.symbol}>
              <div className="treasury-asset-identity"><img src={assetUrl(tokenIcon(row.symbol))} alt="" /><strong>{row.symbol}</strong></div>
              <div className="treasury-asset-balance" title={row.balance ?? undefined}><strong><LiveNumber value={row.balance} format={displayFarmAmount}/></strong><small><LiveNumber value={row.usd} format={value => displayUsd(Number(value))}/></small></div>
              {row.components && <details className="treasury-token-details"><summary>View all three HEX Time Tokens</summary>{row.components.map(token => <div key={token.symbol}><span>{token.symbol}</span><strong>{token.balance == null ? "Unavailable" : displayFarmAmount(token.balance)}</strong><span>{token.usd == null ? "USD unavailable" : displayUsd(token.usd)}</span></div>)}</details>}
            </div>)}
          </div>
          <div className="treasury-value-total"><span className="info-label">{valuation.complete ? "Total" : "Known value"}<InfoTooltip label="About treasury wallet value"><p>The sum of loaded wallet balances with available prices. “Known value” excludes assets whose balance or price is unavailable, so it can be incomplete.</p><p>Farming positions and liquidity are not included in this wallet total.</p></InfoTooltip></span><strong><LiveNumber value={valuation.total} format={value => displayUsd(Number(value))}/></strong></div>
          <p className="treasury-accounts-note treasury-wallet-coverage" role="status">{error || (!valuation.complete && holdingsFresh ? "Some balances or prices are unavailable. The known value excludes them." : "")}</p>
          <div className="treasury-accounts-note treasury-wallet-address"><span aria-label="Treasury wallet address">{TREASURY_WALLET}</span><button type="button" aria-label="Copy treasury wallet address" onClick={async () => { try { await navigator.clipboard.writeText(TREASURY_WALLET); setWalletCopy("copied"); } catch { setWalletCopy("failed"); } }}>{walletCopy === "copied" ? "Copied!" : "Copy"}</button>{walletCopy === "failed" && <small role="status">Select the address to copy it manually.</small>}</div>
          <p className="treasury-accounts-note"><button className="treasury-stats-link" type="button" onClick={() => document.getElementById("participation-heading")?.scrollIntoView({ behavior: "smooth", block: "start" })}>View reward allocation and mining stats ↓</button></p>
        <section className="treasury-liquidity-section" aria-labelledby="treasury-liquidity-heading">
          <div className="info-heading"><h3 id="treasury-liquidity-heading">Protocol-owned liquidity</h3><InfoTooltip label="About protocol-owned liquidity"><p>The treasury wallet owns LP tokens in the PLS / OINK trading pair. These balances show its proportional share of the pair, rather than the entire pool.</p><p>The displayed PLS and OINK amounts change with trades and the treasury's LP ownership.</p></InfoTooltip></div>
          <p className="dashboard-context-line">PLS / OINK pair</p>
          <div className="treasury-holdings-list">
            <div className="treasury-holding-row">
              <div className="treasury-asset-identity"><img src={assetUrl(tokenIcon("PLS"))} alt="" /><strong>PLS</strong></div>
              <div className="treasury-asset-balance"><strong><LiveNumber value={freshLiquidity?.pls} format={displayFarmAmount}/></strong><small><LiveNumber value={freshLiquidity?.pls == null ? null : usdValue(Number(freshLiquidity.pls), "PLS", prices)} format={value => displayUsd(Number(value))}/></small></div>
            </div>
            <div className="treasury-holding-row">
              <div className="treasury-asset-identity"><img src={assetUrl(tokenIcon("OINK"))} alt="" /><strong>OINK</strong></div>
              <div className="treasury-asset-balance"><strong><LiveNumber value={freshLiquidity?.oink} format={displayFarmAmount}/></strong><small><LiveNumber value={freshLiquidity?.oink == null ? null : usdValue(Number(freshLiquidity.oink), "OINK", prices)} format={value => displayUsd(Number(value))}/></small></div>
            </div>
          </div>
          <div className="treasury-value-total"><span>Liquidity value</span><strong><LiveNumber value={liquidityValue} format={value => displayUsd(Number(value))}/></strong></div>
          <p className="treasury-accounts-note treasury-liquidity-status" role="status">{liquidity && (lastKnown || now / 1000 - treasuryDisplay.liquidityTimestamp >= 120) ? "Liquidity uses last observed balances and prices while updates reconnect." : ""}</p>
          <p>Treasury wallet’s share of the PLS / OINK pair, based on its LP tokens.</p>
        </section>
        </article>
        <OinkContractShowcase />
      </div>

    </div>
  </section>;
}
