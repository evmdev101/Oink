import { formatUnits } from "ethers";
import { useEffect, useState } from "react";
import { aggregateBuybacks, OINK_BUYBACK_ADDRESSES, readPublicBuybacks, type BuybackSnapshot } from "../lib/oinkBuybacks";
import { freshFarmPrice, peekFarmPrices, readFarmPrices, type FarmPrices } from "../lib/farmPrices";
import { portfolioMarketValue } from "../lib/portfolioValuation";
import { displayRankValue } from "../lib/farmRankings";
import { displayFarmAmount } from "../lib/farmDisplay";
import { assetUrl } from "../lib/assets";
import { BuybackActivityChart } from "./BuybackActivityChart";
import { useDeferredDisplayRead } from "./useDeferredDisplayRead";
import "./oink-buybacks.css";

const DAY = 86400;
let retainedBuybacks: BuybackSnapshot | null = null;
function compact(raw: bigint | null | undefined) {
  if (raw == null) return "—";
  const value = Number(formatUnits(raw, 18));
  if (value > 0 && value < .001) return "<0.001";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}
function age(timestamp: number, now: number) {
  const seconds = Math.max(0, Math.floor(now / 1000) - timestamp);
  if (seconds < 60) return "Just now";
  const days = Math.floor(seconds / DAY);
  const [value, unit] = seconds < 3600 ? [Math.floor(seconds / 60), "minute"]
    : days < 1 ? [Math.floor(seconds / 3600), "hour"]
    : days < 31 ? [days, "day"]
    : days < 365 ? [Math.floor(days / 30), "month"] : [Math.floor(days / 365), "year"];
  return new Intl.RelativeTimeFormat("en", { numeric: "always" }).format(-Number(value), unit as Intl.RelativeTimeFormatUnit);
}

