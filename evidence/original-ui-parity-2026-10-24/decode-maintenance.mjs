// Static string-table decoding only: original source is never executed.
import fs from 'node:fs';
import ts from 'typescript';
const file = new URL('./js__availableActions.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const tableStart = source.indexOf("const _0x56850c=[");
const tableEnd = source.indexOf('];', tableStart);
const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, source.slice(tableStart, tableEnd));
const strings = [];
while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
  if (scanner.getToken() === ts.SyntaxKind.StringLiteral) strings.push(scanner.getTokenValue());
}
const decode = n => strings[n - 0x12b];
const int = n => Number.parseInt(decode(n), 10);
let rotations = 0;
for (; rotations < strings.length; rotations++) {
  const value = int(0x1e7) * (-int(0x15f) / 2) - int(0x156) / 3 * (-int(0x1ca) / 4) - int(0x20b) / 5 + int(0x1ab) / 6 * (int(0x20a) / 7) - int(0x192) / 8 * (-int(0x17a) / 9) + int(0x1dd) / 10 - int(0x140) / 11;
  if (value === 0x6cec6) break;
  strings.push(strings.shift());
}
if (rotations === strings.length) throw new Error('String table rotation not resolved');
const aliases = new Set(['_0x453612', '_0x3c96']);
let more = true;
while (more) {
  more = false;
  for (const [, alias, original] of source.matchAll(/(_0x[\da-f]+)\s*=\s*(_0x[\da-f]+)/g)) {
    if (aliases.has(original) && !aliases.has(alias)) { aliases.add(alias); more = true; }
  }
}
const pattern = new RegExp('(?:' + [...aliases].join('|') + ')\\((0x[\\da-f]+|\\d+)\\)', 'g');
const decoded = source.replace(pattern, (match, number) => { const value = decode(Number(number)); return value === undefined ? match : JSON.stringify(value); });
const ast = ts.createSourceFile('decoded.js', decoded, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
fs.writeFileSync(new URL('./js__availableActions.decoded.js', import.meta.url), ts.createPrinter().printFile(ast));
console.log(JSON.stringify({ strings: strings.length, rotations, aliases: aliases.size }));
