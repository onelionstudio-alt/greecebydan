/* Real remote staging only: no mocks, routes, image replacement or API credentials. */
const {chromium,webkit}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const origin='https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const expected='22b1c1268d2cb4eb971a9b1ba3cbd516747c4683';
const out=path.resolve('docs/article-affiliate-cards/evidence/live');fs.mkdirSync(out,{recursive:true});
const report={testedAt:new Date().toISOString(),sourceCommit:expected,mocks:false,physicalDevices:false,checks:[],status:'INCOMPLETE'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{try{
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  const forbidden=[],errors=[],network=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const u=new URL(r.url());if(u.pathname==='/events'||/cloudflareinsights|\/photos(?:\/|$)|reviews\/|bookings\//.test(u.href))forbidden.push(u.href)});
  page.on('response',r=>{const u=new URL(r.url());if(u.pathname==='/article-cover'||['media.tacdn.com','hare-media-cdn.tripadvisor.com','media-cdn.tripadvisor.com'].includes(u.hostname))network.push({url:r.url(),status:r.status()})});
  page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
  const metaResponse=await context.request.get(origin+'/_preview/meta');assert.equal(metaResponse.status(),200);const meta=await metaResponse.json();
  assert.equal(meta.sourceCommit,expected);assert.equal(meta.apiPhotos,false);assert.equal(meta.interactionEvents,false);assert.equal(meta.supplierCovers,true);
  assert.equal(meta.apiSourceSha256,sha(fs.readFileSync('travel-worker/worker.mjs')));
  for(const asset of ['/assets/js/article-offers.js','/assets/css/style.css']){
   const r=await context.request.get(origin+asset);assert.equal(r.status(),200);const body=await r.body();assert.equal(sha(body),meta.assetSha256[asset]);
   const local=fs.readFileSync('.'+asset,'utf8').replaceAll('https://greecebydan-travel-api.onelion-studio.workers.dev',origin);assert.equal(sha(body),sha(local));
  }
  const response=page.waitForResponse(r=>r.url()===origin+'/article-cover'&&r.request().method()==='POST');
  const started=Date.now();await page.goto(origin+'/article-card-preview/');
  const card=page.locator('.article-offer');await card.scrollIntoViewIfNeeded();const r=await response;
  assert.equal(r.status(),200);assert.equal(r.headers()['cache-control'],'no-store');
  assert.deepEqual(r.request().postDataJSON(),{productCode:'345728P2'});
  const dto=await r.json(),cover=dto.supplierCover;
  assert.ok(cover,'Actual preview product has no verifiable supplier cover; report fallback instead of claiming a photo PASS');
  assert.equal(cover.source,'SUPPLIER_PROVIDED');assert.equal(cover.isCover,true);assert.ok(cover.expiresAt>Date.now());assert.ok(cover.expiresAt-cover.checkedAt<=300000);
  const img=card.locator('img');await img.waitFor();
  await page.waitForFunction(()=>{const img=document.querySelector('.article-offer img');return img?.complete&&img.naturalWidth>0},null,{timeout:20000});
  assert.equal(await img.getAttribute('src'),cover.url);assert.equal(await img.getAttribute('referrerpolicy'),'no-referrer');assert.ok(await img.getAttribute('alt'));
  assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
  const imageBox=await img.boundingBox();assert.ok(imageBox.height<=(width<=600?150:140), 'Actual supplier image exceeds the compact card height');
  assert.equal(await card.getAttribute('data-product-code'),'345728P2');
  const link=card.locator('a'),affiliate=await link.getAttribute('href');
  assert.equal(affiliate,'https://www.viator.com/tours/Milos/Milos-oneiro/d22323-345728P2?mcid=42383&pid=P00320497&medium=api&api_version=2.0');
  assert.match(await link.getAttribute('rel'),/sponsored/);assert.equal(await link.getAttribute('target'),'_blank');
  assert.doesNotMatch(await card.innerText(),/\bprice\b|\brating\b|\bper person\b|\bper group\b|€|\$/i);
  assert.equal(await page.locator('meta[name=gbd-interactions]').getAttribute('content'),'disabled');assert.equal(await page.locator('meta[name=gbd-api-photos]').getAttribute('content'),'disabled');
  const raw=await (await context.request.get(origin+'/article-card-preview/')).text();assert.ok(!raw.includes(cover.url));assert.match(raw,/noindex,nofollow/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await link.focus();assert.equal(await link.evaluate(e=>e===document.activeElement),true);
  const axe=await new AxeBuilder({page}).include('.article-offer').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(v=>v.id),[]);
  await page.screenshot({path:path.join(out,`real-${engine.name()}-${width}.png`)});
  assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  report.checks.push({engine:engine.name(),width,status:'PASS',apiStatus:r.status(),cover,affiliate,network,axeViolations:0,imageHeight:imageBox.height,elapsedMs:Date.now()-started});await context.close();
 }
 }finally{await browser.close()}
}
report.status='PASS';
}finally{fs.writeFileSync(path.join(out,'real-staging.json'),JSON.stringify(report,null,2))}
console.log('Real article offer staging, supplier CDN, affiliate integrity, Chromium/WebKit, mobile and axe: PASS');
})().catch(e=>{console.error(e);process.exit(1)});
