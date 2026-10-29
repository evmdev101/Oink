import { displayFarmAmount } from "../lib/farmDisplay";
import { SALE_DESTINATIONS, type readSale } from "../lib/miningOffers";
import { InfoTooltip } from "./InfoTooltip";

type Sale = Awaited<ReturnType<typeof readSale>>;

export function SaleEstimate({ data, fresh, busy, amount, amountValid, asset, duration, error }: {
  data: Sale | null; fresh: boolean; busy: boolean; amount: string;
  amountValid: boolean; asset: string; duration: string; error: string;
}) {
  const destination = SALE_DESTINATIONS.find(item => item.id === duration);
  const minerLabel = destination?.label.replace(/ years?$/, "-year");
  const wallet = duration === "wallet";
  const ready = amountValid && fresh && data?.quote != null && !data.quoteError;
  const receiveInput = data?.inputMode === 'receive';
  const status = !amount ? "Enter the OINK amount you want"
    : !amountValid ? "Enter a valid OINK amount"
    : error || data?.quoteError ? "Estimate unavailable"
    : busy || !data ? "Getting your estimate…"
    : !fresh ? "Refreshing estimate…"
    : "Estimate unavailable";

  return <section className="sale-estimate" aria-label="OINK receive estimate" aria-live="polite" aria-atomic="true">
    <span className="sale-estimate-label">You receive · estimated <InfoTooltip label="About estimated OINK received">This total already includes any bonus for the selected miner. The payment is an estimate at the current sale price. The final OINK amount can change before the transaction is mined, and the sale does not guarantee a minimum received amount. When you choose a miner, its OINK is deposited into that time miner instead of paid as liquid OINK.</InfoTooltip></span>
      <strong className="sale-estimate-total">{ready ? displayFarmAmount(data!.quote!) : "—"} <span>OINK</span></strong>
      <p className="sale-estimate-destination">{wallet ? "Sent to your wallet as liquid OINK" : `Deposited into your ${minerLabel} miner`}</p>
      <dl className="sale-estimate-breakdown">
        <div className="sale-payment-total"><dt>You pay · estimated</dt><dd title={ready ? data!.paymentAmount ?? amount : undefined}>{ready ? displayFarmAmount(data!.paymentAmount ?? amount) : "—"} {asset}</dd></div>
        {!wallet && <>
          <div><dt>Base OINK</dt><dd>{ready ? displayFarmAmount(data!.baseQuote!) : "—"} OINK</dd></div>
          <div><dt>Extra OINK for your miner</dt><dd>{ready ? "+" + displayFarmAmount(data!.bonusQuote!) : "—"} OINK</dd></div>
        </>}
      </dl>
      {ready && !data!.quoteFunded && <p className="sale-estimate-warning">This exceeds the sale’s available OINK. Reduce your OINK amount or use Max.</p>}
      {ready && data!.balanceEnough === false && <p className="sale-estimate-warning">Your {asset} balance is too low for this amount{asset === 'PLS' ? ' after the network fee buffer' : ''}. Reduce the OINK amount or add more {asset}.</p>}
      <p className="sale-estimate-note" tabIndex={ready?0:undefined}>{ready ? <>{wallet ? "" : "The total already includes your miner bonus. OINK is locked in the selected miner. "}{receiveInput ? "You pay the quoted payment amount. " : ""}The final OINK amount can change before confirmation; no minimum output is guaranteed.</> : status}</p>
  </section>;
}
