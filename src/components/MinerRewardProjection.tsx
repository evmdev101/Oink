import { useEffect, useId, useRef, useState } from "react";
import type { MinerYield } from "../lib/minerLive";
import { projectMinerRewards } from "../lib/minerProjection";
import { displayFarmAmount } from "../lib/farmDisplay";

export function MinerRewardProjection({ amount, estimate, durationDays, label, now }: {
  amount: string; estimate: MinerYield | null; durationDays: number; label: string; now: number;
}) {
  const [hover, setHover] = useState(false), [pinned, setPinned] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const id = useId(), open = hover || pinned;
  const projection = projectMinerRewards(amount, estimate, durationDays, now);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setPinned(false); setHover(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setPinned(false); setHover(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="miner-reward-projection" ref={root}
    onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setHover(true); }}
    onMouseLeave={() => setHover(false)}>
    <button type="button" className="miner-projection-trigger" ref={trigger} aria-label={label + " rewards projection"} aria-expanded={open} aria-controls={id}
      onClick={() => { setPinned(!pinned); setHover(false); }}>Rewards Projection</button>
    {open && <section id={id} className="miner-projection-panel" aria-label={label + " rewards projection"}>
      <h3>Rewards Projection</h3>
      {projection.error ? <p role="status">{projection.error}</p> : <>
        <p className="miner-projection-amount">Starting amount: <strong title={amount}>{displayFarmAmount(amount)} OINK</strong></p>
        <table><caption>Projected OINK · {label}</caption><thead><tr><th scope="col">Period</th><th scope="col">New rewards</th><th scope="col">Total</th></tr></thead>
          <tbody>{projection.rows.map(row => <tr key={row.label}><th scope="row">{row.label}{row.label === "Full term" && <small>{row.days} days</small>}</th><td title={row.rewards + " OINK"}>{displayFarmAmount(row.rewards)}</td><td title={row.total + " OINK"}>{displayFarmAmount(row.total)}</td></tr>)}</tbody>
        </table>
        <p className="miner-projection-note">Total = starting amount + new rewards. Uses your pool share after deposit at current emissions; no compounding. Rates and pool shares can change. Excludes exit penalties and gas—not a withdrawal quote.</p>
      </>}
    </section>}
  </div>;
}
