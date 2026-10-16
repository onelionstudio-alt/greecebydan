/* Aggregate funnel events only. No cookies, IDs, full URLs or user preferences. */
(() => {
  const endpoint = 'https://greecebydan-travel-api.onelion-studio.workers.dev/events';
  window.gbdEvent = (name, values = {}) => {
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    const data = { v: 1, name, source: 'direct', placement: 'concierge', kind: 'none', productCode: '', count: 0, ...values };
    try {
      void fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer', body: JSON.stringify(data), keepalive: true }).catch(() => {});
    } catch { /* Metrics must never block navigation. */ }
  };
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a');
    if (!link) return;
    if (link.dataset.advisorSource) {
      window.gbdEvent('advisor_open', { source: link.dataset.advisorSource, placement: 'article', kind: new URL(link.href).searchParams.get('kind') });
    } else if (link.rel.split(/\s+/).includes('sponsored') && link.closest('main article') && !link.closest('#concierge-results')) {
      // Existing direct affiliate URLs are untouched. Do not send their parameters.
      window.gbdEvent('affiliate_click', { source: 'article', placement: 'article' });
    }
  });
})();
