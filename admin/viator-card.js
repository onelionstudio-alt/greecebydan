/* Author copy stays portable; the editor never calls Viator or loads media. */
window.viatorCardComponent = {
  id:'viator-card',label:'Viator-карточка с фото',
  fields:[
    {name:'title',label:'Название (на английском)',widget:'string'},
    {name:'text',label:'Твой короткий текст (на английском, до 500 символов)',widget:'text',required:false},
    {name:'url',label:'Полная партнёрская ссылка на тур Viator',widget:'string'}
  ],
  pattern:/^```viator-card\n(\{[^\n]+\})\n```$/,
  fromBlock:match=>JSON.parse(match[1]),
  toBlock:data=>{
    const title=String(data.title||'').trim(),text=String(data.text||'').trim(),url=String(data.url||'').trim();
    const u=new URL(url);
    if(!title || title.length>180 || text.length>500 || u.protocol!=='https:' || u.hostname!=='www.viator.com' || u.username || u.password || u.port || u.hash || /[\s<>"\\]/.test(url) || !/\/(?:d\d+-|p-)\d{1,12}P\d{1,8}$/.test(u.pathname)) throw new Error('Нужны название, короткий текст и полная HTTPS-ссылка на продукт Viator.');
    return '```viator-card\n'+JSON.stringify({title,text,url})+'\n```';
  },
  toPreview:data=>{
    const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return '<aside style="padding:20px;border:1px solid #c9d6da"><strong>'+esc(data.title)+'</strong><p>'+esc(data.text)+'</p><span>View on Viator ↗</span><p>Фото появится на сайте только после проверки supplier cover. Цена и рейтинг не показываются.</p></aside>';
  }
};
