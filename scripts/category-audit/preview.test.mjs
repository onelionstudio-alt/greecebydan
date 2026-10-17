import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../../docs/category-expansion/staging-category-audit.mjs';
const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const env={VIATOR_API_KEY:'NOT_A_REAL_KEY',SEARCH_LIMIT:{limit:async()=>({success:true})},VIATOR_IMAGES_APPROVED:'true',INTERACTIONS_ENABLED:'true'};
const req=(path,body)=>new Request(origin+path,body?{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
test('generated preview keeps source metadata, photos policy and hard-off flags; rejects production host',async()=>{
 const m=await(await worker.fetch(req('/_preview/meta'),env)).json();assert.equal(m.categoryAudit,true);assert.equal(m.auditTaxonomyRevision,2);assert.equal(m.apiPhotos,false);assert.equal(m.interactionEvents,false);assert.equal(m.supplierCovers,true);assert.equal(m.baselineApiSha256,'a75b739ec6f30a0d70530bdc7230b5a358011f1851b181cce3b3ed0713547916');
 assert.equal((await worker.fetch(new Request('https://greecebydan-travel-api.onelion-studio.workers.dev/__category-audit'),env)).status,404);
 const e=await worker.fetch(req('/events',{}),env);assert.equal(e.status,503);assert.deepEqual(await e.json(),{error:'Events disabled'});
 assert.equal((await worker.fetch(req('/__category-audit',{case:'invalid'}),env)).status,400)
});
test('actual packaged route uses only four allowed endpoint families, capped selected details and no protected payload',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{const u=new URL(url);assert.equal(u.origin,'https://api.viator.com');calls.push(u.pathname);
 let d;
 if(u.pathname==='/partner/destinations')d={destinations:[{destinationId:1,name:'Greece',type:'COUNTRY'},{destinationId:2,parentDestinationId:1,name:'Athens'}]};
 else if(u.pathname==='/partner/products/tags')d={tags:[{tagId:99,allNamesByLocale:{en:'Historical Tours'}}]};
 else if(u.pathname==='/partner/products/search'){assert.equal(options.method,'POST');d={products:[{productCode:'P1',title:'Acropolis fixture',productUrl:'https://www.viator.com/tours/Athens/P1?pid=TEST'}]}}
 else if(u.pathname==='/partner/products/P1')d={productCode:'P1',status:'ACTIVE',languageGuides:[{language:'en',type:'GUIDE'}],reviews:{secret:'PRIVATE_REVIEW'},images:[{url:'PRIVATE_IMAGE'}],viatorUniqueContent:'PRIVATE_UNIQUE'};
 else throw Error('Unexpected endpoint');return Response.json(d)};
 try{const r=await worker.fetch(req('/__category-audit',{case:'culture_athens'}),env);assert.equal(r.status,200);const txt=await r.text();assert.doesNotMatch(txt,/PRIVATE_|NOT_A_REAL_KEY/);const d=JSON.parse(txt);assert.equal(d.products[0].details.languageGuides[0].type,'GUIDE');assert.equal(d.products[0].summary.productUrl,'https://www.viator.com/tours/Athens/P1?pid=TEST');assert.deepEqual(calls,['/partner/destinations','/partner/products/tags','/partner/products/search','/partner/products/P1'])}finally{globalThis.fetch=original}
});
