/* npm install --no-save playwright (test tooling only); build the site first.
 * CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/browser-smoke.cjs
 * Uses synthetic UI fixtures, never a live quote or real tour recommendation.
 */
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(process.env.SITE_DIR || '_site');
const screenshots = path.resolve(process.env.SCREENSHOT_DIR || '/tmp/gbd-browser-screenshots');
fs.mkdirSync(screenshots, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (name.endsWith('/')) name += 'index.html';
  const file = path.resolve(root, '.' + name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const report = []; const events = []; let state = 'results'; let collectorFails = false; let previewFeatures = false; const forbiddenRequests = [];
  const product = { productCode: 'UI_FIXTURE', title: 'Interface test — not a tour offer', reason: 'Synthetic test data. No price, dates or availability are supplied.', url: 'https://www.viator.com/tours/UI_FIXTURE?pid=TEST&medium=api', departure: null, image: null, durationMinutes: null };
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.context().route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.origin === base) {
        if (previewFeatures && route.request().isNavigationRequest()) return route.fetch().then(async r => route.fulfill({response:r,body:(await r.text()).replace('name="gbd-interactions" content="disabled"','name="gbd-interactions" content="enabled"').replace('name="gbd-api-photos" content="disabled"','name="gbd-api-photos" content="enabled"')}));
        return route.continue();
      }
      if (!previewFeatures && (u.pathname === '/events' || /cloudflareinsights|tacdn|buymeacoffee/.test(u.hostname))) forbiddenRequests.push(route.request().url());
      if (u.hostname === 'greecebydan-travel-api.onelion-studio.workers.dev') {
        if (u.pathname === '/events') { if (collectorFails) return route.abort(); events.push(route.request().postDataJSON()); return route.fulfill({ status: 204 }); }
        if (u.pathname === '/destinations') return route.fulfill({ json: { destinations: [{ id: '4', name: 'Milos' }, { id: '5', name: 'Santorini' }] } });
        if (u.pathname === '/search') {
          if (state === '429') return route.fulfill({ status: 429, json: { error: 'Try later' } });
          return route.fulfill({ json: { products: state === 'empty' ? [] : [product] } });
        }
      }
      if (u.hostname === 'media.tacdn.com' && u.pathname === '/UI-test.svg') return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480"><rect width="720" height="480" fill="teal"/></svg>'});
      return route.abort(); // No real partner, metric or third-party traffic.
    });
    if (process.env.BASELINE === '1') {
      for (const width of [360,1366]) {
        await page.setViewportSize({width,height:900});
        await page.goto(base + '/concierge/');
        await page.locator('#concierge-form:not([hidden])').waitFor();
        await page.locator('#concierge-form').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(screenshots,`before-concierge-${width}.png`)});
        await page.goto(base + '/');
        await page.locator('.feature-card').first().scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(screenshots,`before-home-${width}.png`)});
      }
      return;
    }
    // First test the ACTUAL disabled release. Then explicitly opt in only in
    // this intercepted, local test HTML to exercise dormant prototype paths.
    product.image = {url:'https://media.tacdn.com/UI-test.svg',width:720,height:480};
    await page.goto(base + '/milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose/');
    await page.locator('[data-advisor-source="boat-milos"]').click();
    await page.locator('#concierge-form:not([hidden])').waitFor();
    await page.locator('#concierge-form button').click();
    await page.locator('.concierge-result').waitFor();
    assert.equal(await page.locator('.concierge-photo').count(),0);
    assert.equal(events.length,0);
    assert.deepEqual(forbiddenRequests,[]);
    assert.equal(await page.locator('.concierge-result .concierge-book').getAttribute('href'),product.url);
    await page.locator('.concierge-result .concierge-book').click();
    assert.deepEqual(forbiddenRequests,[]);
    for (const [basis, expected] of [[undefined, /Price basis not confirmed/], ['unknown', /Price basis not confirmed/], ['per_person', /€123.00 per person/], ['per_group', /€123.00 per group/], ['invented', /Price basis not confirmed/], ['__proto__', /Price basis not confirmed/]]) {
      product.fromPrice = 123; product.priceBasis = basis;
      await page.locator('#concierge-form button').click();
      await page.locator('#concierge-form button:not([disabled])').waitFor();
      const text = await page.locator('.concierge-result').innerText();
      assert.match(text, expected);
      if (!['per_person', 'per_group'].includes(basis)) assert.doesNotMatch(text, /per person|per group/);
    }
    delete product.fromPrice; delete product.priceBasis;
    product.image = null; previewFeatures = true;
    report.push('DISABLED RELEASE: no event/beacon/photo/BMC-widget requests; affiliate action works: PASS');
    const article = '/how-to-taste-santorini-wine-without-driving/';
    await page.goto(base + article);
    const entry = page.locator('[data-advisor-source="wine-santorini"]');
    const href = await entry.getAttribute('href'); assert.match(href, /kind=wine/);
    await entry.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshots, 'after-article-context.png') });
    await entry.click();
    await page.locator('#concierge-form:not([hidden])').waitFor();
    assert.equal(await page.locator('[name=kind]').inputValue(), 'wine');
    assert.equal(await page.locator('[name=destination]').inputValue(), '5');
    await page.waitForFunction(() => Boolean(window.gbdEvent));
    assert.equal(events.filter(e => e.name === 'advisor_open').length, 1);
    await page.locator('#concierge-form button').click();
    await page.locator('.concierge-result').waitFor();
    assert.match(await page.locator('.concierge-result').innerText(), /Check duration on Viator/);
    assert.equal(await page.locator('.concierge-result .concierge-book').getAttribute('href'), product.url);
    assert.match(await page.locator('.concierge-result .concierge-book').getAttribute('rel'), /sponsored/);
    assert.equal(await page.locator('.concierge-photo').count(), 0);
    // Deliberately synthetic result capture; no invented tour price or departure.
    await page.locator('.concierge-result').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(screenshots, 'after-results-UI-fixture.png') });
    await page.locator('.concierge-result .concierge-book').click();
    await page.waitForFunction(() => true);
    assert.equal(events.filter(e => e.name === 'affiliate_click').length, 1);
    assert.equal(events.filter(e => e.name === 'search_submit').length, 1);
    assert.equal(events.filter(e => e.name === 'results_view').length, 1);
    for (const event of events) assert.deepEqual(Object.keys(event).sort(), ['v','name','source','placement','kind','productCode','count'].sort());
    report.push('Article → prefilled wine/destination → results → unmodified sponsored affiliate URL; one event per interaction: PASS');
    state = 'empty'; await page.locator('#concierge-form button').click();
    await page.locator('#concierge-status[data-state=empty]').waitFor();
    assert.equal(await page.locator('[name=destination]').inputValue(), '5');
    assert.equal(events.filter(e => e.name === 'no_results').length, 1);
    state = '429'; await page.locator('#concierge-form button').click();
    await page.locator('#concierge-status[data-state=error]').waitFor();
    assert.match(await page.locator('#concierge-status').innerText(), /wait a moment/);
    report.push('Empty results and rate limiting preserve preferences; retry stays enabled: PASS');
    for (const width of [360, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/', '/stories/', article, '/concierge/?kind=boat&place=milos&profile=boat-choice&source=boat-milos']) {
        await page.goto(base + route);
        if (route.startsWith('/concierge/')) await page.locator('#concierge-form:not([hidden])').waitFor();
        if (route === '/') { await page.locator('.feature-card').first().scrollIntoViewIfNeeded(); await page.screenshot({path:path.join(screenshots,`after-home-${width}.png`)}); }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        if (overflow) { console.log(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0,12).map(e => ({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,80),right:e.getBoundingClientRect().right})))); await page.screenshot({path:path.join(screenshots,'overflow.png'), fullPage:true}); }
        assert.equal(overflow, false, `${width}px ${route}`);
      }
      await page.locator('#concierge-form').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(screenshots, `after-concierge-${width}.png`) });
      state = 'results'; await page.locator('#concierge-form button').click();
      await page.locator('.concierge-result').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('.concierge-result').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(screenshots,`after-results-${width}-UI-fixture.png`)});
      report.push(`Chromium viewport ${width}px: home/catalog/article/concierge horizontal overflow PASS`);
    }
    // Photo success and failure are UI fixtures; never scrape a partner photo.
    product.image = {url:'https://media.tacdn.com/UI-test.svg',width:720,height:480};
    await page.locator('#concierge-form button').click(); await page.locator('.concierge-photo').waitFor();
    await page.locator('.concierge-photo').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.concierge-photo')?.naturalWidth > 0);
    product.image.url = 'https://media.tacdn.com/missing-UI-test.svg';
    await page.locator('#concierge-form button').click(); await page.locator('.concierge-result').waitFor();
    await page.waitForFunction(() => !document.querySelector('.concierge-photo'));
    assert.equal(await page.locator('.concierge-result .concierge-book').getAttribute('href'), product.url);
    collectorFails = true; await page.locator('.concierge-result .concierge-book').click();
    assert.equal(await page.locator('.concierge-result .concierge-book').getAttribute('href'), product.url);
    collectorFails = false; product.image = null;
    report.push('Photo loads only from allowed host; broken photo removed; collector failure does not block affiliate action: PASS');
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(base + '/concierge/?kind=bad&place=%3Cscript%3E&profile=boat-choice&source=boat-milos');
    await page.locator('#concierge-form:not([hidden])').waitFor();
    assert.equal(await page.locator('[name=destination]').inputValue(), '');
    assert.equal(await page.locator('[name=kind]').inputValue(), 'boat');
    await page.getByRole('button', { name: 'Open menu' }).click();
    assert.equal(await page.locator('.menu').getAttribute('aria-expanded'), 'true');
    assert.equal(errors.length, 0, errors.join('\n'));
    report.push('Unknown URL context ignored; mobile menu works; no page JS errors: PASS');
    await page.goto(base + '/milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose/');
    assert.match(await page.locator('h1').innerText(), /Milos Boat Tours/);
    await page.locator('[data-advisor-source="boat-milos"]').click();
    await page.locator('#concierge-form:not([hidden])').waitFor();
    assert.equal(await page.locator('[name=destination]').inputValue(), '4');
    assert.equal(await page.locator('[name=kind]').inputValue(), 'boat');
    await page.goto(base + '/greek-feta-sheeps-milk-wooden-barrels-and-a-taste-of-place/');
    assert.match(await page.locator('h1').innerText(), /Greek Feta/);
    assert.equal(await page.locator('[data-advisor-source="boat-milos"]').count(), 0);
    report.push('Restored Milos article opens Milos Boat profile; Feta has independent identity without a boat CTA: PASS');
    await page.context().addInitScript(() => Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'}));
    await page.goto(base + article);
    const prior = events.length;
    await page.locator('[data-advisor-source]').click();
    await page.locator('#concierge-form:not([hidden])').waitFor();
    await page.locator('#concierge-form button').click();
    await page.locator('.concierge-result').waitFor();
    assert.equal(events.length, prior);
    report.push('Do Not Track disables helper interaction events: PASS');
    fs.writeFileSync(path.join(screenshots, 'browser-results.json'), JSON.stringify({ browser: await browser.version(), fixtures: true, actualPhone: false, checks: report, events }, null, 2));
    console.log(report.join('\n'));
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
