const button = document.querySelector('.menu');
const nav = document.querySelector('.site-header nav');
button?.addEventListener('click', () => {
  const open = nav?.classList.toggle('open');
  button.setAttribute('aria-expanded', String(Boolean(open)));
});
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
