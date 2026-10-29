import { explorerUrl } from "../config/contracts";
import type { DiscoveredFarm } from "../lib/farmDiscovery";

/** Registered participants can use contracts other than a token deposit vault. */
export function DiscoveredPoolCard({ pool, error, favorite, onFavorite, highlighted }: {
  pool: DiscoveredFarm; error: string | null; favorite: boolean; onFavorite: () => void; highlighted: boolean;
}) {
  return <article id={"farm-card-" + pool.id} tabIndex={-1} className={"browse-farm-card discovered-pool-card" + (highlighted ? " farm-rank-target" : "")} aria-labelledby={"farm-" + pool.id}>
    <div className="bfc-head">
      <span className="discovered-pool-icon" aria-hidden="true">◇</span>
      <div className="bfc-identity"><h2 className="bfc-name" id={"farm-" + pool.id}>{pool.label}</h2><span className="bfc-sub">Registered pool · #{pool.poolId}</span></div>
      <button type="button" className={"farm-icon-button" + (favorite ? " is-active" : "")} aria-label={(favorite ? "Unfavorite " : "Favorite ") + pool.label} aria-pressed={favorite} onClick={onFavorite}><span aria-hidden="true">☆</span></button>
    </div>
    <div className="discovered-pool-message">
      <strong>{pool.status === "supported" ? "Pool data unavailable" : "Awaiting integration"}</strong>
      <p>{pool.status === "supported" ? "This pool’s values could not be loaded. They will be checked again on the next refresh." : "This pool is registered with OINK. Its deposit and reward actions are not supported here yet."}</p>
      <span>{pool.allocPoint === "0" ? "No rewards allocated" : "Rewards allocated"}</span>
      {error && <p role="status">Read unavailable. Retrying automatically.</p>}
    </div>
    <div className="bfc-footer discovered-pool-footer"><code>{pool.address}</code><a className="bfc-contract-btn" href={explorerUrl(pool.address)} target="_blank" rel="noreferrer">View contract ↗</a></div>
  </article>;
}
