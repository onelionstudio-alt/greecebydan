const SITE = 'https://greecebydan.com';
const BASE = 'https://api.viator.com/partner';
const WEEK = 604800;
const headers = origin => ({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...(origin === SITE ? { 'Access-Control-Allow-Origin': SITE, 'Vary': 'Origin' } : {}) });
function reply(data, status = 200, origin = '') { return new Response(JSON.stringify(data), { status, headers: headers(origin) }); }

export function greekDestinations(destinations) {
  const root = destinations.find(d => d.name === 'Greece' && d.type === 'COUNTRY');
  if (!root) throw new Error('Destination taxonomy unavailable');
  const ids = new Set([Number(root.destinationId)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of destinations) if (ids.has(Number(d.parentDestinationId)) && !ids.has(Number(d.destinationId))) { ids.add(Number(d.destinationId)); changed = true; }
  }
  return destinations.filter(d => ids.has(Number(d.destinationId)) && Number(d.destinationId) !== Number(root.destinationId)).map(d => ({ id: String(d.destinationId), name: d.name })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

export function preferences(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !['boat', 'wine'].includes(data.kind) || !/^\d{1,8}$/.test(data.destination) || !['any', 'private'].includes(data.style) || !['any', ...(data.kind === 'boat' ? ['sunset', 'swimming'] : ['food', 'vineyard'])].includes(data.mood) || !['0', '75', '150', '300'].includes(String(data.budget)) || typeof data.cancellation !== 'boolean') throw new Error('Invalid preferences');
  return { kind: data.kind, destination: data.destination, style: data.style, mood: data.mood, budget: Number(data.budget), cancellation: data.cancellation };
}

export function category(tags, kind) {
  const names = kind === 'wine' ? ['Wine Tastings', 'Wine Tasting', 'Wine Tours', 'Wine Tasting & Winery Tours'] : ['Cruises & Sailing', 'Day Cruises', 'Sailing'];
  for (const name of names) {
    const tag = tags.find(t => t.allNamesByLocale?.en?.toLowerCase() === name.toLowerCase() || t.allNamesByLocale?.['en-US']?.toLowerCase() === name.toLowerCase());
    if (tag) return tag.tagId;
  }
  throw new Error('Category taxonomy unavailable');
}

export function recommendations(products, pref) {
  const seen = new Set();
  return products.flatMap(p => {
    const content = `${p.title || ''} ${p.description || ''}`.toLowerCase();
    if (!p.productCode || seen.has(p.productCode) || !p.title || !p.productUrl) return [];
    seen.add(p.productCode);
    let target;
    try { target = new URL(p.productUrl); } catch { return []; }
    if (target.protocol !== 'https:' || !['viator.com', 'www.viator.com'].includes(target.hostname) || target.username || target.password) return [];
    if (pref.kind === 'boat' && (/self[- ]drive|without (?:a )?(?:licen[cs]e|captain|skipper|crew)|no (?:captain|skipper|crew)|(?:optional|additional|extra)[ -](?:captain|skipper|crew)|(?:captain|skipper|crew) (?:is )?(?:optional|available on request)|bareboat|boat rental|rent a boat|ferry ticket/i.test(content) || !/\b(?:captain|skipper|crew)\b/.test(content))) return [];
    if (pref.kind === 'wine' && !/\b(?:wine|winery|wineries|vineyard)\b/.test(content)) return [];
    const flags = p.flags || [];
    if (pref.style === 'private' && !flags.includes('PRIVATE_TOUR')) return [];
    if (pref.cancellation && !flags.includes('FREE_CANCELLATION')) return [];
    const patterns = { sunset: /sunset/, swimming: /swim|snorkel/, food: /food|lunch|dinner|cheese|meal|pairing/, vineyard: /vineyard|winery|wineries/ };
    if (pref.mood !== 'any' && !patterns[pref.mood].test(content)) return [];
    const price = p.pricing?.summary?.fromPrice;
    if (!Number.isFinite(price) || price < 0 || p.pricing.currency !== 'EUR' || (pref.budget && price > pref.budget)) return [];
    const rating = Number(p.reviews?.combinedAverageRating) || 0;
    const reviews = Number(p.reviews?.totalReviews) || 0;
    const reasons = [pref.kind === 'boat' ? 'The listing mentions a captain or crew.' : 'A wine experience in your selected destination.'];
    if (pref.style === 'private') reasons.push('Listed as a private experience.');
    if (pref.mood !== 'any') reasons.push({ sunset: 'Sunset is mentioned in the listing.', swimming: 'Swimming or snorkelling is mentioned.', food: 'Food or a pairing is mentioned.', vineyard: 'A winery or vineyard is mentioned.' }[pref.mood]);
    if (pref.cancellation) reasons.push('Listed with free cancellation; check the deadline.');
    return [{ title: p.title, url: p.productUrl, fromPrice: price, rating, reviews, reason: reasons.join(' '), score: rating * Math.min(1, Math.log10(reviews + 1) / 2) }];
  }).sort((a, b) => b.score - a.score || a.fromPrice - b.fromPrice).slice(0, 3).map(({ score, ...p }) => p);
}

async function viator(path, env, body) {
  const response = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'exp-api-key': env.VIATOR_API_KEY, 'Accept': 'application/json;version=2.0', 'Accept-Language': 'en-US', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Upstream unavailable');
  return response.json();
}

async function cached(request, env, path, ttl, body) {
  // Include a one-way key fingerprint so a rotated API key cannot reuse old data.
  const material = `${env.VIATOR_API_KEY}:${path}:${JSON.stringify(body || {})}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  const key = new Request(new URL('/internal-cache/' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''), request.url));
  const cache = globalThis.caches?.default;
  const hit = await cache?.match(key);
  if (hit) return hit.json();
  const data = await viator(path, env, body);
  if (cache) await cache.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}`, 'X-Robots-Tag': 'noindex' } }));
  return data;
}

