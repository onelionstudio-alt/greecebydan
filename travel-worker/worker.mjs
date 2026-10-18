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
  const culture = data?.kind === 'culture';
  const transfer = data?.kind === 'transfer';
  const food = data?.kind === 'food';
  if((culture || food || transfer) && Object.keys(data).some(k=>!['kind','destination','style','mood','budget','cancellation'].includes(k))) throw new Error('Invalid Culture fields');
  const moods = transfer ? ['airport_city','city_airport','airport_port','port_airport','daytrip'] : food ? ['walk','cooking','tasting'] : culture ? ['guided'] : data?.kind === 'boat' ? ['sunset','swimming'] : ['food','vineyard'];
  if (!data || typeof data !== 'object' || Array.isArray(data) || !['boat','wine','culture','food','transfer'].includes(data.kind) || !/^\d{1,8}$/.test(data.destination) || !['any','private',...((culture||food||transfer)?['shared']:[])].includes(data.style) || !['any',...moods].includes(data.mood) || !['0','75','150','300'].includes(String(data.budget)) || typeof data.cancellation !== 'boolean') throw new Error('Invalid preferences');
  return {kind:data.kind,destination:data.destination,style:data.style,mood:data.mood,budget:Number(data.budget),cancellation:data.cancellation};
}

export function category(tags, kind) {
  if (kind === 'culture') {
    for (const name of ['Historical Tours','Archaeology Tours','Cultural Tours']) {
      const matches = tags.filter(t => (t.allNamesByLocale?.en || t.allNamesByLocale?.['en-US'] || '').toLowerCase() === name.toLowerCase());
      if (matches.length === 1) return matches[0].tagId;
      if (matches.length > 1) throw new Error('Ambiguous Culture taxonomy');
    }
    throw new Error('Culture taxonomy unavailable');
  }
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
    const reasons = [pref.kind === 'culture' ? 'Check the included services and option conditions on Viator.' : pref.kind === 'boat' ? 'The listing mentions a captain or crew.' : 'The listing explicitly describes wine tasting. Confirm inclusions for your selected option on Viator.'];
    if (pref.style === 'private') reasons.push('Listed as a private experience.');
    if (pref.mood !== 'any') reasons.push({ sunset: 'Sunset is mentioned in the listing.', swimming: 'Swimming or snorkelling is mentioned.', food: 'Food or a pairing is mentioned.', vineyard: 'A winery or vineyard is mentioned.' }[pref.mood]);
    if (pref.cancellation) reasons.push('Listed with free cancellation; check the deadline.');
    return [{ productCode: p.productCode, ...cardDetails(p), supplierCover: supplierCoversEnabled ? supplierCover(p) : null, title: p.title, url: p.productUrl, currency: p.pricing.currency, selectionEvidence: selectionEvidence(p, pref), fromPrice: price, priceBasis: priceBasis(p), rating, reviews, reason: reasons.join(' '), score: rating * Math.min(1, Math.log10(reviews + 1) / 2) }];
  }).sort((a, b) => b.score - a.score || a.fromPrice - b.fromPrice).slice(0, 3).map(({ score, ...p }) => p);
}

