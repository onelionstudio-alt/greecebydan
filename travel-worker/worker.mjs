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

// Text matching is a conservative candidate filter, never verified suitability.
// A negative or conditional statement wins over a positive mention elsewhere.
export function mentioned(content, terms) {
  const text = content.toLowerCase().replace(/[’‘]/g, "'").replace(/[-–—]/g, ' ');
  const subject = `(?:${terms})`;
  const negative = new RegExp(`\\b(?:no|not|without|excluding|except|unable to|cannot|can't|don't|doesn't|do not|does not)\\b[^.!?;]{0,65}\\b${subject}\\b|\\b${subject}\\b[^.!?;]{0,65}\\b(?:not|never|unavailable|prohibited|forbidden|excluded|optional|extra|additional|weather|conditions|request|cannot|can't)\\b|\\b(?:optional|extra|additional)\\b[^.!?;]{0,40}\\b${subject}\\b`, 'i');
  return new RegExp(`\\b${subject}\\b`, 'i').test(text) && !negative.test(text);
}

// Search summary prices have no verified booking-unit metadata in this adapter.
// Do not infer a unit from title, PRIVATE_TOUR, UNIT, or a website price label:
// search fromPrice may be normalised differently from the bookable unit price.
export function priceBasis() { return 'unknown'; }

export function includesWineTasting(product) {
  const text = `${product.title || ''}. ${product.description || ''}`;
  const activity = 'wine[ -]+tastings?|tastings? of (?:local |Greek )?wines?';
  if (!mentioned(text, activity)) return false;
  // Reject conflicting/optional tasting claims even when the title is positive.
  // Sentence-wide conservative check: uncertainty is never an inclusion claim.
  return !text.split(/[.!?;]/).some(sentence =>
    /(?:tast(?:e|es|ed|ing)|winery|wineries)/i.test(sentence) &&
    /\b(?:no|not|never|without|excluding|excluded|unavailable|closed|prohibited|forbidden|cannot|can't|isn't|isn’t|doesn't|doesn’t|don't|don’t|optional|extra|additional|surcharge|request|may|might|could|can|depending|subject|available|arranged|purchase|purchased|sold|separately|fee|payable|cost|own expense)\b/i.test(sentence));
}

export const SUPPLIER_COVER_TTL_MS = 300000;
export function supplierCover(product, checkedAt = Date.now()) {
  if (product.status !== undefined && product.status !== 'ACTIVE') return null;
  const cover = Array.isArray(product.images) ? product.images.find(i => i?.imageSource === 'SUPPLIER_PROVIDED' && i.isCover === true) : null;
  const variants = (Array.isArray(cover?.variants) ? cover.variants : []).filter(v => {
    try {
      if (typeof v?.url !== 'string' || v.url.length > 2048 || v.url.trim() !== v.url) return false;
      const u = new URL(v.url);
      return u.protocol === 'https:' && ['media.tacdn.com', 'hare-media-cdn.tripadvisor.com', 'media-cdn.tripadvisor.com'].includes(u.hostname) && !u.username && !u.password && !u.port && !u.hash && u.pathname.startsWith('/media/') && /\.(jpg|jpeg|png|webp)$/i.test(u.pathname) && Number.isInteger(v.width) && v.width >= 300 && v.width <= 1200 && Number.isInteger(v.height) && v.height > 0 && v.height <= 4096;
    } catch { return false; }
  }).sort((a,b) => Math.abs(a.width - 720) - Math.abs(b.width - 720));
  const v = variants[0];
  return v ? { source: 'SUPPLIER_PROVIDED', isCover: true, url: v.url, width: v.width, height: v.height, checkedAt, expiresAt: checkedAt + SUPPLIER_COVER_TTL_MS } : null;
}

export function cardDetails(product) {
  const duration = product.duration;
  const valid = n => Number.isFinite(n) && n > 0 && n <= 43200;
  let durationMinutes = null;
  if (valid(duration?.fixedDurationInMinutes)) durationMinutes = { min: duration.fixedDurationInMinutes, max: duration.fixedDurationInMinutes };
  else if (valid(duration?.variableDurationFromMinutes) && valid(duration?.variableDurationToMinutes) && duration.variableDurationToMinutes >= duration.variableDurationFromMinutes) durationMinutes = { min: duration.variableDurationFromMinutes, max: duration.variableDurationToMinutes };
  // Retired legacy photo DTO. Only the separate supplierCover path may render.
  const image = null;
  // Search results do not establish a meeting point. No destination-centre fallback.
  return { durationMinutes, image, departure: null };
}

