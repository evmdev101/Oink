// Read-only deobfuscation of the archived original UI. Only its literal string
// table, arithmetic lookup and table rotation execute in an isolated VM; browser
// and contract-deployment code is parsed/printed but never executed.
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const input='evidence/original-ui-parity-2026-10-24/js__issueStake.js';
const source=fs.readFileSync(input,'utf8'), ast=ts.createSourceFile(input,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['_0x3e3b','_0x69f2'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name?.text));
const rotation=ast.statements.find(n=>ts.isExpressionStatement(n));
const context=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
vm.runInContext(functions.map(n=>n.getText(ast)).join('\n')+'\n'+rotation.getText(ast),context,{timeout:1000});
const aliases=new Set(['_0x69f2']);
function discover(n){if(ts.isVariableDeclaration(n)&&n.initializer&&ts.isIdentifier(n.initializer)&&aliases.has(n.initializer.text)&&ts.isIdentifier(n.name))aliases.add(n.name.text);ts.forEachChild(n,discover);}
for(let i=0;i<5;i++)discover(ast);
const transform=context=>root=>ts.visitNode(root,function visit(n){
 if(ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&aliases.has(n.expression.text)&&n.arguments.length===1&&ts.isNumericLiteral(n.arguments[0]))return ts.factory.createStringLiteral(contextLookup(Number(n.arguments[0].text)));
 const result=ts.visitEachChild(n,visit,context);
 if(ts.isBinaryExpression(result)&&result.operatorToken.kind===ts.SyntaxKind.PlusToken&&ts.isStringLiteral(result.left)&&ts.isStringLiteral(result.right))return ts.factory.createStringLiteral(result.left.text+result.right.text);
 return result;
});
const contextLookup=value=>context._0x69f2(value);
const transformed=ts.transform(ast,[transform]);
const output=ts.createPrinter().printFile(transformed.transformed[0]);
fs.writeFileSync('evidence/original-ui-parity-2026-10-24/issue-miner-decoded.js',output);
transformed.dispose();
console.log('Decoded donation reference saved; no browser, wallet or deployment code executed.');
