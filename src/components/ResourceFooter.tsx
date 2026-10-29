import { Link } from "react-router-dom";
import { LINKS } from "../config/links";
import { assetUrl } from "../lib/assets";
export function ResourceFooter() {
  return <footer className="resource-footer"><div><img src={assetUrl("img/apple-touch-icon.png")} alt="" /><strong>OINK</strong><span>Piggy Bank · PulseChain</span></div><nav aria-label="Resources"><a href={LINKS.buyOink} target="_blank" rel="noreferrer">Buy OINK ↗</a><Link to="/protocol">Contracts &amp; resources</Link><Link to="/protocol?section=tools">More OINK tools</Link><Link to="/maintenance">Community maintenance</Link><Link to="/protocol?section=audits">Audit reports</Link><a href={LINKS.oinkpaperPdf} target="_blank" rel="noreferrer">OINKpaper</a><a href={LINKS.github} target="_blank" rel="noreferrer">Contract source</a><a href={LINKS.telegram} target="_blank" rel="noreferrer">Community</a></nav></footer>;
}
