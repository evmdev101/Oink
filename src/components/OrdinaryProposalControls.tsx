import { RewardEstimate } from "./GovernanceInformation";
import type { GovernanceMetrics } from "../lib/governanceMetrics";
import { governanceAvailability } from "../lib/governanceAvailability";
import { useState } from "react";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import type { GovernanceSnapshot } from "../lib/governance";
import { ORDINARY_MODELS, ordinaryProposalAdapter } from "../lib/ordinaryProposalActions";
import { ProtocolAction } from "./ProtocolAction";
import { useWallet } from "./WalletProvider";
import { InfoTooltip } from "./InfoTooltip";

const localDateValue=(value:string)=>{
  const seconds=Number(value);if(!seconds||!Number.isFinite(seconds))return "";
  const date=new Date(seconds*1000);if(Number.isNaN(date.getTime()))return "";
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
};
export function OrdinaryProposalControls({ family, snapshot, metrics, onConfirmed }: { metrics?: GovernanceMetrics | null; family: string; snapshot: GovernanceSnapshot | null; onConfirmed: () => void }) {
  const wallet = useWallet(), model = ORDINARY_MODELS[family];
  const [mode, setMode] = useState("support"), [selected, setSelected] = useState(""), [values, setValues] = useState<Record<string, string>>({ delay: "0", burn: "false", vaultType: "0", miner: MINER_PREVIEW_SPECS[0].id, start: "0" });
  const update = (key: string, value: string) => setValues(old => ({ ...old, [key]: value }));
  const rows = snapshot?.history.filter(p => p.family === family && p.valid) ?? [], picked = rows.find(p => p.key === selected) ?? rows[0];
  const id = picked?.key.slice(family.length + 1) ?? "";
  if (!model) return <p>This proposal category is not supported.</p>;
  return <section className="professional-card governance-composer"><h3>{family}: take action <InfoTooltip label="About ordinary proposal actions"><p>Creating, supporting and opposing spend the voting credit you enter. Spent credit is not refunded if the proposal loses. Supporting does not execute the change; opposing does not automatically finalize a veto.</p><p>The initial voting window plus the current global delay determine the earliest execution time. Reward events and some transfers also have their own start time. The site checks the selected proposal's current eligibility.</p></InfoTooltip></h3><p>Select a proposal or vote using voting credit. The site checks current terms, then opens your wallet for confirmation.</p>
    <p className="governance-wallet-status" role="status">{!wallet.account ? "Connect your wallet from the header to continue." : ""}</p>
    <div className="protocol-form">
      <label>Action<select value={mode} onChange={e => setMode(e.target.value)}><option value="support">Support a proposal</option><option value="oppose">Oppose a proposal</option><option value="create">Create a proposal</option><option value="veto">Veto a proposal</option><option value="execute">Execute an approved proposal</option></select></label>
      {mode !== "create" && <label>Proposal<select value={picked?.key ?? ""} onChange={e => setSelected(e.target.value)} disabled={!rows.length}>{!rows.length && <option value="">{snapshot ? "No open proposals" : "Loading proposals…"}</option>}{rows.map(row => <option key={row.key} value={row.key}>{row.reference} · {row.change}</option>)}</select></label>}
      {["create", "support", "oppose"].includes(mode) && <label>Voting credit to spend (OINK)<input inputMode="decimal" value={values.credit ?? ""} onChange={e => update("credit", e.target.value)} placeholder={snapshot?.settings.votingCost ?? "Amount"} /></label>}
      {mode === "create" && <>{model.fields.map(f => <label key={f.key}>{f.key === "start" ? "Start date and time (your timezone)" : f.label}{f.key === "start" ? <><input type="datetime-local" value={localDateValue(values.start)} onChange={e=>update("start",e.target.value?String(Math.floor(new Date(e.target.value).getTime()/1000)):"0")} /><small>{family === "Reward boost" ? "Choose a future time after the voting window, global delay and an additional 24 hours." : "Optional. Leave blank for no additional wait after the voting deadline."}</small></> : f.unit === "miner" ? <select value={values[f.key]} onChange={e => update(f.key, e.target.value)}>{MINER_PREVIEW_SPECS.map(m => <option key={m.id} value={m.id}>{m.durationDays} days</option>)}</select> : f.unit === "vault" ? <select value={values[f.key]} onChange={e => update(f.key, e.target.value)}><option value="0">Deposit fee</option><option value="1">Funding charge per hour</option><option value="2">Referral bonus</option></select> : f.unit === "bool" ? <select value={values[f.key]} onChange={e => update(f.key, e.target.value)}><option value="false">Transfer to protocol treasury</option><option value="true">Burn OINK permanently</option></select> : <input inputMode={f.unit === "address" ? "text" : "decimal"} value={values[f.key] ?? ""} onChange={e => update(f.key, e.target.value)} />}</label>)}<label>Initial voting window (whole hours)<input inputMode="numeric" value={values.delay} onChange={e => update("delay", e.target.value)} /></label></>}
      {family === "Reward boost" && mode === "create" && <RewardEstimate metrics={metrics ?? null} rate={values.value ?? ""} duration={values.duration ?? ""} />}
      <p role="status">{governanceAvailability({module:"ordinary",action:mode,args:{...values,family,id}},snapshot)}</p>
      <ProtocolAction request={{ module: "ordinary", action: mode, args: { ...values, family, id } }} adapter={ordinaryProposalAdapter} label="Continue in wallet" onConfirmed={onConfirmed} disabled={!snapshot || (mode !== "create" && !picked)} />
    </div>
  </section>;
}

