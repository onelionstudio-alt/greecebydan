/* API data is deliberately loaded only at runtime, outside indexable HTML. */
(() => {
  const supplierCoversEnabled = document.querySelector('meta[name="gbd-supplier-covers"]')?.content === 'enabled';
  let coverTimer;
  const API = 'https://greecebydan-travel-api.onelion-studio.workers.dev';
  const form = document.querySelector('#concierge-form');
  const status = document.querySelector('#concierge-status');
  const results = document.querySelector('#concierge-results');
  const submit = form.querySelector('button');
  let context = null;
  let cultureDestinations = new Set();
  let foodDestinations = new Set();
  let transferDestinations = new Set();
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
  const cultureRules = {
    culture_guide: {field:'inclusions',value:'GUIDE_INCLUDED',text:'Guide service listed as included; check site coverage.'},
    culture_private: {field:'itinerary.privateTour',value:'true',text:'Private itinerary listed.'},
    culture_shared: {field:'itinerary.privateTour',value:'false',text:'Shared-group itinerary listed.'},
    culture_moderate: {field:'additionalInfo',value:'PHYSICAL_MEDIUM',text:'The supplier lists moderate physical effort.'},
    culture_hard: {field:'additionalInfo',value:'PHYSICAL_HARD',text:'The supplier lists demanding physical effort.'}
  };
  const foodRules = {
    food_cooking:{value:'COOKING_LISTED',text:'A cooking activity is explicitly described by the supplier.'},
    food_walk:{value:'WALK_LISTED',text:'A food walking activity is described by the supplier.'},
    food_tasting:{value:'TASTING_LISTED',text:'Food tastings are explicitly described in the included activity.'}
  };
  const foodActivities={cooking:'Cooking class',walk:'Food walk',tasting:'Food tastings'};
  function foodFor(product) {
    const f=product.food,at=Date.parse(f?.checkedAt);
    if(product.category!=='food'||f?.version!==1||!Number.isFinite(at)||at>Date.now()+30000||!Array.isArray(f.activities)||!f.activities.length||f.activities.some(a=>!Object.hasOwn(foodActivities,a))||!['private','shared','unknown'].includes(f.group)||!Object.hasOwn(pickupNames,f.pickup)||f.dietary!=='not_confirmed')return null;
    return {...f,languages:Array.isArray(f.languages)?f.languages.filter(l=>typeof l==='string'&&/^[a-z]{2}(?:-[A-Z]{2})?$/.test(l)).slice(0,12):[],groupSize:Number.isInteger(f.groupSize)&&f.groupSize>0&&f.groupSize<=1000?f.groupSize:null,cancellationType:['STANDARD','CUSTOM','ALL_SALES_FINAL'].includes(f.cancellationType)?f.cancellationType:'unknown'};
  }
  const transferRoutes={airport_city:'Athens airport → Athens city',city_airport:'Athens city → Athens airport',airport_port:'Athens airport → Piraeus port',port_airport:'Piraeus port → Athens airport',athens_daytrip:'Day trip departing from Athens',unknown:'Exact direction not confirmed'};
  const transferRules={transfer_transport:{text:'Transportation is explicitly listed in the inclusions.'},transfer_route:{text:'The listed direction is consistent across inspected option data; confirm exact pickup and drop-off.'}};
  function transferFor(product){
    const t=product.transfer,at=Date.parse(t?.checkedAt);
    if(product.category!=='transfer'||t?.version!==1||!Number.isFinite(at)||at>Date.now()+30000||!['transfer','daytrip'].includes(t.type)||!Object.hasOwn(transferRoutes,t.route)||!['private','shared','unknown'].includes(t.group)||!Object.hasOwn(pickupNames,t.pickup)||['capacity','luggage','childSeats','delayWaiting','operatingHours'].some(k=>t[k]!=='not_confirmed')||(t.type==='daytrip'&&t.route!=='athens_daytrip')||(t.type==='transfer'&&t.route==='athens_daytrip'))return null;
    return t;
  }
  const languageNames = {en:'English',de:'German',el:'Greek',fr:'French',it:'Italian',es:'Spanish',pt:'Portuguese',nl:'Dutch'};
  const pickupNames = {meeting_point:'Meeting point listed; confirm on Viator',pickup_listed:'Pickup listed; confirm area and option',pickup_or_meeting:'Pickup or meeting point; confirm option',option_dependent:'Meeting / pickup differs by option',unknown:'Check meeting point on Viator'};
  function cultureFor(product) {
    const c=product.culture, at=Date.parse(c?.checkedAt);
    if (product.category!=='culture' || c?.version!==1 || !Number.isFinite(at) || at>Date.now()+30000 || !['included','not_confirmed'].includes(c.guide) || !['private','shared','unknown'].includes(c.group) || !Object.hasOwn(pickupNames,c.pickup) || !['easy','moderate','hard','unknown'].includes(c.effort) || !['some_not_included','unknown'].includes(c.admission)) return null;
    return {...c,languages:Array.isArray(c.languages)?c.languages.filter(l=>typeof l==='string'&&/^[a-z]{2}(?:-[A-Z]{2})?$/.test(l)).slice(0,12):[],groupSize:Number.isInteger(c.groupSize)&&c.groupSize>0&&c.groupSize<=1000?c.groupSize:null};
  }
  const languageText = c => c.culture?.guide==='included' && c.culture.languages.length ? c.culture.languages.map(l=>languageNames[l]||l).join(', ') : null;
  function evidenceFor(product) {
    if (!Array.isArray(product.selectionEvidence)) return [];
    const seen = new Set(), culture=cultureFor(product), food=foodFor(product), transfer=transferFor(product);
    return product.selectionEvidence.filter(fact => {
      if (!fact || seen.has(fact.code)) return false;
      const e=fact.evidence, rule=Object.hasOwn(evidenceRules,fact.code)?evidenceRules[fact.code]:null, cr=Object.hasOwn(cultureRules,fact.code)?cultureRules[fact.code]:null;
      const fr=Object.hasOwn(foodRules,fact.code)?foodRules[fact.code]:null;
      const tr=Object.hasOwn(transferRules,fact.code)?transferRules[fact.code]:null;
      let valid=false;
      if(tr&&transfer) valid=e?.source==='viator_product'&&e.productCode===product.productCode&&e.checkedAt===transfer.checkedAt&&(fact.code==='transfer_transport'?e.field==='inclusions'&&e.value==='TRANSPORT_LISTED':transfer.route!=='unknown'&&e.value===transfer.route&&e.field===(transfer.type==='daytrip'?'logistics.start/inclusions':'productOptions'));
      else if(fr&&food) valid=e?.source==='viator_product'&&e.productCode===product.productCode&&e.checkedAt===food.checkedAt&&['inclusions','itinerary.activityInfo.description'].includes(e.field)&&e.value===fr.value&&food.activities.includes(fact.code.slice(5));
      else if (cr && culture) valid=e?.source==='viator_product' && e.productCode===product.productCode && e.checkedAt===culture.checkedAt && e.field===cr.field && e.value===cr.value && ({culture_guide:culture.guide==='included',culture_private:culture.group==='private',culture_shared:culture.group==='shared',culture_moderate:culture.effort==='moderate',culture_hard:culture.effort==='hard'})[fact.code];
      else if (rule && e?.source==='viator_listing' && typeof e.value==='string' && e.value.length<=100) valid=rule.flag ? e.field==='flags'&&e.value===rule.flag : ['title','description'].includes(e.field)&&rule.pattern.test(e.value);
      if (valid) seen.add(fact.code); return valid;
    }).slice(0,culture?6:4).map(fact=>({...fact,text:(transferRules[fact.code]||foodRules[fact.code]||cultureRules[fact.code]||evidenceRules[fact.code]).text}));
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
    return { ...product, duration, currency, price, ratingInfo: rating, basis: ['per_person', 'per_group'].includes(product.priceBasis) ? product.priceBasis : 'unknown', culture: cultureFor(product), food:foodFor(product), transfer:transferFor(product), facts: evidenceFor(product) };
  }
  const minutes = n => n % 60 === 0 ? `${n / 60} ${n === 60 ? 'hour' : 'hours'}` : `${n} minutes`;
  const durationText = c => c.duration ? (c.duration.min === c.duration.max ? minutes(c.duration.min) : `${minutes(c.duration.min)}–${minutes(c.duration.max)}`) : 'Check duration on Viator';
  const priceText = c => c.price === null ? 'Check price on Viator' : `From ${new Intl.NumberFormat('en-GB', {style:'currency',currency:c.currency}).format(c.price)}${c.basis === 'per_person' ? ' per person' : c.basis === 'per_group' ? ' per group' : ''}`;
  const ratingText = c => c.ratingInfo ? `${c.ratingInfo.value.toFixed(1)}/5 · ${c.ratingInfo.count} combined reviews` : 'Rating not supplied';
  function affiliateLink(c, parent) {
    const link = node('a', 'Details & dates on Viator ↗', parent); link.className = 'concierge-book';
    link.href = c.url; link.target = '_blank'; link.rel = 'sponsored noopener noreferrer';
    link.setAttribute('aria-label', `Check details and dates on Viator for ${c.title} (opens a new tab)`);
    link.addEventListener('click', () => track('affiliate_click', {productCode:c.productCode})); return link;
  }
  function expireCovers() {
    clearTimeout(coverTimer);
    const now = Date.now(); let next = Infinity;
    results.querySelectorAll('.concierge-supplier-cover').forEach(img => {
      const expires = Number(img.dataset.expiresAt);
      if (!Number.isFinite(expires) || expires <= now) img.remove();
      else next = Math.min(next, expires - now);
    });
    if (next !== Infinity) coverTimer = setTimeout(expireCovers, next + 1);
  }
  document.addEventListener('visibilitychange', expireCovers);
  window.addEventListener('pageshow', expireCovers);
  function renderCover(c, parent) {
    const v = c.supplierCover, now = Date.now();
    if (!supplierCoversEnabled || v?.source !== 'SUPPLIER_PROVIDED' || v.isCover !== true || !Number.isFinite(v.checkedAt) || !Number.isFinite(v.expiresAt) || v.expiresAt <= now || v.checkedAt > now + 30000 || v.expiresAt - v.checkedAt > 300000 || v.expiresAt <= v.checkedAt) return;
    try {
      const u = new URL(v.url);
      if (typeof v.url !== 'string' || v.url.length > 2048 || v.url.trim() !== v.url || u.protocol !== 'https:' || !['media.tacdn.com','hare-media-cdn.tripadvisor.com', 'media-cdn.tripadvisor.com'].includes(u.hostname) || u.username || u.password || u.port || u.hash || !u.pathname.startsWith('/media/') || !/\.(jpg|jpeg|png|webp)$/i.test(u.pathname) || !Number.isInteger(v.width) || v.width < 300 || v.width > 1200 || !Number.isInteger(v.height) || v.height <= 0 || v.height > 4096) return;
      const img = node('img','',parent); img.className='concierge-photo concierge-supplier-cover';
      img.alt=`Tour image: ${c.title}`; img.width=v.width; img.height=v.height;
      img.loading='lazy'; img.decoding='async'; img.referrerPolicy='no-referrer';
      img.dataset.expiresAt=String(v.expiresAt);
      img.addEventListener('error',()=>img.remove(),{once:true}); img.src=v.url;
    } catch { /* Missing or untrusted media leaves the compact text card. */ }
  }
  function clearCards() { clearTimeout(coverTimer); cards = []; shortlist.clear(); toolbar.hidden = true; comparison.hidden = true; comparison.replaceChildren(); results.replaceChildren(); }
  function selectionChanged() {
    compareButton.textContent = `Compare selected (${shortlist.size})`; compareButton.disabled = shortlist.size < 2;
    compareHint.textContent = shortlist.size ? `${shortlist.size} selected. Compare confirmed differences.` : 'Choose two or three options to compare.';
    comparison.hidden = true;
  }
  function compare() {
    expireCovers();
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
    if (chosen.every(c=>c.culture)) {
      consider('Group',chosen.map(c=>c.culture.group==='unknown'?null:c.culture.group));
      consider('Guide languages listed',chosen.map(languageText));
      consider('Meeting / pickup method',chosen.map(c=>c.culture.pickup==='unknown'?null:pickupNames[c.culture.pickup]));
      consider('Physical effort listed',chosen.map(c=>c.culture.effort==='unknown'?null:c.culture.effort));
      unknown.push('Guide access inside each site; admission for every stop; stairs and accessible routes');
    }
    if(chosen.every(c=>c.food)) {
      consider('Listed activity',chosen.map(c=>c.food.activities.map(a=>foodActivities[a]).join(', ')));
      consider('Group',chosen.map(c=>c.food.group==='unknown'?null:c.food.group));
      consider('Listed human-guide languages',chosen.map(c=>c.food.languages.length?c.food.languages.map(l=>languageNames[l]||l).join(', '):null));
      consider('Meeting / pickup method',chosen.map(c=>c.food.pickup==='unknown'?null:pickupNames[c.food.pickup]));
      unknown.push('Allergies, dietary accommodation, exact ingredients and option-specific cancellation deadline');
    }
    if(chosen.every(c=>c.transfer)){
      consider('Service listed',chosen.map(c=>c.transfer.type==='daytrip'?'Day trip with transport':'Transfer'));
      consider('Direction listed',chosen.map(c=>c.transfer.route==='unknown'?null:transferRoutes[c.transfer.route]));
      consider('Group',chosen.map(c=>c.transfer.group==='unknown'?null:c.transfer.group));
      consider('Meeting / pickup method',chosen.map(c=>c.transfer.pickup==='unknown'?null:pickupNames[c.transfer.pickup]));
      unknown.push('Vehicle capacity, luggage, child seats, delayed-flight waiting, operating hours and exact pickup time');
    }
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
      renderCover(c,article);
      node('h3', c.title, article);
      if (c.ratingInfo) node('p',ratingText(c),article).className = 'concierge-rating';
      const facts=node('dl','',article); facts.className='concierge-facts'; node('dt',c.transfer?'Duration listed (traffic varies)':'Duration',facts); node('dd',durationText(c),facts); node('dt','Departure',facts); node('dd',c.culture?pickupNames[c.culture.pickup]:c.food?pickupNames[c.food.pickup]:c.transfer?pickupNames[c.transfer.pickup]:'Check meeting point on Viator',facts);
      if(c.culture) {
        node('dt','Guide languages listed',facts);node('dd',languageText(c)||'Not confirmed for every option',facts);
        if(c.culture.admission==='some_not_included') node('p','Some admission fees are not included.',article).className='concierge-price-note';
      }
      if(c.transfer){node('dt','Direction listed',facts);node('dd',transferRoutes[c.transfer.route],facts);}
      if(c.food) {node('dt','Activity listed',facts);node('dd',c.food.activities.map(a=>foodActivities[a]).join(', '),facts);}
      if (c.facts.length) node('p',c.facts[0].text,article).className='concierge-reason';
      node('p',priceText(c),article).className='concierge-price';
      if (c.price !== null) node('p', c.basis === 'unknown' ? 'Price basis not confirmed. Check the final price on Viator.' : 'Indicative starting price. Check the final price for your dates and party.',article).className='concierge-price-note';
      affiliateLink(c,article);
      const details=node('details','',article); details.className='concierge-card-details'; node('summary','Details & things to check',details);
      node('p','Confirm the meeting point and any pickup on Viator. Check dates, party size, inclusions, age limits and cancellation terms for your selected option.',details);
      if (c.culture) {
        node('p',`Group: ${c.culture.group}${c.culture.groupSize?' · listed maximum '+c.culture.groupSize:''}. Physical effort: ${c.culture.effort==='unknown'?'not confirmed':c.culture.effort+' (supplier statement)'}.`,details);
        node('p','Check admission for each stop, which sites the guide enters, meeting and pickup conditions, language, stairs and accessible routes for your selected option. No skip-the-line or step-free guarantee.',details);
        node('p',`Product details checked: ${new Date(c.culture.checkedAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC. Conditions may change; this is not date availability.`,details).className='concierge-source';
      }
      if(c.food) {
        node('p',`Group: ${c.food.group}${c.food.groupSize?' · listed maximum '+c.food.groupSize:''}. Human-guide languages listed across inspected options: ${c.food.languages.map(l=>languageNames[l]||l).join(', ')||'not confirmed'}.`,details);
        node('p','Check how much cooking you do yourself, the walking distance, ingredients, drinks, meeting point and cancellation deadline for your selected option. Dietary requests are not allergy guarantees; ask the operator before booking.',details);
        node('p',`Product details checked: ${new Date(c.food.checkedAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC. This is not date availability.`,details).className='concierge-source';
      }
      if(c.transfer){
        node('p',`Service: ${c.transfer.type==='daytrip'?'day trip with listed transport':'transfer listing'}. Group: ${c.transfer.group}. Confirm the direction for your selected option.`,details);
        node('p','Vehicle capacity, luggage allowance, child seats, delayed-flight waiting, operating hours and exact pickup time are not confirmed here. Check them with the operator before booking. No fixed party fare or accessible-vehicle guarantee. For day trips, confirm site guides, admissions and return arrangements.',details);
        node('p',`Product details checked: ${new Date(c.transfer.checkedAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC. This is not date or vehicle availability.`,details).className='concierge-source';
      }
      if (c.facts.length) { node('h4','Why shown · listing evidence',details); const list=node('ul','',details); c.facts.forEach(f => node('li',f.evidence.source==='viator_product' ? `${f.text} Source: Viator product details · ${f.evidence.field}.` : f.evidence.field === 'flags' ? `${f.text} Source: classification supplied by Viator.` : `${f.text} Source: Viator ${f.evidence.field} — “${f.evidence.value}”.`,list)); }
      node('p','Source: Viator listing data, not an independent inspection or suitability guarantee.',details).className='concierge-source';
    });
    expireCovers();
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
    for (const option of [...form.elements.mood.options,...form.elements.style.options]) {
      option.hidden = Boolean(option.dataset.for && !option.dataset.for.split(' ').includes(form.elements.kind.value));
      option.disabled = option.hidden;
    }
    if (form.elements.mood.selectedOptions[0].disabled) form.elements.mood.value = 'any';
    if (form.elements.style.selectedOptions[0].disabled) form.elements.style.value = 'any';
    const culture=form.elements.kind.value==='culture',food=form.elements.kind.value==='food',transfer=form.elements.kind.value==='transfer';
    for(const option of form.elements.destination.options) {
      option.hidden=Boolean(option.value)&&((culture&&!cultureDestinations.has(option.value))||(food&&!foodDestinations.has(option.value))||(transfer&&!transferDestinations.has(option.value)));option.disabled=option.hidden;
    }
    if(form.elements.destination.selectedOptions[0]?.disabled) form.elements.destination.value='';
    document.querySelector('[data-culture-note]').hidden=!culture;
    document.querySelector('[data-food-note]').hidden=!food;
    document.querySelector('[data-transfer-note]').hidden=!transfer;
  }
  function invalidate() {
    requestNumber++;
    controller?.abort();
    submit.disabled = false;
    clearCards();
    results.setAttribute('aria-busy', 'false');
    feedback('Choose your preferences, then find a few options.');
  }
  form.addEventListener('change', event => { if(event.target===form.elements.kind && form.elements.kind.value==='culture')form.elements.mood.value='guided';moodOptions(); invalidate(); });
  for (const link of document.querySelectorAll('[data-kind]')) link.addEventListener('click', () => {
    form.elements.kind.value = link.dataset.kind;
    if(link.dataset.kind==='culture')form.elements.mood.value='guided';
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
        if(values.kind==='transfer') suggestions.push('fewer requirements; the exact route or included transport may not be confirmed in this limited set');
        if(values.kind==='food') suggestions.push('fewer requirements; included activities may not be confirmed in this limited set');
        if(values.kind==='culture') suggestions.push('fewer requirements; guide, group or option conditions may not be confirmed in this limited set');
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
      if(data.capabilities?.culture===true && Array.isArray(data.capabilities.cultureDestinations)) {
        cultureDestinations=new Set(data.capabilities.cultureDestinations.filter(p=>['Athens','Delphi','Meteora'].includes(p.name)&&data.destinations.some(d=>String(d.id)===String(p.id)&&d.name===p.name)).map(p=>String(p.id)));
        if(cultureDestinations.size) {form.elements.kind.querySelector('[value="culture"]').hidden=false;form.elements.kind.querySelector('[value="culture"]').disabled=false;document.querySelector('[data-culture-tool]').hidden=false;}
      }
      if(data.capabilities?.food===true && Array.isArray(data.capabilities.foodDestinations)) {
        foodDestinations=new Set(data.capabilities.foodDestinations.filter(p=>['Athens','Naxos','Crete'].includes(p.name)&&data.destinations.some(d=>String(d.id)===String(p.id)&&d.name===p.name)).map(p=>String(p.id)));
        if(foodDestinations.size){form.elements.kind.querySelector('[value="food"]').hidden=false;form.elements.kind.querySelector('[value="food"]').disabled=false;document.querySelector('[data-food-tool]').hidden=false;}
      }
      if(data.capabilities?.transfers===true&&Array.isArray(data.capabilities.transferDestinations)){
        transferDestinations=new Set(data.capabilities.transferDestinations.filter(p=>p.name==='Athens'&&data.destinations.some(d=>String(d.id)===String(p.id)&&d.name===p.name)).map(p=>String(p.id)));
        if(transferDestinations.size){form.elements.kind.querySelector('[value="transfer"]').hidden=false;form.elements.kind.querySelector('[value="transfer"]').disabled=false;document.querySelector('[data-transfer-tool]').hidden=false;}
      }
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
