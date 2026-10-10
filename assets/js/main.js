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
