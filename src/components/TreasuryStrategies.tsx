import { useEffect, useState } from "react";
import { getPublicProvider } from "../lib/chain";
import { readTreasuryStrategies, TREASURY_STRATEGIES } from "../lib/treasuryStrategies";
import { type FarmPrices } from "../lib/farmPrices";
import { displayFarmAmount } from "../lib/farmDisplay";
import { updateStrategyDisplay, type StrategyDisplay } from "../lib/treasuryStrategyDisplay";
import { LiveNumber } from "./LiveNumber";
import { InfoTooltip } from "./InfoTooltip";
import { useDeferredDisplayRead } from "./useDeferredDisplayRead";

const usd = (value: number | null) => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
const formatUsd = (raw: string) => usd(Number(raw));
// Only public observations are retained. No connected-wallet or transaction state.
let lastDisplay: StrategyDisplay | null = null;
let lastCombined: { value: number; timestamp: number } | null = null;
const expectedSymbols = [...new Set([...TREASURY_STRATEGIES.flatMap(row => [row.symbol, row.symbol === "PRINT" ? "INC" : "HEX"]), "EARN"])];

export function TreasuryStrategies({ prices, walletValue, walletComplete, walletCurrent = true }: { prices: FarmPrices; walletValue: number | null; walletComplete: boolean; walletCurrent?: boolean }) {
  const { sectionRef, readReady } = useDeferredDisplayRead();
  const [display, setDisplay] = useState(() => updateStrategyDisplay(lastDisplay, null, prices));
  const [combined, setCombined] = useState(lastCombined);

  useEffect(() => {
    setDisplay(previous => updateStrategyDisplay(previous, null, prices));
  }, [prices]);
  useEffect(() => { lastDisplay = display; }, [display]);
  useEffect(() => {
    if (display.currentComplete && display.lastComplete && walletComplete && walletCurrent && walletValue != null && Number.isFinite(walletValue)) {
      const next = { value: walletValue + display.lastComplete.value, timestamp: display.lastComplete.timestamp };
      lastCombined = next;
      setCombined(next);
    }
  }, [display.currentComplete, display.lastComplete, walletComplete, walletCurrent, walletValue]);

  useEffect(() => {
    let active = true, pending = false;
    if (!readReady) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const load = async () => {
      if (!active || pending) return;
      if (document.visibilityState === "hidden") { timer = setTimeout(load, 25000); return; }
      pending = true;
      let delay = 25000;
      try {
        const value = await readTreasuryStrategies(await getPublicProvider(), AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]));
        if (active) {
          setDisplay(previous => updateStrategyDisplay(previous, value, {}));
        }
        if (value.rows.some(row => row.error)) delay = 10000;
      } catch {
        delay = 10000;
      } finally {
        pending = false;
        if (active) timer = setTimeout(load, delay);
      }
    };
    const visible = () => { if (document.visibilityState === "visible" && !pending) { clearTimeout(timer); void load(); } };
    const confirmed = () => { if (!pending) { clearTimeout(timer); void load(); } };
    void load();
    const clock = window.setInterval(() => setDisplay(previous => updateStrategyDisplay(previous, null, {})), 15000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("oink-positions-changed", confirmed);
    return () => { active = false; controller.abort(); clearTimeout(timer); clearInterval(clock); document.removeEventListener("visibilitychange", visible); window.removeEventListener("oink-positions-changed", confirmed); };
  }, [readReady]);

  const data = display.snapshot;
  const total = display.lastComplete?.value ?? null;
  const symbols = [...expectedSymbols, ...display.groups.map(row => row.symbol).filter(symbol => !expectedSymbols.includes(symbol))];
  const groups = symbols.map(symbol => display.groups.find(row => row.symbol === symbol) ?? { symbol, balance:null, usd:null, current:false, observedAt:0 });
  return <section ref={sectionRef} className="treasury-liquidity-section" aria-labelledby="treasury-strategies-heading" aria-busy={!data}>
    <div className="info-heading"><h3 id="treasury-strategies-heading">Treasury farming positions</h3><InfoTooltip label="About treasury farming positions"><p>Underlying assets deployed in the tracked treasury farming strategies, including the treasury's share of supported LP positions.</p><p>They are separate from direct wallet holdings. Pending farming rewards are excluded; the strategy list shows which contracts are covered.</p></InfoTooltip></div>
    <p className="dashboard-context-line">Assets deployed in treasury farms, separate from wallet holdings. Pending farming rewards are excluded.</p>
    <div className="treasury-holdings-list">{groups.map(row => <div className="treasury-holding-row" key={row.symbol}><div className="treasury-asset-identity"><strong>{row.symbol}</strong></div><div className="treasury-asset-balance" aria-description={!row.current && row.observedAt > 0 ? "Last observed " + new Date(row.observedAt * 1000).toLocaleString() : undefined}><strong><LiveNumber value={row.balance} format={displayFarmAmount} /></strong><small><LiveNumber value={row.usd} format={formatUsd} /></small></div></div>)}</div>
    <div className="treasury-value-total"><span className="info-label">Farming value<InfoTooltip label="About treasury farming value"><p>Market value of the tracked underlying farming assets. Pending rewards are excluded. A previously complete value remains visible while current positions or prices refresh.</p></InfoTooltip></span><strong><LiveNumber value={total} format={formatUsd} /></strong></div>
    <div className="treasury-value-total"><span className="info-label">Wallet + farming positions<InfoTooltip label="About the combined treasury value"><p>Adds the treasury wallet value and tracked farming value from complete reads. Protocol-owned liquidity is shown separately and is not added here.</p><p>This is a market estimate, before any exit costs, rather than a guaranteed cash value.</p></InfoTooltip></span><strong><LiveNumber value={combined?.value} format={formatUsd} /></strong></div>
    <details className="treasury-token-details"><summary aria-disabled={!data} onClick={event => { if (!data) event.preventDefault(); }}>View all {data?.rows.length ?? TREASURY_STRATEGIES.length + 1} tracked strategies</summary>{data?.rows.map(row => <div key={row.id}><a href={`https://scan.pulsechain.com/address/${row.address}`} target="_blank" rel="noreferrer">{row.label} ↗</a><span aria-description={row.error || undefined}>{row.assets.map(asset => asset.balance == null ? "—" : `${displayFarmAmount(asset.balance)} ${asset.symbol}`).join(" + ")}{row.error ? " · last known" : ""}</span></div>)}</details>
  </section>;
}
