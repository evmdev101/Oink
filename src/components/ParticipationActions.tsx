import { useEffect, useId, useRef, useState } from "react";
import { formatEther, ZeroAddress } from "ethers";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { getPublicProvider } from "../lib/chain";
import type { GovernanceSnapshot } from "../lib/governance";
import { parseFarmDepositAmount } from "../lib/farmTransactions";
import { participationAdapter, readParticipationPositions, type ParticipationPositions } from "../lib/participationTransactions";
import { ProtocolAction } from "./ProtocolAction";
import { useWallet } from "./WalletProvider";
import { InfoTooltip } from "./InfoTooltip";
import "./participation-actions.css";

export function ParticipationActions({ mode, snapshot, onConfirmed }: { mode: "credit" | "miner"; snapshot: GovernanceSnapshot | null; onConfirmed?: () => void }) {
  const id = useId(), wallet = useWallet();
  const [amount, setAmount] = useState(""), [burnAmount, setBurnAmount] = useState(""), [forId, setForId] = useState("");
  const [minerId, setMinerId] = useState("one-month"), [selection, setSelection] = useState("neutral"), [stance, setStance] = useState("support");
  const [delegate, setDelegate] = useState(""), [voters, setVoters] = useState("");
  const [positions, setPositions] = useState<ParticipationPositions | null>(null), [positionId, setPositionId] = useState(""), [shares, setShares] = useState("");
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const generation = useRef(0), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++generation.current; }; }, []);
  useEffect(() => {
    const reset = () => { ++generation.current; setPositions(null); setPositionId(""); setShares(""); setError(""); setLoading(false); };
    reset(); window.addEventListener("oink-positions-changed", reset);
    return () => { ++generation.current; window.removeEventListener("oink-positions-changed", reset); };
  }, [wallet.revision, minerId]);
  const action = (name: string, args: Record<string, string>, label: string, disabled = false) => <ProtocolAction request={{ module: "participation", action: name, args }} adapter={participationAdapter} label={label} disabled={disabled} onConfirmed={onConfirmed} />;
  const load = async (start: number) => {
    if (!wallet.account || wallet.chainId !== 369n || loading) return;
    const run = ++generation.current; setLoading(true); setError(""); setPositions(null); setPositionId(""); setShares("");
    try {
      const result = await readParticipationPositions(await getPublicProvider(), wallet.account, minerId, start);
      if (mounted.current && run === generation.current) { setPositions(result); setPositionId(result.positions[0]?.index.toString() ?? ""); setShares(result.positions[0] ? formatEther(BigInt(result.positions[0].shares)) : ""); }
    } catch (reason) { if (mounted.current && run === generation.current) setError(reason instanceof Error ? reason.message : "Positions could not be loaded."); }
    finally { if (mounted.current && run === generation.current) setLoading(false); }
  };
  if (mode === "credit") return <section className="professional-card participation-actions" aria-labelledby={id + "-credit"}>
    <h3 id={id + "-credit"}>Voting credit <InfoTooltip label="About voting credit">Burning OINK creates an equal amount of nonredeemable voting credit. Ordinary proposal actions consume credit permanently. It is separate from the reusable voting power of your locked miner positions.</InfoTooltip></h3>
    <p>Burn OINK to receive the same amount of voting credit. Credit pays for ordinary governance actions and cannot be redeemed for OINK.</p>
    <p>Current credit: {snapshot?.walletAddress === wallet.account && snapshot.walletCredit !== null ? `${snapshot.walletCredit} OINK units` : "Connect your wallet to see its balance"}</p>
    <div className="participation-controls"><label htmlFor={id + "-amount"}>OINK to burn<input id={id + "-amount"} inputMode="decimal" placeholder="0.0" value={amount} onChange={event => setAmount(event.target.value)} /></label>{action("credit-deposit", { amount }, "Deposit voting credit", !amount)}</div>
    <details><summary>Burn existing credit for a reference ID</summary><p>This permanently destroys credit. It does not cast a proposal vote or return tokens.</p><div className="participation-controls"><label htmlFor={id + "-burn"}>Voting credit to destroy<input id={id + "-burn"} inputMode="decimal" value={burnAmount} onChange={event => setBurnAmount(event.target.value)} /></label><label htmlFor={id + "-reference"}>Burn reference ID<input id={id + "-reference"} inputMode="numeric" value={forId} onChange={event => setForId(event.target.value)} /></label>{action("credit-burn", { amount: burnAmount, forId }, "Burn voting credit", !burnAmount || !forId)}</div></details>
    <p className="governance-wallet-status" role="status">{!wallet.account ? "Connect your wallet from the header to continue." : ""}</p>
    
  </section>;
  const [targetKind, targetId = "0"] = selection.split(":");
  const voteArgs = { minerId, targetKind, targetId, stance };
  let rawShares = "";
  try { rawShares = parseFarmDepositAmount(shares, 18).toString(); } catch { /* Validation runs before the wallet can be opened. */ }
  const selectedPosition = positions?.positions.find(row => row.index.toString() === positionId);
  return <section className="professional-card participation-actions" aria-labelledby={id + "-miner"}>
    <h3 id={id + "-miner"}>Manage miner voting <InfoTooltip label="About selecting a miner vote">Your whole share balance in the chosen miner follows one proposal selection, with that duration's voting weight. Choose Neutral to stop voting from that miner. You can change the selection without spending voting credit.</InfoTooltip></h3>
    <label htmlFor={id + "-miner-select"}>Time miner<select id={id + "-miner-select"} value={minerId} onChange={event => setMinerId(event.target.value)}>{MINER_PREVIEW_SPECS.map(miner => <option key={miner.id} value={miner.id}>{miner.label}</option>)}</select></label>
    <div className="participation-controls"><label htmlFor={id + "-target"}>Proposal<select id={id + "-target"} value={selection} onChange={event => setSelection(event.target.value)}><option value="neutral">Neutral — stop voting</option>{snapshot?.treasury.filter(row => row.valid).map(row => <option key={`t${row.id}`} value={`treasury:${row.id}`}>Treasury withdrawal {row.id}</option>)}{snapshot?.upgrades.filter(row => !row.invalidated).map(row => <option key={`g${row.supportPosition}`} value={`governor:${row.supportPosition}`}>Governor {row.proposedGovernor}</option>)}</select></label>{targetKind !== "neutral" && <label htmlFor={id + "-stance"}>Selection<select id={id + "-stance"} value={stance} onChange={event => setStance(event.target.value)}><option value="support">Support</option><option value="oppose">{targetKind === "treasury" ? "Block" : "Oppose"}</option></select></label>}{action("miner-vote", voteArgs, "Cast my miner vote")}</div>
    <p>Your whole share balance in this miner follows one selection. Voting does not consume credit or withdraw OINK.</p>
    <details><summary>Delegate voting power</summary><p>A delegate may change your selection in this miner until removed. Your current vote remains when a delegate is changed or removed.</p><div className="participation-controls"><label htmlFor={id + "-delegate"}>Delegate wallet<input id={id + "-delegate"} placeholder="0x…" value={delegate} onChange={event => setDelegate(event.target.value)} /></label>{action("delegate", { minerId, delegate }, "Set delegate", !delegate)}{action("delegate", { minerId, delegate: ZeroAddress }, "Remove delegate")}</div></details>
    <details><summary>Vote for wallets delegated to you</summary><p>Each listed wallet must currently delegate this miner to your connected account. This uses the proposal selection above.</p><label htmlFor={id + "-voters"}>Delegating wallet addresses (up to 25)<textarea id={id + "-voters"} rows={3} placeholder="One wallet address per line" value={voters} onChange={event => setVoters(event.target.value)} /></label>{action("delegated-vote", { ...voteArgs, voters }, "Cast delegated votes", !voters)}</details>
    <details><summary>Convert miner shares into voting credit</summary><p>Remove some or all of a position in exchange for nonwithdrawable voting credit. The corresponding OINK goes to the Governor contract. You receive no OINK in your wallet. <InfoTooltip label="About converting miner shares to credit">This consumes the selected shares and replaces their position value with voting credit. It is not a wallet withdrawal and cannot be undone by redeeming the credit. The site reloads the selected position and shows the current conversion amount.</InfoTooltip></p>
      <button type="button" disabled={loading || !wallet.account || wallet.chainId !== 369n} onClick={() => void load(0)}>{loading ? "Loading positions…" : "Load my positions"}</button>
      {error && <p className="farm-action-error" role="alert">{error}</p>}
      {positions && <><p>{positions.count ? `Showing positions ${positions.start}–${positions.start + positions.positions.length - 1} of ${positions.count}` : "No positions in this miner."}</p>
        {!!positions.count && <><label htmlFor={id + "-position"}>Position<select id={id + "-position"} value={positionId} onChange={event => { setPositionId(event.target.value); const row = positions.positions.find(item => item.index.toString() === event.target.value); setShares(row ? formatEther(BigInt(row.shares)) : ""); }}>{positions.positions.map(row => <option key={row.index} value={row.index}>#{row.index} · approximately {row.estimatedValue} OINK</option>)}</select></label>
          {selectedPosition && <><div className="participation-controls"><label htmlFor={id + "-shares"}>Shares to convert<input id={id + "-shares"} inputMode="decimal" value={shares} onChange={event => setShares(event.target.value)} /></label><button type="button" onClick={() => setShares(formatEther(BigInt(selectedPosition.shares)))}>All shares</button>{action("convert", { minerId, stakeId: positionId, shares: rawShares }, "Convert shares to voting credit", !rawShares || BigInt(rawShares) > BigInt(selectedPosition.shares))}</div><p>Full position: {formatEther(BigInt(selectedPosition.shares))} shares. The site reloads the exact position and current credit estimate.</p></>}
          {positions.count > 20 && <div className="participation-controls"><button type="button" disabled={loading || positions.start === 0} onClick={() => void load(Math.max(0, positions.start - 20))}>Previous 20</button><button type="button" disabled={loading || positions.start + 20 >= positions.count} onClick={() => void load(positions.start + 20)}>Next 20</button></div>}
        </>}
      </>}
    </details>
    <p className="governance-wallet-status" role="status">{!wallet.account ? "Connect your wallet from the header to continue." : ""}</p>
    
  </section>;
}

