/* API data is deliberately loaded only at runtime, outside indexable HTML. */
(() => {
  const API = 'https://greecebydan-travel-api.onelion-studio.workers.dev';
  const form = document.querySelector('#concierge-form');
  const status = document.querySelector('#concierge-status');
  const results = document.querySelector('#concierge-results');
  const submit = form.querySelector('button');
  let requestNumber = 0;
  let controller;
  function feedback(message, state = '', reveal = false) {
    status.textContent = message;
    status.dataset.state = state;
    if (reveal) status.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }
  const node = (tag, text, parent) => {
    const el = document.createElement(tag);
    el.textContent = text;
    parent.append(el);
    return el;
  };
  async function api(path, options = {}) {
    const response = await fetch(API + path, { ...options, signal: options.signal || AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Service unavailable');
    return response.json();
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
    try {
      const data = await api('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal: controller.signal });
      if (id !== requestNumber) return;
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
        node('small', index ? 'Another option' : 'Start here', article);
        node('h3', product.title, article);
        node('p', product.reason, article);
        if (Number.isFinite(product.fromPrice)) node('p', `From ${new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(product.fromPrice)} per person · indicative starting price`, article);
        if (product.rating && product.reviews) node('p', `${product.rating.toFixed(1)}/5 · ${product.reviews} reviews across Viator and Tripadvisor`, article);
        let target;
        try { target = new URL(product.url); } catch { return; }
        if (target.protocol !== 'https:' || !['viator.com', 'www.viator.com'].includes(target.hostname)) return;
        const link = node('a', 'See details & dates on Viator ↗', article);
        link.href = product.url;
        link.target = '_blank';
        link.rel = 'sponsored noopener noreferrer';
      });
    } catch (error) {
      if (id === requestNumber) feedback('The search is unavailable just now. Please try again in a moment.', 'error', true);
    } finally {
      if (id === requestNumber) submit.disabled = false;
    }
  });
  (async () => {
    try {
      const data = await api('/destinations');
      if (!data.destinations?.length) throw new Error('No destinations');
      for (const place of data.destinations) {
        const option = node('option', place.name, form.elements.destination);
        option.value = String(place.id);
      }
      form.hidden = false;
      feedback('Choose a place to get started.');
      moodOptions();
    } catch {
      feedback('The helpers are being connected. Please check back soon.');
    }
  })();
})();
