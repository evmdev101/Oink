import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TIME_MINER_CONTRACTS, explorerUrl } from "../config/contracts";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { usePageLoadStatus } from "./PageLoadBoundary";
import { InfoTooltip } from "./InfoTooltip";
import "./time-miner-cards.css";

import { readTimeMinerSummary, peekTimeMinerSummary, type TimeMinerSummary } from "../lib/minerDisplayReads";
const compact = (value: string) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number(value));

export function TimeMinerCards() {
  const [snapshot, setSnapshot] = useState<TimeMinerSummary | null>(peekTimeMinerSummary);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const ready = !!snapshot && snapshot.rows.length === TIME_MINER_CONTRACTS.length && snapshot.rows.every(row => row != null) && !snapshotIsStale(snapshot.timestamp, now);
  const loadError = loading ? null : error || (snapshot?.rows.some(row => !row) ? "Some miner values could not be loaded. Retry to load all time miners." : snapshot && snapshotIsStale(snapshot.timestamp, now) ? "Miner data is out of date. Retry to load current values." : null);
  usePageLoadStatus("time-miner-cards", ready, loadError, () => setRefresh(value => value + 1));
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let timer: number | undefined;
    let readTimer: number | undefined;
    let retryDelay = 60000;
    setLoading(true);
    setError("");
    const timeout = new Promise<never>((_, reject) => {
      readTimer = window.setTimeout(() => { reject(new Error("Miner data is taking too long to load. Please retry.")); controller.abort(); }, 60000);
    });
    Promise.race([readTimeMinerSummary(controller.signal), timeout]).then(value => {
      if (!active) return;
      setSnapshot(value); setError(""); setNow(Date.now());
      if (value.rows.some(row => row == null)) retryDelay = 5000;
    }).catch((reason) => { if (active) { setError(String(reason.message ?? reason)); retryDelay = 5000; } }).finally(() => {
      window.clearTimeout(readTimer);
      if (!active) return;
      setLoading(false);
      timer = window.setTimeout(() => setRefresh((value) => value + 1), retryDelay);
    });
    return () => { active = false; controller.abort(); window.clearTimeout(timer); window.clearTimeout(readTimer); };
  }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="time-miner-workspace">
    <div className="time-miner-toolbar">{error && <p role="alert">{error}</p>}<InfoTooltip label="About miner pool statistics"><p>Total pool shares are accounting units for everyone in that duration pool. OINK per full share is the pool's gross OINK value divided by its shares; your position value depends on how many shares you own.</p><p>The harvest call fee rewards the caller for harvesting pool rewards. It is separate from an individual miner's early or late withdrawal penalty. These pool figures are not your wallet balance or a withdrawal quote.</p></InfoTooltip></div>
    <div className="time-miner-grid">{TIME_MINER_CONTRACTS.map((record, index) => {
      const row = snapshot?.rows[index];
      return <article className="time-miner-card" key={record.id}>
        <span className="time-miner-asset">OINK TIME MINER</span><h3>{record.label}</h3>
        <dl>
          <div><dt>Total pool shares</dt><dd>{row ? compact(row.shares) : "—"}</dd></div>
          <div><dt>OINK per full share</dt><dd>{row ? compact(row.sharePrice) : "—"}</dd></div>
          <div><dt>Harvest call fee</dt><dd>{row ? `${row.callFee}%` : "—"}</dd></div>
        </dl>
        <p className="time-miner-read-status" role="status">{snapshot && !row ? "Contract reads unavailable. Values are not assumed to be zero." : ""}</p>
        <p className="time-miner-note">Pool totals, not your balance. Share price is not APR or a guaranteed withdrawal amount.</p>
        <Link className="secondary-action" style={{ width: "100%", marginBottom: 16 }} to="/mining?tab=deploy">Deploy miners</Link>
        <a href={explorerUrl(record.address)} target="_blank" rel="noreferrer">View miner contract</a>
      </article>;
    })}</div>
  </section>;
}
