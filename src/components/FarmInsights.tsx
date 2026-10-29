import { useEffect, useRef, useState } from "react";
import { formatEther, parseEther } from "ethers";
import type { FarmYield } from "../lib/farmYield";
import { displayFarmAmount } from "../lib/farmDisplay";
import { decimalAmount, FARM_PERIODS, percentage, projectedReward, recordShare, rewardApr, type ShareReading } from "../lib/farmInsights";

type Props = { estimate: FarmYield | null; stake: string | null; pool: string; symbol: string; assetPrice: string; rewardPrice: string };
export function FarmInsightPopover({ mode, values }: { mode: "apr" | "rewards"; values: Props }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const { estimate, stake, pool, assetPrice, rewardPrice } = values;
  const apr = estimate ? rewardApr(estimate.dailyPool, pool, assetPrice, rewardPrice) : null;
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && ref.current?.open) { ref.current.removeAttribute("open"); ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details className={"farm-insight farm-insight-" + mode} ref={ref} onMouseEnter={() => { if (matchMedia("(hover: hover)").matches && ref.current) ref.current.open = true; }} onMouseLeave={() => { if (matchMedia("(hover: hover)").matches && !ref.current?.contains(document.activeElement) && ref.current) ref.current.open = false; }}>
    <summary onClick={event => { if (event.detail > 0 && ref.current) { event.preventDefault(); ref.current.open = true; } }} aria-label={mode === "apr" ? "APR breakdown" : "Rewards projection"}>{mode === "apr" ? <>{apr == null ? "—" : apr + "%"} <span aria-hidden="true">🧮</span></> : <span aria-hidden="true"><svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v13h14M5 12l4-4 3 2 4-5M12 5h4v4" /></svg></span>}</summary>
    <div className="farm-insight-panel">
      <h3><span aria-hidden="true">{mode === "apr" ? "🧮" : "📈"}</span>{mode === "apr" ? "APR Breakdown" : "Rewards Projection"}</h3>
      {!estimate ? <p>This vault's emission model is not verified yet.</p> : <>
        <table><tbody>{FARM_PERIODS.map(([period, days]) => {
          const tokens = projectedReward(estimate.dailyPool, stake, pool, days);
          const rate = rewardApr(estimate.dailyPool, pool, assetPrice, rewardPrice, days);
          const price = decimalAmount(rewardPrice);
          return <tr key={period}><th>{period}</th><td>{mode === "apr" ? rate == null ? "—" : rate + "%" : tokens == null ? "—" : displayFarmAmount(tokens) + " OINK"}{mode === "rewards" && tokens != null && price != null && price > 0n && <small> (${displayFarmAmount(formatEther(parseEther(tokens) * price / 10n ** 18n))} USD)</small>}</td></tr>;
        })}</tbody></table>

      </>}
    </div>
  </details>;
}

export function FarmPriceSettings({ symbol, assetPrice, rewardPrice, onPrices }: { symbol:string; assetPrice:string; rewardPrice:string; onPrices:(asset:string,reward:string)=>void }) {
  return <section className="farm-price-settings"><h3>Optional price overrides</h3>
    <div className="farm-insight-prices">
      <label>{symbol} price · USD<input inputMode="decimal" maxLength={40} placeholder="Enter price" value={assetPrice} onChange={e=>onPrices(e.target.value,rewardPrice)} /></label>
      <label>OINK price · USD<input inputMode="decimal" maxLength={40} placeholder="Enter price" value={rewardPrice} onChange={e=>onPrices(assetPrice,e.target.value)} /></label>
    </div>
    <p>Leave blank to use live market prices. Entered values override market quotes and are labeled as manual prices. Reward projections require a connected wallet and verified emissions.</p>
    <p>Gross estimates at the current rate, without compounding; month = 30 days. Fees, funding, gas, destination payout reductions and changes in pool conditions are excluded. Review the actual payout before confirming a transaction.</p>
  </section>;
}

export function FarmShareHistory({ account, farm, stake, pool, timestamp, verified }: { account: string | null; farm: string; stake: string | null; pool: string; timestamp: number | null; verified: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [stored, setStored] = useState<{ key: string; rows: ShareReading[] }>({ key: "", rows: [] });
  const [storageError, setStorageError] = useState(false);
  const s = decimalAmount(stake), p = decimalAmount(pool);
  const value = verified && s != null && p != null && p > 0n ? percentage(s, p, 3) : null;
  const key = account ? "oink:farm-ratio:369:" + account.toLowerCase() + ":" + farm : "";
  const rows = stored.key === key ? stored.rows : [];
  useEffect(() => { dialog.current?.close(); }, [key]);
  useEffect(() => {
    if (!key || value == null || timestamp == null || Date.now() - timestamp * 1000 > 120000) return;
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (!Array.isArray(parsed) || parsed.length > 1000 || parsed.some(r => !r || typeof r.at !== "number" || typeof r.value !== "number")) throw Error("Invalid history");
      const next = recordShare(parsed, { at: timestamp * 1000, value: Number(value) });
      localStorage.setItem(key, JSON.stringify(next)); setStored({ key, rows: next }); setStorageError(false);
    } catch { setStorageError(true); setStored({ key, rows: [] }); }
  }, [key, timestamp, value]);
  const current = value != null && timestamp != null ? { at: timestamp * 1000, value: Number(value) } : null;
  const observed = current ? [...rows.filter(r => r.at < current.at), current] : rows;
  const low = Math.min(...observed.map(r => r.value)), high = Math.max(...observed.map(r => r.value));
  const first = observed[0], last = observed.at(-1);
  const previous = current ? rows.filter(r => r.at < current.at).at(-1) : null;
  const points = observed.map(r => [(r.at - first.at) / Math.max(1, last!.at - first.at) * 280 + 10, 90 - (r.value - low) / Math.max(.01, high - low) * 70]);
  return <>
    <button className="farm-share-link" type="button" onClick={() => dialog.current?.showModal()} aria-label="Your farm share history">{value == null ? "(—)" : "(" + value + "%)"}</button>
    <dialog ref={dialog} className="farm-review-dialog farm-share-dialog" aria-label="Your farm share history">
      <header><h2>Your farm share</h2><button type="button" onClick={() => dialog.current?.close()}>Close</button></header>
      <p>Recorded stake / vault asset balance</p><strong className="farm-share-value">{value == null ? "Unavailable" : value + "%"}</strong>
      {previous && current && <p>{current.value === previous.value ? "No change" : (current.value > previous.value ? "+" : "") + (current.value - previous.value).toFixed(2) + " percentage points"} · previously {previous.value.toFixed(2)}% on {new Date(previous.at).toLocaleString()}</p>}
      <p>This is OINK's reward-weight ratio, not ownership of an LP pool or a verified percentage of total recorded deposits. Funding and direct transfers can change the ratio.</p>
      {observed.length > 0 && <><p>Observed range: {low.toFixed(2)}%–{high.toFixed(2)}%</p><svg viewBox="0 0 300 110" role="img" aria-label={"Observed stake-to-vault ratio, " + observed.length + " readings"}><polyline points={points.map(p => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth="2" />{points.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="currentColor" />)}</svg><p>{new Date(first.at).toLocaleString()} — {new Date(last!.at).toLocaleString()}</p></>}
      {value == null && <p>Connect a wallet and wait for verified farm data.</p>}
      {observed.length === 1 && <p>First observation saved. More visits build the history.</p>}
      <p>{storageError ? "Browser storage is unavailable or invalid; history could not be saved." : "Saved only in this browser for this wallet, up to 30 days, at least 4 hours apart, plus the current reading. Lines connect observations across gaps."}</p>
    </dialog>
  </>;
}
