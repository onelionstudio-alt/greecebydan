/* Real staging only, no fixtures, secrets or purchases.
 * npm install --prefix /tmp/gbd-e2e playwright
 * NODE_PATH=/tmp/gbd-e2e/node_modules node tests/staging-e2e.cjs
 * Needs Chromium installed with Playwright. Does not deploy anything.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const base = 'https://greecebydan-travel-api-staging.onelion-studio.workers.dev';
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined });
  const report = { realResponses: true, physicalMobile: false, journeys: [], forbiddenRequests: [], errors: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    let diagnostic = false;
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('request', r => {
      const u = new URL(r.url());
      if (!diagnostic && (u.pathname === '/events' || /cloudflareinsights|tacdn|bmc-widget/.test(u.hostname + u.pathname))) report.forbiddenRequests.push(u.origin + u.pathname);
    });
    const metaResponse = await page.goto(base + '/_preview/meta');
    assert.equal(metaResponse.status(), 200, 'staging must be accessible from this browser');
    const meta = JSON.parse(await page.locator('body').innerText());
    assert.equal(meta.apiSourceSha256, hash(fs.readFileSync('travel-worker/worker.mjs')), 'staging Worker is stale');
    assert.equal(meta.assetSha256['/assets/js/concierge.js'], hash(fs.readFileSync('assets/js/concierge.js', 'utf8').replaceAll('https://greecebydan-travel-api.onelion-studio.workers.dev', base)), 'staging frontend is stale');
    assert.equal(meta.apiPhotos, false); assert.equal(meta.interactionEvents, false);
    for (const [article, kind, destination] of [
      ['/milos-boat-tours-if-you-get-seasick-which-boat-should-you-choose/', 'boat', '22323'],
      ['/how-to-taste-santorini-wine-without-driving/', 'wine', '959']
    ]) {
      await page.goto(base + article);
      await page.locator('[data-advisor-source]').first().click();
      await page.locator('#concierge-form:not([hidden])').waitFor();
      assert.equal(await page.locator('[name=kind]').inputValue(), kind);
      assert.equal(await page.locator('[name=destination]').inputValue(), destination);
      const api = page.waitForResponse(r => r.url() === base + '/search' && r.request().method() === 'POST');
      await page.locator('#concierge-form button').click();
      const response = await api; assert.equal(response.status(), 200);
      const data = await response.json();
      assert.ok(data.products.length > 0, `${kind}: no confirmed matches; inspect live source evidence, do not weaken filters`);
      await page.locator('.concierge-result').first().waitFor();
      assert.equal(await page.locator('.concierge-photo').count(), 0);
      for (const [i, product] of data.products.entries()) {
        assert.equal(product.image, null);
        assert.equal(product.priceBasis, 'unknown');
        const card = page.locator('.concierge-result').nth(i);
        assert.match(await card.innerText(), /Price basis not confirmed/);
        assert.doesNotMatch(await card.innerText(), /per person|per group/);
        assert.equal(await card.locator('a').getAttribute('href'), product.url);
        const url = new URL(product.url);
        assert.equal(url.hostname, 'www.viator.com'); assert.equal(url.searchParams.get('pid'), 'P00320497');
        assert.equal(url.searchParams.get('medium'), 'api');
        if (kind === 'wine') assert.match(product.reason, /explicitly describes wine tasting/);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const first = data.products[0];
      const popupPromise = page.waitForEvent('popup');
      await page.locator('.concierge-result a').first().click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      const landing = new URL(popup.url());
      assert.ok(['www.viator.com', 'viator.com'].includes(landing.hostname));
      assert.ok(landing.pathname.includes(first.productCode), 'landing must preserve selected product identity');
      const landingText = await popup.locator('body').innerText();
      assert.doesNotMatch(landingText, /access denied|verify you are human|enable js and disable|error code: 1010/i, 'partner landing blocked; manual check required');
      report.journeys.push({ article, kind, products: data.products.map(p => p.productCode), affiliateUrl: first.url, landing: landing.href });
      await popup.close();
    }
    // Check ordinary client traffic BEFORE deliberately probing the disabled endpoint.
    assert.deepEqual(report.forbiddenRequests, []);
    assert.deepEqual(report.errors, []);
    diagnostic = true;
    report.eventsProbe = await page.evaluate(async () => {
      const r = await fetch('/events', { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' });
      return {status:r.status, body:await r.json()};
    });
    assert.equal(report.eventsProbe.status, 503); assert.equal(report.eventsProbe.body.error, 'Events disabled');
    report.status = 'PASS';
  } catch (error) { report.status = 'BLOCKED'; report.failure = error.message; process.exitCode = 1; }
  finally { console.log(JSON.stringify(report, null, 2)); await browser.close(); }
})();
