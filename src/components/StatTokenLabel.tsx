import { assetUrl } from "../lib/assets";

const tokens:Record<string,"oink" | "pls" | "hex"> = {
  "OINK supply":"oink", "Treasury OINK":"oink", "Treasury PLS":"pls",
  "OINK in miners":"oink", "OINK in governance":"oink", "OINK in LP":"oink",
  "HEX T-shares":"hex",
};

export function StatTokenLabel({ label }: { label:string | undefined }) {
  const token = tokens[label ?? ""];
  return <span className="stat-token-label">
    {token && <span className={"stat-token-icon" + (token === "oink" ? " is-oink" : "")} aria-hidden="true">
      <img src={assetUrl(token === "oink" ? "img/oink.png" : `img/farms/${token}.png`)} alt="" />
    </span>}
    {label}
  </span>;
}
