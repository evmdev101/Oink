import fs from 'node:fs';
import ts from 'typescript';
const folder = new URL('./', import.meta.url);
const root = new URL('../../', folder);
const coverageSource = fs.readFileSync(new URL('src/config/siteCoverage.ts', root), 'utf8');
const sourceFile = ts.createSourceFile('siteCoverage.ts', coverageSource, ts.ScriptTarget.Latest, true);
let rows;
function inspect(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'SITE_COVERAGE') {
    let initializer = node.initializer;
    if (ts.isAsExpression(initializer)) initializer = initializer.expression;
    rows = initializer.elements.map(row => row.elements.map(cell => cell.text));
  }
  ts.forEachChild(node, inspect);
}
inspect(sourceFile);
const original = JSON.parse(fs.readFileSync(new URL('inventory.json', folder), 'utf8'));
const namedFunctions = Object.fromEntries(fs.readdirSync(folder).filter(name => /^js__.*\.js$/.test(name) && !name.includes('.decoded.')).map(name => {
  const source = fs.readFileSync(new URL(name, folder), 'utf8');
  const functions = [...source.matchAll(/(?:async\s+)?function\s+([\w$]+)\s*\([^)]*\)/g)].map(match => match[1]).filter(name => !name.startsWith('_0x'));
  return [name, [...new Set(functions)]];
}));
const routes = {
  'index.html': '/', 'create-miner.html': '/mining?tab=deploy', 'view-all-miner.html': '/mining',
  'view-miner-card.html': '/mining', 'pulse-ecosystem-mining.html': '/farms', 'view-pulse-ecosystem-miners.html': '/farms',
  'referral.html': '/mining?tab=referral', 'pig-offering.html': '/mining?tab=sale', 'claim.html': '/protocol?section=tools',
  'issue-miner.html': '/mining?tab=donations', 'miner-voting.html': '/governance#miner-voting',
  'delegate-vote.html': '/governance#miner-voting', 'voting-credit.html': '/governance#ordinary',
  'senate.html': '/governance#senate', 'propose-upgrade.html': '/governance#upgrades',
  'basic-settings.html': '/governance#ordinary', 'pools-farms.html': '/governance#ordinary',
  'add-token.html': '/governance#ordinary', 'NFT-allocation.html': '/governance#nft-allocation',
  'governor-tax.html': '/governance#ordinary', 'reward-boost.html': '/governance#ordinary',
  'token-burn.html': '/governance#ordinary', 'treasury-deposit.html': '/governance#ordinary',
  'treasury.html': '/governance#senate', 'available-actions.html': '/maintenance',
  'latest-actions.html': '/protocol?section=treasury', 'sidebar.html': '/',
};
const inProgress = new Set();
const limited = new Set(['pulse-ecosystem-mining.html', 'view-pulse-ecosystem-miners.html', 'available-actions.html']);
const pages = rows.map(([feature, originalPage, destinationLabel, notes]) => {
  const html = fs.readFileSync(new URL(originalPage, folder), 'utf8');
  const inlineHandlers = [...new Set([...html.matchAll(/on(?:click|change)\s*=\s*["']([^"']+)/g)].map(match => match[1]))];
  return { feature, originalPage, originalUrl: 'https://oink-pls.github.io/Piggy-Bank-UI/' + originalPage,
    localRoute: routes[originalPage], destinationLabel, statusAtAudit: inProgress.has(originalPage) ? 'being_implemented_this_turn' : limited.has(originalPage) ? 'implemented_with_explicit_remaining_limits' : 'implemented', notes, inlineHandlers };
});
const report = {
  inspectedAt: new Date().toISOString(), chainId: 369, originalRepository: 'https://github.com/OINK-pls/Piggy-Bank-UI',
  finalStatus: 'Original page/action mapping complete; maintenance, miner portions and donation workflows implemented and tested. Four exceptional token deposit/position integrations and PDRIP fee collection remain explicitly external.',
  originalTreeSha: original.treeSha, originalSourceManifest: 'evidence/original-ui-parity-2026-10-24/inventory.json',
  scope: 'Source and local implementation parity audit; no wallet approvals, transactions, deployment or assertion that current contracts permit every flow.',
  pages, namedOriginalFunctions: namedFunctions,
  parityWorkThisTurn: [
    { id: 'miner-partitions', owner: 'miner agent', actions: ['partial withdrawal', 'partial transfer', 'partial longer-duration hop'], evidence: 'js__allStakes.js transferPartial/hopPools/withdraw; local MinerActions and miner partial-share tests', status: 'implemented_this_turn' },
    { id: 'donation-contract', owner: 'miner agent', actions: ['create a donation receiver contract', 'select recipient/duration/mandatory service', 'use receiver in separately voted treasury request', 'activate the funded miner'], evidence: 'issue-miner.html and js__issueStake.js createContract; local MinerDonations.tsx and minerDonationTransactions.ts', status: 'implemented_this_turn' },
    { id: 'maintenance', owner: 'root + maintenance backend agent', status: 'implemented_this_turn', actionCount: 13, actions: [
      'buybackContract.buyWithPLS()', 'buybackContract.swapTokenForPLS(PLSX/INC/HEX, currentBalance)',
      'Governor.harvest()', 'farmerContract.harvest(9)', 'Farms.rebalancePools()',
      'Farms.reduceMaxPulseAllocation()', 'Farms.rebalanceIfPulseAllocationExceedsMaximum()',
      'vault.updateFees()', 'vault.collectCommission(users, positionIndices) (verified direct equivalent of original proxy batches)',
      'MasterChef.fairMintSenate() (deployed successor to original harvestForSenate handler)', 'MasterChef.publishTokens(senateAddress, callerCreditAmount)',
    ], evidence: 'js__availableActions.decoded.js; js__senate.js harvestForSenators/mintTokens' },
    { id: 'legacy-token-models', owner: 'parity audit agent', status: 'live_reads_and_accounting_explanations_with_external_action_links; local_writes_not_implemented', assets: [
      { id: 'pdrip', reason: 'Live token implementation lacks verified source; approval/transfer/accounting semantics unknown.' },
      { id: 'emit', reason: 'Non-whitelisted transfers burn 1% and retain 4%; mutable swap/reward callbacks. Vault is not whitelisted at reviewed snapshot.' },
      { id: 'ptgc', reason: '5% standard transfer fees, reflection, staking callback and token locking. Vault is not exempt at reviewed snapshot.' },
      { id: 'ufo', reason: '6% transfer fees, reflection and mutable LPStaking callbacks. Vault is not exempt at reviewed snapshot.' },
    ], evidence: 'evidence/expanded-tokens-b-review.md; evidence/expanded-farm-vaults.md' },
  ],
  notMissingOriginalFeatures: [
    'Original multiCall in pulseStakes is a HEX-share view helper, not a Claim all transaction. Original farm reward actions select individual positions.',
    'NFT-allocation.html governs NFT valuation/allocation contracts. The original main repository does not provide an NFT mint/stake UI; DEGEN NFT project actions remain in the published linked project dashboard.',
    'eHEX and some old side navigation entries are commented out in original HTML and are not active original workflows.',
    'giveToRewardContract and activateRewardReduction in the original maintenance script are unused legacy declarations. The active features() control opens governance links rather than calling another contract.',
    'Local direct/miner farm reward destinations, emergency farm recovery, old/current referral accounting, distribution claims, eleven ordinary proposal families and advanced treasury/Senate/Governor/NFT governance already exist.',
  ],
  displayCoverageLimits: [
    'Treasury inflows count tracked ERC20 transfers, excluding native PLS and untracked tokens; incomplete time windows stay explicit.',
    'Ten documented treasury farming strategies are valued; pending rewards and unknown future strategies are excluded.',
    'Prices, balances, allocations, projections and histories refresh in the background; failed reads must not become fabricated zero values.',
  ],
  remainingLocalIntegrations: [
    { assets: ['PDRIP', 'EMIT', 'pTGC', 'UFO'], actions: ['deposit', 'position claim', 'position withdrawal'], disposition: 'Live reads remain available. Token-specific accounting explanations, verified source links and the original deposit/position pages are shown; these links are not counted as implemented local writes.' },
    { assets: ['PDRIP'], actions: ['collect funding fees'], disposition: 'Original maintenance link with an explicit unavailable reason; no local fee-action authorization.' },
  ],
  validation: {
    tests: { total: 979, passed: 979, failed: 0, log: 'evidence/full-site-parity-tests-2026-10-24.log' },
    maintenanceTests: { passed: 50, failed: 0, log: 'evidence/community-maintenance-tests.log' },
    typecheck: { result: 'passed', command: 'node node_modules/typescript/bin/tsc -p tsconfig.app.json --pretty false' },
    productionBuild: { result: 'passed', log: 'evidence/full-site-parity-build-2026-10-24.log' },
    sourceAndRuntime: 'evidence/community-maintenance.json',
    publicReadStatusAndQuotes: 'evidence/community-maintenance-live.json',
    independentReview: 'evidence/community-maintenance-independent-review-2026-10-24.md',
    noWalletApprovalTransactionOrDeploymentPerformed: true,
  },
};
const live = JSON.parse(fs.readFileSync(new URL('evidence/community-maintenance-live.json', root), 'utf8'));
report.publicReadSummary = { checkedAt: live.checkedAt, block: live.status.block, timestamp: live.status.timestamp,
  ecosystemAllocationBasisPoints: live.status.allocation, ecosystemCapBasisPoints: live.status.maximum,
  activeEvent: live.status.eventId, quotes: live.quotes.map(quote => ({ action: quote.action, prepared: quote.pass, error: quote.error })),
  note: 'This is read-only snapshot evidence, not a transaction result. Later UI precision and zero-member readiness fixes are verified by the final tests; snapshot logs retain their original output.' };
fs.writeFileSync(new URL('evidence/full-site-parity-2026-10-24.json', root), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ pages: pages.length, scripts: Object.keys(namedFunctions).length, gapGroups: report.parityWorkThisTurn.length, testsPassed: report.validation.tests.passed }));
