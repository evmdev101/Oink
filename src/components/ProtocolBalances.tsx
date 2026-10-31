import { useEffect, useState } from "react";
import { getPublicProvider } from "../lib/chain";
import { protocolBalanceRows, readProtocolBalances } from "../lib/protocolBalances";
import { snapshotIsStale } from "../lib/governanceReadSafety";
import { displayFarmAmount } from "../lib/farmDisplay";
import "./access-tools.css";
import { InfoTooltip } from "./InfoTooltip";

export function ProtocolBalances() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof readProtocolBalances>> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      setBusy(true);
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([
          getPublicProvider().then(readProtocolBalances),
          new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(Error("Public balance read timed out. Retrying automatically.")), 45000); }),
        ]);
        if (active) { setData(next); setError(""); setNow(Date.now()); }
      } catch { if (active) setError("Current protocol balances are unavailable. Retrying automatically."); }
      finally { clearTimeout(deadline); if (active) { setBusy(false); timer = setTimeout(load, 60000); } }
    };
    void load();
    const clock = setInterval(() => setNow(Date.now()), 15000);
    const confirmed = () => setRevision(value => value + 1);
    window.addEventListener("oink-protocol-confirmed", confirmed);
    return () => { active = false; clearTimeout(timer); clearInterval(clock); window.removeEventListener("oink-protocol-confirmed", confirmed); };
  }, [open, revision]);
  const fresh = !!data && !snapshotIsStale(data.timestamp, now);
  return <details className="reference-panel access-tools protocol-balances" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Show all OINK balances &amp; supply</summary>
    {open && <>
      <p className="info-label">Issued supply, protocol reserves and distribution credit from the current chain state.<InfoTooltip label="About OINK balances and supply"><p>Issued supply counts existing tokens. Virtual supply also includes protocol accounting credit that may not yet have been minted.</p><p>Wallet balances, Governor reserves and distribution credit overlap these supply figures. Do not add the categories together. Reward credit is not a guarantee that a claim is currently payable.</p></InfoTooltip></p>
      <div className="access-facts protocol-balance-facts" aria-busy={!data}>{protocolBalanceRows.map(record => {
        const row = data?.rows.find(row => row.id === record.id);
        return <div key={record.id}><span>{record.label}</span><strong>{!data ? "— OINK" : fresh && row?.value != null ? displayFarmAmount(row.value) + " OINK" : "Unavailable"}</strong></div>;
      })}</div>
      <p className="snapshot-note protocol-balances-status" role="status">{error || (!data ? busy ? "Reading public OINK balances…" : "Balances unavailable." : fresh ? "" : "This snapshot is out of date. Waiting for current balances.")}{data?.rows.some(row => row.value == null) ? " Some contract reads are unavailable." : ""}</p>
      <p>Virtual supply includes protocol accounting credit and is not circulating token supply. Distribution reward credit is not an additional wallet token balance or a guarantee of a payable claim. These categories overlap and should not be added together.</p>
    </>}
  </details>;
}
