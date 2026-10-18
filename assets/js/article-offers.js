/* Editorial links work without JS; only approved fresh supplier covers are added. */
(() => {
  if (document.querySelector('meta[name="gbd-supplier-covers"]')?.content !== 'enabled') return;
  const api = 'https://greecebydan-travel-api.onelion-studio.workers.dev';
  const cards = [...document.querySelectorAll('.article-offer')].slice(0,3);
  const requests = new Map();
  const valid = v => {
    const now=Date.now();
    if (v?.source!=='SUPPLIER_PROVIDED' || v.isCover!==true || !Number.isFinite(v.checkedAt) || !Number.isFinite(v.expiresAt) || v.checkedAt>now+30000 || v.expiresAt<=now || v.expiresAt<=v.checkedAt || v.expiresAt-v.checkedAt>300000) return false;
    try {
      const u=new URL(v.url);
      return typeof v.url==='string' && v.url.length<=2048 && v.url===v.url.trim() && u.protocol==='https:' && ['media.tacdn.com','hare-media-cdn.tripadvisor.com','media-cdn.tripadvisor.com'].includes(u.hostname) && !u.username && !u.password && !u.port && !u.hash && u.pathname.startsWith('/media/') && /\.(jpg|jpeg|png|webp)$/i.test(u.pathname) && Number.isInteger(v.width) && v.width>=300 && v.width<=1200 && Number.isInteger(v.height) && v.height>0 && v.height<=4096;
    } catch { return false; }
  };
  const expire = () => document.querySelectorAll('.article-offer-photo').forEach(img=>{
    if (Number(img.dataset.expiresAt)<=Date.now()) img.remove();
  });
  document.addEventListener('visibilitychange',expire);
  window.addEventListener('pageshow',expire);
  async function load(card) {
    const code=card.dataset.productCode;
    if (!/^[0-9]{1,12}P[0-9]{1,8}$/.test(code)) return;
    try {
      if (!requests.has(code)) requests.set(code,fetch(api+'/article-cover',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productCode:code}),
        cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)
      }).then(r=>r.ok?r.json():null).catch(()=>null));
      const data=await requests.get(code),v=data?.supplierCover;
      if (data?.active===false) {
        card.querySelector('a')?.remove();
        card.querySelector('.article-offer-disclosure').textContent='This listing is currently inactive on Viator.';
      }
      if (!valid(v)) return;
      const img=document.createElement('img');
      img.className='article-offer-photo';img.alt='Tour image: '+card.querySelector('h3').textContent;
      img.width=v.width;img.height=v.height;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
      img.dataset.expiresAt=String(v.expiresAt);
      img.addEventListener('error',()=>img.remove(),{once:true});
      img.src=v.url;card.prepend(img);
      setTimeout(expire,Math.max(1,v.expiresAt-Date.now()+1));
    } catch { /* The compact editorial link remains, without a blank image block. */ }
  }
  if ('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      entries.filter(e=>e.isIntersecting).forEach(e=>{observer.unobserve(e.target);load(e.target)});
    },{rootMargin:'600px'});
    cards.forEach(c=>observer.observe(c));
  } else cards.forEach(load);
})();
