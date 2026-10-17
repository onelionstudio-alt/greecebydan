import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import worker,{preferences,category,cultureConditions,cultureCandidates,cultureSearch,selectionEvidence} from './worker.mjs';
const pref={kind:'culture',destination:'496',style:'any',mood:'guided',budget:0,cancellation:false};
const actual=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/culture-live.json',import.meta.url))).products;
const actualByCode=Object.fromEntries(actual.map(p=>[p.productCode,p]));
const detail=(code='P1')=>({productCode:code,status:'ACTIVE',languageGuides:[{language:'en',type:'GUIDE'}],itinerary:{privateTour:false,maxTravelersInSharedTour:12},inclusions:[{otherDescription:'Licensed tour guide'}],exclusions:[],productOptions:[{title:'Guided visit',languageGuides:[{language:'en',type:'GUIDE'}]}],logistics:{travelerPickup:{pickupOptionType:'MEET_EVERYONE_AT_START_POINT'}}});
const summary=(code='P1')=>({productCode:code,title:'Acropolis guided tour',productUrl:`https://www.viator.com/tours/Athens/${code}?mcid=42383&pid=P00320497&medium=api&api_version=2.0`,description:'Acropolis visit',pricing:{currency:'EUR',summary:{fromPrice:80}},flags:['FREE_CANCELLATION'],duration:{fixedDurationInMinutes:120}});
test('Culture input, exact live tags and scoped places; Boat/Wine preferences remain valid',()=>{
 assert.deepEqual(preferences({...pref,budget:'0'}),pref);assert.equal(preferences({...pref,style:'shared'}).style,'shared');
 for(const p of [{...pref,mood:'food'},{...pref,style:'taxi'},{...pref,destination:'../../products/P1'},{...pref,kind:'food'},{...pref,cancellation:'yes'},{...pref,budget:42},{...pref,url:'https://evil.invalid'}])assert.throws(()=>preferences(p));
 assert.throws(()=>preferences({...pref,kind:'boat',style:'shared',mood:'any'}));
 assert.equal(category([{tagId:100,allNamesByLocale:{en:'Historical Tours'}}],'culture'),100);
 assert.throws(()=>category([{tagId:1,allNamesByLocale:{en:'Historical Tours'}},{tagId:2,allNamesByLocale:{en:'Historical Tours'}}],'culture'));
 assert.throws(()=>category([],'culture'));assert.deepEqual(cultureCandidates([summary()],pref,'Olympia'),[]);
});
test('recorded real data rejects GUIDE-only driver/escort claims and retains explicit licensed inclusion',()=>{
 for(const code of ['349296P1','443226P3','368783P2','66179P12','141312P3','5647765P2'])assert.equal(cultureConditions(actualByCode[code]).guide,'not_confirmed',code);
 for(const code of ['240841P1','198006P36','464406P5','464406P12'])assert.equal(cultureConditions(actualByCode[code]).guide,'included',code);
 assert.deepEqual(cultureConditions(actualByCode['240841P1']).languages,['de']);
 assert.equal(cultureConditions(actualByCode['368783P2']).admission,'some_not_included');
 assert.equal(cultureConditions(actualByCode['368783P2']).effort,'moderate');assert.equal(cultureConditions(actualByCode['368783P2']).groupSize,null);
});
test('guide missing/optional/negated/audio and conflicting options fail closed',()=>{
 assert.equal(cultureConditions({...detail(),inclusions:[]}).guide,'not_confirmed');
 for(const text of ['Licensed guide on request','No licensed tour guide','Professional guide optional at extra cost'])assert.equal(cultureConditions({...detail(),inclusions:[{otherDescription:text}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...detail(),exclusions:[{otherDescription:'Guided tour inside the site'}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...detail(),productOptions:[{title:'Audio tour',languageGuides:[{type:'AUDIO',language:'en'}]}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...detail(),productOptions:[{title:'Guided',languageGuides:[{type:'GUIDE',language:'de'}]},{title:'Guided',languageGuides:[{type:'GUIDE',language:'en'}]}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...detail(),productOptions:Array(21).fill({})}),null);
});
test('missing option coverage and truncated conditions never prove guide/group inclusion',()=>{
 assert.equal(cultureConditions({...detail(),productOptions:undefined}).guide,'not_confirmed');
 assert.equal(cultureConditions({...detail(),productOptions:undefined}).group,'unknown');
 assert.equal(cultureConditions({...detail(),inclusions:[{otherDescription:'Licensed tour guide '+'.'.repeat(2100)+' optional'}]}).guide,'not_confirmed');
});
test('option conflicts suppress group/pickup claims; absent data does not prove access or admission',()=>{
 let p=detail();p.itinerary.privateTour=true;p.productOptions.push({title:'Small Group Tour'});assert.equal(cultureConditions(p).group,'unknown');
 p=detail();p.productOptions.push({title:'Private visit',logistics:{travelerPickup:{pickupOptionType:'PICKUP_EVERYONE'}}});const c=cultureConditions(p);assert.equal(c.group,'unknown');assert.equal(c.pickup,'option_dependent');assert.equal(c.admission,'unknown');
 const minimal=cultureConditions({productCode:'X',status:'ACTIVE'});assert.equal(minimal.group,'unknown');assert.equal(minimal.pickup,'unknown');assert.equal(minimal.effort,'unknown');assert.equal(minimal.guide,'not_confirmed');assert.equal(minimal.admission,'unknown');assert.equal(minimal.groupSize,null);
 assert.equal(cultureConditions({...detail(),additionalInfo:[{type:'PHYSICAL_EASY'},{type:'PHYSICAL_HARD'}]}).effort,'unknown');
 assert.equal(cultureConditions({...detail(),status:'INACTIVE'}),null);
});
test('bounded twelve-details/two-concurrent pipeline preserves exact affiliate URL and unknown price units',async()=>{
 let calls=0,concurrency=0,max=0;const products=Array.from({length:30},(_,i)=>summary('P'+i));
 const result=await cultureSearch(products,pref,'Athens',false,async code=>{calls++;concurrency++;max=Math.max(max,concurrency);await new Promise(r=>setTimeout(r,1));concurrency--;return detail(code)});
 assert.equal(calls,12);assert.equal(max,2);assert.equal(result.length,3);assert.equal(result[0].url,products[0].productUrl);assert.equal(result[0].priceBasis,'unknown');assert.equal(result[0].supplierCover,null);
 assert.ok(result[0].selectionEvidence.every(f=>f.evidence.productCode===result[0].productCode));assert.equal(result[0].culture.guide,'included');
 assert.deepEqual(selectionEvidence(summary(),pref),[]);
});
test('no padded results, inactive/identity failure, detail failure and fresh-image removal',async()=>{
 assert.deepEqual(await cultureSearch([summary()],pref,'Athens',true,async()=>({...detail(),status:'INACTIVE'})),[]);
 assert.deepEqual(await cultureSearch([summary()],pref,'Athens',false,async()=>({...detail(),inclusions:[]})),[]);
 await assert.rejects(cultureSearch([summary()],pref,'Athens',false,async()=>({...detail(),productCode:'OTHER'})));
 await assert.rejects(cultureSearch([summary()],pref,'Athens',false,async()=>{throw Error('Upstream')}));
 const p=summary();p.images=[{imageSource:'SUPPLIER_PROVIDED',isCover:true,variants:[{url:'https://media.tacdn.com/media/a.jpg',width:720,height:480}]}];
 const [c]=await cultureSearch([p],pref,'Athens',true,async()=>detail());assert.equal(c.supplierCover,null);
 const [withPhoto]=await cultureSearch([p],pref,'Athens',true,async()=>({...detail(),images:p.images}));assert.equal(withPhoto.supplierCover.url,p.images[0].variants[0].url);
 for(const title of ['Meteora E-Bike tour','Acropolis photo tour','Acropolis audio-guide'])assert.deepEqual(cultureCandidates([{...p,title,description:''}],pref,title.startsWith('Meteora')?'Meteora':'Athens'),[]);
});
test('Worker capability gate, destination scope, endpoint budget and safe API errors',async()=>{
 const original=globalThis.fetch;const calls=[];const origin='https://greecebydan.com';
 const env={VIATOR_API_KEY:'TEST_NOT_A_REAL_KEY',CULTURE_ENABLED:'true',SUPPLIER_COVERS_ENABLED:'true',SEARCH_LIMIT:{limit:async()=>({success:true})}};
 const request=body=>new Request('https://worker.example/search',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 globalThis.fetch=async(url,options)=>{const p=new URL(url).pathname;calls.push(p);assert.ok(options.signal);let data;
 if(p==='/partner/destinations')data={destinations:[{destinationId:1,name:'Greece',type:'COUNTRY'},{destinationId:496,name:'Athens',parentDestinationId:1},{destinationId:9,name:'Olympia',parentDestinationId:1}]};
 else if(p==='/partner/products/tags')data={tags:[{tagId:100,allNamesByLocale:{en:'Historical Tours'}}]};
 else if(p==='/partner/products/search'){const b=JSON.parse(options.body);assert.deepEqual(b.filtering.tags,[100]);data={products:[summary()]}}
 else if(p==='/partner/products/P1')data=detail();else throw Error('Forbidden endpoint');return Response.json(data)};
 try {
  let r=await worker.fetch(request(pref),{...env,CULTURE_ENABLED:'false'});assert.equal(r.status,400);assert.equal(calls.filter(x=>x.includes('/products')).length,0);calls.length=0;
  r=await worker.fetch(request({...pref,destination:'9'}),env);assert.equal(r.status,400);assert.deepEqual(calls,['/partner/destinations']);calls.length=0;
  r=await worker.fetch(request(pref),env);assert.equal(r.status,200);let d=await r.json();assert.equal(d.products.length,1);assert.equal(d.products[0].culture.guide,'included');assert.deepEqual(calls,['/partner/destinations','/partner/products/tags','/partner/products/search','/partner/products/P1']);
  const m=await worker.fetch(new Request('https://worker.example/destinations',{headers:{Origin:origin}}),env);assert.deepEqual((await m.json()).capabilities.cultureDestinations,[{id:'496',name:'Athens'}]);
  globalThis.fetch=async()=>new Response('SECRET_ERROR_BODY',{status:403});r=await worker.fetch(request(pref),env);assert.equal(r.status,502);assert.doesNotMatch(await r.text(),/SECRET/);
 }finally{globalThis.fetch=original}
});

const inventoryGuides=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/culture-inventory-guide.json',import.meta.url))).products;
test('real inventory recognizes explicit included English-speaking guide without asserting a licence',()=>{
 const by=Object.fromEntries(inventoryGuides.map(p=>[p.productCode,p]));
 for(const code of ['341709P1','63145P77','6357P78','6575PRIVATE']){
  const c=cultureConditions(by[code]);assert.equal(c.guide,'included',code);assert.ok(c.languages.includes('en'),code);
  assert.equal(c.facts.find(f=>f.code==='culture_guide').evidence.value,'GUIDE_INCLUDED');
 }
 for(const code of ['368783P2','123525P19'])assert.equal(cultureConditions(by[code]).guide,'not_confirmed',code);
});
test('English-speaking inclusion still requires common GUIDE English and rejects negatives, extras and conflicting options',()=>{
 for(const t of ['English speaking Guide','English-speaking guide','English – speaking Guide','Local English speaking tour guide'])
  assert.equal(cultureConditions({...detail(),inclusions:[{otherDescription:t}]}).guide,'included',t);
 for(const t of ['English speaking driver','English speaking tour leader','English speaking guide on request','No English speaking guide','English speaking guide at additional cost','English speaking guide available','English speaking guide excluded','English speaking guide / driver','We can arrange an English speaking guide'])
  assert.equal(cultureConditions({...detail(),inclusions:[{otherDescription:t}]}).guide,'not_confirmed',t);
 const p={...detail(),inclusions:[{otherDescription:'English speaking Guide'}]};
 assert.equal(cultureConditions({...p,exclusions:[{otherDescription:'Guide inside the monastery'}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...p,productOptions:[{title:'French tour',languageGuides:[{type:'GUIDE',language:'fr'}]}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...p,productOptions:[{title:'English audio',languageGuides:[{type:'AUDIO',language:'en'}]}]}).guide,'not_confirmed');
 assert.equal(cultureConditions({...p,productOptions:[{title:'Audio tour',languageGuides:[{type:'GUIDE',language:'en'}]}]}).guide,'not_confirmed');
});
test('deeper window finds evidence-backed alternatives without padding or reading beyond twelve details',async()=>{
 const products=Array.from({length:20},(_,i)=>summary('P'+i));const calls=[];
 const result=await cultureSearch(products,pref,'Athens',false,async code=>{
  calls.push(code);return {...detail(code),inclusions:Number(code.slice(1))<6?[]:[{otherDescription:'English speaking Guide'}]};
 });
 assert.equal(calls.length,12);assert.ok(!calls.includes('P12'));assert.equal(result.length,3);
 assert.ok(result.every(p=>Number(p.productCode.slice(1))>=6&&p.culture.languages.includes('en')));
 assert.ok(result.every(p=>p.url===products.find(s=>s.productCode===p.productCode).productUrl&&p.priceBasis==='unknown'));
});
