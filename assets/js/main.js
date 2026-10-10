const button = document.querySelector('.menu');
const nav = document.querySelector('.site-header nav');
button?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  button.setAttribute('aria-expanded', String(Boolean(open)));
});

const sharing = document.querySelector('.story-share');
if (sharing) {
  const native = sharing.querySelector('[data-share-native]');
  const copy = sharing.querySelector('[data-share-copy]');
  const status = sharing.querySelector('.story-share-status');
  const fallback = sharing.querySelector('.story-share-link');
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const title = document.querySelector('h1')?.textContent || document.title;
  sharing.hidden = false;
  native.hidden = typeof navigator.share !== 'function';

  copy.addEventListener('click', async () => {
    copy.disabled = true;
    status.textContent = '';
    fallback.hidden = true;
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copied!';
    } catch {
      fallback.value = url;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = 'Select and copy the link below.';
    } finally {
      copy.disabled = false;
    }
  });

  native.addEventListener('click', async () => {
    native.disabled = true;
    status.textContent = '';
    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (error.name !== 'AbortError') {
        status.textContent = 'Sharing is unavailable. Use Copy link instead.';
      }
    } finally {
      native.disabled = false;
    }
  });
}
if (document.querySelector('#stories-catalog')) {
  const script = document.createElement('script');
  script.src = '/assets/js/catalog.js';
  document.body.appendChild(script);
}
if (document.querySelector('#greece-concierge')) {
  const script = document.createElement('script');
  script.src = '/assets/js/concierge.js';
  document.body.appendChild(script);
}

// Reveal contact details on request to reduce basic email harvesting.
document.querySelectorAll('.email-reveal').forEach((reveal) => {
  reveal.hidden = false;
  reveal.addEventListener('click', () => {
    const address = atob('bXlncmVlY2U=') + '@' + atob('Z3JlZWNlYnlkYW4uY29t');
    const link = document.createElement('a');
    link.href = 'mailto:' + address;
    link.textContent = address;
    reveal.replaceWith(link);
    link.focus();
  }, { once: true });
});
