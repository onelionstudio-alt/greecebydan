import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin='https://greecebydan.com',api='https://greecebydan-travel-api.onelion-studio.workers.dev';
const report={checkedAt:new Date().toISOString(),mode:'Read-only production release verification; real Worker/API; no purchase or valid interaction event',checks:[]};
const request=async(path,data)=>{const r=await fetch(api+path,{method:data?'POST':'GET',headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(40000)});return{status:r.status,body:await r.json()}};
try{
 const health=await request('/health');assert.equal(health.status,200);assert.equal(health.body.ready,true);report.health=health;
 const guard=await request('/events',{});assert.equal(guard.status,503);assert.deepEqual(guard.body,{error:'Events disabled'});report.eventsGuard=guard;
 for(const [kind,destination] of [['boat','22323'],['wine','959']]){
  const r=await request('/search',{kind,destination,style:'any',mood:'any',budget:0,cancellation:false});assert.equal(r.status,200);assert.equal(r.body.products.length,3);assert.equal(r.body.imageAudit,undefined);
  const products=r.body.products.map(p=>{assert.equal(p.image,null);const u=new URL(p.url);assert.equal(u.hostname,'www.viator.com');assert.equal(u.searchParams.get('pid'),'P00320497');assert.equal(u.searchParams.get('mcid'),'42383');assert.equal(u.searchParams.get('medium'),'api');
   if(p.supplierCover){assert.equal(p.supplierCover.source,'SUPPLIER_PROVIDED');assert.equal(p.supplierCover.isCover,true);assert.ok(p.supplierCover.expiresAt-p.supplierCover.checkedAt<=300000)}
   return{code:p.productCode,url:p.url,priceBasis:p.priceBasis,legacyImage:p.image,supplierCover:p.supplierCover||null}});
  assert.ok(products.some(p=>p.supplierCover));report.checks.push({kind,status:'PASS',products});
 }
 report.status='PASS';
}finally{fs.mkdirSync('release-evidence',{recursive:true});fs.writeFileSync('release-evidence/pr24-production.json',JSON.stringify(report,null,2))}
console.log('Production real API/supplier provenance/affiliate URLs/legacy photo null/events disabled: PASS');