// Food adapter is bundled into the existing Worker; no new upstream endpoints.
export const FOOD_PLACES = Object.freeze(['Athens', 'Naxos', 'Crete']);
const array = v => Array.isArray(v) ? v : [];
const text = v => typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
const uncertain = /\b(?:no|not|without|optional|extra|additional|request|surcharge|may|might|could|can|depending|subject|excluded|unavailable|demonstration|watch(?:ing)?|separately|fee|cost|if)\b/i;
const patterns = {
  cooking: /\b(?:hands[- ]on cooking|cooking (?:class(?:es)?|lesson(?:s)?|workshop)|(?:you|guests|participants) (?:will )?(?:cook|prepare (?:the |your |a )?(?:meal|dishes|food)))\b/i,
  walk: /\b(?:food (?:and culinary )?walking (?:tour|experience)|(?:guided )?(?:food|culinary) walk|walking food tour)\b/i,
  tasting: /\b(?:food(?:\s*(?:&|and)\s*drink)? tastings?|tastings? of (?:Greek |local )?(?:food|delicacies|specialties))\b/i
};
export function foodTag(tags, mood, place) {
  const label = mood === 'cooking' || (mood === 'any' && place !== 'Athens') ? 'Cooking Classes' : 'Food Tours';
  const name = t => t.allNamesByLocale?.en || t.allNamesByLocale?.['en-US'] || '';
  const roots = tags.filter(t => name(t) === 'Food & Drink' && !array(t.parentTagIds).length);
  if (roots.length !== 1) throw new Error('Food taxonomy unavailable');
  const matches = tags.filter(t => name(t) === label && array(t.parentTagIds).includes(roots[0].tagId));
  if (matches.length !== 1) throw new Error('Ambiguous Food taxonomy');
  return matches[0].tagId;
}
export function foodConditions(p, common, checkedAt = new Date().toISOString()) {
  const options = array(p?.productOptions), inc = array(p?.inclusions), exc = array(p?.exclusions);
  if (p?.status !== 'ACTIVE' || !common || options.length < 1 || options.length > 20 ||
      [...inc, ...exc].some(i => typeof i.otherDescription === 'string' && i.otherDescription.length > 2000)) return null;
  const itinerary = p.itinerary;
  // The ACTIVITY description is documented; menus alone never establish cooking.
  const description = itinerary?.itineraryType === 'ACTIVITY' ? text(itinerary.activityInfo?.description) : '';
  if (description.length > 6000) return null;
  const fields = inc.map(i => ({field:'inclusions', value:text(i.otherDescription)}));
  if (description) fields.push({field:'itinerary.activityInfo.description', value:description});
  if(options.some(o=>typeof o.description==='string'&&o.description.length>2000))return null;
  const scopeTitles = options.map(o => [text(o.title),text(o.description)].filter(Boolean).join('. '));
  const facts = [];
  const activities = [];
  for (const [activity, pattern] of Object.entries(patterns)) {
    // Check every complete source for contradictions, not just a matching excerpt.
    const relevant = [...fields.map(f => f.value), ...exc.map(i => text(i.otherDescription)), ...scopeTitles];
    const topic=({cooking:/\b(?:cook(?:ing)?|prepar(?:e|ing)|class|lesson|workshop)\b/i,walk:/\bwalk(?:ing)?\b/i,tasting:/\btast(?:e|ing|ings)\b/i})[activity];
    const conflict = exc.some(i => topic.test(text(i.otherDescription))) || relevant.some(v =>
      topic.test(v) && uncertain.test(v));
    const optionConflict = activity === 'cooking' && scopeTitles.some(t => /tasting[- ]only|demonstration|self[- ]guided|dinner[- ]only/i.test(t));
    const proof = fields.find(f => pattern.test(f.value) && !uncertain.test(f.value));
    if (!proof || conflict || optionConflict) continue;
    activities.push(activity);
    facts.push({code:'food_'+activity,evidence:{source:'viator_product',productCode:p.productCode,checkedAt,field:proof.field,value:activity.toUpperCase()+'_LISTED'}});
  }
  if (!activities.length) return null;
  const languageEntries = o => array(o.languageGuides === undefined ? p.languageGuides : o.languageGuides)
    .filter(g => g?.type === 'GUIDE' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(g.language || '')).map(g => g.language);
  const scopes = options.map(languageEntries);
  const languages = [...new Set(scopes[0])].filter(l => scopes.every(s => s.includes(l))).sort().slice(0,12);
  // Option titles also contradict privateTour even when the overall product is private.
  const group = (common.group === 'private' && scopeTitles.some(t => /small[- ]group|shared|group tour/i.test(t))) || (common.group === 'shared' && scopeTitles.some(t=>/\bprivate\b/i.test(t))) ? 'unknown' : common.group;
  return {version:1,checkedAt,activities,languages,group,groupSize:group==='shared'?common.groupSize:null,pickup:common.pickup,
    dietary:'not_confirmed',ingredients:'not_confirmed',cancellationType:scopeTitles.some(t=>/non[- ]refundable|no refunds|all sales final/i.test(t))?'unknown':['STANDARD','CUSTOM','ALL_SALES_FINAL'].includes(p.cancellationPolicy?.type)?p.cancellationPolicy.type:'unknown',facts};
}

