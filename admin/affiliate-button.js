/* Standard Markdown keeps the article portable outside Decap. */
window.affiliateButtonComponent = {
  id: 'affiliate-button',
  label: 'Партнёрская кнопка',
  fields: [
    {name: 'label', label: 'Текст кнопки (на английском)', widget: 'string'},
    {name: 'url', label: 'Партнёрская ссылка (https://)', widget: 'string', pattern: ['^https://[^\\s<>"\\\\]+$', 'Вставь полную HTTPS-ссылку без пробелов.']}
  ],
  pattern: /^\[([^\]\n]+)\]\((https:\/\/[^\s]+) "affiliate-button"\)$/,
  fromBlock: match => ({label: match[1], url: match[2]}),
  toBlock: data => {
    const label = String(data.label || '').replace(/[\[\]<>\r\n]/g, '').trim();
    const url = String(data.url || '').trim();
    if (!/^https:\/\/[^\s<>"\\]+$/.test(url)) throw new Error('Нужна корректная HTTPS-ссылка.');
    return `[${label}](${url} "affiliate-button")`;
  },
  toPreview: data => {
    const escape = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return `<p class="affiliate-cta"><span class="affiliate-button" style="display:inline-block;padding:13px 20px;background:#185e78;color:#fbfaf6;border-radius:4px;font:600 15px Arial">${escape(data.label)} ↗</span></p>`;
  }
};
