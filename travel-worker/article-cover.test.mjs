import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const image={imageSource:'SUPPLIER_PROVIDED',isCover:true,variants:[{url:'https://media.tacdn.com/media/supplier.jpg',width:720,height:480}]};
const request=(body={productCode:'345728P2'},method='POST')=>new Request('https://worker.test/article-cover',{method,headers:{Origin:'https://greecebydan.com','Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
const env={VIATOR_API_KEY:'test-only',SEARCH_LIMIT:{limit:async()=>({success:true})},SUPPLIER_COVERS_ENABLED:'true'};
test('editorial covers use one fresh permitted detail request, exact source URL, no protected fields',async()=>{
  const original=globalThis.fetch,calls=[];
  let product={productCode:'345728P2',status:'ACTIVE',images:[image],viatorUniqueContent:'must not leak',reviews:['must not leak']};
  globalThis.fetch=async(url,init)=>{calls.push(url);assert.equal(init.headers['Accept-Language'],'en-US');return Response.json(product)};
  try{
    let response=await worker.fetch(request(),env),data=await response.json();
    assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(Object.keys(data),['supplierCover']);assert.equal(data.supplierCover.url,image.variants[0].url);
    product.images=[];assert.equal((await (await worker.fetch(request(),env)).json()).supplierCover,null);
    product.images=[{...image,variants:[{...image.variants[0],url:'https://media.tacdn.com/media/replacement.jpg'}]}];
    assert.match((await (await worker.fetch(request(),env)).json()).supplierCover.url,/replacement/);
    for(const patch of [{status:'INACTIVE'},{status:undefined},{productCode:'999P2'},{images:[{...image,imageSource:'TRAVELER_PROVIDED'}]},{images:[{...image,imageSource:undefined}]},{images:[{...image,variants:[{...image.variants[0],url:'https://evil.test/media/a.jpg'}]}]}]){
      product={productCode:'345728P2',status:'ACTIVE',images:[image],...patch};
      assert.equal((await (await worker.fetch(request(),env)).json()).supplierCover,null);
    }
    assert.equal(calls.length,9);assert.ok(calls.every(u=>u==='https://api.viator.com/partner/products/345728P2'));
  }finally{globalThis.fetch=original}
});
test('editorial route validates input, origin, feature, method, rate limit and upstream errors',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('private upstream body')};
  try{
    assert.equal((await worker.fetch(request(),env)).status,502);
    assert.equal((await worker.fetch(request(),{...env,SUPPLIER_COVERS_ENABLED:'false'})).status,200);assert.equal(calls,1);
    for(const data of [{productCode:'../bad'},[],{productCode:345728},{productCode:'345728P2',url:'https://evil.test'},null])assert.equal((await worker.fetch(request(data),env)).status,400);
    assert.equal((await worker.fetch(request({productCode:'a'.repeat(200)}),env)).status,413);
    assert.equal((await worker.fetch(request(undefined,'GET'),env)).status,405);
    assert.equal((await worker.fetch(request(),{...env,SEARCH_LIMIT:{limit:async()=>({success:false})}})).status,429);
    const denied=new Request('https://worker.test/article-cover',{method:'POST',headers:{Origin:'https://evil.test'}});assert.equal((await worker.fetch(denied,env)).status,403);assert.equal(calls,1);
  }finally{globalThis.fetch=original}
});
