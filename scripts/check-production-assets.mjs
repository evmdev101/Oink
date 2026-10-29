// Local release check only: serve dist under a repository-style prefix.
// Does not publish, connect wallets, or execute browser transactions.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const root = resolve('dist');
const prefix = '/oink-launch/';
async function filesAt(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesAt(resolve(directory, entry.name)) : [resolve(directory, entry.name)]))).flat();
}
const files = await filesAt(root);
assert(files.length > 0, 'Build dist before running the release check.');
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const path = resolve(root, decodeURIComponent(pathname.slice(prefix.length)) || 'index.html');
    if (!path.startsWith(root + sep)) { response.writeHead(404).end(); return; }
    const content = await readFile(path);
    response.writeHead(200).end(content);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolveListening => server.listen(0, '127.0.0.1', resolveListening));
const origin = `http://127.0.0.1:${server.address().port}`;
let references = 0;
try {
  for (const file of files) {
    const filePath = relative(root, file).split(sep).map(encodeURIComponent).join('/');
    const url = new URL(prefix + filePath, origin);
    const response = await fetch(url);
    assert.equal(response.status, 200, filePath);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(file), filePath);
    if (/\.(html|css)$/.test(file)) {
      const text = await readFile(file, 'utf8');
      const pattern = file.endsWith('.html')
        ? /(?:src|href)=["']([^"']+)["']/g
        : /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g;
      for (const match of text.matchAll(pattern)) {
        const value = (match[1] ?? match[2] ?? match[3]).trim();
        if (value.startsWith('#')) continue;
        const target = new URL(value, url);
        if (target.origin !== origin) continue;
        assert(target.pathname.startsWith(prefix), `Asset escapes deployment prefix: ${target.pathname}`);
        assert.equal((await fetch(target)).status, 200, `Missing asset: ${target.pathname}`);
        references++;
      }
    }
  }
  assert.equal((await fetch(origin + prefix)).status, 200);
  assert.equal((await fetch(origin + '/')).status, 404);
  console.log(JSON.stringify({ passed: true, prefix, files: files.length, localHtmlCssReferences: references,
    scope: 'Static production files and HTML/CSS references only; no browser, wallet or public deployment.' }, null, 2));
} finally {
  await new Promise(resolveClosed => server.close(resolveClosed));
}
