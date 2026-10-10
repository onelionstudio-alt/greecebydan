(() => {
  const root = document.querySelector('#stories-catalog');
  if (!root) return;
  const form = root.querySelector('form');
  const grid = root.querySelector('.catalog-grid');
  const cards = Array.from(grid.children);
  const count = root.querySelector('.catalog-count');
  const empty = root.querySelector('.catalog-empty');
  const pagination = root.querySelector('.catalog-pagination');
  const previous = pagination.querySelector('[data-page="previous"]');
  const next = pagination.querySelector('[data-page="next"]');
  const fields = ['q', 'region', 'place', 'topic', 'sort'];
  const pageSize = 12;
  let page = 1;
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const records = cards.map(node => ({
    node, ...node.dataset,
    topics: JSON.parse(node.dataset.topics),
    search: normalize(node.dataset.search)
  }));
  function loadURL() {
    const params = new URLSearchParams(location.search);
    for (const name of fields) {
      const control = form.elements.namedItem(name);
      const value = params.get(name) || (name === 'sort' ? 'newest' : '');
      control.value = value;
      if (control.tagName === 'SELECT' && control.selectedIndex === -1) {
        control.value = name === 'sort' ? 'newest' : '';
      }
    }
    const requested = Number(params.get('page'));
    page = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  }
  function render(updateURL = true) {
    const values = Object.fromEntries(fields.map(name => [name, form.elements.namedItem(name).value]));
    const words = normalize(values.q.trim()).split(/\s+/).filter(Boolean);
    const matches = records.filter(r =>
      (!values.region || r.region === values.region) &&
      (!values.place || r.place === values.place) &&
      (!values.topic || r.topics.includes(values.topic)) &&
      words.every(word => r.search.includes(word))
    );
    matches.sort((a, b) => {
      const titleOrder = a.title.localeCompare(b.title, 'en', {sensitivity: 'base'});
      return values.sort === 'az' ? titleOrder : b.date.localeCompare(a.date) || titleOrder;
    });
    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    page = Math.min(page, totalPages);
    cards.forEach(node => { node.hidden = true; });
    matches.forEach((record, index) => {
      grid.appendChild(record.node);
      record.node.hidden = index < (page - 1) * pageSize || index >= page * pageSize;
    });
    count.textContent = `${matches.length} ${matches.length === 1 ? 'story' : 'stories'}`;
    empty.hidden = matches.length > 0;
    pagination.hidden = totalPages <= 1;
    previous.disabled = page <= 1;
    next.disabled = page >= totalPages;
    pagination.querySelector('span').textContent = `Page ${page} of ${totalPages}`;
    if (updateURL) {
      const url = new URL(location.href);
      for (const name of fields) {
        if (values[name] && !(name === 'sort' && values[name] === 'newest')) url.searchParams.set(name, values[name]);
        else url.searchParams.delete(name);
      }
      if (page > 1) url.searchParams.set('page', String(page));
      else url.searchParams.delete('page');
      history.replaceState(null, '', url);
    }
  }
  form.addEventListener('submit', event => { event.preventDefault(); page = 1; render(); });
  form.addEventListener('input', () => { page = 1; render(); });
  form.addEventListener('change', () => { page = 1; render(); });
  form.addEventListener('reset', () => { setTimeout(() => { page = 1; render(); }, 0); });
  for (const [control, offset] of [[previous, -1], [next, 1]]) {
    control.addEventListener('click', () => {
      page += offset;
      render();
      count.scrollIntoView({block: 'start'});
    });
  }
  window.addEventListener('popstate', () => { loadURL(); render(false); });
  loadURL();
  render();
  form.hidden = false;
})();
