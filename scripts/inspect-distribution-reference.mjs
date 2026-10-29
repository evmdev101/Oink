import fs from 'node:fs'; import vm from 'node:vm';
const path='C:/Users/Ryan A. Saunders/AppData/Local/Temp/oink-ui-reference-3259ce10ff4a490facdd8ab473783884/js/claim.js'; const source=fs.readFileSync(path,'utf8');
const prefix=source.slice(source.indexOf('const _0xacc1b1'),source.indexOf('var pool1Month'));
const decoder=source.slice(source.indexOf('function _0xdf75'),source.indexOf('var distributionContract'));
const assign=source.slice(source.indexOf('var distributionContract'),source.indexOf(',sacList'))+';';
const context=vm.createContext({});vm.runInContext(prefix+decoder+assign,context,{timeout:2000});
console.log(context.distributionContractToContributors, context.distributionContractToLocked);
const decoded=source.replace(/_0x[a-z0-9]+\((0x[a-f0-9]+)\)/g,(match,num)=>{try{return JSON.stringify(context._0xdf75(Number(num)))}catch{return match}}).replace(/'([^']*)'\+'([^']*)'/g,(_,a,b)=>JSON.stringify(a+b));fs.writeFileSync('evidence/distribution-ui-decoded.txt',decoded);
console.log([...decoded.matchAll(/.{0,40}(?:merkle|Proofs|apiURL).{0,180}/g)].map(v=>v[0]).join('\n'));
