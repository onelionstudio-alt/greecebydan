/* API data is deliberately loaded only at runtime, outside indexable HTML. */
(() => {
  const photosEnabled = document.querySelector('meta[name="gbd-api-photos"]')?.content === 'enabled';
  const API = 'https://greecebydan-travel-api.onelion-studio.workers.dev';
  const form = document.querySelector('#concierge-form');
  const status = document.querySelector('#concierge-status');
  const results = document.querySelector('#concierge-results');
  const submit = form.querySelector('button');
  let context = null;
  const track = (name, extra = {}) => window.gbdEvent?.(name, { source: context?.source || 'direct', placement: 'concierge', kind: form.elements.kind.value, ...extra });
  let requestNumber = 0;
  let controller;
  function feedback(message, state = '', reveal = false) {
    status.textContent = message;
    status.dataset.state = state;
    if (reveal) status.scrollIntoView?.({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
  const node = (tag, text, parent) => {
    const el = document.createElement(tag);
    el.textContent = text;
    parent.append(el);
    return el;
  };
  const shortlist = new Set();
  let cards = [];
  const toolbar = node('div', '', results.parentNode); toolbar.className = 'concierge-compare-toolbar'; toolbar.hidden = true;
  results.before(toolbar);
  const compareHint = node('span', 'Choose two or three options to compare.', toolbar); compareHint.setAttribute('aria-live','polite');
  const compareButton = node('button', 'Compare selected (0)', toolbar); compareButton.type = 'button'; compareButton.disabled = true;
  const comparison = node('section', '', results.parentNode); comparison.className = 'concierge-comparison'; comparison.hidden = true;
  comparison.setAttribute('aria-labelledby', 'comparison-heading'); toolbar.after(comparison);
  compareButton.setAttribute('aria-controls', 'concierge-comparison'); comparison.id = 'concierge-comparison';
  const evidenceRules = {
    crew: { text: 'The listing mentions a captain or crew.', pattern: /^(captain|skipper|crew)$/i },
    wine_tasting: { text: 'The listing explicitly describes wine tasting.', pattern: /^(wine[ -]+tastings?|tastings? of (local |Greek )?wines?)$/i },
    private: { text: 'Listed as a private experience.', flag: 'PRIVATE_TOUR' },
    cancellation: { text: 'Listed with free cancellation; check the deadline.', flag: 'FREE_CANCELLATION' }
  };
  function evidenceFor(product) {
    if (!Array.isArray(product.selectionEvidence)) return [];
    const seen = new Set();
    return product.selectionEvidence.filter(fact => {
      if (!fact || !Object.hasOwn(evidenceRules, fact.code) || seen.has(fact.code)) return false;
      const rule = evidenceRules[fact.code], e = fact.evidence;
      if (e?.source !== 'viator_listing' || typeof e.value !== 'string' || e.value.length > 100) return false;
      const valid = rule.flag ? e.field === 'flags' && e.value === rule.flag : ['title', 'description'].includes(e.field) && rule.pattern.test(e.value);
      if (valid) seen.add(fact.code); return valid;
    }).slice(0, 4).map(fact => ({ ...fact, text: evidenceRules[fact.code].text }));
  }
  function normalise(product) {
    if (!product || typeof product.title !== 'string' || !product.title.trim() || typeof product.productCode !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(product.productCode)) return null;
    let target; try { target = new URL(product.url); } catch { return null; }
    if (target.protocol !== 'https:' || !['viator.com', 'www.viator.com'].includes(target.hostname) || target.username || target.password) return null;
    const d = product.durationMinutes;
    const duration = d && Number.isFinite(d.min) && Number.isFinite(d.max) && d.min > 0 && d.max >= d.min && d.max <= 43200 ? { min: d.min, max: d.max } : null;
    // Legacy Worker search validates EUR before returning its older DTO.
    const currency = product.currency === undefined ? 'EUR' : product.currency;
    const price = Number.isFinite(product.fromPrice) && product.fromPrice >= 0 && typeof currency === 'string' && /^[A-Z]{3}$/.test(currency) ? product.fromPrice : null;
    const rating = Number.isFinite(product.rating) && product.rating > 0 && product.rating <= 5 && Number.isInteger(product.reviews) && product.reviews > 0 ? { value: product.rating, count: product.reviews } : null;
    return { ...product, duration, currency, price, ratingInfo: rating, basis: ['per_person', 'per_group'].includes(product.priceBasis) ? product.priceBasis : 'unknown', facts: evidenceFor(product) };
  }
  const minutes = n => n % 60 === 0 ? `${n / 60} ${n === 60 ? 'hour' : 'hours'}` : `${n} minutes`;
  const durationText = c => c.duration ? (c.duration.min === c.duration.max ? minutes(c.duration.min) : `${minutes(c.duration.min)}–${minutes(c.duration.max)}`) : 'Check duration on Viator';
  const priceText = c => c.price === null ? 'Check price on Viator' : `From ${new Intl.NumberFormat('en-GB', {style:'currency',currency:c.currency}).format(c.price)}${c.basis === 'per_person' ? ' per person' : c.basis === 'per_group' ? ' per group' : ''}`;
  const ratingText = c => c.ratingInfo ? `${c.ratingInfo.value.toFixed(1)}/5 · ${c.ratingInfo.count} combined reviews` : 'Rating not supplied';
  function affiliateLink(c, parent) {
    const link = node('a', 'Check details & dates on Viator ↗', parent); link.className = 'concierge-book';
    link.href = c.url; link.target = '_blank'; link.rel = 'sponsored noopener noreferrer';
    link.setAttribute('aria-label', `Check details and dates on Viator for ${c.title} (opens a new tab)`);
    link.addEventListener('click', () => track('affiliate_click', {productCode:c.productCode})); return link;
  }
  function clearCards() { cards = []; shortlist.clear(); toolbar.hidden = true; comparison.hidden = true; comparison.replaceChildren(); results.replaceChildren(); }
  function selectionChanged() {
    compareButton.textContent = `Compare selected (${shortlist.size})`; compareButton.disabled = shortlist.size < 2;
    compareHint.textContent = shortlist.size ? `${shortlist.size} selected. Compare confirmed differences.` : 'Choose two or three options to compare.';
    comparison.hidden = true;
  }
  function compare() {
    const chosen = cards.filter(c => shortlist.has(c.productCode)); if (chosen.length < 2) return;
    comparison.replaceChildren();
    const heading = node('h3', 'What is different?', comparison); heading.id = 'comparison-heading'; heading.tabIndex = -1;
    const close = node('button', 'Back to options', comparison); close.type = 'button'; close.className = 'concierge-back';
    close.addEventListener('click', () => { comparison.hidden = true; compareButton.focus(); });
    const different = [], common = [], unknown = ['Meeting point, pickup, dates, availability and option-specific terms'];
    const consider = (label, values) => {
      if (values.some(v => v === null)) { unknown.push(label); return; }
      if (new Set(values).size > 1) different.push({label,values}); else common.push(`${label}: ${values[0]}`);
    };
    consider('Duration', chosen.map(c => c.duration ? durationText(c) : null));
    consider('Rating and review count', chosen.map(c => c.ratingInfo ? ratingText(c) : null));
    if (chosen.every(c => c.price !== null && c.basis !== 'unknown' && c.basis === chosen[0].basis && c.currency === chosen[0].currency)) consider('Starting price', chosen.map(priceText));
    else unknown.push('Comparable pricing unit and final party price — starting amounts are not compared');
    if (!different.length) node('p', 'No confirmed differences in the comparable fields returned. Check the full listings on Viator.', comparison);
    else {
      node('p', 'Only differing fields supplied for every selected option are shown. Ratings are not a suitability or safety assessment.', comparison).className = 'concierge-comparison-note';
      const grid = node('div', '', comparison); grid.className = 'concierge-differences'; grid.style.setProperty('--options', String(chosen.length));
      chosen.forEach((c,i) => { const item = node('article', '', grid); node('h4', c.title, item); const dl = node('dl', '', item); different.forEach(row => { node('dt', row.label, dl); node('dd', row.values[i], dl); }); affiliateLink(c,item); });
    }
    if (common.length) { const same = node('details','',comparison); node('summary','Same in these options',same); common.forEach(v => node('p',v,same)); }
    const check = node('p', `Not confirmed for every option: ${unknown.join('; ')}.`, comparison); check.className = 'concierge-unknowns';
    node('p', 'Source: listing data supplied by Viator. Compare the operator’s full conditions before booking.', comparison).className = 'concierge-source';
    comparison.hidden = false; heading.focus(); comparison.scrollIntoView({block:'start',behavior:'instant'});
  }
  compareButton.addEventListener('click', compare);
  function renderCards(products) {
    const seen = new Set();
    cards = products.map(normalise).filter(c => c && !seen.has(c.productCode) && seen.add(c.productCode)).slice(0,3);
    toolbar.hidden = cards.length < 2; selectionChanged();
    cards.forEach((c,index) => {
      const article = node('article','',results); article.className = 'concierge-result';
      const top = node('div','',article); top.className = 'concierge-card-top'; node('small', `Option ${index + 1}`,top);
      if (cards.length > 1) { const label = node('label','',top); label.className = 'concierge-compare-choice'; const input = node('input','',label); input.type = 'checkbox'; input.setAttribute('aria-label',`Compare ${c.title}`); node('span','Compare',label);
        input.addEventListener('change', () => { input.checked ? shortlist.add(c.productCode) : shortlist.delete(c.productCode); selectionChanged(); }); }
      if (photosEnabled && c.image) {
        try { const u = new URL(c.image.url); if (u.protocol === 'https:' && u.hostname === 'media.tacdn.com' && !u.username && !u.password && Number.isInteger(c.image.width) && Number.isInteger(c.image.height)) {
          const img = node('img','',article); img.className='concierge-photo'; img.alt=''; img.width=c.image.width; img.height=c.image.height; img.loading='lazy'; img.decoding='async'; img.referrerPolicy='no-referrer'; img.addEventListener('error',()=>img.remove(),{once:true}); img.src=c.image.url;
        } } catch { /* Optional media never blocks the text or link. */ }
      }
      node('h3', c.title, article);
      if (c.ratingInfo) node('p',ratingText(c),article).className = 'concierge-rating';
      const facts=node('dl','',article); facts.className='concierge-facts'; node('dt','Duration',facts); node('dd',durationText(c),facts); node('dt','Departure',facts); node('dd','Check meeting point on Viator',facts);
      if (c.facts.length) node('p',c.facts[0].text,article).className='concierge-reason';
      node('p',priceText(c),article).className='concierge-price';
      if (c.price !== null) node('p', c.basis === 'unknown' ? 'Price basis not confirmed. Check the final price on Viator.' : 'Indicative starting price. Check the final price for your dates and party.',article).className='concierge-price-note';
      affiliateLink(c,article);
      const details=node('details','',article); details.className='concierge-card-details'; node('summary','Details & things to check',details);
      node('p','Confirm the meeting point and any pickup on Viator. Check dates, party size, inclusions, age limits and cancellation terms for your selected option.',details);
      if (c.facts.length) { node('h4','Why shown · listing evidence',details); const list=node('ul','',details); c.facts.forEach(f => node('li',f.evidence.field === 'flags' ? `${f.text} Source: classification supplied by Viator.` : `${f.text} Source: Viator ${f.evidence.field} — “${f.evidence.value}”.`,list)); }
      node('p','Source: Viator listing data, not an independent inspection or suitability guarantee.',details).className='concierge-source';
    });
    return cards.length;
  }
  async function api(path, options = {}) {
    const requestController = new AbortController();
    const cancel = () => requestController.abort();
    const timeout = setTimeout(cancel, path === '/search' ? 35000 : 15000);
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    try {
      const response = await fetch(API + path, { ...options, signal: requestController.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!response.ok) { const error = new Error('Service unavailable'); error.status = response.status; throw error; }
      return await response.json();
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
  function moodOptions() {
    for (const option of form.elements.mood.options) {
      option.hidden = Boolean(option.dataset.for && option.dataset.for !== form.elements.kind.value);
      option.disabled = option.hidden;
    }
    if (form.elements.mood.selectedOptions[0].disabled) form.elements.mood.value = 'any';
  }
  function invalidate() {
    requestNumber++;
    controller?.abort();
    submit.disabled = false;
    clearCards();
    results.setAttribute('aria-busy', 'false');
    feedback('Choose your preferences, then find a few options.');
  }
  form.addEventListener('change', () => { moodOptions(); invalidate(); });
  for (const link of document.querySelectorAll('[data-kind]')) link.addEventListener('click', () => {
    form.elements.kind.value = link.dataset.kind;
    moodOptions();
    if (!form.hidden) invalidate();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    controller?.abort();
    controller = new AbortController();
    const id = ++requestNumber;
    clearCards();
    results.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    feedback('Searching Viator for your preferences…', 'loading', true);
    const values = Object.fromEntries(new FormData(form));
    values.cancellation = values.cancellation === 'on';
    track('search_submit');
    try {
      const data = await api('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: controller.signal });
      if (id !== requestNumber) return;
      if (!Array.isArray(data.products)) throw new Error('Invalid results');
      track(data.products.length ? 'results_view' : 'no_results', { count: Math.min(3, data.products.length) });
      if (data.products.length) {
        feedback(`${data.products.length} ${data.products.length === 1 ? 'option' : 'options'} to explore. Check the full details on Viator before booking.`, 'success', true);
      } else {
        const suggestions = [];
        if (values.budget !== '0') suggestions.push('a higher budget or “Any budget”');
        if (values.style === 'private') suggestions.push('“Open to suggestions” instead of a private trip');
        if (values.mood !== 'any') suggestions.push('“Show me a few ideas” for what matters most');
        feedback('Search complete — no clear matches in this set of results. ' + (suggestions.length ? 'Try ' + suggestions.join(', or ') + ', then search again.' : 'Try another destination, then search again.') + ' Your filters have not been changed.', 'empty', true);
      }
      const rendered = renderCards(data.products);
      if (rendered) feedback(`${rendered} ${rendered === 1 ? 'option' : 'options'} to explore. Check the full details on Viator before booking.`, 'success', true);
      if (data.products.length && !rendered) feedback('The returned listings could not be displayed safely. Please try again.', 'error', true);

    } catch (error) {
      if (id === requestNumber) {
        track('search_error');
        feedback(error.status === 429 ? 'Please wait a moment before searching again. Your preferences are saved.' : 'The search is unavailable just now. Your preferences are saved; use the search button to try again.', 'error', true);
      }
    } finally {
      if (id === requestNumber) { submit.disabled = false; results.setAttribute('aria-busy', 'false'); }
    }
  });
  (async () => {
    try {
      const [data, profiles] = await Promise.all([api('/destinations'), fetch('/assets/data/advisor-contexts.json').then(r => r.ok ? r.json() : []).catch(() => [])]);
      const params = new URLSearchParams(location.search);
      context = (Array.isArray(profiles?.profiles) ? profiles.profiles : []).find(p => ['source', 'kind', 'place', 'profile'].every(k => params.get(k) === p[k])) || null;
      if (context) form.elements.kind.value = context.kind;
      if (!data.destinations?.length) throw new Error('No destinations');
      for (const place of data.destinations) {
        const option = node('option', place.name, form.elements.destination);
        option.value = String(place.id);
      }
      form.hidden = false;
      const destination = context && data.destinations.find(p => p.name.toLowerCase() === context.place);
      if (destination) form.elements.destination.value = String(destination.id);
      feedback(destination ? 'Your destination and experience are selected. Choose any other preferences, then search.' : 'Choose a place to get started.');
      moodOptions();
    } catch {
      feedback('Destinations could not be loaded. Please reload this page to try again.', 'error');
    }
  })();
})();
