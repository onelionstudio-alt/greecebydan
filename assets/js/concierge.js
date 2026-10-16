/* API data is deliberately loaded only at runtime, outside indexable HTML. */
(() => {
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
    results.replaceChildren();
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
    results.replaceChildren();
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
      data.products.forEach((product, index) => {
        const article = document.createElement('article');
        article.className = 'concierge-result';
        results.append(article);
        node('small', index ? 'Another option to compare' : 'An option to explore', article);
        if (product.image) {
          try {
            const u = new URL(product.image.url);
            if (u.protocol === 'https:' && u.hostname === 'media.tacdn.com' && !u.username && !u.password && Number.isInteger(product.image.width) && Number.isInteger(product.image.height)) {
              const img = document.createElement('img');
              img.className = 'concierge-photo'; img.alt = ''; img.width = product.image.width; img.height = product.image.height;
              img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
              img.addEventListener('error', () => img.remove(), { once: true });
              img.src = product.image.url; article.append(img);
            }
          } catch { /* Missing or invalid photo does not hide a result. */ }
        }
        node('h3', product.title, article);
        const reason = node('p', product.reason, article); reason.className = 'concierge-reason';
        const facts = node('dl', '', article); facts.className = 'concierge-facts';
        node('dt', 'Duration', facts);
        const d = product.durationMinutes;
        const minutes = n => n % 60 === 0 ? `${n / 60} hours` : `${n} minutes`;
        node('dd', d && Number.isFinite(d.min) && Number.isFinite(d.max) && d.min > 0 && d.max >= d.min ? (d.min === d.max ? minutes(d.min) : `${minutes(d.min)}–${minutes(d.max)}`) : 'Check duration on Viator', facts);
        node('dt', 'Departure', facts);
        node('dd', 'Confirm the meeting point and any pickup on Viator', facts);
        if (Number.isFinite(product.fromPrice)) node('p', `From ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(product.fromPrice)} per person · indicative starting price`, article);
        if (product.rating && product.reviews) node('p', `${product.rating.toFixed(1)}/5 · ${product.reviews} reviews across Viator and Tripadvisor`, article);
        let target;
        try { target = new URL(product.url); } catch { return; }
        if (target.protocol !== 'https:' || !['viator.com', 'www.viator.com'].includes(target.hostname) || target.username || target.password) return;
        const link = node('a', 'Check details & dates on Viator ↗', article);
        link.className = 'concierge-book';
        link.addEventListener('click', () => track('affiliate_click', { productCode: /^[A-Za-z0-9_-]{1,40}$/.test(product.productCode || '') ? product.productCode : '' }));
        link.href = product.url;
        link.target = '_blank';
        link.rel = 'sponsored noopener noreferrer';
      });
    } catch (error) {
      if (id === requestNumber) {
        track('search_error');
        feedback(error.status === 429 ? 'Please wait a moment before searching again. Your preferences are saved.' : 'The search is unavailable just now. Your preferences are saved; use the search button to try again.', 'error', true);
      }
    } finally {
      if (id === requestNumber) submit.disabled = false;
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
