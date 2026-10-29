import { useEffect, useState } from "react";
import { NftDashboardCard, isNftDashboardPool } from "../components/NftDashboardCard";
import { peekEcosystemVaults, readEcosystemVaults } from "../lib/miningAccounts";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import "./farms-layout.css";
import "./secondary-page-stability.css";

export function NftsPage() {
  const [snapshot, setSnapshot] = useState(() => peekEcosystemVaults());
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const result = await readEcosystemVaults(controller.signal);
        if (!controller.signal.aborted) {
          setSnapshot(result);
          setFailed(false);
          setNow(Date.now());
        }
      } catch {
        if (!controller.signal.aborted) {
          setFailed(true);
          setNow(Date.now());
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => { setNow(Date.now()); void refresh(); }, 60000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, []);

  const pools = snapshot?.rows.flatMap(row => row.discovery && isNftDashboardPool(row.address) ? [row.discovery] : []) ?? [];
  const fresh = !!snapshot && snapshot.complete && !failed && !snapshotIsStale(snapshot.timestamp, now) && !snapshot.discoveryError && !snapshot.registry?.partial;

  return <main className="app-page oink-farms-page nft-projects-page"><NftDashboardCard pools={pools} fresh={fresh} /></main>;
}
