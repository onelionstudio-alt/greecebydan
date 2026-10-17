// Read-only staging diagnostic. Never part of the ordinary production Worker.
export const AUDIT_CASES = Object.freeze({
  culture_athens: {destination:'Athens', tags:['Historical Tours','Archaeology Tours','Cultural Tours'], subject:/acropolis/i},
  culture_delphi: {destination:'Delphi', tags:['Historical Tours','Archaeology Tours','Cultural Tours'], subject:/delphi/i},
  culture_meteora: {destination:'Meteora', tags:['Historical Tours','Cultural Tours'], subject:/meteora/i},
  culture_olympia: {destination:'Olympia', tags:['Historical Tours','Archaeology Tours','Cultural Tours'], subject:/olympia/i},
  food_athens: {destination:'Athens', tags:['Food Tours','Food & Drink'], root:'Food & Drink', subject:/food|tasting/i},
  food_naxos: {destination:'Naxos', tags:['Cooking Classes','Cooking Class'], root:'Food & Drink', subject:/cook/i},
  food_crete: {destination:'Crete', tags:['Cooking Classes','Cooking Class'], root:'Food & Drink', subject:/cook/i},
  transfers_athens: {destination:'Athens', tags:['Airport & Hotel Transfers','Airport Transfers','Private Transfers'], subject:/airport|piraeus|transfer/i}
});
const text = v => typeof v==='string' ? v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160) : null;
const duration = v => { const d=Object.fromEntries(['fixedDurationInMinutes','variableDurationFromMinutes','variableDurationToMinutes'].filter(k=>Number.isFinite(v?.[k])&&v[k]>0).map(k=>[k,v[k]]));return Object.keys(d).length?d:null; };
const list = v => Array.isArray(v) ? v : [];
const flag = v => typeof v==='boolean' ? v : null;
// Duplicate English labels occur in the live taxonomy. Resolve lineage by live
// root name, never by array order or an assumed numeric tag ID.
export function selectAuditTag(tags, config) {
  const nameOf=t=>t.allNamesByLocale?.en||t.allNamesByLocale?.['en-US']||'';
  for(const label of config.tags) {
    const candidates=tags.filter(t=>nameOf(t).toLowerCase()===label.toLowerCase());
    if(!candidates.length)continue;
    if(config.root) {
      const roots=tags.filter(t=>nameOf(t)===config.root&&!(t.parentTagIds||[]).length);
      if(roots.length!==1)return null;
      const current=candidates.filter(t=>t.tagId===roots[0].tagId||(t.parentTagIds||[]).includes(roots[0].tagId));
      return current.length===1?current[0]:null;
    }
    return candidates.length===1?candidates[0]:null;
  }
  return null;
}
export function auditSummary(p) {
  let url=null;try{const u=new URL(p.productUrl);if(u.protocol==='https:'&&['viator.com','www.viator.com'].includes(u.hostname)&&!u.username&&!u.password)url=p.productUrl}catch{}
  return {productCode:text(p.productCode),title:text(p.title),productUrl:url,tags:list(p.tags).filter(Number.isInteger),flags:list(p.flags).filter(x=>typeof x==='string').slice(0,20),duration:duration(p.duration),
    priceBasis:'unknown',currency:p.pricing?.currency||null,fromPrice:Number.isFinite(p.pricing?.summary?.fromPrice)?p.pricing.summary.fromPrice:null,
    fieldsPresent:Object.keys(p).sort(),availability:'Not checked for dates, option or party size; search eligibility only'};
}
export function auditDetails(p) {
  const logistics = v => v&&typeof v==='object'?{startCount:list(v.start).length,endCount:list(v.end).length,pickupOptionType:text(v.travelerPickup?.pickupOptionType),startDescriptionsPresent:list(v.start).some(x=>!!text(x.description)),startLocationFields:[...new Set(list(v.start).flatMap(x=>Object.keys(x.location||{})))].sort()}:null;
  const inclusion = v=>list(v).slice(0,30).map(x=>({category:text(x.category),type:text(x.type),description:text(x.otherDescription)}));
  return {productCode:text(p.productCode),status:text(p.status),checkedAt:new Date().toISOString(),fieldsPresent:Object.keys(p).sort(),
    languageGuides:list(p.languageGuides).slice(0,30).map(x=>({language:text(x.language),type:text(x.type)})),
    itinerary:p.itinerary?{itineraryType:text(p.itinerary.itineraryType),privateTour:flag(p.itinerary.privateTour),maxTravelersInSharedTour:Number.isInteger(p.itinerary.maxTravelersInSharedTour)&&p.itinerary.maxTravelersInSharedTour>0?p.itinerary.maxTravelersInSharedTour:null,duration:duration(p.itinerary.duration),stopCount:list(p.itinerary.itineraryItems).length,stops:list(p.itinerary.itineraryItems).slice(0,20).map(x=>({admissionIncluded:text(x.admissionIncluded),passByWithoutStopping:flag(x.passByWithoutStopping),description:text(x.description)}))}:null,
    logistics:logistics(p.logistics),optionCount:list(p.productOptions).length,optionsTruncated:list(p.productOptions).length>10,options:list(p.productOptions).slice(0,10).map(x=>({code:text(x.productOptionCode),title:text(x.title),logistics:logistics(x.logistics),languageGuides:list(x.languageGuides).map(g=>({language:text(g.language),type:text(g.type)}))})),
    inclusions:inclusion(p.inclusions),exclusions:inclusion(p.exclusions),additionalInfo:list(p.additionalInfo).slice(0,25).map(x=>({type:text(x.type),description:text(x.description)})),
    cancellationType:text(p.cancellationPolicy?.type),protectedContentReturned:false,
    note:'Supplier listing data, not independent verification. No meeting address, stair count, dietary guarantee or availability inferred. Descriptive excerpts capped at 160 characters.'};
}
export async function categoryAudit(request,env,origin,io) {
  const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Access-Control-Allow-Origin':origin,'Vary':'Origin'}});
  if(new URL(request.url).hostname!=='greecebydan-travel-api-staging.onelion-studio.workers.dev')return respond({error:'Staging only'},404);
  if(origin!=='https://greecebydan-travel-api-staging.onelion-studio.workers.dev'||request.headers.get('Origin')!==origin)return respond({error:'Origin not allowed'},403);
  if(request.method!=='POST')return respond({error:'POST required'},405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>256)return respond({error:'Request too large'},413);
  let name;try{const body=JSON.parse(raw);if(!body||Object.keys(body).length!==1||typeof body.case!=='string')throw Error();name=body.case;if(name!=='taxonomy'&&!Object.hasOwn(AUDIT_CASES,name))throw Error()}catch{return respond({error:'Invalid audit case'},400)}
  if(!env.VIATOR_API_KEY||!env.SEARCH_LIMIT?.limit)return respond({error:'Setup incomplete'},503);
  if(!(await env.SEARCH_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return respond({error:'Please try again shortly'},429);
  try{
    const destinations=await io.destinations(),tags=await io.tags();
    const nameOf=t=>t.allNamesByLocale?.en||t.allNamesByLocale?.['en-US']||'';
    if(name==='taxonomy')return respond({purpose:'Category audit only; no recommendations',checkedAt:new Date().toISOString(),cases:Object.keys(AUDIT_CASES),destinations:destinations.filter(d=>Object.values(AUDIT_CASES).some(c=>c.destination===d.name)),tags:tags.filter(t=>/histor|cultur|archaeo|food|cook|transfer|day trips/i.test(nameOf(t))).slice(0,80).map(t=>({id:t.tagId,name:nameOf(t),parentTagIds:t.parentTagIds||[]}))});
    const c=AUDIT_CASES[name],destination=destinations.find(d=>d.name===c.destination),tag=selectAuditTag(tags,c);
    if(!destination||!tag)return respond({case:name,status:'BLOCKED',reason:!destination?'Exact destination missing':'Exact unambiguous category tag/lineage missing',attemptedTagNames:c.tags});
    const data=await io.search({filtering:{destination:destination.id,tags:[tag.tagId]},sorting:{sort:'TRAVELER_RATING',order:'DESCENDING'},pagination:{start:1,count:50},currency:'EUR'});
    const seen=new Set(),selected=list(data.products).filter(p=>c.subject.test(`${p.title||''} ${p.description||''}`)&&/^[A-Za-z0-9_-]{1,40}$/.test(p.productCode||'')&&!seen.has(p.productCode)&&seen.add(p.productCode)).slice(0,3);
    let detailAccessDenied=false;const products=[];for(const p of selected){const summary=auditSummary(p);if(!summary.productUrl)continue;const detail=await io.detail(p.productCode);products.push({summary,detailHttpStatus:detail.status,details:detail.status===200&&detail.data?.productCode===p.productCode?auditDetails(detail.data):null});if([401,403,429].includes(detail.status)){detailAccessDenied=true;break}}
    return respond({case:name,purpose:'Candidate/data audit, not recommendation or availability approval',checkedAt:new Date().toISOString(),destination,tag:{id:tag.tagId,name:nameOf(tag)},candidateCount:list(data.products).length,products,detailAccessDenied,detailLimit:3,availabilityCalls:0,automaticRetries:0});
  }catch{return respond({error:'Audit upstream unavailable; no stale fallback'},502)}
}
