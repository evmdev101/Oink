// Isolated dev-only UI fixture. No provider injection, wallet or RPC requests.
import { createRoot } from "react-dom/client";
import { MinerActions } from "../src/components/MinerActions";
import "../src/styles.css";
import "../src/pages/miners-layout.css";
const row = { index: 0, shares: "1000", gross: "1023.123456", deposited: 1700000000, maturity: 1707862400, mandatoryUntil: 1700000000, graceEnd: 1708294400, pool: {id:"three-month",label:"3 months",address:"0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4"} };
if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<main style={{maxWidth:440,margin:"80px auto",padding:20}}><p>Isolated UI test · sample position · no wallet</p><article className="my-miner-card"><header><h2>3 month lock</h2><span>#0</span></header><div className="miner-hero-value"><strong>1,023.123</strong><span>OINK</span></div><div className="miner-penalty"><span>Exit penalty</span><strong>Check on exit</strong></div><MinerActions row={row} account={null} revision={0} chainId={null}/></article></main>);
