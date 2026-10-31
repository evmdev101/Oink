import { useEffect, useState, type FormEvent } from "react";
import { getAddress } from "ethers";
import { readMinerPositions } from "../lib/miningAccounts";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { ScrollRegion } from "./ScrollRegion";
import { explorerUrl } from "../config/contracts";
import "./time-miner-cards.css";

const date = (value: number) => new Date(value * 1000).toLocaleString();
export function MyMiners() {
  const [account, setAccount] = useState("");
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof readMinerPositions>> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!account) return;
    let active = true;
    const controller = new AbortController();
    setLoading(true); setSnapshot(null); setError("");
    readMinerPositions(account, controller.signal).then((result) => { if (active) setSnapshot(result); })
      .catch((reason) => { if (active) setError(String(reason.message ?? reason)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [account, refresh]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const lookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try { setAccount(getAddress(String(new FormData(event.currentTarget).get("wallet")).trim())); setRefresh((r) => r + 1); setError(""); }
    catch { setError("Enter a valid 0x wallet address. No wallet connection is required."); }
  };
  return <section className="professional-card" aria-labelledby="my-miners-title">
    <h2 id="my-miners-title">Public wallet lookup</h2><p>Look up any public wallet address in read-only mode. The address is sent to the public RPC to read its positions. To manage your own positions, connect your wallet and use My miners above.</p>
    <form className="protocol-form" onSubmit={lookup}><label>Wallet address<input name="wallet" placeholder="0x…" required autoComplete="off" spellCheck={false} /></label><button type="submit" disabled={loading}>{loading ? "Reading positions…" : "Look up miners"}</button></form>
    {error && <p role="alert">{error}</p>}
    {snapshot && <>{snapshotIsStale(snapshot.timestamp, now) && <p role="status">Values are out of date. Look up again for current state.</p>}<p style={{ overflowWrap: "anywhere" }}>Wallet: {snapshot.account}</p>
      <p>Gross share value includes pool accounting rewards. It is not a withdrawal quote. Mandatory locks, early/late penalties and execution conditions still need action-specific checks. Position indexes can change after transfers or withdrawals.</p>
      <ScrollRegion label="Wallet time-miner positions">{snapshot.pools.map((pool) => <section key={pool.id} className="wallet-pool"><h3>{pool.label} <a href={explorerUrl(pool.address)} target="_blank" rel="noreferrer">Contract</a></h3>
        {pool.error ? <p role="status">Unavailable: {pool.error}</p> : pool.rows.length === 0 ? <p>No positions at this snapshot.</p> : <div className="time-miner-grid">{pool.rows.map((row) => <article className="time-miner-card" key={row.index}><h3>Position #{row.index}</h3><p>{row.status}</p><dl>
          <div><dt>Shares</dt><dd>{row.shares}</dd></div><div><dt>Gross OINK before fees</dt><dd>{row.gross}</dd></div><div><dt>Nominal maturity</dt><dd>{date(row.maturity)}</dd></div><div><dt>Grace period ends</dt><dd>{date(row.graceEnd)}</dd></div><div><dt>Mandatory lock until</dt><dd>{date(row.mandatoryUntil)}</dd></div>
        </dl></article>)}</div>}
      </section>)}</ScrollRegion></>}
  </section>;
}
