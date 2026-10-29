import { useState } from "react";
import { Link } from "react-router-dom";
import { InfoTooltip } from "./InfoTooltip";

export function MiningComparison({ rows }: { rows: { label:string; apr:string|null; balance:string|null; color:string }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const total = rows.reduce((sum, row) => sum + Number(row.balance ?? 0), 0);
  const max = Math.max(10, ...rows.map(row => Number(row.apr ?? 0)));
  const points = rows.map((row,index) => ({ x:65 + index * 130, y:220 - Number(row.apr ?? 0) / max * 170 }));
  const selected = active == null ? null : rows[active];
  return <article className="reference-panel mining-comparison">
    <header><div><div className="info-heading"><h3>Mining rewards by duration</h3><InfoTooltip label="About mining rewards by duration"><p>APR annualizes the current OINK emission rate for each miner using its accounting balance and recent block timing. It is an estimate that changes as emissions, timing and participation change.</p><p>Exit penalties and other costs are excluded. “Miner weight” is each duration's share of the loaded accounting balances, rather than a promised return.</p></InfoTooltip></div><p>Gross annualized estimates from current miner emissions and recent block timing, before exit costs.</p></div><Link to="/mining?tab=deploy">Create a miner →</Link></header>
    <div className="mining-curve-readout" aria-live="polite">{selected ? <><strong>{selected.label}</strong><span>{selected.apr == null ? "Unavailable" : Number(selected.apr).toFixed(1) + "% estimated APR"}</span></> : <><strong>Six lock-up durations</strong><span>Estimated rewards, not guaranteed returns</span></>}</div>
    <svg className="mining-reward-curve" viewBox="0 0 780 270" role="img" aria-label="Estimated annual mining rewards by lock-up duration">
      {[0, .5, 1].map(step => <g key={step}><line x1="50" x2="755" y1={220-step*170} y2={220-step*170} /><text x="42" y={224-step*170} textAnchor="end">{(max*step).toFixed(0)}%</text></g>)}
      {rows.slice(1).map((row,index) => row.apr != null && rows[index].apr != null ? <line className="mining-curve-line" key={row.label} x1={points[index].x} y1={points[index].y} x2={points[index+1].x} y2={points[index+1].y} /> : null)}
      {rows.map((row,index) => <g key={row.label}>
        <text x={points[index].x} y="250" textAnchor="middle">{row.label}</text>
        {row.apr != null && <g tabIndex={0} role="button" aria-label={`${row.label}: ${Number(row.apr).toFixed(1)}% estimated APR`} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(index)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(index); } }}>
          <circle cx={points[index].x} cy={points[index].y} r="18" fill="transparent" stroke="none" />
          <circle cx={points[index].x} cy={points[index].y} r={active === index ? 7 : 5} fill={row.color} className="mining-curve-point" />
          <text x={points[index].x} y={points[index].y-15} textAnchor="middle">{Number(row.apr).toFixed(1)}%</text>
        </g>}
      </g>)}
    </svg>
    <div className="portfolio-table-wrap"><table className="portfolio-table"><thead><tr><th>Duration</th><th>Estimated APR</th><th>Miner weight</th><th>Accounting balance</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.label}><td>{row.label}</td><td>{row.apr == null ? "—" : Number(row.apr).toFixed(1) + "%"}</td><td>{row.balance == null || !rows.every(item => item.balance != null) || total <= 0 ? "—" : (Number(row.balance)/total*100).toFixed(1)+"%"}</td><td>{row.balance == null ? "—" : new Intl.NumberFormat("en", {notation:"compact",maximumFractionDigits:2}).format(Number(row.balance)) + " OINK"}</td><td><Link to="/mining?tab=deploy">Create →</Link></td></tr>)}</tbody></table></div>
  </article>;
}
