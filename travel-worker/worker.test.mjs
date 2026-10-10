import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { greekDestinations, category, preferences, recommendations } from './worker.mjs';
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
