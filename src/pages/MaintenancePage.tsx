import { Link } from "react-router-dom";
import { MaintenanceStatus } from "../components/MaintenanceStatus";
import { ResourceFooter } from "../components/ResourceFooter";
import { MAINTENANCE_ACTIONS_DISABLED } from "../config/publicPreview";

export function MaintenancePage() {
  return <main className="app-page maintenance-page">
    <section className="page-intro"><div><span className="page-kicker">OINK community tools</span><h1>Protocol maintenance</h1><p>Keep the protocol running: buybacks, reward updates, farming upkeep and mining fees.</p></div></section>
    <p className="maintenance-intro">{MAINTENANCE_ACTIONS_DISABLED ? "Review live protocol statistics and maintenance conditions below. Transaction actions are temporarily disabled while testing is completed." : "Anyone can review the public actions below. Available actions depend on current contract conditions. Each transaction shows its effect and estimated PLS fee before you confirm in your wallet."}</p>
    <MaintenanceStatus />
    <p className="maintenance-governance-link"><Link to="/governance">Manage proposals and voting →</Link></p>
    <ResourceFooter />
  </main>;
}
