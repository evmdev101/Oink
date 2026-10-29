import { useLocation } from "react-router-dom";
import { GOVERNANCE_ACTIONS_DISABLED, GOVERNANCE_ACTIONS_NOTICE, MAINTENANCE_ACTIONS_DISABLED, MAINTENANCE_ACTIONS_NOTICE } from "../config/publicPreview";
import "./public-preview.css";

export function PublicPreviewNotice() {
  const { pathname } = useLocation();
  const maintenance = pathname === "/maintenance" && MAINTENANCE_ACTIONS_DISABLED;
  if (!maintenance && (!GOVERNANCE_ACTIONS_DISABLED || pathname !== "/governance")) return null;
  return <aside className="public-preview-notice" aria-label="Public preview notice">
    <strong>{maintenance ? "Protocol maintenance" : "Governance"} · Actions temporarily disabled</strong>
    <p>{maintenance ? MAINTENANCE_ACTIONS_NOTICE : GOVERNANCE_ACTIONS_NOTICE}</p>
  </aside>;
}
