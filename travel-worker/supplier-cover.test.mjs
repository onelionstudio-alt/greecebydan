import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {supplierCover, recommendations} from './worker.mjs';
const url = 'https://media.tacdn.com/media/attractions-splice-spp-720x480/test.jpg';
const image = {imageSource:'SUPPLIER_PROVIDED',isCover:true,variants:[{url,width:720,height:480}]};
const p = {productCode:'P1',title:'Boat',description:'Crew included.',productUrl:'https://www.viator.com/tours/Milos/x/d22323-P1?pid=P00320497&medium=api',pricing:{currency:'EUR',summary:{fromPrice:100}},images:[image],flags:[]};
const pref={kind:'boat',destination:'22323',style:'any',mood:'any',budget:0,cancellation:false};

test('only explicit supplier cover; ownership never inferred from isCover or position',()=>{
  assert.equal(supplierCover(p,1000).url,url);
  for(const change of [{imageSource:undefined},{imageSource:'PROFESSIONAL'},{imageSource:'TRAVELER_PROVIDED'},{imageSource:'supplier_provided'},{isCover:false},{isCover:1}]) assert.equal(supplierCover({...p,images:[{...image,...change}]}),null);
  assert.equal(supplierCover({...p,images:[{...image,imageSource:'PROFESSIONAL'},image]}).url,url);
  assert.equal(supplierCover({...p,images:[]}),null);
  assert.equal(supplierCover({...p,images:[{...image,variants:null}]}),null);
});
test('strict CDN URLs/dimensions and original bytes; nearest supplied variant',()=>{
  const query=url+'?original=1&token=public-variant';
  assert.equal(supplierCover({...p,images:[{...image,variants:[{url:query,width:720,height:480}]}]}).url,query);
  for(const bad of ['http://media.tacdn.com/media/x.jpg','https://media.tacdn.com.evil.example/media/x.jpg','https://media-cdn.tripadvisor.com.evil.example/media/x.jpg','https://user:pass@media.tacdn.com/media/x.jpg','https://media.tacdn.com:444/media/x.jpg','https://media.tacdn.com/media/x.svg','https://media.tacdn.com/other/x.jpg',url+'#fragment',' '+url,'javascript:alert(1)',null]) assert.equal(supplierCover({...p,images:[{...image,variants:[{url:bad,width:720,height:480}]}]}),null,String(bad));
  for(const dims of [{width:0},{width:'720'},{height:0},{height:5000},{width:2400}]) assert.equal(supplierCover({...p,images:[{...image,variants:[{url,width:720,height:480,...dims}]}]}),null);
  assert.equal(supplierCover({...p,images:[{...image,variants:[{url:url.replace('720','400'),width:400,height:300},image.variants[0]]}]}).width,720);
  assert.equal(supplierCover({...p,images:[{...image,variants:[{url:'https://hare-media-cdn.tripadvisor.com/media/x.webp',width:720,height:480}]}]}).width,720);
  assert.equal(supplierCover({...p,images:[{...image,variants:[{url:'https://media-cdn.tripadvisor.com/media/x.jpg',width:720,height:480}]}]}).url,'https://media-cdn.tripadvisor.com/media/x.jpg');
});
test('removed/replaced images never reused; expiry and inactive products fail closed',()=>{
  assert.deepEqual(supplierCover(p,1000),{source:'SUPPLIER_PROVIDED',isCover:true,url,width:720,height:480,checkedAt:1000,expiresAt:301000});
  const updated={...p,images:[{...image,variants:[{...image.variants[0],url:url.replace('test','updated')}]}]};
  assert.notEqual(supplierCover(updated).url,supplierCover(p).url);
  assert.equal(supplierCover({...p,images:[]}),null);
  for(const status of ['INACTIVE','SUSPENDED','UNKNOWN']){assert.equal(supplierCover({...p,status}),null);assert.deepEqual(recommendations([{...p,status}],pref,true),[]);}
  assert.equal(recommendations([{...p,status:'ACTIVE'}],pref,true).length,1);
});
test('photo opt-in does not change ranking, selectionEvidence, pricing or exact affiliate URL',()=>{
  const products=[p,{...p,productCode:'P2',pricing:{currency:'EUR',summary:{fromPrice:90}}}];
  const off=recommendations(products,pref),on=recommendations(products,pref,true);
  assert.ok(off.every(x=>x.supplierCover===null&&x.image===null));
  assert.deepEqual(on.map(({supplierCover,...x})=>x),off.map(({supplierCover,...x})=>x));
  assert.equal(on[0].url,p.productUrl); assert.equal(on[0].priceBasis,'unknown');
});
test('enabled path fetches fresh search each time, bypasses stale cache, removes inactive and fails closed',async()=>{
  const previousFetch=globalThis.fetch,previousCaches=globalThis.caches;
  let current=p,searches=0,searchCacheReads=0,searchCacheWrites=0,fail=false;
  globalThis.caches={default:{match:async r=>{if(r.url.includes('/internal-cache/'))searchCacheReads++;return undefined;},put:async()=>{searchCacheWrites++;}}};
  globalThis.fetch=async (u,options)=>{
    assert.equal(options.headers['exp-api-key'],'unit-only');
    if(u.endsWith('/destinations'))return Response.json({destinations:[{destinationId:1,name:'Greece',type:'COUNTRY'},{destinationId:22323,parentDestinationId:1,name:'Milos'}]});
    if(u.endsWith('/products/tags'))return Response.json({tags:[{tagId:1,allNamesByLocale:{en:'Sailing'}}]});
    assert.ok(u.endsWith('/products/search'));searches++;if(fail)return Response.json({}, {status:503});return Response.json({products:[current]});
  };
  const env={VIATOR_API_KEY:'unit-only',SUPPLIER_COVERS_ENABLED:'true',VIATOR_IMAGES_APPROVED:'false',INTERACTIONS_ENABLED:'false',SEARCH_LIMIT:{limit:async()=>({success:true})}};
  const req=()=>new Request('https://worker.example/search',{method:'POST',headers:{Origin:'https://greecebydan.com','Content-Type':'application/json'},body:JSON.stringify(pref)});
  try{
    let r=await worker.fetch(req(),env);assert.equal(r.status,200);assert.equal((await r.json()).products[0].supplierCover.url,url);
    current={...p,images:[]};r=await worker.fetch(req(),env);assert.equal((await r.json()).products[0].supplierCover,null);
    current={...p,status:'INACTIVE'};r=await worker.fetch(req(),env);assert.deepEqual((await r.json()).products,[]);
    fail=true;r=await worker.fetch(req(),env);assert.equal(r.status,502);assert.equal(r.headers.get('Cache-Control'),'no-store');
    assert.equal(searches,4);assert.equal(searchCacheReads,8);assert.equal(searchCacheWrites,8); // auxiliary only: 2 per request
  }finally{globalThis.fetch=previousFetch;globalThis.caches=previousCaches;}
});
