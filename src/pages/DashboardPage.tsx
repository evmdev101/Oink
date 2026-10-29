import { useCallback, useState } from "react";
import { ParticipationSnapshot } from "../components/ParticipationSnapshot";
import { ProtocolBalances } from "../components/ProtocolBalances";
import { HomeSnapshot } from "../components/HomeSnapshot";
import { DashboardTreasury } from "../components/DashboardTreasury";
import { DashboardInsights } from "../components/DashboardInsights";
import { ResourceFooter } from "../components/ResourceFooter";
import { RecentProtocolActivity } from "../components/RecentProtocolActivity";
import { LINKS } from "../config/links";
import { InfoTooltip } from "../components/InfoTooltip";
import "./home-resources.css";
import "./reference-layout.css";

let lastFarmCount: number | null = null;
export function DashboardPage() {
  const [farmCount, setFarmCount] = useState<number | null>(lastFarmCount);
  const updateFarmCount = useCallback((count:number|null) => { if (count != null) { lastFarmCount=count; setFarmCount(count); } },[]);
  return <main className="app-page oink-home reference-dashboard">
    <HomeSnapshot farmCount={farmCount} />
    <DashboardTreasury />
    <ParticipationSnapshot onFarmCount={updateFarmCount} />
    <ProtocolBalances />
    <section className="dashboard-market-grid">
      <article className="reference-panel market-panel"><header><div className="market-pair-heading"><span className="market-pair-icons" aria-hidden="true"><span className="market-oink-icon"><img src={import.meta.env.BASE_URL + "img/oink.png"} alt="" /></span><img src={import.meta.env.BASE_URL + "img/farms/pls.png"} alt="" /></span><h2>OINK / PLS</h2><InfoTooltip label="About the OINK / PLS market chart"><p>Market trading data for the linked OINK / PLS pair, provided by Dexscreener. This price chart shows trading activity, rather than your miner earnings or a guaranteed sale price.</p></InfoTooltip></div><a href={LINKS.dexscreener} target="_blank" rel="noreferrer">Open on Dexscreener ↗</a></header><iframe src={LINKS.dexscreener + "?embed=1&theme=dark&trades=0&info=0"} title="OINK / PLS market chart on Dexscreener" loading="eager" allowFullScreen /></article>
    </section>
    <RecentProtocolActivity />
    <DashboardInsights />
    <ResourceFooter />
  </main>;
}
