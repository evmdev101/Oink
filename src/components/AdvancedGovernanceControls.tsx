import { GovernanceCandidates } from "./GovernanceCandidates";
import { governanceAvailability } from "../lib/governanceAvailability";
import { useState } from "react";
import { Link } from "react-router-dom";
import { advancedGovernanceAdapter } from "../lib/advancedGovernanceActions";
import { ProtocolAction } from "./ProtocolAction";
import type { GovernanceSnapshot } from "../lib/governance";
import { InfoTooltip } from "./InfoTooltip";

const choices = {
  senate: [["senate-vote", "Vote to veto a proposal"], ["senate-remove-vote", "Remove my recorded ballot"], ["senate-veto", "Finalize a Senate veto"], ["senate-membership-vote", "Vote on Senate membership"], ["senate-add", "Finalize adding a member"], ["senate-expel", "Finalize removing a member"], ["senate-replace", "Replace my Senate seat"], ["senate-credit", "Distribute Senate voting credit"]],
  treasury: [["treasury-create", "Create a treasury request"], ["treasury-support", "Support with voting credit"], ["treasury-oppose", "Oppose with voting credit"], ["treasury-veto", "Veto using credit opposition"], ["treasury-kill", "Reject using miner opposition"], ["treasury-approve", "Approve treasury transfer"], ["treasury-close", "Close unsuccessful request"]],
  governor: [["governor-propose", "Propose a replacement Governor"], ["governor-activate", "Approve first stage"], ["governor-reject-first", "Reject unsuccessful first stage"], ["governor-veto", "Veto after first-stage approval"], ["governor-veto-total", "Veto with 25% miner opposition"], ["governor-enforce", "Finalize Governor replacement"], ["governor-clear", "Clear rejected replacement"]],
} as const;

export function AdvancedGovernanceControls({ section, snapshot, onConfirmed, active = false }: { active?:boolean; section: keyof typeof choices; snapshot: GovernanceSnapshot | null; onConfirmed: () => void }) {
  const [action, setAction] = useState<string>(choices[section][0][0]);
  const [args, setArgs] = useState<Record<string, string>>({ kind: "treasury", outcome: "add", delay: "0", token: "0x0000000000000000000000000000000000000000" });
  const update = (key: string, value: string) => setArgs(old => ({ ...old, [key]: value }));
  const field = (key: string, label: string, placeholder = "") => <label>{label}<input value={args[key] ?? ""} onChange={e => update(key, e.target.value)} placeholder={placeholder} /></label>;
  const targetNeeded = ["senate-vote", "senate-veto"].includes(action);
  const needsId = targetNeeded || section === "treasury" && action !== "treasury-create" || section === "governor" && !["governor-propose", "governor-clear"].includes(action);
  const treasury = section === "treasury" || targetNeeded && args.kind === "treasury";
  const targets = treasury ? snapshot?.treasury.filter(row => row.valid).map(row => ({ id: String(row.id), label: `Request ${row.id} · ${row.assetSymbol ?? row.token} → ${row.beneficiary}` })) ?? [] : snapshot?.upgrades.filter(row => !row.invalidated).map(row => ({ id: String(row.supportPosition), label: `Proposal ${row.supportPosition} · ${row.proposedGovernor}` })) ?? [];
  const id = targets.some(row => row.id === args.id) ? args.id : targets[0]?.id ?? args.id ?? "";
  return <section className="professional-card governance-composer"><h3>{section === "senate" ? "Senate actions" : section === "treasury" ? "Treasury actions" : "Governor replacement actions"} <InfoTooltip label={section === "senate" ? "About Senate actions" : section === "treasury" ? "About treasury actions" : "About Governor replacement actions"}>{section === "senate" ? <p>Recording a Senate ballot and finalizing its effect are separate transactions. Vetoes apply to treasury requests and Governor replacements. Membership changes also need the deployed membership rules to be met; an off-chain nomination does not create a seat.</p> : section === "treasury" ? <p>A treasury request sets the asset, recipient, amount and initial voting window. Credit votes, miner opposition, Senate vetoes and timing can affect its outcome. Finalization may close an unsuccessful request without sending funds; the review checks the expected result.</p> : <p>A replacement candidate must be a contract. Proposal, first-stage approval, veto and final enforcement are separate actions. Final enforcement can transfer MasterChef control, fee authorities and the old Governor's OINK balance to that candidate.</p>}</InfoTooltip></h3>
    <p>Choose an action and enter its details. Current requirements are checked before your wallet opens.</p>
    {section === "senate" && <p><Link to="/maintenance">Harvest and publish Senate credit in Community maintenance →</Link></p>}
    {section === "senate" && <GovernanceCandidates kind="senate" active={active} onSelect={row => {setAction("senate-membership-vote");setArgs(old => ({...old,candidate:row.address,outcome:row.kind === "add" ? "add" : "remove"}));}} />}
    <div className="protocol-form">
      <label>Action<select value={action} onChange={e => setAction(e.target.value)}>{choices[section].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {targetNeeded && <label>Proposal category<select value={args.kind} onChange={e => setArgs(old => ({ ...old, kind: e.target.value, id: "" }))}><option value="treasury">Treasury withdrawal</option><option value="governor">Governor replacement</option></select></label>}
      {needsId && (targets.length ? <label>{treasury ? "Treasury request" : "Governor proposal"}<select value={id} onChange={e => update("id", e.target.value)}>{targets.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}</select></label> : field("id", treasury ? "Treasury request ID" : "Governor support-position ID"))}
      {["senate-membership-vote", "senate-add", "senate-expel", "senate-replace", "governor-propose"].includes(action) && field("candidate", action === "governor-propose" ? "Replacement Governor contract" : "Member address", "0x…")}
      {action === "senate-membership-vote" && <label>Membership change<select value={args.outcome} onChange={e => update("outcome", e.target.value)}><option value="add">Add member</option><option value="remove">Remove member</option></select></label>}
      {action === "senate-remove-vote" && field("ballot", "Recorded ballot number")}
      {["treasury-create", "treasury-support", "treasury-oppose"].includes(action) && field("credit", "Voting credit to spend (OINK)")}
      {action === "treasury-create" && <>{field("token", "Asset contract (zero address for PLS)")}{field("recipient", "Recipient address", "0x…")}{field("amount", "Amount in whole token units")}{field("delay", "Initial voting window (whole hours)")}</>}
      <p role="status">{governanceAvailability({module:"advanced-governance",action,args:{...args,id}},snapshot)}</p>
      <ProtocolAction request={{ module: "advanced-governance", action, args: { ...args, id } }} adapter={advancedGovernanceAdapter} label="Continue in wallet" onConfirmed={onConfirmed} />
    </div>
  </section>;
}

