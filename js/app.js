/* Prompt Studio — démarrage, navigation, thème */
(function () {
  'use strict';
  const { $, $$, icon } = PS;
  PS.load(); // état provisoire (synchrone) en attendant IndexedDB

  const TITLES = { accueil: 'Accueil', rapide: 'Une phrase', generateur: 'Assistant détaillé', editeur: 'Éditeur et vérification', modeles: 'Modèles', projets: 'Projets', demarrer: 'Démarrer un projet', avis: 'Avis', reglages: 'Réglages' };
  const mq = matchMedia('(prefers-color-scheme: dark)');
  PS.applyTheme = () => {
    const t = PS.state.settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : PS.state.settings.theme;
    document.documentElement.dataset.theme = t;
    const b = $('#themeBtn'); if (b) b.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
    $$('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', t === 'dark' ? '#121214' : '#f6f5f2'));
  };
  mq.addEventListener && mq.addEventListener('change', PS.applyTheme);

  let lastView = null;
  PS.route = () => {
    const parts = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/').map(decodeURIComponent);
    let name = parts[0]; const params = parts.slice(1);
    if (!PS.views[name]) name = 'accueil';
    if (PS.state.drafts && name !== 'editeur' && lastView === 'editeur') PS.save();
    const old = $('#view');
    const root = document.createElement('div');
    root.id = 'view'; root.className = 'view';
    old.replaceWith(root);
    const d = $('#modal'); if (d.open && !(name === 'modeles' && params[0])) d.close();
    try { PS.views[name](root, params); }
    catch (e) { console.error(e); root.innerHTML = '<div class="empty"><h3>Oups, un problème est survenu</h3><p>Recharge la page. Tes données sont conservées.</p></div>'; }
    $$('[data-nav]').forEach((a) => { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = (name === 'accueil' ? 'Prompt Studio — Des prompts clairs pour Claude' : TITLES[name] + ' · Prompt Studio');
    if (lastView !== name || !params.length) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    lastView = name;
  };
  window.addEventListener('hashchange', PS.route);

  document.addEventListener('DOMContentLoaded', async () => {
    await PS.init();
    PS.applyTheme();
    $('#themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme;
      PS.state.settings.theme = cur === 'dark' ? 'light' : 'dark'; PS.save(); PS.applyTheme();
    });
    PS.route();
    window.addEventListener('beforeunload', () => PS.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) PS.save(); });
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw/.test(location.search)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  });
})();
