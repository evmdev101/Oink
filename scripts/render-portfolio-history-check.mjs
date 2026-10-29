// Render the real history panels with public chain records, without connecting a wallet.
import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {readFile,writeFile} from 'node:fs/promises';
const account=process.argv[2];
if(!account)throw Error('Provide a public address for the read-only preview.');
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
let provider;
try{
  const chain=await server.ssrLoadModule('/src/lib/chain.ts');
  provider=await chain.getPublicProvider();
  const history=await server.ssrLoadModule('/src/lib/portfolioHistory.ts');
  const data=await history.readPortfolioHistory(account,AbortSignal.timeout(50000));
  const {PortfolioHistoryPanel}=await server.ssrLoadModule('/src/components/PortfolioHistoryPanel.tsx');
  const panels=renderToString(createElement(PortfolioHistoryPanel,{account:data.account,revision:0,oinkPrice:'0'}));
  const chartCount=(panels.match(/<svg/g)??[]).length;
  if(data.failed||!data.rows.length||chartCount<2)throw Error('History render did not contain complete data and both charts.');
  const styles=await readFile('src/app-styles.ts','utf8');
  const css=[...styles.matchAll(/import "\.\/(.*?\.css)"/g)].map(([,path])=>`<link rel="stylesheet" href="/src/${path}">`).join('\n');
  const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OINK history · read-only verification</title>${css}<style>body{margin:0}.history-preview-note{padding:18px 24px;font:14px/1.5 "DM Sans",sans-serif;border-bottom:1px solid var(--border)}.history-preview-note strong{font-size:17px} .app-page{padding-top:0}</style></head><body class="theme-obsidian"><div class="history-preview-note"><strong>Read-only history preview</strong><br>${data.rows.length} verified events · ${data.account} · No wallet connection or transactions</div><div class="app-shell"><main class="app-page overview-page portfolio-detail-page">${panels}</main></div></body></html>`;
  await writeFile('evidence/portfolio-history-verified-2026-10-25.html',html);
  console.log(JSON.stringify({preview:'evidence/portfolio-history-verified-2026-10-25.html',rows:data.rows.length,charts:chartCount,failed:data.failed}));
}finally{provider?.destroy();await server.close();}