// Culture uses fresh single-product content, never summaries as proof of inclusions.
export const CULTURE_PLACES = Object.freeze({Athens:'acropolis',Delphi:'(?:delphi|deplhi)',Meteora:'meteora'});
const list = value => Array.isArray(value) ? value : [];
const boundedText = value => typeof value === 'string' ? value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,2000) : '';
export function cultureConditions(product, checkedAt = new Date().toISOString()) {
  if (product?.status !== 'ACTIVE' || !/^[A-Za-z0-9_-]{1,40}$/.test(product.productCode || '')) return null;
  const options = list(product.productOptions);
  if (options.length > 20) return null; // No partial option inspection.
  const includes = list(product.inclusions), excludes = list(product.exclusions);
  const guideText = includes.map(i => boundedText(i.otherDescription));
  const inspectable = options.length>0 && [...includes,...excludes].every(i=>typeof i.otherDescription!=='string'||i.otherDescription.length<=2000);
  const guideExcluded = excludes.some(i => /guid(?:e|ed|ing)/i.test(boundedText(i.otherDescription)));
  const uncertain = /\b(?:no|not|without|optional|extra|additional|request|surcharge|depending|subject|cannot|can't)\b/i;
  const explicitGuide = guideText.some(t => /\b(?:(?:licensed|professional|expert|local)\s+(?:(?:professional|licensed|tour|local)\s+){0,3}guide|tour guide)\b/i.test(t) && !uncertain.test(t));
  // Explicit included English-speaking human guide is evidence too. Keep this
  // separate from generic GUIDE metadata, drivers, leaders and title mentions.
  const englishGuide = guideText.some(t => /\benglish\s*[-–—]?\s*speaking\s+(?:tour\s+)?guide\b/i.test(t) && !uncertain.test(t) && !/\b(?:driver|leader|escort|audio|excluded|unavailable|available|arranged|may|might|could|can|separately|fee|cost|payable|if)\b/i.test(t));
  const optionGuideConflict = options.some(o => /audio|self[- ]guided|driver[- ]only|without (?:a )?guide/i.test(boundedText(o.title)));
  const languageEntries = option => list(option?.languageGuides === undefined ? product.languageGuides : option.languageGuides).filter(g => g?.type === 'GUIDE' && /^[a-z]{2}(?:-[A-Z]{2})?$/.test(g.language || '')).map(g => g.language);
  const scopes = options.length ? options.map(languageEntries) : [languageEntries(product)];
  const languages = [...new Set(scopes[0] || [])].filter(l => scopes.every(s => s.includes(l))).sort().slice(0,12);
  const guide = inspectable && (explicitGuide || (englishGuide && languages.includes('en'))) && !guideExcluded && !optionGuideConflict && languages.length > 0;
  const titles = options.map(o => boundedText(o.title));
  const privateConflict = titles.some(t => /\bshared|small[- ]group|group tour\b/i.test(t));
  const sharedConflict = titles.some(t => /\bprivate\b/i.test(t));
  const group = !inspectable ? 'unknown' : product.itinerary?.privateTour === true && !privateConflict ? 'private' : product.itinerary?.privateTour === false && !sharedConflict ? 'shared' : 'unknown';
  const max = product.itinerary?.maxTravelersInSharedTour;
  const listedMaxima=[boundedText(product.title),...titles,...guideText].flatMap(t=>[...t.matchAll(/\b(?:max(?:imum)?\.?|up to)\s*(\d{1,3})\b/gi)].map(m=>Number(m[1])));
  const groupSize = group === 'shared' && Number.isInteger(max) && max > 0 && max <= 1000 && listedMaxima.every(n=>n===max) ? max : null;
  const pickups = options.length ? options.map(o => o.logistics === undefined ? product.logistics : o.logistics) : [product.logistics];
  const methods = pickups.map(l => l?.travelerPickup?.pickupOptionType || 'UNKNOWN');
  const method = methods.every(m => m === methods[0]) ? methods[0] : 'OPTION_DEPENDENT';
  const pickup = ({MEET_EVERYONE_AT_START_POINT:'meeting_point',PICKUP_EVERYONE:'pickup_listed',PICKUP_AND_MEET_AT_START_POINT:'pickup_or_meeting',OPTION_DEPENDENT:'option_dependent'})[method] || 'unknown';
  const effortTypes = [...new Set(list(product.additionalInfo).map(i => i.type).filter(t => ['PHYSICAL_EASY','PHYSICAL_MEDIUM','PHYSICAL_HARD'].includes(t)))];
  const effort = effortTypes.length === 1 ? ({PHYSICAL_EASY:'easy',PHYSICAL_MEDIUM:'moderate',PHYSICAL_HARD:'hard'})[effortTypes[0]] : 'unknown';
  const feesExcluded = excludes.some(i => ['ENTRANCE_FEES','ADMISSION_FEES'].includes(i.type) || /\b(?:entrance|admission|tickets?)[\s-]*(?:fees?|to|for|$)/i.test(boundedText(i.otherDescription)));
  const stops = list(product.itinerary?.itineraryItems);
  // Never turn all-fees text or a ticket format into an all-sites inclusion promise.
  const admission = feesExcluded || stops.some(s => s.admissionIncluded === 'NO' && s.passByWithoutStopping !== true) ? 'some_not_included' : 'unknown';
  const facts = [];
  const add = (code,field,value) => facts.push({code,evidence:{source:'viator_product',productCode:product.productCode,checkedAt,field,value}});
  if (guide) add('culture_guide','inclusions','GUIDE_INCLUDED');
  if (group !== 'unknown') add('culture_'+group,'itinerary.privateTour',group === 'private' ? 'true' : 'false');
  if (effort === 'moderate' || effort === 'hard') add('culture_'+effort,'additionalInfo',effort === 'moderate' ? 'PHYSICAL_MEDIUM' : 'PHYSICAL_HARD');
  return {version:1,checkedAt,guide:guide?'included':'not_confirmed',languages:guide?languages:[],group,groupSize,pickup,effort,admission,facts};
}
export function cultureCandidates(products, pref, place) {
  const topic = CULTURE_PLACES[place];
  if (!topic) return [];
  const seen = new Set();
  return list(products).filter(p => {
    if (!p || !/^[A-Za-z0-9_-]{1,40}$/.test(p.productCode || '') || seen.has(p.productCode) || (p.status !== undefined && p.status !== 'ACTIVE')) return false;
    const title = boundedText(p.title), content = `${title}. ${boundedText(p.description)}`;
    if (!new RegExp('\\b'+topic+'\\b','i').test(content)) return false;
    if (/e[- ]?bike|bicycl|cycling|photo(?:graphy)? tour|rock climb|hiking|food tour|wine tasting|cooking|virtual reality|audio[- ]?guide|self[- ]guided|ticket(?:s)?[- ]only/i.test(title)) return false;
    if (pref.mood === 'guided' && /driver[- ]only|not licensed|cannot (?:enter|accompany)|guide (?:is )?(?:optional|on request)/i.test(content)) return false;
    if (!Number.isFinite(p.pricing?.summary?.fromPrice) || p.pricing.summary.fromPrice < 0 || p.pricing.currency !== 'EUR' || (pref.budget && p.pricing.summary.fromPrice > pref.budget)) return false;
    if (pref.cancellation && !p.flags?.includes('FREE_CANCELLATION')) return false;
    try { const u = new URL(p.productUrl); if (u.protocol !== 'https:' || !['viator.com','www.viator.com'].includes(u.hostname) || u.username || u.password) return false; } catch { return false; }
    seen.add(p.productCode); return true;
  }).slice(0,12);
}
export async function cultureSearch(products,pref,place,coversEnabled,detail) {
  const candidates = cultureCandidates(products,pref,place), eligible = [], conditions = new Map();
  // Up to twelve fresh details, two at a time, under the shared 28s deadline.
  // Still at most three results; no retries, stale content or extra pages.
  for (let i=0;i<candidates.length;i+=2) {
    const batch = await Promise.all(candidates.slice(i,i+2).map(async summary => {
      const p = await detail(summary.productCode);
      if (p?.productCode !== summary.productCode) throw new Error('Product identity mismatch');
      const c = cultureConditions(p);
      if (!c || (pref.mood === 'guided' && c.guide !== 'included') || (pref.style !== 'any' && c.group !== pref.style)) return null;
      return {summary:{...summary,status:p.status,images:p.images},conditions:c};
    }));
    for (const match of batch) if (match) { eligible.push(match.summary);conditions.set(match.summary.productCode,match.conditions); }
  }
  return recommendations(eligible,{...pref,style:'any',mood:'any'},coversEnabled).map(p => {
    const c = conditions.get(p.productCode);
    return {...p,category:'culture',culture:{...c,facts:undefined},selectionEvidence:[...p.selectionEvidence,...c.facts],reason:'Compare the listed guide, group and admission conditions before booking.'};
  });
}

export async function foodSearch(products,pref,place,coversEnabled,detail) {
  if (!FOOD_PLACES.includes(place)) return [];
  const seen=new Set(), candidates=list(products).filter(p=>{
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(p?.productCode||'') || seen.has(p.productCode)) return false;
    seen.add(p.productCode);
    return (p.status===undefined||p.status==='ACTIVE') && Number.isFinite(p.pricing?.summary?.fromPrice) && p.pricing.currency==='EUR' && p.pricing.summary.fromPrice>=0 && (!pref.budget||p.pricing.summary.fromPrice<=pref.budget) && (!pref.cancellation||p.flags?.includes('FREE_CANCELLATION'));
  }).slice(0,12), eligible=[], conditions=new Map();
  for(let i=0;i<candidates.length;i+=2) {
    const batch=await Promise.all(candidates.slice(i,i+2).map(async s=>{
      const p=await detail(s.productCode);
      if(p?.productCode!==s.productCode)throw new Error('Product identity mismatch');
      const c=foodConditions(p,cultureConditions(p));
      if(!c || (pref.cancellation&&c.cancellationType!=='STANDARD') || (pref.mood!=='any'&&!c.activities.includes(pref.mood)) || (pref.style!=='any'&&c.group!==pref.style))return null;
      return {summary:{...s,status:p.status,images:p.images},conditions:c};
    }));
    for(const match of batch)if(match){eligible.push(match.summary);conditions.set(match.summary.productCode,match.conditions)}
  }
  return recommendations(eligible,{...pref,style:'any',mood:'any'},coversEnabled).map(p=>{
    const c=conditions.get(p.productCode);
    return {...p,category:'food',food:{...c,facts:undefined},selectionEvidence:[...p.selectionEvidence,...c.facts],reason:'Compare the listed activity and option conditions before booking.'};
  });
}

