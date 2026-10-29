import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/walletContext.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace('from "react"', `from ${JSON.stringify(import.meta.resolve('react'))}`);
let revision = 0;

async function evaluateContext(hotData) {
  // Vite supplies the same hot.data to each new evaluation of a module.
  // Evaluate the real module twice while keeping the first provider mounted.
  const key = `__walletContextTest${revision++}`;
  globalThis[key] = hotData ? { data: hotData } : undefined;
  const code = compiled.replaceAll('import.meta.hot', `globalThis[${JSON.stringify(key)}]`);
  try { return await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`); }
  finally { delete globalThis[key]; }
}

function readAccount(useWallet) {
  return function Account() {
    return createElement('span', null, useWallet().account ?? 'Disconnected');
  };
}

test('hot replacement consumers read the existing wallet provider and its latest value', async () => {
  const hotData = {};
  const before = await evaluateContext(hotData);
  const after = await evaluateContext(hotData);
  const Consumer = readAccount(after.useWallet);
  assert.equal(before.WalletContext, after.WalletContext);
  const render = account => renderToStaticMarkup(createElement(before.WalletContext.Provider, { value: { account } }, createElement(Consumer)));
  assert.equal(render('0x111'), '<span>0x111</span>');
  assert.equal(render('0x222'), '<span>0x222</span>');
  assert.equal(render(null), '<span>Disconnected</span>');
});

test('a missing wallet provider still fails explicitly after hot replacement', async () => {
  const hotData = {};
  await evaluateContext(hotData);
  const { useWallet } = await evaluateContext(hotData);
  assert.throws(() => renderToStaticMarkup(createElement(readAccount(useWallet))), /useWallet must be used inside WalletProvider/);
});

test('without hot replacement, independent app modules do not share a wallet context', async () => {
  const first = await evaluateContext();
  const second = await evaluateContext();
  assert.notEqual(first.WalletContext, second.WalletContext);
});
