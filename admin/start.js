/* The endpoint is public configuration; OAuth secrets never belong here. */
window.CMS_MANUAL_INIT = true;
(async () => {
  const status = document.getElementById('status');
  try {
    const response = await fetch('/admin/auth.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Не удалось прочитать настройки входа.');
    const auth = await response.json();
    if (!auth.base_url) {
      status.textContent = 'Редактор подготовлен. Осталось подключить вход через GitHub: добавить адрес Cloudflare Worker в admin/auth.json. Инструкция находится в репозитории: docs/admin-setup.md.';
      return;
    }
    const endpoint = new URL(auth.base_url);
    if (endpoint.protocol !== 'https:' || endpoint.origin !== auth.base_url || endpoint.username || endpoint.password) {
      throw new Error('В настройках нужен HTTPS-адрес Worker без пути и завершающего слеша.');
    }
    const health = await fetch(`${endpoint.origin}/health`, {cache:'no-store'});
    if (!health.ok || !(await health.json()).ready) {
      throw new Error('Worker доступен, но вход ещё не настроен. Проверь переменные и секрет GitHub в Cloudflare.');
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/decap-cms@3.16.3/dist/decap-cms.js';
    script.onerror = () => { status.textContent = 'Не удалось загрузить редактор. Обнови страницу или проверь соединение.'; };
    script.onload = () => {
      window.CMS.registerPreviewStyle('/assets/css/style.css');
      window.CMS.init({config: {backend: {base_url: endpoint.origin}}});
      document.getElementById('setup').hidden = true;
    };
    document.head.appendChild(script);
  } catch (error) {
    status.textContent = error.message || 'Не удалось подключить вход. Попробуй обновить страницу.';
  }
})();