export default {
  async fetch(request, env) {
    const route = new URL(request.url).pathname;
    const origin = request.headers.get('Origin') || '';
    if (route === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    const ready = Boolean(env.VIATOR_API_KEY && env.SEARCH_LIMIT?.limit);
    if (route === '/health' && request.method === 'GET') return reply({ ready }, 200, origin);
    if (origin !== SITE) return reply({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers(origin), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    if (!['/destinations', '/search'].includes(route)) return reply({ error: 'Not found' }, 404, origin);
    if ((route === '/search' && request.method !== 'POST') || (route === '/destinations' && request.method !== 'GET')) return reply({ error: 'Method not allowed' }, 405, origin);
    if (!ready) return reply({ error: 'Setup incomplete' }, 503, origin);
    // Anonymous visitors share an IP allowance. This can affect shared networks.
    const { success } = await env.SEARCH_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
    if (!success) return reply({ error: 'Please try again shortly' }, 429, origin);
    let pref;
    if (route === '/search') {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415, origin);
      const body = await request.text();
      if (body.length > 2048) return reply({ error: 'Request too large' }, 413, origin);
      try { pref = preferences(JSON.parse(body)); } catch { return reply({ error: 'Invalid preferences' }, 400, origin); }
    }
    try {
      const raw = await cached(request, env, '/destinations', WEEK);
      const destinations = greekDestinations(raw.destinations || []);
      if (route === '/destinations') return reply({ destinations }, 200, origin);
      if (!destinations.some(d => d.id === pref.destination)) return reply({ error: 'Choose a Greek destination' }, 400, origin);
      const tags = await cached(request, env, '/products/tags', WEEK);
      const filtering = { destination: pref.destination, tags: [category(tags.tags || [], pref.kind)] };
      if (pref.budget) filtering.highestPrice = pref.budget;
      const flags = [];
      if (pref.style === 'private') flags.push('PRIVATE_TOUR');
      if (pref.cancellation) flags.push('FREE_CANCELLATION');
      if (flags.length) filtering.flags = flags;
      const body = { filtering, sorting: { sort: 'TRAVELER_RATING', order: 'DESCENDING' }, pagination: { start: 1, count: 50 }, currency: 'EUR' };
      const data = await cached(request, env, '/products/search', 900, body);
      return reply({ products: recommendations(data.products || [], pref) }, 200, origin);
    } catch {
      // Never return upstream bodies, request headers or API credentials.
      return reply({ error: 'Search temporarily unavailable' }, 502, origin);
    }
  }
};