// Transfers use the existing bounded Live API model and card/URL rules.
export function transferTag(tags,mood) {
  const name=t=>(t.allNamesByLocale?.en||t.allNamesByLocale?.['en-US']||'').trim();
  const day=mood==='daytrip', label=day?'Day Trips':['airport_port','port_airport'].includes(mood)?'Port Transfers':'Airport & Hotel Transfers';
  const roots=tags.filter(t=>(day?['Tours by Duration','Tours, Sightseeing & Cruises']:['Transfers']).includes(name(t)));
  const matches=tags.filter(t=>name(t)===label&&roots.some(r=>list(t.parentTagIds).includes(r.tagId)));
  if(matches.length!==1)throw new Error('Transfer taxonomy unavailable or ambiguous');
  return matches[0].tagId;
}
export function transferRoute(value) {
  if(typeof value!=='string'||value.length>2000)return 'unknown';
  const t=boundedText(value);
  if(/\b(?:or|either|optional|request|not|without)\b|\//i.test(t))return 'unknown';
  const airport='(?:Athens(?: International)? Airport|ATH Airport)',city='Athens (?:city(?: cent(?:re|er))?|cent(?:re|er))',port='Piraeus (?:cruise )?port';
  const found=[];
  for(const [route,a,b] of [['airport_city',airport,city],['city_airport',city,airport],['airport_port',airport,port],['port_airport',port,airport]])
    if(new RegExp('\\b(?:from\\s+)?'+a+'\\s+(?:to|→)\\s+'+b+'\\b','i').test(t))found.push(route);
  return found.length===1?found[0]:'unknown';
}
export function transferConditions(p,tagId,dayTrip,checkedAt=new Date().toISOString()) {
  const common=cultureConditions(p,checkedAt),options=list(p?.productOptions),inc=list(p?.inclusions),exc=list(p?.exclusions);
  if(!common||!list(p.tags).includes(tagId)||options.length<1||options.length>20||[...inc,...exc].some(i=>typeof i.otherDescription==='string'&&i.otherDescription.length>2000)||options.some(o=>[o.title,o.description].some(t=>typeof t==='string'&&t.length>2000)))return null;
  const transportTypes=['PRIVATE_TRANSPORTATION','AIR_CONDITIONED_VEHICLE','PUBLIC_TRANSPORTATION'];
  const transportText=/\b(?:private transportation|air[- ]conditioned (?:vehicle|van|bus)|(?:one[- ]way|round[- ]trip) transfer)\b/i;
  const transport=inc.find(i=>transportTypes.includes(i.type)||(transportText.test(boundedText(i.otherDescription))&&!uncertain.test(boundedText(i.otherDescription))));
  if(!transport||exc.some(i=>transportTypes.includes(i.type)||/\b(?:transportation|vehicle|transfers?)\b/i.test(boundedText(i.otherDescription))))return null;
  const scopes=options.map(o=>[boundedText(o.title),boundedText(o.description)].filter(Boolean).join('. '));
  if(inc.some(i=>transportTypes.includes(i.type)&&uncertain.test(boundedText(i.otherDescription)))||scopes.some(t=>/\b(?:transport(?:ation)?|vehicle|transfer)\b/i.test(t)&&/\b(?:no|without|optional|extra|additional|request)\b.{0,60}\b(?:transport(?:ation)?|vehicle|transfer)\b|\b(?:transport(?:ation)?|vehicle|transfer)\b.{0,60}\b(?:not included|optional|extra|additional|request|excluded)\b/i.test(t)))return null;
  const group=(common.group==='private'&&scopes.some(t=>/\bshared|small[- ]group|group tour\b/i.test(t)))||(common.group==='shared'&&scopes.some(t=>/\bprivate\b/i.test(t)))?'unknown':common.group;
  const routes=options.map(o=>transferRoute([o.title,o.description].filter(Boolean).join('. ')));
  let route=routes.every(r=>r===routes[0])?routes[0]:'unknown';
  const itinerary=p.itinerary;
  if(dayTrip) {
    const d=cardDetails({duration:itinerary?.duration}).durationMinutes;
    if(itinerary?.itineraryType!=='STANDARD'||!d||d.max>1440||!list(itinerary.itineraryItems).length)return null;
    const includedAthensPickup=inc.some(i=>/\b(?:pick[- ]?up|departure)\b.{0,60}\b(?:from|in) Athens\b/i.test(boundedText(i.otherDescription))&&!uncertain.test(boundedText(i.otherDescription)));
    const starts=options.map(o=>list((o.logistics===undefined?p.logistics:o.logistics)?.start));
    const commonStart=starts.every(rows=>rows.some(r=>/^(?:(?:meeting|departure|pickup)(?: point)?[ :,-]+)?Athens\b/i.test(boundedText(r.description))&&!uncertain.test(boundedText(r.description))));
    const pickupConflict=scopes.some(t=>/without (?:a )?pickup|no (?:hotel )?pickup|pickup (?:is )?(?:not included|optional)|(?:depart|start|pickup) from Thessaloniki|meet (?:at|in) (?:Delphi|Meteora)/i.test(t));
    if(pickupConflict||(!commonStart&&!(includedAthensPickup&&options.every(o=>o.logistics===undefined))))return null;
    route='athens_daytrip';
  }else if(itinerary?.itineraryType!=='UNSTRUCTURED'||list(itinerary?.itineraryItems).length||/sightseeing|guided (?:city )?tour|multi[- ]day|visit (?:the )?(?:acropolis|delphi|meteora)/i.test([itinerary.unstructuredDescription,itinerary.unstructuredItinerary].filter(Boolean).join(' ')))return null;
  const facts=[{code:'transfer_transport',evidence:{source:'viator_product',productCode:p.productCode,checkedAt,field:'inclusions',value:'TRANSPORT_LISTED'}}];
  if(route!=='unknown')facts.push({code:'transfer_route',evidence:{source:'viator_product',productCode:p.productCode,checkedAt,field:dayTrip?'logistics.start/inclusions':'productOptions',value:route}});
  const cancellation=scopes.some(t=>/non[- ]refundable|no refunds|all sales final/i.test(t))?'unknown':p.cancellationPolicy?.type;
  return {version:1,checkedAt,type:dayTrip?'daytrip':'transfer',route,group,pickup:common.pickup,cancellationType:['STANDARD','CUSTOM','ALL_SALES_FINAL'].includes(cancellation)?cancellation:'unknown',capacity:'not_confirmed',luggage:'not_confirmed',childSeats:'not_confirmed',delayWaiting:'not_confirmed',operatingHours:'not_confirmed',facts};
}
export async function transferSearch(products,pref,place,coversEnabled,detail,tagId) {
  if(place!=='Athens')return [];
  const seen=new Set(),candidates=list(products).filter(p=>{
    if(!/^[A-Za-z0-9_-]{1,40}$/.test(p?.productCode||'')||seen.has(p.productCode))return false;
    seen.add(p.productCode);
    return (p.status===undefined||p.status==='ACTIVE')&&Number.isFinite(p.pricing?.summary?.fromPrice)&&p.pricing.currency==='EUR'&&p.pricing.summary.fromPrice>=0&&(!pref.budget||p.pricing.summary.fromPrice<=pref.budget)&&(!pref.cancellation||p.flags?.includes('FREE_CANCELLATION'));
  }).slice(0,12),eligible=[],conditions=new Map();
  for(let i=0;i<candidates.length;i+=2){
    const batch=await Promise.all(candidates.slice(i,i+2).map(async s=>{
      const p=await detail(s.productCode);if(p?.productCode!==s.productCode)throw new Error('Product identity mismatch');
      const c=transferConditions(p,tagId,pref.mood==='daytrip');
      if(!c||(pref.style!=='any'&&c.group!==pref.style)||(pref.cancellation&&c.cancellationType!=='STANDARD')||(!['any','daytrip'].includes(pref.mood)&&c.route!==pref.mood))return null;
      return {summary:{...s,duration:p.itinerary?.duration,status:p.status,images:p.images},conditions:c};
    }));
    for(const match of batch)if(match){eligible.push(match.summary);conditions.set(match.summary.productCode,match.conditions)}
  }
  return recommendations(eligible,{...pref,style:'any',mood:'any'},coversEnabled).map(p=>{const c=conditions.get(p.productCode);return {...p,category:'transfer',transfer:{...c,facts:undefined},selectionEvidence:[...p.selectionEvidence,...c.facts],reason:'Confirm the exact route, pickup, luggage and timing before booking.'}});
}

async function viator(path, env, body, deadline) {
  if (deadline !== undefined && deadline <= Date.now()) throw new Error('Search deadline exceeded');
  const response = await fetch(BASE + path, { method: body ? 'POST' : 'GET', headers: { 'exp-api-key': env.VIATOR_API_KEY, 'Accept': 'application/json;version=2.0', 'Accept-Language': 'en-US', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(deadline === undefined ? 10000 : Math.min(10000,Math.max(1,deadline-Date.now()))) });
  if (!response.ok) throw new Error('Upstream unavailable');
  return response.json();
}

async function cached(request, env, path, ttl, body, deadline) {
  // Include a one-way key fingerprint so a rotated API key cannot reuse old data.
  const material = `${env.VIATOR_API_KEY}:${path}:${JSON.stringify(body || {})}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(material));
  const key = new Request(new URL('/internal-cache/' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join(''), request.url));
  const cache = globalThis.caches?.default;
  try { const hit = await cache?.match(key); if (hit) return await hit.json(); } catch { /* Cache is optional. */ }
  const data = await viator(path, env, body, deadline);
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
    const deadline = ['culture','food','transfer'].includes(pref?.kind) ? Date.now()+28000 : undefined;
    try {
      const raw = await cached(request, env, '/destinations', WEEK,undefined,deadline);
      const destinations = greekDestinations(raw.destinations || []);
      if (route === '/destinations') return reply({ destinations, capabilities:{...(env.TRANSFERS_ENABLED==='true'?{transfers:true,transferDestinations:destinations.filter(d=>d.name==='Athens')}:{}), ...(env.FOOD_ENABLED === 'true' ? {food:true,foodDestinations:destinations.filter(d=>FOOD_PLACES.includes(d.name))}:{}), ...(env.CULTURE_ENABLED === 'true' ? {culture:true,cultureDestinations:destinations.filter(d => Object.hasOwn(CULTURE_PLACES,d.name))} : {})} }, 200, origin);
      if(pref.kind==='transfer'&&env.TRANSFERS_ENABLED!=='true')return reply({error:'Transfers are not enabled'},400,origin);
      if (pref.kind === 'food' && env.FOOD_ENABLED !== 'true') return reply({error:'Food is not enabled'},400,origin);
      if (pref.kind === 'culture' && env.CULTURE_ENABLED !== 'true') return reply({error:'Culture is not enabled'},400,origin);
      if (!destinations.some(d => d.id === pref.destination)) return reply({ error: 'Choose a Greek destination' }, 400, origin);
      const place = destinations.find(d => d.id === pref.destination)?.name;
      if (pref.kind === 'culture' && !Object.hasOwn(CULTURE_PLACES,place)) return reply({error:'Choose Athens, Delphi or Meteora for Culture'},400,origin);
      if (pref.kind === 'food' && !FOOD_PLACES.includes(place)) return reply({error:'Choose Athens, Naxos or Crete for Food'},400,origin);
      if(pref.kind==='transfer'&&place!=='Athens')return reply({error:'Choose Athens for Transfers'},400,origin);
      const tags = await cached(request, env, '/products/tags', WEEK,undefined,deadline);
      const filtering = { destination: pref.destination, tags: [pref.kind==='transfer'?transferTag(tags.tags||[],pref.mood):pref.kind==='food'?foodTag(tags.tags||[],pref.mood,place):category(tags.tags || [], pref.kind)] };
      if (pref.budget) filtering.highestPrice = pref.budget;
      const flags = [];
      if (!['culture','food','transfer'].includes(pref.kind) && pref.style === 'private') flags.push('PRIVATE_TOUR');
      if (pref.cancellation) flags.push('FREE_CANCELLATION');
      if (flags.length) filtering.flags = flags;
      const body = { filtering, sorting: { sort: 'TRAVELER_RATING', order: 'DESCENDING' }, pagination: { start: 1, count: 50 }, currency: 'EUR' };
      const coversEnabled = env.SUPPLIER_COVERS_ENABLED === 'true';
      // Live search model: no stored image metadata or stale search fallback.
      const data = coversEnabled || ['culture','food','transfer'].includes(pref.kind) ? await viator('/products/search', env, body,deadline) : await cached(request, env, '/products/search', 900, body);
      if(pref.kind==='transfer'){
        const products=await transferSearch(data.products||[],pref,place,coversEnabled,code=>viator('/products/'+encodeURIComponent(code),env,undefined,deadline),filtering.tags[0]);
        return reply({products,limitedSelection:true,checkedAt:new Date().toISOString()},200,origin);
      }
      if (pref.kind === 'food') {
        const products=await foodSearch(data.products||[],pref,place,coversEnabled,code=>viator('/products/'+encodeURIComponent(code),env,undefined,deadline));
        return reply({products,limitedSelection:true,checkedAt:new Date().toISOString()},200,origin);
      }
      if (pref.kind === 'culture') {
        const products = await cultureSearch(data.products || [],pref,place,coversEnabled,code=>viator('/products/'+encodeURIComponent(code),env,undefined,deadline));
        return reply({products,limitedSelection:true,checkedAt:new Date().toISOString()},200,origin);
      }
      return reply({ products: recommendations(data.products || [], pref, coversEnabled) }, 200, origin);
    } catch {
      // Never return upstream bodies, request headers or API credentials.
      return reply({ error: 'Search temporarily unavailable' }, 502, origin);
    }
  }
};
