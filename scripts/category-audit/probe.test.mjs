import test from 'node:test';import assert from 'node:assert/strict';
import {categoryAudit,auditDetails,auditSummary,AUDIT_CASES,selectAuditTag} from './probe.mjs';
const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const env={VIATOR_API_KEY:'TEST_ONLY',SEARCH_LIMIT:{limit:async()=>({success:true})}};
const request=body=>new Request(origin+'/__category-audit',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const product=n=>({productCode:'P'+n,title:'Acropolis guided candidate',description:'Not evidence of included tickets',productUrl:'https://www.viator.com/tours/Athens/P'+n+'?pid=P00320497&mcid=42383&medium=api',flags:[],tags:[99],pricing:{currency:'EUR',summary:{fromPrice:25}}});
const io=()=>({destinations:async()=>[{id:'710',name:'Athens'}],tags:async()=>[{tagId:99,allNamesByLocale:{en:'Historical Tours'}}],search:async()=>({products:Array.from({length:50},(_,i)=>product(i))}),detail:async code=>({status:200,data:{productCode:code,status:'ACTIVE',languageGuides:[{language:'en',type:'GUIDE'}]}})});
test('strict input and foreign host/origin rejected without upstream work',async()=>{
 let calls=0;const deps={destinations:async()=>{calls++;throw Error()}};
 for(const body of [{case:'unknown'},{case:'taxonomy',url:'https://evil.invalid'},{case:'../../bookings/book'},null])assert.equal((await categoryAudit(request(body),env,origin,deps)).status,400);
 assert.equal((await categoryAudit(new Request('https://greecebydan.com/__category-audit'),env,origin,deps)).status,404);
 assert.equal((await categoryAudit(new Request(origin+'/__category-audit',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json'},body:'{}'}),env,origin,deps)).status,403);
 assert.equal(calls,0)
});
test('taxonomy uses actual names/IDs and missing tags fail without a guessed tag',async()=>{
 const d=io();d.tags=async()=>[];let search=0;d.search=async()=>{search++;return{}};
 const r=await categoryAudit(request({case:'culture_athens'}),env,origin,d);assert.equal((await r.json()).status,'BLOCKED');assert.equal(search,0);
 const taxonomy=await(await categoryAudit(request({case:'taxonomy'}),env,origin,io())).json();assert.deepEqual(taxonomy.tags[0],{id:99,name:'Historical Tours',parentTagIds:[]});assert.ok(Object.keys(AUDIT_CASES).includes('culture_olympia'))
});
test('single search, at most three selected detail calls; exact productUrl unchanged',async()=>{
 const d=io();let search=0,details=0;d.search=async body=>{search++;assert.deepEqual(body.filtering.tags,[99]);return{products:Array.from({length:50},(_,i)=>product(i))}};d.detail=async code=>{details++;return{status:200,data:{productCode:code,status:'ACTIVE'}}};
 const r=await categoryAudit(request({case:'culture_athens'}),env,origin,d);const x=await r.json();assert.equal(search,1);assert.equal(details,3);assert.equal(x.products.length,3);assert.equal(x.products[0].summary.productUrl,product(0).productUrl);assert.equal(x.products[0].summary.priceBasis,'unknown');assert.equal(x.availabilityCalls,0);assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow')
});
test('no reviews, protected content, contacts, images or unbounded duration copied',()=>{
 const p={productCode:'P',status:'ACTIVE',viatorUniqueContent:'SECRET_UNIQUE',reviews:{text:'SECRET_REVIEW'},supplier:{email:'SECRET_EMAIL'},images:[{url:'SECRET_PHOTO'}],duration:{fixedDurationInMinutes:90,private:'SECRET_DURATION'},languageGuides:[{language:'en',type:'AUDIO'}],additionalInfo:[{type:'NOT_WHEELCHAIR_ACCESSIBLE'}]};
 assert.doesNotMatch(JSON.stringify(auditDetails(p)),/SECRET_/);assert.doesNotMatch(JSON.stringify(auditSummary(p)),/SECRET_/);assert.equal(auditDetails(p).languageGuides[0].type,'AUDIO');assert.equal(auditDetails(p).logistics,null);assert.deepEqual(auditSummary(p).duration,{fixedDurationInMinutes:90})
});
test('detail denial is recorded without inventing facts; errors, empty results, rate limits safe',async()=>{
 const d=io();d.detail=async()=>({status:403});let x=await(await categoryAudit(request({case:'culture_athens'}),env,origin,d)).json();assert.equal(x.products[0].detailHttpStatus,403);assert.equal(x.products[0].details,null);
 d.search=async()=>({products:[]});x=await(await categoryAudit(request({case:'culture_athens'}),env,origin,d)).json();assert.deepEqual(x.products,[]);
 d.search=async()=>{throw Error('SECRET_UPSTREAM')};const r=await categoryAudit(request({case:'culture_athens'}),env,origin,d);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/SECRET_/);
 assert.equal((await categoryAudit(request({case:'taxonomy'}),{...env,SEARCH_LIMIT:{limit:async()=>({success:false})}},origin,d)).status,429)
});

test('duplicate live cooking/food labels use confirmed root lineage, independent of order',()=>{
 const tag=(id,name,parents=[])=>({tagId:id,allNamesByLocale:{en:name},parentTagIds:parents});
 const tags=[tag(13283,'Cooking Classes',[12694,12519]),tag(13112,'Cooking Classes',[12718,12520]),tag(21911,'Food & Drink'),tag(12034,'Cooking Classes',[21482,21911,21915]),tag(13285,'Food Tours',[12519]),tag(21567,'Food Tours',[21911])];
 for(const a of [tags,[...tags].reverse()]){
  assert.equal(selectAuditTag(a,AUDIT_CASES.food_naxos).tagId,12034);
  assert.equal(selectAuditTag(a,AUDIT_CASES.food_athens).tagId,21567);
 }
 assert.equal(selectAuditTag(tags.filter(t=>t.tagId!==21911),AUDIT_CASES.food_naxos),null);
 assert.equal(selectAuditTag([...tags,tag(999,'Cooking Classes',[21911])],AUDIT_CASES.food_naxos),null);
 assert.equal(selectAuditTag([tag(1,'Historical Tours'),tag(2,'Historical Tours')],AUDIT_CASES.culture_athens),null);
});
