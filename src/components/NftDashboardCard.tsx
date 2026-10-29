import { useState } from "react";
import { explorerUrl } from "../config/contracts";
import { NFT_PROJECTS, nftRewardStatus, type NftPool } from "../config/nftProjects";
import { useSavedPreference } from "../lib/useSavedPreference";
import { assetUrl } from "../lib/assets";
import { InfoTooltip } from "./InfoTooltip";
export { isNftDashboardPool } from "../config/nftProjects";

function ProjectCard({ project, pools, fresh, favorite, onFavorite }: {
  project: typeof NFT_PROJECTS[number]; pools: NftPool[]; fresh: boolean; favorite: boolean; onFavorite: () => void;
}) {
  const status = nftRewardStatus(project.contracts.map(c => c.address), pools, fresh);
  return <article className="nft-project-card" aria-labelledby={project.id + "-title"}>
    <a className="nft-project-art" href={project.dashboard} target="_blank" rel="noopener noreferrer" aria-label="View DegenStrategy NFT in the DEGEN dashboard (opens in a new tab)">
      <img src={assetUrl("img/nft/degen-miner.png")} alt="DegenStrategy NFT Miner: two glowing orange and red dice" width="400" height="400" loading="lazy" />
      <span className="nft-art-caption">EXPLORE DEGEN NFT MINERS ↗</span>
    </a>
    <div className="nft-project-body">
      <div className="nft-project-badges"><span className={"nft-reward-badge " + status}>{status === "active" ? "OINK rewards active" : status === "none" ? "No OINK allocation" : "Reward status unavailable"}</span><InfoTooltip label="About NFT reward status">This badge reads whether OINK rewards are currently allocated to the project's registered pools. It does not show your NFT holdings, unclaimed balance or a guaranteed return. Unavailable status means current allocation data could not be confirmed.</InfoTooltip><span>External dashboard</span>
        <button type="button" className="nft-project-favorite" aria-label={(favorite ? "Unfavorite " : "Favorite ") + project.name} aria-pressed={favorite} onClick={onFavorite}>{favorite ? "★" : "☆"}</button>
      </div>
      <div className="nft-project-identity"><img src={assetUrl("img/nft/degen-miner.png")} alt="DEGEN logo" width="48" height="48" loading="lazy" /><h3 id={project.id + "-title"}>{project.name}</h3></div>
      <p>{project.description}</p>
      <div className="nft-project-rewards"><span>Reward tokens</span>{project.rewards.map(token => <strong key={token}>{token}</strong>)}</div>
      <a className="bfc-contract-btn nft-project-open" href={project.dashboard} target="_blank" rel="noopener noreferrer">Open NFT Dashboard ↗</a>
      <small>Opens the published DEGEN dashboard in a new tab.</small>
      <details className="nft-pool-details">
        <summary>Explore project &amp; contracts</summary>
        <p>NFT units participate in reward sharing. Payouts depend on the contracts’ settings. The OINK badge shows protocol allocation, not your personal earnings or a guaranteed return.</p>
        <p>Older vaults stay listed for existing holders. NFT balances and actions are available in the linked dashboard.</p>
        <ul>{project.contracts.map(contract => {
          const pool = pools.find(row => row.address.toLowerCase() === contract.address.toLowerCase());
          return <li key={contract.address}>
            <a href={explorerUrl(contract.address)} target="_blank" rel="noopener noreferrer">{contract.label}{pool ? " · #" + pool.poolId : ""} ↗</a>
            <span>{!fresh || pool?.allocPoint == null ? "Allocation unavailable" : pool.allocPoint === "0" ? "No OINK allocation" : "OINK rewards allocated"}</span>
            <code>{contract.address}</code>
          </li>;
        })}</ul>
      </details>
    </div>
  </article>;
}

export function NftDashboardCard({ pools, fresh = false }: { pools: NftPool[]; fresh?: boolean }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [favorites, setFavorites] = useSavedPreference<string>("oink:nft-project-favorites", "");
  const ids = favorites.split(",").filter(Boolean);
  const projects = NFT_PROJECTS.filter(project => {
    const match = [project.name, project.description, ...project.contracts.map(c => c.address), ...pools.filter(p => project.contracts.some(c => c.address.toLowerCase() === p.address.toLowerCase())).map(p => "#" + p.poolId)].join(" ").toLowerCase().includes(search.trim().toLowerCase());
    return match && (filter !== "favorites" || ids.includes(project.id)) && (filter !== "active" || nftRewardStatus(project.contracts.map(c => c.address), pools, fresh) === "active");
  });
  return <section id="nft-projects" className="nft-projects" aria-labelledby="nft-projects-title">
    <header className="nft-projects-header"><div><span className="bfc-sub">Explore the ecosystem</span><div className="info-heading"><h2 id="nft-projects-title">NFT Projects</h2><InfoTooltip label="About NFT projects">These projects connect NFT units to reward sharing. This site shows their OINK allocation and published contracts. The linked project dashboard manages NFT holdings, minting and reward actions; its own contract rules and fees apply.</InfoTooltip></div><p>Discover NFT miners connected to OINK.</p></div><span className="nft-project-count">{NFT_PROJECTS.length} project</span></header>
    <div className="nft-projects-toolbar">
      <label>Search projects<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Project, pool # or contract" /></label>
      <div role="group" aria-label="NFT project filters">{[["all", "All projects"], ["active", "Earning OINK"], ["favorites", "Favorites"]].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
    </div>
    <div className="nft-projects-results" role="region" aria-label="NFT project results" tabIndex={0}>
      <div className="nft-projects-grid">{projects.map(project => <ProjectCard key={project.id} project={project} pools={pools} fresh={fresh} favorite={ids.includes(project.id)} onFavorite={() => setFavorites((ids.includes(project.id) ? ids.filter(id => id !== project.id) : [...ids, project.id]).join(","))} />)}</div>
      {!projects.length && <div className="nft-projects-empty" role="status"><p>{filter === "active" && !fresh ? "Live reward status is unavailable. View all projects while data refreshes." : filter === "favorites" ? "No favorites match. Use the star on a project to save it." : "No projects match your search."}</p><button type="button" onClick={() => { setSearch(""); setFilter("all"); }}>Show all projects</button></div>}
    </div>
  </section>;
}
