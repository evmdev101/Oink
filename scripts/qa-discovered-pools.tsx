// Dev-only layout fixture. No wallet, injected provider, or RPC calls.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DiscoveredPoolCard } from "../src/components/DiscoveredPoolCard";
import type { DiscoveredFarm } from "../src/lib/farmDiscovery";
import "../src/styles.css";
import "../src/pages/farms-layout.css";
const pools: DiscoveredFarm[] = [
  { id:"registry-0x1111111111111111111111111111111111111111",address:"0x1111111111111111111111111111111111111111",poolId:"28",allocPoint:"0",label:"Pool #28",status:"awaiting-integration",reason:"Unsupported contract" },
  { id:"registry-0x2222222222222222222222222222222222222222",address:"0x2222222222222222222222222222222222222222",poolId:"29",allocPoint:"100",label:"Pool #29",status:"awaiting-integration",reason:"Unreviewed asset" },
];
function Fixture() {
  const [list,setList]=useState(false), [favorites,setFavorites]=useState<string[]>([]);
  return <main className="app-page oink-farms-page"><p>Local sample pools · no wallet or transactions</p><button onClick={()=>setList(value=>!value)}>{list?"Grid view":"List view"}</button><div className={"browse-farms-grid"+(list?" farms-list-view":"")} style={{marginTop:20}}>{pools.map(pool=><DiscoveredPoolCard key={pool.id} pool={pool} error={null} favorite={favorites.includes(pool.id)} highlighted={false} onFavorite={()=>setFavorites(current=>current.includes(pool.id)?current.filter(id=>id!==pool.id):[...current,pool.id])}/>)}</div></main>;
}
if(import.meta.env.DEV)createRoot(document.getElementById("root")!).render(<Fixture/>);
