import { Link } from "react-router-dom";

export function DashboardInsights() {
  return <section className="dashboard-insights dashboard-actions-only" aria-labelledby="dashboard-actions-heading">
    <article className="reference-panel dashboard-action-panel">
      <h3 id="dashboard-actions-heading">Where to act</h3>
      <div className="treasury-action-map">
        <Link to="/governance#senate"><strong>Treasury requests</strong><span>Create, support, block or finalize funding actions.</span></Link>
        <Link to="/governance#miner-voting"><strong>Miner voting</strong><span>Use locked-position power on treasury and Governor positions.</span></Link>
        <Link to="/governance#ordinary"><strong>Ordinary proposals</strong><span>Change settings, allocations, fees and reward events.</span></Link>
      </div>
    </article>
  </section>;
}
