import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{preferences,transferTag,transferRoute,transferConditions,transferSearch} from './worker.mjs';
const pref={kind:'transfer',destination:'496',style:'any',mood:'any',budget:0,cancellation:false};
const tags=[{tagId:10,allNamesByLocale:{en:'Transfers'},parentTagIds:[1]},{tagId:20,allNamesByLocale:{en:'Airport & Hotel Transfers'},parentTagIds:[10,1]},{tagId:21,allNamesByLocale:{en:'Port Transfers '},parentTagIds:[10,1]},{tagId:22,allNamesByLocale:{en:'Port Transfers'},parentTagIds:[]},{tagId:30,allNamesByLocale:{en:'Tours by Duration'},parentTagIds:[]},{tagId:31,allNamesByLocale:{en:'Day Trips'},parentTagIds:[30]},{tagId:32,allNamesByLocale:{en:'Day Trips'},parentTagIds:[99]}];
const product=(code='TEST')=>({productCode:code,status:'ACTIVE',tags:[20],title:'Transfer listing',productUrl:'https://www.viator.com/tours/Athens/Transfer/d496-'+code+'?mcid=42383&pid=P00320497&medium=api&api_version=2.0',pricing:{currency:'EUR',summary:{fromPrice:40}},flags:['FREE_CANCELLATION'],cancellationPolicy:{type:'STANDARD'},itinerary:{itineraryType:'UNSTRUCTURED',privateTour:true,duration:{fixedDurationInMinutes:45}},duration:{fixedDurationInMinutes:45},inclusions:[{type:'PRIVATE_TRANSPORTATION'}],exclusions:[],productOptions:[{title:'Departure Transfer from Athens City to Athens Airport'}],logistics:{travelerPickup:{pickupOptionType:'PICKUP_EVERYONE'}}});
const condition=p=>transferConditions(p,20,false);
function day(){const p=product();p.tags=[31];p.productOptions=[{title:'Day trip'}];p.itinerary={itineraryType:'STANDARD',privateTour:true,duration:{fixedDurationInMinutes:480},itineraryItems:[{description:'Delphi visit'}]};p.inclusions.push({otherDescription:'Pickup from Athens hotels'});return p}
function projectedTransfers(){
 const x=JSON.parse(readFileSync(new URL('../tests/fixtures/transfers-audit.json',import.meta.url)));
 return x.case.data.products.map(row=>{
  const d=row.details,s=row.summary;
  return {summary:{...s,pricing:{currency:s.currency,summary:{fromPrice:s.fromPrice}}},detail:{...d,tags:s.tags,
   productOptions:d.options.map(o=>({title:o.title,languageGuides:o.languageGuides})),
   inclusions:d.inclusions.map(i=>({...i,otherDescription:i.description})),
   exclusions:d.exclusions.map(i=>({...i,otherDescription:i.description})),
   logistics:{travelerPickup:{pickupOptionType:d.logistics.pickupOptionType}}}};
 });
}
test('Transfer input and live namespace resolve duplicated labels fail closed',()=>{
 assert.equal(preferences(pref).kind,'transfer');for(const x of [{mood:'taxi_now'},{flight:'XX123'},{style:'van'},{destination:'Athens'}])assert.throws(()=>preferences({...pref,...x}));
 assert.equal(transferTag(tags,'any'),20);assert.equal(transferTag([...tags].reverse(),'airport_port'),21);assert.equal(transferTag(tags,'daytrip'),31);assert.throws(()=>transferTag([...tags,{...tags[1],tagId:25}],'any'));assert.throws(()=>transferTag([], 'any'));
});
test('Route is exact directed option wording; no title/geographic or variant guesses',()=>{
 for(const [value,expected] of [['Athens Airport to Athens City','airport_city'],['Departure Transfer from Athens City to Athens Airport','city_airport'],['ATH Airport to Piraeus Port','airport_port'],['Piraeus cruise port to Athens International Airport','port_airport'],['Airport to Athens/Piraeus','unknown'],['Athens Airport and Piraeus Port','unknown'],['Athens Airport to Athens City or Piraeus Port','unknown'],['Athens Airport to Athens City. Return from Athens City to Athens Airport','unknown'],['Round-trip transfer Athens City to Athens Airport','unknown'],['Athens Airport to Athens City via Piraeus Port','unknown'],['x'.repeat(2001),'unknown']])assert.equal(transferRoute(value),expected,value);
 const p=product();p.title='Athens Airport to Piraeus Port';p.productOptions=[{title:'Transfer'}];assert.equal(condition(p).route,'unknown');p.productOptions=[{title:'Athens Airport to Athens City'},{title:'Athens City to Athens Airport'}];assert.equal(condition(p).route,'unknown');
});
test('Included transport, ACTIVE, complete options and service type are required',()=>{
 for(const modify of [p=>p.status='INACTIVE',p=>p.inclusions=[],p=>p.exclusions=[{type:'PRIVATE_TRANSPORTATION'}],p=>p.inclusions=[{otherDescription:'Private transportation is optional'}],p=>p.inclusions=[{type:'PRIVATE_TRANSPORTATION',otherDescription:'On request only'}],p=>p.productOptions[0].description='Transportation not included',p=>p.productOptions=[],p=>p.productOptions=Array(21).fill({title:'Transfer'}),p=>p.productOptions[0].description='x'.repeat(2001),p=>p.tags=[],p=>p.itinerary.unstructuredDescription='Guided city tour with sightseeing']){const p=product();modify(p);assert.equal(condition(p),null)}
 const c=condition(product());assert.equal(c.route,'city_airport');assert.equal(c.group,'private');for(const k of ['capacity','luggage','childSeats','delayWaiting','operatingHours'])assert.equal(c[k],'not_confirmed');
 const p=product();p.productOptions[0].description='Shared small-group transfer';assert.equal(condition(p).group,'unknown');
});
test('Day trips require one-day structured itinerary, included transport and scoped Athens departure',()=>{
 assert.equal(transferConditions(day(),31,true).route,'athens_daytrip');
 for(const modify of [p=>p.itinerary.itineraryType='MULTI_DAY_TOUR',p=>p.itinerary.duration.fixedDurationInMinutes=1500,p=>p.inclusions=[{type:'PRIVATE_TRANSPORTATION'}],p=>p.productOptions[0].description='Pickup is optional',p=>p.productOptions[0].logistics={},p=>p.inclusions=[],p=>p.itinerary.itineraryItems=[]]){const p=day();modify(p);assert.equal(transferConditions(p,31,true),null)}
 const p=day();p.inclusions=[{type:'PRIVATE_TRANSPORTATION'}];p.logistics={start:[{description:'Meeting point: Athens city centre'}]};assert.ok(transferConditions(p,31,true));p.logistics.start[0].description='Thessaloniki, travel to Athens later';assert.equal(transferConditions(p,31,true),null);
});
test('Authentic permitted field projections preserve route direction and unknown limitations',()=>{
 const rows=projectedTransfers();assert.equal(rows.length,3);const by=Object.fromEntries(rows.map(p=>[p.detail.productCode,p]));const condition=p=>transferConditions(p,12044,false);assert.equal(condition(by['323957P7'].detail).route,'city_airport');assert.equal(condition(by['189416P13'].detail).route,'unknown');assert.equal(condition(by['241463P2'].detail).route,'unknown');assert.equal(condition(by['323957P7'].detail).luggage,'not_confirmed');
});
test('Fresh bounded adapter keeps exact affiliate URL, unknown price and no false padding',async()=>{
 const products=Array.from({length:20},(_,i)=>product('T'+i));let calls=0,active=0,max=0;
 const results=await transferSearch(products,pref,'Athens',false,async code=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,1));active--;return products.find(p=>p.productCode===code)},20);
 assert.equal(calls,12);assert.equal(max,2);assert.equal(results.length,3);assert.equal(results[0].url,products[0].productUrl);assert.equal(results[0].priceBasis,'unknown');assert.equal(results[0].supplierCover,null);assert.equal(results[0].transfer.route,'city_airport');
 const fresh=await transferSearch([{...products[0],duration:{fixedDurationInMinutes:999}}],pref,'Athens',false,async()=>products[0],20);assert.equal(fresh[0].durationMinutes.max,45);
 assert.deepEqual(await transferSearch([products[0]],{...pref,mood:'airport_port'},'Athens',false,async()=>products[0],20),[]);
 assert.deepEqual(await transferSearch([products[0]],pref,'Athens',true,async()=>({...products[0],status:'INACTIVE'}),20),[]);
 assert.deepEqual(await transferSearch([products[0]],{...pref,cancellation:true},'Athens',false,async()=>({...products[0],productOptions:[{title:'Non-refundable transfer'}]}),20),[]);
 await assert.rejects(transferSearch([products[0]],pref,'Athens',false,async()=>({...products[0],productCode:'OTHER'}),20));await assert.rejects(transferSearch([products[0]],pref,'Athens',false,async()=>{throw Error('timeout')},20));
});
test('Worker gate and integration use only existing endpoints; no capacity or schedule API',async()=>{
 const original=globalThis.fetch,paths=[];globalThis.fetch=async(url)=>{const p=new URL(url).pathname.replace('/partner','');paths.push(p);return Response.json(p==='/destinations'?{destinations:[{destinationId:1,name:'Greece',type:'COUNTRY'},{destinationId:496,parentDestinationId:1,name:'Athens'}]}:p==='/products/tags'?{tags}:p==='/products/search'?{products:[product()]}:product())};
 const env={VIATOR_API_KEY:'UNIT_ONLY',TRANSFERS_ENABLED:'true',SEARCH_LIMIT:{limit:async()=>({success:true})}};const request=()=>new Request('https://test/search',{method:'POST',headers:{Origin:'https://greecebydan.com','Content-Type':'application/json'},body:JSON.stringify(pref)});
 try{assert.equal((await worker.fetch(request(),{...env,TRANSFERS_ENABLED:'false'})).status,400);paths.length=0;const r=await worker.fetch(request(),env);assert.equal(r.status,200);assert.equal((await r.json()).products.length,1);assert.deepEqual(paths,['/destinations','/products/tags','/products/search','/products/TEST'])}finally{globalThis.fetch=original}
});
