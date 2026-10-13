import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { greekDestinations, category, preferences, recommendations, impactCoverage } from './worker.mjs';
const destinations = [{ destinationId: 1, name: 'Europe', type: 'CONTINENT' }, { destinationId: 2, parentDestinationId: 1, name: 'Greece', type: 'COUNTRY' }, { destinationId: 3, parentDestinationId: 2, name: 'Cyclades' }, { destinationId: 4, parentDestinationId: 3, name: 'Milos' }, { destinationId: 5, parentDestinationId: 1, name: 'Rome' }];
const pref = { kind: 'boat', destination: '4', style: 'any', mood: 'any', budget: 0, cancellation: false };
const product = { productCode: 'X', title: 'Milos sailing', description: 'A captain and crew, sunset swimming.', flags: ['PRIVATE_TOUR', 'FREE_CANCELLATION'], productUrl: 'https://www.viator.com/tours/Milos/tour?pid=P123&medium=api', pricing: { summary: { fromPrice: 100 }, currency: 'EUR' }, reviews: { combinedAverageRating: 4.8, totalReviews: 120 } };
test('destination hierarchy includes Greek descendants only', () => {
  assert.deepEqual(greekDestinations(destinations).map(d => d.id).sort(), ['3', '4']);
  assert.throws(() => greekDestinations([]));
});
test('preferences reject unknown filters, non-Greek-looking IDs and wrong types', () => {
  assert.deepEqual(preferences({ ...pref, budget: '75' }).budget, 75);
  for (const change of [{ destination: '../bad' }, { mood: 'food' }, { budget: -1 }, { cancellation: 'true' }, { style: 'shared' }, { kind: 'anything' }]) assert.throws(() => preferences({ ...pref, ...change }));
});
test('category comes from live names, absent taxonomy fails closed', () => {
  assert.equal(category([{ tagId: 9, allNamesByLocale: { en: 'Wine Tastings' } }], 'wine'), 9);
  assert.throws(() => category([], 'boat'));
});
test('boat filter rejects self-drive, unknown crew, unsafe links and prices', () => {
  const good = recommendations([product], pref);
  assert.equal(good.length, 1);
  assert.equal(good[0].url, product.productUrl);
  for (const change of [{ description: 'Boat rental with captain' }, { description: 'Bareboat self-drive' }, { description: 'Sail without a captain' }, { description: 'Optional skipper for your sailing day' }, { description: 'Skipper available on request' }, { description: 'A lovely day out' }, { productUrl: 'https://evil.example/tour' }, { productUrl: 'javascript:alert(1)' }, { pricing: { summary: { fromPrice: 100 }, currency: 'USD' } }]) assert.equal(recommendations([{ ...product, ...change }], pref).length, 0);
});
test('preferences are enforced and duplicate results removed', () => {
  assert.equal(recommendations([product, product], { ...pref, style: 'private', mood: 'sunset', cancellation: true }).length, 1);
  assert.equal(recommendations([product], { ...pref, budget: 75 }).length, 0);
  assert.equal(recommendations([{ ...product, flags: [] }], { ...pref, style: 'private' }).length, 0);
  assert.equal(recommendations([{ ...product, description: 'Crew on board' }], { ...pref, mood: 'swimming' }).length, 0);
});
test('wine, ordering and maximum three alternatives', () => {
  const wine = { ...product, title: 'Winery tour', description: 'Wine paired with cheese.' };
  assert.equal(recommendations([wine], { ...pref, kind: 'wine', mood: 'food' }).length, 1);
  const data = Array.from({ length: 5 }, (_, i) => ({ ...product, productCode: `P${i}`, reviews: { combinedAverageRating: 4 + i / 10, totalReviews: 100 } }));
  const result = recommendations(data, pref);
  assert.equal(result.length, 3);
  assert.equal(result[0].rating, 4.4);
  assert.ok(!('description' in result[0]) && !('score' in result[0]));
});
test('health, robots, CORS, setup and rate limiting fail safely', async () => {
  const req = (path, init = {}) => new Request('https://worker.example' + path, init);
  assert.deepEqual(await (await worker.fetch(req('/health'), {})).json(), { ready: false });
  assert.match(await (await worker.fetch(req('/robots.txt'), {})).text(), /Disallow: \/\n/);
  assert.equal((await worker.fetch(req('/search'), {})).status, 403);
  const origin = { Origin: 'https://greecebydan.com' };
  assert.equal((await worker.fetch(req('/destinations', { headers: origin }), {})).status, 503);
  const blocked = { VIATOR_API_KEY: 'test-secret', SEARCH_LIMIT: { limit: async () => ({ success: false }) } };
  assert.equal((await worker.fetch(req('/destinations', { headers: origin }), blocked)).status, 429);
  const options = await worker.fetch(req('/search', { method: 'OPTIONS', headers: origin }), {});
  assert.equal(options.headers.get('Access-Control-Allow-Origin'), origin.Origin);
});
test('mock integration bounds endpoint calls and keeps attribution unchanged', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const data = url.endsWith('/destinations') ? { destinations } : url.endsWith('/products/tags') ? { tags: [{ tagId: 10, allNamesByLocale: { en: 'Cruises & Sailing' } }] } : { products: [product] };
    return Response.json(data);
  };
  try {
    const env = { VIATOR_API_KEY: 'test-secret', SEARCH_LIMIT: { limit: async () => ({ success: true }) } };
    const request = data => new Request('https://worker.example/search', { method: 'POST', headers: { Origin: 'https://greecebydan.com', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const response = await worker.fetch(request(pref), env);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(!text.includes('test-secret'));
    assert.equal(JSON.parse(text).products[0].url, product.productUrl);
    assert.equal(calls.length, 3);
    const search = JSON.parse(calls[2].init.body);
    assert.deepEqual(search.pagination, { start: 1, count: 50 });
    assert.equal(search.currency, 'EUR');
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    calls.length = 0;
    assert.equal((await worker.fetch(request({ ...pref, destination: '5' }), env)).status, 400);
    assert.equal(calls.length, 1);
    globalThis.fetch = async () => new Response('test-secret upstream debug', { status: 401 });
    const failed = await worker.fetch(request(pref), env);
    assert.equal(failed.status, 502);
    assert.ok(!(await failed.text()).includes('test-secret'));
  } finally { globalThis.fetch = original; }
});

test('Impact diagnostics expose coverage only and validate tracking destinations', () => {
  const tracked = 'https://click-and-boat.pxf.io/c/123/456/19914?u=https%3A%2F%2Fwww.clickandboat.com%2Fen%2Fboat-rental%2Fcorfu%2Fmotorboat%2Fboat';
  const result = impactCoverage({ '@uri': '/private-token', '@total': '12315', Items: [
    { Name: 'Boat', Description: 'Private content', Url: tracked, CurrentPrice: '18', Currency: 'EUR', Text1: '', Numeric1: '0' },
    { Name: 'Other', Url: tracked.replace('www.clickandboat.com', 'evil.example'), AuthToken: 'secret', Uri: '/private-token' }
  ] });
  assert.equal(result.totalItems, 12315);
  assert.equal(result.populatedFields.Name, 2);
  assert.equal(result.populatedFields.Text1, 0);
  assert.equal(result.populatedFields.Numeric1, 1);
  assert.equal(result.trackedClickAndBoatLinks, 1);
  assert.deepEqual(result.sampleDestinationSlugs, ['corfu']);
  assert.ok(!JSON.stringify(result).includes('Private content') && !JSON.stringify(result).includes('secret'));
  assert.throws(() => impactCoverage({}));
});

test('Impact check uses fixed catalog, scoped credentials, bounded requests and safe errors', async () => {
  const original = globalThis.fetch;
  const env = { IMPACT_ACCOUNT_SID: 'IRtestSID', IMPACT_ACCESS_TOKEN: 'test-impact-secret', SEARCH_LIMIT: { limit: async () => ({ success: true }) } };
  const req = (init = {}) => new Request('https://worker.example/impact/check', init);
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return Response.json(url.includes('/Items?') ? { '@total': '1', Items: [{ Name: 'Sample boat' }] } : { Id: '18365', CampaignId: '19914', Uri: '/IRtestSID' });
  };
  try {
    assert.equal((await worker.fetch(req(), {})).status, 503);
    assert.equal((await worker.fetch(req({ method: 'POST' }), env)).status, 405);
    assert.equal((await worker.fetch(req({ headers: { Origin: 'https://evil.example' } }), env)).status, 403);
    assert.equal(calls.length, 0);
    const response = await worker.fetch(req(), env);
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.equal(JSON.parse(body).connected, true);
    assert.ok(!body.includes('IRtestSID') && !body.includes('test-impact-secret'));
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://api.impact.com/Mediapartners/IRtestSID/Catalogs/18365/Items?Page=1&PageSize=25');
    assert.equal(calls[0].init.headers.Authorization, 'Basic ' + btoa('IRtestSID:test-impact-secret'));
    assert.equal(calls[0].init.redirect, 'manual');
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: 'https://other.example/private' } });
    const redirect = await (await worker.fetch(req(), env)).json();
    assert.equal(redirect.code, 'upstream_redirect');
    assert.equal(redirect.upstreamStatus, 302);
    assert.ok(!JSON.stringify(redirect).includes('other.example'));
    for (const status of [401, 403, 404, 429, 500]) {
      globalThis.fetch = async () => new Response('test-impact-secret raw upstream details', { status });
      const failed = await worker.fetch(req(), env);
      assert.equal(failed.status, 502);
      const body = await failed.json();
      assert.equal(body.stage, 'catalog');
      assert.equal(body.upstreamStatus, status);
      assert.ok(!JSON.stringify(body).includes('test-impact-secret'));
    }
    globalThis.fetch = async () => new Response('not JSON, test-impact-secret');
    assert.equal((await (await worker.fetch(req(), env)).json()).code, 'invalid_json');
    globalThis.fetch = async () => { throw new DOMException('test-impact-secret', 'TimeoutError'); };
    assert.equal((await (await worker.fetch(req(), env)).json()).code, 'timeout');
    globalThis.fetch = async () => { throw new Error('test-impact-secret'); };
    assert.equal((await (await worker.fetch(req(), env)).json()).code, 'network_or_redirect');
    globalThis.fetch = async url => Response.json(url.includes('/Items?') ? { Items: {} } : { Id: '18365', CampaignId: '19914' });
    const schema = await (await worker.fetch(req(), env)).json();
    assert.equal(schema.stage, 'items');
    assert.equal(schema.code, 'items_schema');
    assert.equal((await (await worker.fetch(req(), { ...env, IMPACT_ACCOUNT_SID: 'bad SID' })).json()).code, 'credential_format');
    globalThis.fetch = async () => Response.json({ Id: '999', CampaignId: '19914' });
    assert.match(await (await worker.fetch(req(), env)).text(), /Unexpected Click&Boat catalog/);
  } finally { globalThis.fetch = original; }
});

test('Impact summary succeeds even when the cache cannot write', async () => {
  const originalFetch = globalThis.fetch;
  const originalCache = globalThis.caches;
  globalThis.caches = { default: { match: async () => { throw new Error('Cache unavailable'); }, put: async () => { throw new Error('Cache unavailable'); } } };
  globalThis.fetch = async url => Response.json(url.includes('/Items?') ? { Items: [] } : { Id: '18365', CampaignId: '19914' });
  try {
    const env = { IMPACT_ACCOUNT_SID: ' IRtestSID\n', IMPACT_ACCESS_TOKEN: ' test-impact-secret\n', SEARCH_LIMIT: { limit: async () => ({ success: true }) } };
    const response = await worker.fetch(new Request('https://worker.example/impact/check'), env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).connected, true);
  } finally { globalThis.fetch = originalFetch; globalThis.caches = originalCache; }
});
