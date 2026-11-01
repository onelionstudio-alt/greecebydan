/* Prevent accidentally replacing an existing story with a different topic.
   GitHub CI independently validates article identity before deployment. */
(function () {
  const ignored = new Set(['a', 'an', 'and', 'are', 'at', 'be', 'by', 'can', 'do', 'for', 'from', 'how', 'if', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'was', 'what', 'when', 'where', 'which', 'why', 'with', 'you', 'your']);
  function words(value) {
    return new Set(String(value || '').toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/).filter(word => word.length > 1 && !ignored.has(word)));
  }
  function matches(slug, title) {
    const fromSlug = words(slug);
    const fromTitle = words(title);
    if (!fromSlug.size || !fromTitle.size) return true;
    let shared = 0;
    fromTitle.forEach(word => { if (fromSlug.has(word)) shared++; });
    return shared >= Math.ceil(fromTitle.size * 0.5);
  }
  window.greeceStoryIdentity = {matches};
  window.registerStoryIdentityGuard = function (CMS) {
    CMS.registerEventListener({
      name: 'preSave',
      handler: ({entry}) => {
        const path = String(entry.get('path') || '');
        const slug = String(entry.get('slug') || '');
        const data = entry.get('data');
        const title = data && data.get('title');
        if ((path.startsWith('content/stories/') || (!path && slug)) && slug && title && !matches(slug, title)) {
          const message = 'Название статьи больше не соответствует её адресу. Похоже, ты вставил новую статью поверх старой. Создай новую запись через «Новая история», чтобы не потерять старую статью и не сломать публикацию.';
          window.alert(message);
          throw new Error(message);
        }
        return data;
      }
    });
  };
})();