// Additive evidence DTO: old clients keep `reason`; new cards use only these
// bounded, source-labelled facts. Matching is not independent suitability review.
export function selectionEvidence(product, pref) {
  const facts = [];
  const textFact = (code, pattern) => {
    for (const field of ['title', 'description']) {
      const value = typeof product[field] === 'string' ? product[field].match(pattern)?.[0] : null;
      if (value) { facts.push({ code, evidence: { source: 'viator_listing', field, value } }); break; }
    }
  };
  if (pref.kind === 'wine' && includesWineTasting(product)) textFact('wine_tasting', /\bwine[ -]+tastings?\b|\btastings? of (?:local |Greek )?wines?\b/i);
  if (pref.kind === 'boat' && mentioned(`${product.title || ''} ${product.description || ''}`, 'captain|skipper|crew')) textFact('crew', /\b(?:captain|skipper|crew)\b/i);
  if (pref.style === 'private' && product.flags?.includes('PRIVATE_TOUR')) facts.push({code:'private',evidence:{source:'viator_listing',field:'flags',value:'PRIVATE_TOUR'}});
  if (pref.cancellation && product.flags?.includes('FREE_CANCELLATION')) facts.push({code:'cancellation',evidence:{source:'viator_listing',field:'flags',value:'FREE_CANCELLATION'}});
  return facts;
}

export function recommendations(products, pref, supplierCoversEnabled = false) {
  const seen = new Set();
  return products.flatMap(p => {
    if (p.status !== undefined && p.status !== 'ACTIVE') return [];
    const content = `${p.title || ''} ${p.description || ''}`.toLowerCase();
    if (!p.productCode || seen.has(p.productCode) || !p.title || !p.productUrl) return [];
    seen.add(p.productCode);
    let target;
    try { target = new URL(p.productUrl); } catch { return []; }
    if (target.protocol !== 'https:' || !['viator.com', 'www.viator.com'].includes(target.hostname) || target.username || target.password) return [];
    if (pref.kind === 'boat' && (/self[- ]drive|without (?:a )?(?:licen[cs]e|captain|skipper|crew)|no (?:captain|skipper|crew)|(?:optional|additional|extra)[ -](?:captain|skipper|crew)|(?:captain|skipper|crew) (?:is )?(?:optional|available on request)|bareboat|boat rental|rent a boat|ferry ticket/i.test(content) || !mentioned(content, 'captain|skipper|crew'))) return [];
    if (pref.kind === 'wine' && !includesWineTasting(p)) return [];
    const flags = p.flags || [];
    if (pref.style === 'private' && !flags.includes('PRIVATE_TOUR')) return [];
    if (pref.cancellation && !flags.includes('FREE_CANCELLATION')) return [];
    const patterns = { sunset: 'sunset', swimming: 'swim|swimming|snorkel|snorkeling|snorkelling', food: 'food|lunch|dinner|cheese|meal|pairing', vineyard: 'vineyard|vineyards|winery|wineries' };
    if (pref.mood !== 'any' && !mentioned(content, patterns[pref.mood])) return [];
    const price = p.pricing?.summary?.fromPrice;
    if (!Number.isFinite(price) || price < 0 || p.pricing.currency !== 'EUR' || (pref.budget && price > pref.budget)) return [];
    const rating = Number(p.reviews?.combinedAverageRating) || 0;
    const reviews = Number(p.reviews?.totalReviews) || 0;
    const reasons = [pref.kind === 'boat' ? 'The listing mentions a captain or crew.' : 'The listing explicitly describes wine tasting. Confirm inclusions for your selected option on Viator.'];
    if (pref.style === 'private') reasons.push('Listed as a private experience.');
    if (pref.mood !== 'any') reasons.push({ sunset: 'Sunset is mentioned in the listing.', swimming: 'Swimming or snorkelling is mentioned.', food: 'Food or a pairing is mentioned.', vineyard: 'A winery or vineyard is mentioned.' }[pref.mood]);
    if (pref.cancellation) reasons.push('Listed with free cancellation; check the deadline.');
    return [{ productCode: p.productCode, ...cardDetails(p), supplierCover: supplierCoversEnabled ? supplierCover(p) : null, title: p.title, url: p.productUrl, currency: p.pricing.currency, selectionEvidence: selectionEvidence(p, pref), fromPrice: price, priceBasis: priceBasis(p), rating, reviews, reason: reasons.join(' '), score: rating * Math.min(1, Math.log10(reviews + 1) / 2) }];
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
  try { const hit = await cache?.match(key); if (hit) return await hit.json(); } catch { /* Cache is optional. */ }
  const data = await viator(path, env, body);
  try { if (cache) await cache.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}`, 'X-Robots-Tag': 'noindex' } })); } catch { /* Cache is optional. */ }
  return data;
}

const IMPACT_CATALOG = '18365'; // CAB_EN_GS, supplied Click&Boat feed.
const IMPACT_PROGRAM = '19914';
const IMPACT_FIELDS = ['Name', 'Description', 'Url', 'ImageUrl', 'CurrentPrice', 'Currency', 'StockAvailability', 'Category', 'SubCategory', 'Bullets', 'Labels', 'Text1', 'Text2', 'Text3', 'Numeric1', 'Numeric2', 'Numeric3', 'Money1', 'Money2', 'Money3'];

export function impactCoverage(data) {
  if (!Array.isArray(data.Items)) throw new Error('Unexpected catalog schema');
  const items = data.Items.slice(0, 25).filter(item => item && typeof item === 'object' && !Array.isArray(item));
  const populated = value => typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : typeof value === 'number' && Number.isFinite(value);
  const fields = Object.fromEntries(IMPACT_FIELDS.map(field => [field, items.filter(item => populated(item[field])).length]));
  const destinations = new Set();
  let trackingLinks = 0;
  for (const item of items) {
    try {
      const tracking = new URL(item.Url);
      if (tracking.protocol !== 'https:' || tracking.hostname !== 'click-and-boat.pxf.io' || tracking.username || tracking.password) continue;
      const target = new URL(tracking.searchParams.get('u'));
      if (target.protocol !== 'https:' || !['clickandboat.com', 'www.clickandboat.com'].includes(target.hostname) || target.username || target.password) continue;
      trackingLinks++;
      const match = target.pathname.match(/^\/en\/boat-rental\/([a-z0-9-]{1,64})\//);
      if (match) destinations.add(match[1]);
    } catch { /* No guessed destination or attribution. */ }
  }
  const total = Number(data['@total']);
  return { sampledItems: items.length, totalItems: Number.isSafeInteger(total) && total >= 0 ? total : null, populatedFields: fields, trackedClickAndBoatLinks: trackingLinks, sampleDestinationSlugs: [...destinations].sort(), scope: 'First page only; destinations are URL slugs, not verified Greek locations.', availability: 'Catalog stock is not availability for travel dates.' };
}

async function impact(path, env) {
  const sid = String(env.IMPACT_ACCOUNT_SID).trim();
  const token = String(env.IMPACT_ACCESS_TOKEN).trim();
  if (!/^[A-Za-z0-9]+$/.test(sid) || !/^[\x21-\x7E]+$/.test(token)) {
    const error = new Error('Invalid credential format');
    error.safeCode = 'credential_format';
    throw error;
  }
  let response;
  try {
    response = await fetch(`https://api.impact.com/Mediapartners/${encodeURIComponent(sid)}/Catalogs/${IMPACT_CATALOG}${path}`, {
      headers: { Authorization: 'Basic ' + btoa(`${sid}:${token}`), Accept: 'application/json' },
      redirect: 'manual', signal: AbortSignal.timeout(15000)
    });
  } catch (cause) {
    const error = new Error('Impact request failed');
    error.safeCode = ['TimeoutError', 'AbortError'].includes(cause?.name) ? 'timeout' : 'network_or_redirect';
    throw error;
  }
  if (!response.ok) {
    const error = new Error('Impact unavailable');
    error.upstreamStatus = response.status;
    if (response.status >= 300 && response.status < 400) error.safeCode = 'upstream_redirect';
    throw error;
  }
  try { return await response.json(); } catch {
    const error = new Error('Impact returned invalid JSON');
    error.safeCode = 'invalid_json';
    throw error;
  }
}

