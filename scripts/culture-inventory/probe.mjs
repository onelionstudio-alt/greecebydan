// Temporary read-only diagnostic; bundled only into the named staging preview.
export const INVENTORY_CASES = Object.freeze(Object.fromEntries(
  [['acropolis','Athens','Athens'],['delphi_local','Delphi','Delphi'],['delphi_athens','Athens','Delphi'],['meteora','Meteora','Meteora']].flatMap(([scope,destination,place]) =>
    ['Historical Tours','Archaeology Tours','Cultural Tours'].flatMap((tag,t) =>
      [[1,0],[1,6],...(['acropolis','meteora'].includes(scope)?[[51,0]]:[])].map(([start,offset]) =>
        [`${scope}_${t}_${start}_${offset}`,{scope,destination,place,tag,start,offset}])))));
const arr = v => Array.isArray(v)?v:[];
const short = v => typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160):null;
export function projectInventoryDetail(p,conditions) {
  const languages = v => arr(v).slice(0,30).map(g=>({type:short(g.type),language:short(g.language)}));
  const items = v => arr(v).slice(0,30).map(i=>({type:short(i.type),category:short(i.category),description:short(i.otherDescription)}));
  return {productCode:short(p.productCode),status:short(p.status),conditions,
    languageGuides:languages(p.languageGuides),optionCount:arr(p.productOptions).length,
    options:arr(p.productOptions).slice(0,20).map(o=>({code:short(o.productOptionCode),title:short(o.title),languageGuides:o.languageGuides===undefined?null:languages(o.languageGuides),pickupOptionType:short(o.logistics?.travelerPickup?.pickupOptionType),logisticsOverride:o.logistics!==undefined})),
    inclusions:items(p.inclusions),exclusions:items(p.exclusions),
    pickupOptionType:short(p.logistics?.travelerPickup?.pickupOptionType),
    startCount:arr(p.logistics?.start).length,
    // Textual place mentions are diagnostic clues only, never transport evidence.
    startMentionsAthens:arr(p.logistics?.start).some(x=>/\bathens\b/i.test(x.description||'')),
    startMentionsDelphi:arr(p.logistics?.start).some(x=>/\bdelphi\b/i.test(x.description||'')),
    excerptsTruncated:[...arr(p.inclusions),...arr(p.exclusions)].some(x=>(x.otherDescription||'').length>160),
    availability:'NOT_CHECKED',transport:'REQUIRES_SCOPED_REVIEW'};
}
export async function runInventoryAudit(request,env,io) {
  const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  if(new URL(request.url).origin!==origin)return respond({error:'Staging only'},404);
  if(request.headers.get('Origin')!==origin)return respond({error:'Origin not allowed'},403);
  if(request.method!=='POST')return respond({error:'POST required'},405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return respond({error:'JSON required'},415);
  const raw=await request.text();if(raw.length>256)return respond({error:'Request too large'},413);
  let name;try{const b=JSON.parse(raw);if(!b||Object.keys(b).length!==1||!Object.hasOwn(INVENTORY_CASES,b.case))throw Error();name=b.case}catch{return respond({error:'Invalid fixed audit case'},400)}
  if(!env.VIATOR_API_KEY||!env.SEARCH_LIMIT?.limit)return respond({error:'Setup incomplete'},503);
  if(!(await env.SEARCH_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return respond({error:'Rate limited; stop without retry'},429);
  try{
    const deadline=Date.now()+28000,c=INVENTORY_CASES[name];
    const [destinations,tags]=await Promise.all([io.destinations(deadline),io.tags(deadline)]);
    const ds=destinations.filter(d=>d.name===c.destination),ts=tags.filter(t=>(t.allNamesByLocale?.en||t.allNamesByLocale?.['en-US'])===c.tag);
    if(ds.length!==1||ts.length!==1)return respond({error:'Ambiguous or missing taxonomy'},422);
    const body={filtering:{destination:ds[0].id,tags:[ts[0].tagId]},sorting:{sort:'TRAVELER_RATING',order:'DESCENDING'},pagination:{start:c.start,count:50},currency:'EUR'};
    const data=await io.search(body,deadline),pref={kind:'culture',destination:ds[0].id,style:'any',mood:'guided',budget:0,cancellation:false};
    // Apply the exact production candidate checks, in six-item windows, without
    // removing fail-closed exclusions. Offset is a fixed server case, not user input.
    const pool=arr(data.products),eligible=[];
    for(let i=0;i<pool.length;i++)if(io.candidates([pool[i]],pref,c.place).length&&!eligible.some(p=>p.productCode===pool[i].productCode))eligible.push(pool[i]);
    const selected=eligible.slice(c.offset,c.offset+6),products=[];
    for(let i=0;i<selected.length;i+=2){
      const batch=await Promise.all(selected.slice(i,i+2).map(async s=>{
        const p=await io.detail(s.productCode,deadline);if(p?.productCode!==s.productCode)throw Error('Identity mismatch');
        const conditions=io.conditions(p);
        return {summary:{productCode:s.productCode,title:short(s.title),productUrl:s.productUrl},detail:projectInventoryDetail(p,conditions),qualifiesGuided:conditions?.guide==='included'};
      }));products.push(...batch);
    }
    return respond({case:name,checkedAt:new Date().toISOString(),config:c,request:body,acceptLanguage:'en-US',searchCount:pool.length,totalCount:Number.isFinite(data.totalCount)?data.totalCount:null,candidateCount:eligible.length,
      candidates:eligible.map(p=>({productCode:p.productCode,title:short(p.title)})),products,detailLimit:6,automaticRetries:0,availabilityCalls:0,
      warning:'Bounded candidate audit, not total catalogue or date-specific bookability. Title, destination and pickup do not prove guide language or included transport.'});
  }catch{return respond({error:'Upstream failed; stop without retries or stale fallback'},502)}
}
