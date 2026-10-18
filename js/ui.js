/* Prompt Studio — composants d'interface partagés */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;

  function toast(msg, ic = 'check', ms = 2400) {
    const box = $('#toasts');
    const d = $('#modal');
    const host = d.open ? d : document.body;
    if (box.parentNode !== host) host.appendChild(box);
    $$('.toast', box).forEach((x) => { if (x.dataset.msg === msg) x.remove(); });
    const all = $$('.toast', box); if (all.length >= 2) all[0].remove();
    const t = document.createElement('div'); t.dataset.msg = msg;
    t.className = 'toast'; t.innerHTML = icon(ic) + '<span>' + esc(msg) + '</span>';
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  let onCloseCb = null;
  function modal({ title, body, foot = '', wide = false, onMount }) {
    const d = $('#modal'), c = $('#modalCard');
    d.classList.toggle('wide', !!wide);
    c.innerHTML = `<div class="modal-head"><h2 id="modalTitle">${esc(title)}</h2><button class="icon-btn" type="button" data-close aria-label="Fermer">${icon('x')}</button></div><div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}`;
    const close = () => { if (d.open) d.close(); };
    $$('[data-close]', c).forEach((b) => b.addEventListener('click', close));
    if (!d.open) d.showModal();
    if (onMount) onMount(c, close);
    const first = c.querySelector('.modal-body input, .modal-body textarea, .modal-body select');
    if (first && !first.hasAttribute('data-nofocus')) setTimeout(() => first.focus(), 30);
    return close;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const d = $('#modal');
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => { if (onCloseCb) { const f = onCloseCb; onCloseCb = null; f(); } });
  });

  function confirmDialog({ title, text, ok = 'Confirmer', danger = false, typed = '' }) {
    return new Promise((resolve) => {
      let done = false;
      onCloseCb = () => { if (!done) resolve(false); };
      modal({ title, body: `<p>${text}</p>${typed ? `<div class="field"><label class="lbl" for="cfTyped">Pour confirmer, écris <span class="kbd">${esc(typed)}</span></label><input id="cfTyped" type="text" autocomplete="off"></div>` : ''}`,
        foot: `<button class="btn ghost" data-close type="button">Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cfOk" type="button" ${typed ? 'disabled' : ''}>${esc(ok)}</button>`,
        onMount: (c, close) => {
          const okb = $('#cfOk', c);
          if (typed) $('#cfTyped', c).addEventListener('input', (e) => { okb.disabled = e.target.value.trim() !== typed; });
          okb.addEventListener('click', () => { done = true; close(); resolve(true); });
          if (!typed) setTimeout(() => okb.focus(), 30);
        } });
    });
  }

  async function copyPrompt(text, label = 'Prompt copié') {
    if (!String(text).trim()) return toast('Rien à copier pour l’instant.', 'info');
    const ok = await PS.copy(text);
    toast(ok ? label : 'Copie impossible : sélectionne le texte à la main.', ok ? 'check' : 'alert');
  }
  async function openClaude(text) {
    if (!String(text).trim()) return toast('Le prompt est vide.', 'info');
    const url = PS.claudeLink(text);
    if (url.length > PS.CLAUDE_URL_MAX) {
      await PS.copy(text);
      const go = await confirmDialog({ title: 'Prompt long', text: 'Ce prompt est long : le lien risque d’être coupé par le navigateur ou par Claude. Je l’ai copié dans ton presse-papiers. Tu pourras le coller dans Claude si le texte arrive incomplet.', ok: 'Ouvrir Claude quand même' });
      if (!go) return;
      window.open('https://claude.ai/new', '_blank', 'noopener');
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  function saveToProject(content, { title = '', note = 'Version initiale' } = {}) {
    if (!String(content).trim()) return toast('Le prompt est vide.', 'info');
    const projects = PS.state.projects;
    const opts = projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    modal({ title: 'Enregistrer dans un projet',
      body: `<div class="field"><label class="lbl" for="spTitle">Nom du prompt</label><input id="spTitle" type="text" value="${esc(title)}" placeholder="Par exemple : Cadrage du site"></div>
        <div class="field"><label class="lbl" for="spProj">Projet</label><select id="spProj">${opts}<option value="__new">+ Nouveau projet…</option></select></div>
        <div class="field" id="spNewWrap" ${projects.length ? 'hidden' : ''}><label class="lbl" for="spNew">Nom du nouveau projet</label><input id="spNew" type="text" placeholder="Mon projet"></div>
        <p class="small muted">Le prompt est enregistré sur cet appareil, avec une première version dans son historique.</p>`,
      foot: `<button class="btn ghost" data-close type="button">Annuler</button><button class="btn primary" id="spOk" type="button">${icon('save')}Enregistrer</button>`,
      onMount: (c, close) => {
        const sel = $('#spProj', c), wrap = $('#spNewWrap', c);
        if (!projects.length) sel.value = '__new';
        sel.addEventListener('change', () => { wrap.hidden = sel.value !== '__new'; });
        $('#spOk', c).addEventListener('click', () => {
          let p;
          if (sel.value === '__new') p = PS.newProject({ name: $('#spNew', c).value.trim() || 'Nouveau projet' });
          else p = PS.findProject(sel.value);
          const pr = PS.newPrompt(p, { title: $('#spTitle', c).value.trim() || 'Prompt sans nom', content, note });
          close(); toast('Enregistré dans « ' + p.name + ' »');
          PS.lastSaved = { pid: p.id, prid: pr.id };
        });
      } });
  }

  // Rendu d'un prompt avec titres et zones à compléter mis en valeur
  function highlight(text) {
    return esc(text).split('\n').map((l) => {
      if (/^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒ][A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇŒ0-9 '’()/,\-–]{2,}(\(.*\))?$/.test(l.trim()) || /^[A-ZÀÂÉÈÊÎÔÙÛÇ ’']{3,}\s*\(/.test(l.trim())) return `<span class="h">${l}</span>`;
      return l.replace(/\[à compléter\]|\{\{[^}]+\}\}/g, (m) => `<span class="ph">${m}</span>`);
    }).join('\n');
  }

  function scoreColor(s) { return s >= 80 ? 'var(--ok)' : s >= 55 ? 'var(--warn)' : 'var(--bad)'; }

  Object.assign(PS, { toast, modal, confirmDialog, copyPrompt, openClaude, saveToProject, highlight, scoreColor });
})();
