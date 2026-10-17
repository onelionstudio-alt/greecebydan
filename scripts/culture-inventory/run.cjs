const {chromium}=require('playwright');
const fs=require('fs');
(async()=>{
 const {INVENTORY_CASES}=await import('./probe.mjs');
 const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
 const browser=await chromium.launch();
 const page=await browser.newPage();const results=[];
 try{
  await page.goto(origin+'/concierge/');
  const meta=await page.evaluate(async()=>await(await fetch('/_preview/meta')).json());
  if(meta.sourceCommit!=='840bcfb98044a4dc1aa2c14dfabc38b7d6aef7ab'||meta.cultureInventoryAuditRevision!==1||meta.apiPhotos!==false||meta.interactionEvents!==false)throw Error('Staging version/feature flags mismatch; upload inventory bundle first');
  for(const name of Object.keys(INVENTORY_CASES)){
   const result=await page.evaluate(async name=>{
    const r=await fetch('/__culture-inventory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({case:name})});
    return {status:r.status,data:await r.json()};
   },name);
   results.push(result);console.log(name,result.status,result.data.products?.filter(p=>p.qualifiesGuided).length??'-');
   if(result.status!==200)throw Error('Audit stopped without retry: '+result.status);
   await new Promise(resolve=>setTimeout(resolve,20000));
  }
 }finally{
  fs.mkdirSync('docs/culture-history/evidence',{recursive:true});
  fs.writeFileSync('docs/culture-history/evidence/inventory-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),purpose:'Bounded supplier inventory audit; no date availability checks',results},null,2));
  await browser.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
