const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,out=path.join(root,'evidence');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true});const report=[],requests=[];try{
for(const width of [360,390,768,1440]){const page=await browser.newPage({viewport:{width,height:width<500?844:1050},deviceScaleFactor:1});
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
await page.goto('file://'+path.join(root,'prototype.html'));await page.getByRole('heading',{name:'Milos oneiro-kleftiko sailing experience with local guide',exact:true}).waitFor();
assert.equal(await page.locator('.card').count(),3);assert.equal(await page.locator('img').count(),0);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.equal(await page.locator('.unit').first().innerText(),'Price basis not confirmed');
if(width===390||width===1440)await page.screenshot({path:path.join(out,`cards-${width}.png`),fullPage:true});
await page.getByRole('button',{name:'Compare selected (2)',exact:true}).click();assert.equal(await page.locator('#comparison').isVisible(),true);
assert.equal(await page.locator('#table thead th').count(),3);
if(width===390||width===1440)await page.screenshot({path:path.join(out,`compare-${width}.png`),fullPage:false});
await page.getByRole('button',{name:'Back to cards',exact:true}).click();
await page.locator('[data-index="2"]').check();await page.getByRole('button',{name:'Compare selected (3)',exact:true}).click();assert.equal(await page.locator('#table thead th').count(),4);
await page.getByRole('button',{name:'Back to cards',exact:true}).click();
await page.locator('[data-index="1"]').uncheck();await page.locator('[data-index="2"]').uncheck();assert.equal(await page.locator('#compare').isEnabled(),false);
await page.locator('#collection').selectOption('wine');assert.match(await page.locator('.card').first().innerText(),/Cooking Class and Wine Tasting/);
const link=page.locator('.card a.book').first();const u=new URL(await link.getAttribute('href'));assert.equal(u.searchParams.get('pid'),'P00320497');assert.equal(u.searchParams.get('medium'),'api');assert.match(await link.getAttribute('rel'),/sponsored/);
for(const state of ['loading','no-image','missing','empty','error']){await page.locator('#state').selectOption(state);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);if(width===390)await page.screenshot({path:path.join(out,`state-${state}-390.png`),fullPage:true});if(['empty','error','loading'].includes(state)){assert.equal(await page.locator('.card').count(),0);await page.locator('#reset-state').click();assert.equal(await page.locator('.card').count(),3);}else if(state==='missing'){assert.match(await page.locator('.card').innerText(),/Price not supplied/);assert.equal(await page.locator('.card .book').isEnabled(),false);}}
report.push(`${width}px: cards, no horizontal page overflow, 2/3 item comparison, missing data, state recovery, attribution: PASS`);await page.close();}
assert.deepEqual(requests,[]);report.push('Zero HTTP requests: no API, photos, fonts, telemetry or collectors: PASS');
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({fixture:'Recorded examples + explicitly synthetic states; not a live API test',physicalDevices:false,checks:report},null,2));console.log(report.join('\n'));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
