import type { GovernanceMetrics } from "../lib/governanceMetrics";
import { governanceAvailability } from "../lib/governanceAvailability";
import { useState } from "react";
import type { GovernanceSnapshot } from "../lib/governance";
import { rewardMaintenanceAdapter } from "../lib/rewardMaintenanceActions";
import { ProtocolAction } from "./ProtocolAction";
export function RewardMaintenanceControls({snapshot,metrics,onConfirmed}:{metrics?:GovernanceMetrics|null;snapshot:GovernanceSnapshot|null;onConfirmed:()=>void}){
  const [action,setAction]=useState("end"),[selected,setSelected]=useState("");
  const rows=snapshot?.history.filter(row=>row.family==="Reward boost"&&row.valid)??[];
  const id=rows.some(row=>row.key.slice("Reward boost:".length)===selected)?selected:rows[0]?.key.slice("Reward boost:".length)??"";
  return <section className="professional-card governance-composer"><h3>Reward Boost follow-up actions</h3><p>End an expired active event or cancel a competing proposal while an event is running.</p><div className="protocol-form"><label>Maintenance action<select value={action} onChange={e=>setAction(e.target.value)}><option value="end">End expired event</option><option value="cancel">Cancel competing proposal</option></select></label>{action==="cancel"&&<label>Competing proposal<select value={id} onChange={e=>setSelected(e.target.value)}>{!rows.length&&<option value="">No open proposals</option>}{rows.map(row=><option key={row.key} value={row.key.slice("Reward boost:".length)}>{row.reference} · {row.change}</option>)}</select></label>}<p role="status">{governanceAvailability({module:"reward-maintenance",action,args:{id}},snapshot,metrics??null)}</p><ProtocolAction request={{module:"reward-maintenance",action,args:{id}}} adapter={rewardMaintenanceAdapter} label="Continue in wallet" disabled={action==="cancel"&&!id} onConfirmed={onConfirmed}/></div></section>;
}
