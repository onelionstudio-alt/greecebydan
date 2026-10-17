import test from 'node:test';
import assert from 'node:assert/strict';
import {INVENTORY_CASES,runInventoryAudit,projectInventoryDetail} from './probe.mjs';
const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const request=(body,extra={})=>new Request(origin+'/__culture-inventory',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const env={VIATOR_API_KEY:'test-only',SEARCH_LIMIT:{limit:async()=>({success:true})}};
test('fixed cases cap pages, windows and scope; no arbitrary endpoints or codes',()=>{
 assert.equal(Object.keys(INVENTORY_CASES).length,30);
 for(const c of Object.values(INVENTORY_CASES)){assert.ok([1,51].includes(c.start));assert.ok([0,6].includes(c.offset));assert.ok(['Athens','Delphi','Meteora'].includes(c.destination));}
});
test('foreign origin and arbitrary fields rejected before network',async()=>{
 assert.equal((await runInventoryAudit(request({case:'acropolis_0_1_0'},{Origin:'https://other.test'}),env,{})).status,403);
 assert.equal((await runInventoryAudit(request({case:'acropolis_0_1_0',code:'x'}),env,{})).status,400);
});
test('bounded details preserve exact production qualification, identity and URL',async()=>{
 const seen=[];let body;
 const io={destinations:async()=>[{name:'Athens',id:'496'}],tags:async()=>[{tagId:12029,allNamesByLocale:{en:'Historical Tours'}}],
 search:async b=>{body=b;return {products:Array.from({length:20},(_,i)=>({productCode:'X'+i,productUrl:'https://www.viator.com/tours/x?pid=keep'}))}},
 candidates:p=>p,detail:async code=>{seen.push(code);return {productCode:code,status:'ACTIVE'}},conditions:()=>({guide:'not_confirmed'})};
 const r=await runInventoryAudit(request({case:'acropolis_0_1_6'}),env,io),data=await r.json();
 assert.equal(r.status,200);assert.deepEqual(seen,['X6','X7','X8','X9','X10','X11']);assert.equal(body.pagination.count,50);
 assert.ok(data.products.every(p=>!p.qualifiesGuided&&p.summary.productUrl==='https://www.viator.com/tours/x?pid=keep'));
});
test('taxonomy ambiguities, identity mismatch, rate limit fail closed',async()=>{
 const io={destinations:async()=>[],tags:async()=>[]};
 assert.equal((await runInventoryAudit(request({case:'acropolis_0_1_0'}),env,io)).status,422);
 assert.equal((await runInventoryAudit(request({case:'acropolis_0_1_0'}),{...env,SEARCH_LIMIT:{limit:async()=>({success:false})}},{})).status,429);
 const io2={destinations:async()=>[{name:'Athens',id:'496'}],tags:async()=>[{tagId:1,allNamesByLocale:{en:'Historical Tours'}}],search:async()=>({products:[{productCode:'X'}]}),candidates:p=>p,detail:async()=>({productCode:'Y'})};
 assert.equal((await runInventoryAudit(request({case:'acropolis_0_1_0'}),env,io2)).status,502);
});
test('no protected content, addresses, photos, reviews or secrets in projection',()=>{
 const d=projectInventoryDetail({productCode:'X',viatorUniqueContent:'SECRET',reviews:{secret:1},images:[{url:'SECRET'}],logistics:{start:[{description:'Athens',location:{ref:'SECRET'}}]},inclusions:[{otherDescription:'x'.repeat(200)}]},null);
 assert.ok(!JSON.stringify(d).includes('SECRET'));assert.equal(d.excerptsTruncated,true);assert.equal(d.transport,'REQUIRES_SCOPED_REVIEW');assert.equal(d.availability,'NOT_CHECKED');
});