async function impactCheck(request, env, origin) {
  if (request.method !== 'GET') return reply({ error: 'Method not allowed' }, 405, origin);
  if (!env.IMPACT_ACCOUNT_SID || !env.IMPACT_ACCESS_TOKEN || !env.SEARCH_LIMIT?.limit) return reply({ connected: false, error: 'Impact setup incomplete' }, 503, origin);
  const { success } = await env.SEARCH_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) return reply({ error: 'Please try again shortly' }, 429, origin);
  // Cache only a safe summary. Never cache or return credential-bearing API URIs.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.IMPACT_ACCOUNT_SID}:${env.IMPACT_ACCESS_TOKEN}`));
  const key = new Request(new URL('/internal-impact-check/' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''), request.url));
  const cache = globalThis.caches?.default;
  try {
    const hit = await cache?.match(key);
    if (hit) return reply(await hit.json(), 200, origin);
  } catch { /* Cache failure must not prevent the API check. */ }
  let stage = 'catalog';
  try {
    const catalog = await impact('', env);
    if (!catalog || String(catalog.Id) !== IMPACT_CATALOG || String(catalog.CampaignId) !== IMPACT_PROGRAM) return reply({ connected: false, stage, code: 'catalog_identity', error: 'Unexpected Click&Boat catalog' }, 502, origin);
    stage = 'items';
    const data = await impact('/Items?Page=1&PageSize=25', env);
    if (!data || !Array.isArray(data.Items)) return reply({ connected: false, stage, code: 'items_schema', error: 'Unexpected catalog item format', hasItems: Boolean(data && Object.hasOwn(data, 'Items')), itemsType: data?.Items === null ? 'null' : typeof data?.Items }, 502, origin);
    const summary = { connected: true, catalogId: IMPACT_CATALOG, programId: IMPACT_PROGRAM, catalog: 'CAB_EN_GS', checkedAt: new Date().toISOString(), ...impactCoverage(data) };
    try {
      if (cache) await cache.put(key, Response.json(summary, { headers: { 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex' } }));
    } catch { /* Successful authentication remains successful without caching. */ }
    return reply(summary, 200, origin);
  } catch (error) {
    const messages = { 401: 'Impact credentials rejected', 403: 'Impact access or scopes denied', 404: 'Click&Boat catalog not accessible', 429: 'Impact rate limit reached' };
    const codes = { credential_format: 'Impact credential format is invalid', timeout: 'Impact request timed out', network_or_redirect: 'Impact connection failed or redirected', upstream_redirect: 'Impact redirected the API request; redirect not followed', invalid_json: 'Impact response was not valid JSON' };
    return reply({ connected: false, stage, code: error.safeCode || (error.upstreamStatus ? 'upstream_http' : 'check_failed'), ...(error.upstreamStatus ? { upstreamStatus: error.upstreamStatus } : {}), error: messages[error.upstreamStatus] || codes[error.safeCode] || 'Impact check temporarily unavailable' }, 502, origin);
  }
}

const EVENT_NAMES = ['advisor_open', 'search_submit', 'results_view', 'no_results', 'search_error', 'affiliate_click'];
export function interaction(data) {
  const keys = ['v', 'name', 'source', 'placement', 'kind', 'productCode', 'count'];
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(k => !keys.includes(k)) || data.v !== 1 || !EVENT_NAMES.includes(data.name) || !['direct', 'wine-santorini', 'boat-milos', 'article'].includes(data.source) || !['article', 'concierge'].includes(data.placement) || !['boat', 'wine', 'none'].includes(data.kind) || typeof data.productCode !== 'string' || !/^[A-Za-z0-9_-]{0,40}$/.test(data.productCode) || !Number.isInteger(data.count) || data.count < 0 || data.count > 3) throw new Error('Invalid event');
  return { v: 1, name: data.name, source: data.source, placement: data.placement, kind: data.kind, productCode: data.productCode, count: data.count };
}
async function eventRequest(request, env, origin) {
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405, origin);
  if (env.INTERACTIONS_ENABLED !== 'true' || !env.INTERACTIONS?.writeDataPoint || !env.EVENT_LIMIT?.limit) return reply({ error: 'Events disabled' }, 503, origin);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({ error: 'JSON required' }, 415, origin);
  const { success } = await env.EVENT_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) return reply({ error: 'Please try again shortly' }, 429, origin);
  try {
    // Bound actual streamed bytes before decoding; no raw request logging.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: 'Invalid event' }, 400, origin);
    let size = 0; const chunks = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 512) { await reader.cancel(); return reply({ error: 'Request too large' }, 413, origin); } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const e = interaction(JSON.parse(new TextDecoder().decode(bytes)));
    env.INTERACTIONS.writeDataPoint({ indexes: [e.name], blobs: [String(e.v), e.source, e.placement, e.kind, e.productCode], doubles: [e.count] });
    return new Response(null, { status: 204, headers: headers(origin) });
  } catch { return reply({ error: 'Invalid event or collector unavailable' }, 400, origin); }
}

export default {
  async fetch(request, env) {
    const route = new URL(request.url).pathname;
    const origin = request.headers.get('Origin') || '';
    if (route === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    const ready = Boolean(env.VIATOR_API_KEY && env.SEARCH_LIMIT?.limit);
    if (route === '/health' && request.method === 'GET') return reply({ ready }, 200, origin);
    // A browser can open this fixed diagnostic URL directly; no raw catalog content.
    if (route === '/impact/check' && (!origin || origin === SITE)) return impactCheck(request, env, origin);
    if (origin !== SITE) return reply({ error: 'Origin not allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers(origin), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    if (route === '/events') return eventRequest(request, env, origin);
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
      const coversEnabled = env.SUPPLIER_COVERS_ENABLED === 'true';
      // Live search model: no stored image metadata or stale search fallback.
      const data = coversEnabled ? await viator('/products/search', env, body) : await cached(request, env, '/products/search', 900, body);
      return reply({ products: recommendations(data.products || [], pref, coversEnabled) }, 200, origin);
    } catch {
      // Never return upstream bodies, request headers or API credentials.
      return reply({ error: 'Search temporarily unavailable' }, 502, origin);
    }
  }
};