export function OinkBuybacks() {
  const { sectionRef, readReady } = useDeferredDisplayRead();
  const [data, setData] = useState<BuybackSnapshot | null>(retainedBuybacks);
  const [prices, setPrices] = useState<FarmPrices>(peekFarmPrices);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(5);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!readReady) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (document.hidden) { timer = setTimeout(load, 15000); return; }
      setBusy(true);
      try {
        const result = await readPublicBuybacks(controller.signal);
        if (!controller.signal.aborted) {
          retainedBuybacks = result;
          setData(result); setError(""); setNow(Date.now());
        }
      } catch {
        if (!controller.signal.aborted) setError("Live buyback history is unavailable. Retrying automatically.");
      } finally {
        if (!controller.signal.aborted) { setBusy(false); timer = setTimeout(load, 60000); }
      }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [readReady, revision]);
  useEffect(() => {
    if (!readReady) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      if (document.hidden) { timer = setTimeout(load, 15000); return; }
      try {
        const result = await readFarmPrices(controller.signal);
        if (!controller.signal.aborted) { setPrices(result); setNow(Date.now()); }
      } catch { /* Quote freshness independently hides unavailable dollar values. */ }
      finally { if (!controller.signal.aborted) timer = setTimeout(load, 60000); }
    };
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [readReady]);
  const all = data ? aggregateBuybacks(data) : null;
  const latest = data?.rows[0];
  const fresh = data != null && now >= data.timestamp * 1000 && now - data.timestamp * 1000 <= 120000;
  const currentValue = all ? portfolioMarketValue(formatUnits(all.oinkRaw, 18), freshFarmPrice(prices.oink, now), true) : null;
  const asOf = data ? new Date(data.timestamp * 1000).toLocaleString() : "";

  return <section ref={sectionRef} className="reference-panel oink-buybacks" aria-labelledby="oink-buybacks-heading">
    <header className="buyback-heading">
      <div className="buyback-title"><img src={assetUrl("img/oink.png")} alt="" width="42" height="42" /><div><span className="buyback-kicker">PIGGY BANK → OINK</span><h2 id="oink-buybacks-heading">OINK buybacks</h2></div></div>
      <details className="buyback-contracts"><summary>Buyback contracts</summary><div>{OINK_BUYBACK_ADDRESSES.map((address, index) => <a key={address} href={`https://scan.pulsechain.com/address/${address}`} target="_blank" rel="noreferrer"><span>Contract {index + 1}</span><span>{address.slice(0, 6)}…{address.slice(-4)} ↗</span></a>)}</div></details>
    </header>
    <p className="buyback-intro">Follow OINK purchased by the Piggy Bank protocol’s buyback contract and sent to its treasury. DEGEN buybacks are tracked separately on the DEGEN site.</p>
    <div className="buyback-stats" aria-label="OINK protocol buyback statistics" aria-busy={busy && !data}>
      <div><span>Recorded OINK bought</span><strong>{compact(all?.oinkRaw)} <small>OINK</small></strong><small>Current value: {currentValue == null ? "— USD" : displayRankValue(currentValue, "tvl")}</small></div>
      <div><span>Recorded PLS spent</span><strong>{compact(all?.spentRaw)} <small>PLS</small></strong><small>Actual swap input, excluding gas</small></div>
      <div><span>Buybacks recorded</span><strong>{all ? all.count.toLocaleString() : "—"}</strong><small>Confirmed purchases</small></div>
      <div><span>Latest buyback</span><strong className="buyback-latest">{latest ? age(latest.timestamp, now) : data ? "None recorded" : "—"}</strong><small>{latest ? new Date(latest.timestamp * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}</small></div>
    </div>
    <p className="buyback-status" role="status">{error || (!data ? readReady ? "Reading buyback history…" : "Buyback history loads as this section comes into view." : fresh ? `Updated ${asOf}` : `Showing recorded history as of ${asOf}. Waiting for a live refresh.`)}{error && <button type="button" disabled={busy} onClick={() => setRevision(value => value + 1)}>{busy ? "Retrying…" : "Retry"}</button>}</p>
    {data && !fresh && error && <p className="buyback-note">Showing recorded history as of {asOf}.</p>}
    <div className="buyback-windows" aria-label={data ? `Recent buyback totals ending ${asOf}` : "Recent buyback totals"}>
      {([ ["24 hours", DAY], ["7 days", 7 * DAY], ["30 days", 30 * DAY] ] as const).map(([label, seconds]) => {
        const total = data ? aggregateBuybacks(data, seconds) : null;
        return <div key={label}><span>{label}</span><strong>{compact(total?.oinkRaw)} <small>OINK bought</small></strong><small>{total ? `${total.count.toLocaleString()} buyback${total.count === 1 ? "" : "s"}` : "—"}</small></div>;
      })}
    </div>
    {data && <div className="buyback-history-layout">
      <BuybackActivityChart snapshot={data} />
      <div className="buyback-history"><h3>Recent buybacks</h3>
        {!data.rows.length && <p className="buyback-note">No purchases recorded by the tracked contract.</p>}
        {!!data.rows.length && <div className="buyback-list" id="oink-buyback-history" role="region" aria-label="Recent protocol buyback history" tabIndex={0}>
          {data.rows.slice(0, limit).map(row => <a href={`https://scan.pulsechain.com/tx/${row.tx}`} target="_blank" rel="noreferrer" className="buyback-row" key={row.key}>
            <span><strong>{displayFarmAmount(formatUnits(row.oinkRaw, 18))} OINK</strong><small>{displayFarmAmount(formatUnits(row.spentRaw, 18))} PLS spent</small></span>
            <span className="buyback-time"><time dateTime={new Date(row.timestamp * 1000).toISOString()}>{age(row.timestamp, now)}</time><span aria-hidden="true">↗</span></span>
          </a>)}
        </div>}
        {limit < data.rows.length && <button className="buyback-show-more" type="button" aria-controls="oink-buyback-history" onClick={() => setLimit(value => value + 5)}>Show more buybacks</button>}
      </div>
    </div>}
    <p className="buyback-note buyback-coverage">Totals cover the listed OINK protocol buyback contract. Purchased OINK is accumulated in the treasury, not burned. Current USD value uses today’s available market quote, not the value at purchase.</p>
  </section>;
}
