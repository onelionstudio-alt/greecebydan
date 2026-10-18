import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{preferences,foodTag,foodConditions,foodSearch,cultureConditions,selectionEvidence} from './worker.mjs';
const at='2026-10-18T08:00:00Z';
const pref={kind:'food',destination:'496',style:'any',mood:'any',budget:0,cancellation:false};
const product=(code='A')=>({productCode:code,status:'ACTIVE',title:'Supplier example',productUrl:'https://www.viator.com/tours/Athens/example/d496-'+code+'?pid=P00320497&mcid=42383&medium=api&api_version=2.0',inclusions:[{otherDescription:'Cooking class'}],exclusions:[],itinerary:{privateTour:false,maxTravelersInSharedTour:8,itineraryType:'ACTIVITY',duration:{fixedDurationInMinutes:180}},productOptions:[{title:'Morning cooking class',languageGuides:[{type:'GUIDE',language:'en'}]}],logistics:{travelerPickup:{pickupOptionType:'MEET_EVERYONE_AT_START_POINT'}},pricing:{currency:'EUR',summary:{fromPrice:50}},flags:['FREE_CANCELLATION'],cancellationPolicy:{type:'STANDARD'}});
const conditions=p=>foodConditions(p,cultureConditions(p,at),at);
const tags=[{tagId:1,allNamesByLocale:{en:'Food & Drink'},parentTagIds:[]},{tagId:2,allNamesByLocale:{en:'Cooking Classes'},parentTagIds:[1]},{tagId:3,allNamesByLocale:{en:'Food Tours'},parentTagIds:[1]},{tagId:4,allNamesByLocale:{en:'Cooking Classes'},parentTagIds:[9]}];
test('Food input and live lineage reject ambiguity and preserve Boat Wine Culture',()=>{
 assert.equal(preferences(pref).kind,'food');
 for(const change of [{mood:'allergen_free'},{allergies:'nuts'},{style:'taxi'},{destination:'Athens'}])assert.throws(()=>preferences({...pref,...change}));
 assert.equal(foodTag(tags,'any','Athens'),3);assert.equal(foodTag(tags,'any','Naxos'),2);assert.equal(foodTag([...tags].reverse(),'cooking','Crete'),2);
 assert.throws(()=>foodTag([...tags,{...tags[1],tagId:5}],'cooking','Crete'));
 for(const kind of ['boat','wine','culture'])assert.equal(preferences({...pref,kind}).kind,kind);
});
test('food activity needs explicit detail evidence, not title, menu, wine or a meal',()=>{
 for(const inclusions of [[],[{type:'LUNCH'}],[{type:'ALCOHOLIC_BEVERAGES'}]]){const p=product();p.inclusions=inclusions;p.title='Amazing cooking class food walk';p.itinerary.foodMenus=[{dishName:'Cooking class'}];assert.equal(conditions(p),null)}
 const p=product();assert.deepEqual(conditions(p).activities,['cooking']);assert.equal(conditions(p).dietary,'not_confirmed');assert.equal(conditions(p).ingredients,'not_confirmed');
 p.inclusions=[];p.itinerary.activityInfo={description:'You will cook traditional food with a chef.'};assert.equal(conditions(p).facts[0].evidence.field,'itinerary.activityInfo.description');
 p.itinerary.activityInfo.description='Watch a cooking demonstration.';assert.equal(conditions(p),null);
});
test('negative, optional, excluded, truncated and contradictory activities fail closed',()=>{
 for(const statement of ['Cooking class is optional.','No cooking class.','Cooking class available on request.','Cooking class for an additional fee.','Watch a cooking class demonstration.','Cooking class. Watch the chef only.']){const p=product();p.inclusions=[{otherDescription:statement}];assert.equal(conditions(p),null,statement)}
 for(const modify of [p=>p.exclusions=[{otherDescription:'Cooking class'}],p=>p.inclusions.push({otherDescription:'No cooking class.'}),p=>p.productOptions.push({title:'Dinner-only'}),p=>p.inclusions.push({otherDescription:'x'.repeat(2001)}),p=>p.productOptions=[],p=>p.productOptions=Array(21).fill(p.productOptions[0])]){const p=product();modify(p);assert.equal(conditions(p),null)}
});
test('common option languages and group conflicts never become broad guarantees',()=>{
 const p=product();p.languageGuides=[{type:'GUIDE',language:'en'},{type:'GUIDE',language:'it'}];p.productOptions.push({title:'Evening cooking class',languageGuides:[{type:'GUIDE',language:'el'}]});assert.deepEqual(conditions(p).languages,[]);
 p.itinerary.privateTour=true;p.productOptions[0].title='Small Group Tour';assert.equal(conditions(p).group,'unknown');
 p.status='INACTIVE';assert.equal(conditions(p),null);
});
test('authentic 17 October field projections: cooking inclusion, food walk, wine mismatch',()=>{
 const recorded=JSON.parse(readFileSync(new URL('../tests/fixtures/food-audit.json',import.meta.url)));
 const byCode=Object.fromEntries(recorded.cases.flatMap(c=>c.data.products).map(p=>[p.summary.productCode,p]));
 const fromProjection=code=>{const d=byCode[code].details;return {productCode:code,status:d.status,inclusions:d.inclusions.map(i=>({...i,otherDescription:i.description})),exclusions:d.exclusions.map(i=>({...i,otherDescription:i.description})),itinerary:d.itinerary,languageGuides:d.languageGuides,productOptions:d.options.map(o=>({title:o.title,languageGuides:o.languageGuides}))}};
 assert.ok(conditions(fromProjection('5649732P3')).activities.includes('cooking'));
 assert.ok(conditions(fromProjection('101933P4')).activities.includes('walk'));
 assert.ok(conditions(fromProjection('417834P1')).activities.includes('tasting'));
 assert.equal(conditions(fromProjection('342330P1')),null);
 // Audit omitted activity descriptions. Missing evidence remains missing, not fabricated.
 assert.equal(conditions(fromProjection('432159P1')),null);
});
test('bounded fresh details, exact affiliate URL, unknown pricing and unavailable products',async()=>{
 const products=Array.from({length:20},(_,i)=>product('P'+i));let calls=0,active=0,max=0;
 const result=await foodSearch(products,pref,'Athens',false,async code=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,1));active--;return products.find(p=>p.productCode===code)});
 assert.equal(calls,12);assert.equal(max,2);assert.equal(result.length,3);assert.equal(result[0].url,products[0].productUrl);assert.equal(result[0].priceBasis,'unknown');assert.equal(result[0].supplierCover,null);assert.equal(result[0].image,null);assert.ok(result[0].selectionEvidence.some(f=>f.code==='food_cooking'));
 assert.deepEqual(await foodSearch([products[0]],pref,'Athens',true,async()=>({...products[0],status:'INACTIVE'})),[]);
 await assert.rejects(foodSearch([products[0]],pref,'Athens',false,async()=>({...products[0],productCode:'DIFFERENT'})));
 await assert.rejects(foodSearch([products[0]],pref,'Athens',false,async()=>{throw Error('timeout')}));
 assert.deepEqual(await foodSearch([products[0]],{...pref,mood:'walk'},'Athens',false,async()=>products[0]),[]);
 assert.deepEqual(await foodSearch([products[0]],{...pref,cancellation:true},'Athens',false,async()=>({...products[0],cancellationPolicy:{type:'ALL_SALES_FINAL'}})),[]);
 assert.deepEqual(selectionEvidence(products[0],{...pref,style:'any'}),[]);
});
test('Worker Food feature gate and endpoint budget use only existing allowed paths',async()=>{
 const original=globalThis.fetch,paths=[];
 globalThis.fetch=async(url,init)=>{const path=new URL(url).pathname.replace('/partner','');paths.push(path);return Response.json(path==='/destinations'?{destinations:[{destinationId:1,name:'Greece',type:'COUNTRY'},{destinationId:496,parentDestinationId:1,name:'Athens'}]}:path==='/products/tags'?{tags}:path==='/products/search'?{products:[product()]}:product())};
 const env={VIATOR_API_KEY:'TEST_ONLY',SEARCH_LIMIT:{limit:async()=>({success:true})},FOOD_ENABLED:'true'};
 const request=()=>new Request('https://api.example/search',{method:'POST',headers:{Origin:'https://greecebydan.com','Content-Type':'application/json'},body:JSON.stringify(pref)});
 try{let r=await worker.fetch(request(),{...env,FOOD_ENABLED:'false'});assert.equal(r.status,400);assert.ok(paths.every(p=>p==='/destinations'));paths.length=0;
 r=await worker.fetch(request(),env);assert.equal(r.status,200);assert.equal((await r.json()).products.length,1);assert.deepEqual(paths,['/destinations','/products/tags','/products/search','/products/A']);
 const caps=await (await worker.fetch(new Request('https://api.example/destinations',{headers:{Origin:'https://greecebydan.com'}}),env)).json();assert.equal(caps.capabilities.food,true);
 }finally{globalThis.fetch=original}
});
