import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { farmSpecIdentity, getFarmCatalogRevision, getFarmWriteSpec, subscribeFarmCatalog } from "../lib/farmCatalog";
import { useWallet } from "./WalletProvider";
import "./farm-transactions.css";
import "./position-previews.css";
import { PositionTransaction } from "./PositionTransaction";
import { TIME_MINER_CONTRACTS } from "../config/contracts";
import { readFarmRewardDestinations, rewardRateText, rewardDestinationAmount, rewardDestinationEligibility, type RewardDestinations } from "../lib/farmRewardDestinations";
import { displayFarmAmount } from "../lib/farmDisplay";
import { formatEther } from "ethers";
import { readFarmClaimReward, type FarmClaimReward } from "../lib/farmClaimReward";

export function FarmExitPreview({ farmId, positions, kind, compact = false }: { farmId: string; positions: { index: number; pending?: string }[] | null; kind: "claim" | "withdraw"; compact?: boolean }) {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [destination, setDestination] = useState("wallet");
  const [emergency, setEmergency] = useState(false);
  const [payouts, setPayouts] = useState<RewardDestinations | null>(null);
  const [payoutError, setPayoutError] = useState(false);
  const [currentReward, setCurrentReward] = useState<FarmClaimReward | null>(null);
  const [rewardError, setRewardError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useSyncExternalStore(subscribeFarmCatalog, getFarmCatalogRevision);
  const spec = getFarmWriteSpec(farmId), supported = !!spec;
  const specIdentity = spec ? farmSpecIdentity(spec) : "";
  const index = selected === "" ? positions?.[0]?.index : Number(selected);
  const available = supported && !!wallet.account && wallet.chainId === 369n && index !== undefined && !!positions?.some((v) => v.index === index);
  const fieldId = farmId + "-" + kind + (compact ? "-max" : "");
  useEffect(() => { setSelected(""); setDestination("wallet"); setEmergency(false); setOpen(false); dialog.current?.close(); }, [wallet.revision, farmId, specIdentity]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) dialog.current?.close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) dialog.current?.close();
    };
    // Dismiss without consuming the click: navigation and other page controls
    // keep working on the same click. No backdrop, focus trap or scroll lock.
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => {
    setPayouts(null); setPayoutError(false);
  }, [farmId, specIdentity]);
  useEffect(() => {
    if (!open || !supported) return;
    let active = true;
    const controller = new AbortController();
    const read = async () => {
      try {
        const value = await readFarmRewardDestinations(farmId, controller.signal);
        if (active) { setPayouts(value); setPayoutError(false); }
      } catch { if (active) setPayoutError(true); }
    };
    void read();
    const timer = window.setInterval(read, 30000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [open, supported, farmId, specIdentity]);
  useEffect(() => {
    setCurrentReward(null); setRewardError(false);
    const account = wallet.account;
    if (!open || !available || !account || index == null || emergency) return;
    let active = true;
    const controller = new AbortController();
    const read = async () => {
      try {
        const value = await readFarmClaimReward(farmId, account, index, controller.signal);
        if (active) { setCurrentReward(value); setRewardError(false); }
      } catch { if (active) setRewardError(true); }
    };
    void read();
    const timer = window.setInterval(read, 15000);
    window.addEventListener("oink-positions-changed", read);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("oink-positions-changed", read); };
  }, [open, available, wallet.account, wallet.revision, farmId, specIdentity, index, emergency]);
  const payoutLabel = (id: string) => rewardRateText(payouts?.rates[id]) ?? (payoutError || payouts ? "Payout rate unavailable" : "Checking payout rate…");
  const liveReward = currentReward?.farmId === farmId && currentReward.account.toLowerCase() === wallet.account?.toLowerCase() && currentReward.index === index ? currentReward : null;
  const grossRewards = liveReward?.gross ?? positions?.find(position => position.index === index)?.pending ?? null;
  const destinationState = (id: string) => rewardDestinationEligibility(!rewardError ? liveReward?.gross : null, payouts?.rates[id], payouts?.minimums?.[id]);
  const eligibility = destinationState(destination);
  const claimReady = emergency || (kind === "withdraw" && destination === "wallet") || eligibility === "ready";
  const estimatedReward = rewardDestinationAmount(grossRewards, payouts?.rates[destination]);
  const minimum = payouts?.minimums?.[destination];
  const minerMinimums = TIME_MINER_CONTRACTS.map(miner => payouts?.minimums?.[miner.id]);
  const commonMinimum = minerMinimums[0] != null && minerMinimums.every(value => value === minerMinimums[0]) ? formatEther(minerMinimums[0]).replace(/\.0$/, "") : null;
  const rewardOptions = [...TIME_MINER_CONTRACTS].reverse().map(miner => ({ id: miner.id, label: miner.label.replace(/years?/i, "Year").replace(/months?/i, "Month") }));
  return <div className={"farm-exit-control farm-exit-" + kind}>
    <button type="button" className={compact ? "farm-inline-control" : kind === "claim" ? "bfc-harvest-btn" : "bfc-unstake-btn"} aria-label={compact ? "Unstake a full position" : undefined} disabled={!supported} onClick={() => { setEmergency(false); setOpen(true); if (!dialog.current?.open) dialog.current?.show(); }}>{compact ? "[MAX]" : kind === "claim" ? "Claim" : "Unstake"}</button>
    {typeof document !== "undefined" && createPortal(<dialog ref={dialog} className="farm-review-dialog farm-exit-dialog" aria-modal="false" aria-labelledby={"exit-title-" + fieldId} onClose={() => { if (!dialog.current?.open) setOpen(false); }}>
      <header><h2 id={"exit-title-" + fieldId}>{kind === "claim" ? "Claim OINK rewards" : emergency ? "Emergency withdrawal" : "Unstake position"}</h2><button type="button" onClick={() => dialog.current?.close()}>Close</button></header>
      <section className="farm-exit-preview">
        <label htmlFor={"exit-position-" + fieldId}>Select position</label>
        <select id={"exit-position-" + fieldId} value={index ?? ""} disabled={!positions?.length} onChange={(event) => setSelected(event.target.value)}>
          {!positions?.length && <option value="">{wallet.account ? "No available positions" : "Connect wallet to view positions"}</option>}
          {positions?.map((v) => <option key={v.index} value={v.index}>Position #{v.index}</option>)}
        </select>
        {!emergency && <><label htmlFor={"exit-destination-" + fieldId}>Send rewards to</label>
        <select id={"exit-destination-" + fieldId} value={destination} onChange={(event) => setDestination(event.target.value)}>
          <option value="wallet">Your wallet · {payoutLabel("wallet")}</option>
          {TIME_MINER_CONTRACTS.map((v) => <option value={v.id} key={v.id} disabled={destinationState(v.id) === "below-minimum" || payouts?.rates[v.id] === "0"}>{v.label} miner · {payoutLabel(v.id)}{destinationState(v.id) === "below-minimum" ? " · below minimum" : ""}</option>)}
        </select><p className="farm-reward-payout" role="status">{payoutLabel(destination)}{payouts && !payoutError ? " of gross OINK rewards." : ""}{destination !== "wallet" && " Miner withdrawal penalties and locks apply separately."}{payoutError && payouts && " Showing the last loaded rate; current terms are checked before the wallet opens."}</p>
        <section className="farm-reward-breakdown" aria-label="Estimated rewards by destination" title="Estimated OINK rewards for the selected position">
          <h3>Harvest Rewards:</h3>
          <dl>{rewardOptions.map(option => {
            const amount = rewardDestinationAmount(grossRewards, payouts?.rates[option.id]);
            const rate = payouts?.rates[option.id];
            const penalty = rewardRateText(rate)?.replace(" penalty", "");
            return <div key={option.id}>
              <dt>{option.label}:</dt>
              <dd title={amount ?? undefined}>{amount == null ? "—" : displayFarmAmount(amount)} OINK{rate === "10000" ? "(100%)" : penalty ? `(-${penalty})` : "(—)"}</dd>
            </div>;
          })}</dl>
        </section></>}
        {!emergency && available && !claimReady && <p className="farm-claim-eligibility" role="status">
          {eligibility === "below-minimum" && minimum != null
            ? `After the penalty, this position would send about ${estimatedReward == null ? "—" : displayFarmAmount(estimatedReward)} OINK. This miner requires at least ${formatEther(minimum)} OINK. Choose another destination or wait for more rewards.`
            : eligibility === "unavailable" ? "No claimable OINK is available for this destination yet. Choose another destination or wait for more rewards."
            : rewardError ? "Current rewards could not be checked. Retrying automatically."
            : !liveReward ? "Checking current claimable rewards…"
            : payouts || payoutError ? "Claim limits could not be verified. They will be checked again automatically."
            : "Checking the destination’s payout and minimum deposit…"}
        </p>}
        <p>{emergency ? "Returns your remaining stake after funding costs and forfeits all OINK rewards for this position. This closes the entire position." : kind === "withdraw" ? "Unstaking withdraws the entire selected position; the card's amount field is for staking only. Funding charges can reduce your payout." : `${commonMinimum != null ? `Miner minimum: ${commonMinimum} OINK after penalties.` : "Each miner’s minimum applies after penalties."} Wallet claims have no miner minimum.`}</p>
        {kind === "withdraw" && <label className="farm-review-consent"><input type="checkbox" checked={emergency} onChange={event => setEmergency(event.target.checked)} /><span>Use emergency withdrawal and forfeit this position's OINK rewards</span></label>}
        {!wallet.account && <p>Connect your wallet from the header to continue.</p>}
        {wallet.account && wallet.chainId !== 369n && <p>Switch your wallet to PulseChain to continue.</p>}
        {open && <PositionTransaction label={kind === "claim" ? "Claim OINK" : emergency ? "Emergency withdraw" : "Withdraw position"} disabled={!available || !claimReady} request={{type:"farm",id:farmId,index:index??0,kind:emergency ? "emergency" : kind,destination:emergency ? "wallet" : destination}} />}
      </section>
    </dialog>, document.body)}
  </div>;
}

