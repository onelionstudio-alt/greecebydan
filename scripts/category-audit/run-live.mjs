// Explicitly triggered, read-only staging audit. Never deploys or books.
import fs from 'node:fs';import assert from 'node:assert/strict';
const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const output={checkedAt:new Date().toISOString(),purpose:'Real category field/inventory audit; not recommendation or date availability approval',checks:[]};
try{
 const meta=await(await fetch(origin+'/_preview/meta')).json();assert.equal(meta.categoryAudit,true);assert.equal(meta.auditTaxonomyRevision,2);assert.equal(meta.baselineApiSha256,'a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916');assert.equal(meta.apiPhotos,false);assert.equal(meta.interactionEvents,false);assert.equal(meta.supplierCovers,true);output.meta=meta;
 const cases=process.argv.includes('--food-only')?['taxonomy','food_athens','food_naxos','food_crete']:['taxonomy','culture_athens','culture_delphi','culture_meteora','culture_olympia','food_athens','food_naxos','food_crete','transfers_athens'];
 for(const name of cases){
  const response=await fetch(origin+'/__category-audit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({case:name}),signal:AbortSignal.timeout(70000)});
  const data=await response.json();output.checks.push({case:name,httpStatus:response.status,data});console.log(JSON.stringify({case:name,httpStatus:response.status,status:data.status||'COLLECTED',products:data.products?.length,detailStatus:data.products?.map(p=>p.detailHttpStatus)}));
  if(!response.ok||data.detailAccessDenied){output.stopped='Request failed or detail access/rate denied; no automatic retries';break}
  await new Promise(resolve=>setTimeout(resolve,20000));
 }
 output.status=output.stopped?'PARTIAL_REQUIRES_REVIEW':'COLLECTED_REQUIRES_REVIEW';
}finally{fs.mkdirSync('category-audit-evidence',{recursive:true});fs.writeFileSync('category-audit-evidence/real-categories.json',JSON.stringify(output,null,2))}
