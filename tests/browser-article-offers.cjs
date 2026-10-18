/* Synthetic UI/response boundary tests, not evidence of live product availability. */
const {chromium,webkit}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve('_site'),out=path.resolve('docs/article-affiliate-cards/evidence');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{let p=new URL(req.url,'http://local').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f))});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const report=[];
try{for(const engine of [chromium,webkit]){const browser=await engine.launch();try{for(const width of [320,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();let mode='none',calls=[],forbidden=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return route.continue();
  if(u.pathname==='/article-cover'&&u.hostname==='greecebydan-travel-api.onelion-studio.workers.dev'){
    calls.push(route.request().postDataJSON());
    let cover={source:'SUPPLIER_PROVIDED',isCover:true,url:'https://media.tacdn.com/media/synthetic-boundary.png',width:720,height:480,checkedAt:Date.now(),expiresAt:Date.now()+299000};
    if(mode==='portrait'){cover.width=300;cover.height=4096}if(mode==='traveler')cover.source='TRAVELER_PROVIDED';if(mode==='evil')cover.url='https://evil.test/media/x.jpg';if(mode==='expired')cover.expiresAt=Date.now()-1;if(mode==='short')cover.expiresAt=Date.now()+1500;
    if(mode==='error')return route.fulfill({status:502,json:{error:'Image temporarily unavailable'}});
    return route.fulfill({json:{supplierCover:mode==='none'||mode==='inactive'?null:cover,...(mode==='inactive'?{active:false}:{})}});
  }
  if(u.hostname==='media.tacdn.com'&&u.pathname==='/media/synthetic-boundary.png'){
    if(mode==='broken')return route.fulfill({status:404,body:''});
    return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jBbsAAAAASUVORK5CYII=','base64')});
  }
  forbidden.push(u.hostname+u.pathname);return route.abort();
 });
 const visit=async()=>{await page.goto('http://127.0.0.1:'+server.address().port+'/article-card-preview/');await page.locator('.article-offer').scrollIntoViewIfNeeded();await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.endsWith('/article-cover')))};
 await visit();assert.equal(await page.locator('.article-offer img').count(),0);
 const url=await page.locator('.article-offer a').getAttribute('href');assert.match(url,/pid=P00320497&medium=api&api_version=2.0$/);
 const box=await page.locator('.article-offer').boundingBox();assert.ok(box.height<440);
 await page.locator('.article-offer').screenshot({path:path.join(out,engine.name()+'-'+width+'-text.png')});
 for(const state of ['valid','portrait','traveler','evil','expired','error','none','broken','short','inactive']){
   mode=state;await visit();
   if(['valid','portrait','short'].includes(state)){
     await page.locator('.article-offer img').waitFor();
     assert.equal(await page.locator('.article-offer img').getAttribute('alt'),'Tour image: Explore a Milos sailing option');
     assert.equal(await page.locator('.article-offer img').evaluate(e=>getComputedStyle(e).objectFit),'contain');
     const imageBox=await page.locator('.article-offer img').boundingBox();assert.ok(imageBox.height<=(width<=600?150:140), 'Supplier image must remain compact even when article image styles override height');
     if(state==='valid'||state==='portrait'){
       await new AxeBuilder({page}).include('.article-offer').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze().then(a=>assert.deepEqual(a.violations.map(v=>v.id),[]));
       // Boundary screenshot uses a deliberately synthetic one-pixel image, not a real tour photo.
       await page.locator('.article-offer').screenshot({path:path.join(out,engine.name()+'-'+width+'-synthetic-cover.png')});
     }else await page.waitForFunction(()=>!document.querySelector('.article-offer img'));
   }else{
     await page.waitForFunction(()=>!document.querySelector('.article-offer img'));
   }
   if(state==='inactive')assert.equal(await page.locator('.article-offer a').count(),0);
   else assert.equal(await page.locator('.article-offer a').getAttribute('href'),url);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 mode='none';await visit();await page.locator('.article-offer a').focus();assert.equal(await page.evaluate(()=>document.activeElement.matches('.article-offer a')),true);await page.keyboard.press('Tab');
 assert.ok(calls.every(c=>JSON.stringify(c)==='{"productCode":"345728P2"}'));assert.equal(calls.length,12);assert.deepEqual(forbidden,[]);assert.deepEqual(errors,[]);
 report.push({engine:engine.name(),width,status:'PASS',realApi:false,photo:'synthetic boundary only',requests:calls.length});await context.close();
}}finally{await browser.close()}}}finally{server.close();fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify(report,null,2))}
console.log('Article offer responsive, source, expiry, error, keyboard and axe boundaries: PASS');
})().catch(e=>{console.error(e);server.close();process.exit(1)});
