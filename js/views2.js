/* Prompt Studio — vues : projets, démarrage, avis, réglages */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;
  const V = PS.views;
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // ================= PROJETS (liste) =================
  V.projets = (root, params) => {
    if (params && params[0]) return projectDetail(root, params[0], params[1]);
    const st = PS.state;
    let q = '', tag = '';
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('folder', 'sm')} Projets</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Tes projets</h1><p>Un endroit central pour les prompts d’un même projet, avec leurs versions, leurs notes et leurs étiquettes.</p></div>
        <div class="btn-row"><details class="menu" id="pImpMenu"><summary class="btn" id="pImport">${icon('upload', 'sm')}Importer</summary><div class="menu-panel menu-right" role="menu">
          <button type="button" role="menuitem" id="pImpFiles"><b>Des fichiers…</b><span>Un ou plusieurs fichiers : sauvegardes JSON, textes, Markdown, Word, code…</span></button>
          ${PS.importer.supportsDir ? `<button type="button" role="menuitem" id="pImpDir"><b>Un dossier…</b><span>Tout un dossier devient un projet : un prompt par fichier.</span></button>` : `<p class="tiny muted" style="margin:4px 10px 8px">${esc(PS.importer.noDirNote)}</p>`}
          <p class="tiny muted" style="margin:4px 10px 8px">${esc(PS.importer.pickHint)}</p>
        </div></details><a class="btn" href="#/demarrer">${icon('rocket', 'sm')}Démarrer avec un pack</a><button class="btn primary" type="button" id="pNew">${icon('plus', 'sm')}Nouveau projet</button></div></div>
      <div id="pBody"></div>`;
    function render() {
      const all = st.projects;
      if (!all.length) {
        $('#pBody', root).innerHTML = `<div class="empty"><span class="card-icon">${icon('folder', 'lg')}</span><h3>Aucun projet pour l’instant</h3><p>Crée un projet vide, ou laisse le site te préparer un pack de 4 prompts pour bien démarrer.</p><div class="btn-row" style="justify-content:center"><button class="btn primary" type="button" data-new>${icon('plus', 'sm')}Nouveau projet</button><a class="btn" href="#/demarrer">${icon('rocket', 'sm')}Démarrer un projet</a><button class="btn" type="button" data-impfiles>${icon('upload', 'sm')}Importer des fichiers</button></div>${PS.importer.dropHint ? `<p class="tiny muted" style="margin:14px 0 0">${PS.importer.dropHint}</p>` : ''}</div>`;
        return;
      }
      const tags = Array.from(new Set(all.flatMap((p) => p.tags.concat(p.prompts.flatMap((x) => x.tags))))).sort();
      const list = all.filter((p) => {
        const hay = norm([p.name, p.description, p.notes, p.tags.join(' '), ...p.prompts.map((x) => x.title + ' ' + x.content + ' ' + x.tags.join(' '))].join(' '));
        return (!q || hay.includes(norm(q))) && (!tag || p.tags.includes(tag) || p.prompts.some((x) => x.tags.includes(tag)));
      }).sort((a, b) => b.updatedAt - a.updatedAt);
      $('#pBody', root).innerHTML = `<div class="row" style="margin-bottom:12px"><div class="search" style="flex:1;min-width:220px">${icon('search')}<label class="sr" for="pQ">Rechercher</label><input id="pQ" type="search" placeholder="Rechercher dans les projets et les prompts" value="${esc(q)}"></div></div>
        ${tags.length ? `<div class="cat-scroll" role="group" aria-label="Étiquettes"><button class="chip" type="button" data-tag="" aria-pressed="${!tag}">Toutes</button>${tags.map((t) => `<button class="chip" type="button" data-tag="${esc(t)}" aria-pressed="${tag === t}">${icon('tag', 'sm')}${esc(t)}</button>`).join('')}</div>` : ''}
        ${list.length ? `<div class="proj-grid">${list.map(PS.projCard).join('')}</div>` : `<div class="empty"><h3>Aucun résultat</h3><p>Aucun projet ne correspond à ta recherche.</p></div>`}
        ${PS.importer.dropHint ? `<p class="tiny muted" style="margin:18px 0 0;text-align:center">${PS.importer.dropHint}</p>` : ''}`;
      const qi = $('#pQ', root); qi.addEventListener('input', (e) => { q = e.target.value; const pos = qi.selectionStart; render(); const n = $('#pQ', root); n.focus(); n.setSelectionRange(pos, pos); });
    }
    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tag]'); if (t) { tag = t.dataset.tag; render(); return; }
      if (e.target.closest('[data-new]')) newProjectDialog();
      if (e.target.closest('[data-impfiles]')) PS.importer.pickFiles();
    });
    $('#pNew', root).onclick = newProjectDialog;
    const menu = $('#pImpMenu', root);
    $('#pImpFiles', root).onclick = () => { menu.open = false; PS.importer.pickFiles(); };
    if ($('#pImpDir', root)) $('#pImpDir', root).onclick = () => { menu.open = false; PS.importer.pickDir(); };
    document.addEventListener('click', function closeImp(e) { if (!document.body.contains(menu)) return document.removeEventListener('click', closeImp); if (menu.open && !menu.contains(e.target)) menu.open = false; });
    PS.importer.bindDrop(root);
    render();
  };

  function newProjectDialog() {
    PS.modal({ title: 'Nouveau projet',
      body: `<div class="field"><label class="lbl" for="npName">Nom</label><input id="npName" type="text" placeholder="Site de mon club de foot"></div>
        <div class="field"><label class="lbl" for="npDesc">Description <span class="muted">(facultatif)</span></label><textarea id="npDesc" rows="3" placeholder="Ce que tu veux réaliser"></textarea></div>
        <div class="field"><label class="lbl" for="npTags">Étiquettes <span class="muted">(séparées par des virgules)</span></label><input id="npTags" type="text" placeholder="site, perso"></div>`,
      foot: `<button class="btn ghost" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="npOk">Créer le projet</button>`,
      onMount: (c, close) => {
        const go = () => { const p = PS.newProject({ name: $('#npName', c).value.trim() || 'Nouveau projet', description: $('#npDesc', c).value.trim(), tags: PS.tagsFrom($('#npTags', c).value) }); close(); location.hash = '#/projets/' + p.id; };
        $('#npOk', c).onclick = go; $('#npName', c).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      } });
  }

  // ---------- Import / export ----------
  function reId(p) {
    p.id = PS.uid(); (p.prompts || []).forEach((x) => { x.id = PS.uid(); (x.versions || []).forEach((v) => (v.id = PS.uid())); });
    return p;
  }
  function validProject(p) { return p && typeof p.name === 'string' && Array.isArray(p.prompts); }
  function sanitizeProject(p) {
    const now = Date.now();
    return { id: p.id || PS.uid(), name: String(p.name).slice(0, 200), description: String(p.description || ''), tags: Array.isArray(p.tags) ? p.tags.map(String) : [], notes: String(p.notes || ''), status: String(p.status || ''),
      ctx: p.ctx && typeof p.ctx === 'object' ? { mode: p.ctx.mode === 'manual' ? 'manual' : 'auto', ids: Array.isArray(p.ctx.ids) ? p.ctx.ids.map(String) : [], budget: +p.ctx.budget || 15000 } : undefined,
      createdAt: +p.createdAt || now, updatedAt: +p.updatedAt || now,
      ...(p.srcRoot ? { srcRoot: String(p.srcRoot) } : {}), ...(+p.syncedAt ? { syncedAt: +p.syncedAt } : {}),
      ...(Array.isArray(p.trash) ? { trash: p.trash.filter((t) => t && t.prompt && typeof t.prompt.content === 'string').map((t) => ({ id: t.id || PS.uid(), prompt: sanitizePrompt(t.prompt, now), key: String(t.key || ''), removedAt: +t.removedAt || now, reason: String(t.reason || '') })) } : {}),
      prompts: p.prompts.filter((x) => x && typeof x.content === 'string').map((x) => sanitizePrompt(x, now)) };
  }
  function sanitizePrompt(x, now) {
    return { id: x.id || PS.uid(), title: String(x.title || 'Prompt'), tags: Array.isArray(x.tags) ? x.tags.map(String) : [], content: x.content, createdAt: +x.createdAt || now, updatedAt: +x.updatedAt || now, ...(x.gen && typeof x.gen === 'object' ? { gen: { phrase: String(x.gen.phrase || ''), files: Array.isArray(x.gen.files) ? x.gen.files.map(String) : [] } } : {}),
      ...(x.src ? { src: String(x.src) } : {}), ...(x.srcHash ? { srcHash: String(x.srcHash) } : {}),
      versions: Array.isArray(x.versions) ? x.versions.filter((v) => v && typeof v.content === 'string').map((v) => ({ id: v.id || PS.uid(), content: v.content, note: String(v.note || ''), at: +v.at || now })) : [] };
  }
  Object.assign(PS, { reId, validProject, sanitizeProject });
  const exportProject = (p) => PS.download(`prompt-studio-${PS.slug(p.name)}.json`, JSON.stringify({ app: 'prompt-studio', version: 1, exportedAt: new Date().toISOString(), project: p }, null, 2));

  // ================= PROJET (détail) =================
  function projectDetail(root, pid, prid) {
    const p = PS.findProject(pid);
    if (!p) { root.innerHTML = `<div class="empty"><h3>Projet introuvable</h3><p>Il a peut-être été supprimé.</p><a class="btn" href="#/projets">Retour aux projets</a></div>`; return; }
    if (PS.resync.purgeTrash(p)) PS.saveSoon(); // corbeille : plus de 30 jours → supprimé
    let sel = prid && p.prompts.find((x) => x.id === prid) ? prid : (p.prompts[0] && p.prompts[0].id);
    let pq = '';
    const touch = () => { p.updatedAt = Date.now(); PS.saveSoon(); };
    root.innerHTML = `
      <a class="crumb" href="#/projets">${icon('left', 'sm')}Projets</a>
      <div class="page-head" style="align-items:flex-start;margin-top:0">
        <div style="flex:1;min-width:260px">
          <label class="sr" for="pdName">Nom du projet</label><input id="pdName" class="title-input" type="text" value="${esc(p.name)}" style="font-size:clamp(1.5rem,3.4vw,2.1rem)!important">
          <label class="sr" for="pdDesc">Description</label><input id="pdDesc" type="text" value="${esc(p.description)}" placeholder="Ajoute une description" class="title-input" style="font-size:1rem!important;font-weight:400;color:var(--ink-2)">
          <div class="row" style="margin-top:6px">${icon('tag', 'sm')}<label class="sr" for="pdTags">Étiquettes</label><input id="pdTags" type="text" value="${esc(p.tags.join(', '))}" placeholder="Étiquettes, séparées par des virgules" style="max-width:420px;padding:7px 11px;font-size:.9rem"></div>
        </div>
        <div class="btn-row">
          <button class="btn sm" type="button" id="pdDup">${icon('dup', 'sm')}Dupliquer</button>
          <button class="btn sm" type="button" id="pdJson">${icon('download', 'sm')}JSON</button>
          <button class="btn sm" type="button" id="pdMd">${icon('file', 'sm')}Markdown</button>
          <button class="btn sm danger" type="button" id="pdDel">${icon('trash', 'sm')}Supprimer</button>
        </div>
      </div>
      ${PS.resync.barHtml(p)}
      ${PS.phrase.quickAddHtml(p)}
      <div class="pd">
        <div class="stack">
          <div class="card plist">
            <div class="row" style="padding:6px 6px 10px"><b>Prompts</b><span class="spacer"></span><button class="btn sm primary" type="button" id="pdAdd">${icon('plus', 'sm')}Ajouter</button></div>
            <div class="search" style="margin:0 4px 8px">${icon('search')}<label class="sr" for="pdQ">Filtrer les prompts</label><input id="pdQ" type="search" placeholder="Filtrer" style="padding-top:8px;padding-bottom:8px"></div>
            <div id="pdList"></div>
          </div>
          <div class="card"><label class="lbl" for="pdNotes">${icon('edit', 'sm')} Notes du projet</label><span class="hint">Décisions, liens, idées. Enregistré automatiquement.</span><textarea id="pdNotes" rows="6" placeholder="Ce qui a marché, ce qui reste à faire…">${esc(p.notes)}</textarea></div>
        </div>
        <div id="pdMain"></div>
      </div>`;
    $('#pdName', root).addEventListener('input', (e) => { p.name = e.target.value || 'Sans nom'; touch(); });
    $('#pdDesc', root).addEventListener('input', (e) => { p.description = e.target.value; touch(); });
    $('#pdTags', root).addEventListener('change', (e) => { p.tags = PS.tagsFrom(e.target.value); e.target.value = p.tags.join(', '); touch(); });
    $('#pdNotes', root).addEventListener('input', (e) => { p.notes = e.target.value; touch(); });
    $('#pdQ', root).addEventListener('input', (e) => { pq = e.target.value; renderList(); });
    $('#pdJson', root).onclick = () => exportProject(p);
    $('#pdMd', root).onclick = () => PS.download(`prompt-studio-${PS.slug(p.name)}.md`, PS.projectToMarkdown(p), 'text/markdown');
    $('#pdDup', root).onclick = () => { const c = reId(PS.clone(p)); c.name = p.name + ' (copie)'; c.createdAt = c.updatedAt = Date.now(); PS.state.projects.unshift(c); PS.save(); PS.toast('Projet dupliqué'); location.hash = '#/projets/' + c.id; };
    $('#pdDel', root).onclick = async () => {
      if (await PS.confirmDialog({ title: 'Supprimer ce projet ?', text: `« ${esc(p.name)} » et ses ${p.prompts.length} prompt(s) seront supprimés de cet appareil. Pense à exporter avant si tu veux garder une copie.`, ok: 'Supprimer', danger: true })) {
        PS.state.projects = PS.state.projects.filter((x) => x.id !== p.id); PS.save(); PS.toast('Projet supprimé', 'trash'); location.hash = '#/projets';
      }
    };
    $('#pdAdd', root).onclick = () => { const pr = PS.newPrompt(p, { title: 'Nouveau prompt' }); sel = pr.id; renderList(); renderMain(); const t = $('#prTitle', root); if (t) { t.focus(); t.select(); } };

    PS.resync.bindBar(root, p);
    PS.importer.bindDrop(root, { title: 'Dépose le dossier pour mettre à jour ce projet', text: 'Tu pourras choisir : mettre à jour « ' + p.name + ' » ou importer comme d’habitude.', onDrop: (prom) => PS.resync.dropChoice(p, prom) });
    PS.phrase.bindQuickAdd(root, p, (pr) => { sel = pr.id; history.replaceState(null, '', `#/projets/${p.id}/${sel}`); renderList(); renderMain(); const m = $('#pdMain', root); if (m && matchMedia('(max-width:1000px)').matches) m.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

    function renderList() {
      const list = p.prompts.filter((x) => !pq || norm(x.title + ' ' + x.content + ' ' + x.tags.join(' ')).includes(norm(pq)));
      $('#pdList', root).innerHTML = list.length ? list.map((x) => `<button class="pi" type="button" data-sel="${x.id}" aria-current="${x.id === sel}"><b>${esc(x.title)}</b><span>${x.versions.length} version${x.versions.length > 1 ? 's' : ''} · ${PS.fmtDay(x.updatedAt)}${x.tags.length ? ' · ' + esc(x.tags.join(', ')) : ''}</span></button>`).join('')
        : `<p class="small muted" style="padding:8px">${p.prompts.length ? 'Aucun prompt ne correspond.' : 'Aucun prompt. Ajoute-en un, ou enregistre-en un depuis l’assistant, l’éditeur ou un modèle.'}</p>`;
    }
    $('#pdList', root).addEventListener('click', (e) => { const b = e.target.closest('[data-sel]'); if (b) { sel = b.dataset.sel; history.replaceState(null, '', `#/projets/${p.id}/${sel}`); renderList(); renderMain(); if (matchMedia('(max-width:1000px)').matches) $('#pdMain', root).scrollIntoView({ behavior: 'smooth' }); } });

    function renderMain() {
      const pr = p.prompts.find((x) => x.id === sel);
      const main = $('#pdMain', root);
      if (!pr) { main.innerHTML = `<div class="empty"><span class="card-icon">${icon('file', 'lg')}</span><h3>Aucun prompt sélectionné</h3><p>Ajoute un premier prompt à ce projet.</p></div>`; return; }
      const last = pr.versions[pr.versions.length - 1];
      const dirty = () => !last || last.content !== pr.content;
      main.innerHTML = `<div class="card stack">
          <div class="row"><label class="sr" for="prTitle">Nom du prompt</label><input id="prTitle" class="title-input" type="text" value="${esc(pr.title)}" style="flex:1;min-width:200px"><span id="prDirty"></span></div>
          <div class="row">${icon('tag', 'sm')}<label class="sr" for="prTags">Étiquettes du prompt</label><input id="prTags" type="text" value="${esc(pr.tags.join(', '))}" placeholder="Étiquettes" style="max-width:360px;padding:7px 11px;font-size:.9rem"></div>
          <label class="sr" for="prText">Contenu du prompt</label><textarea id="prText" class="code" rows="16" placeholder="Écris ton prompt ici…">${esc(pr.content)}</textarea>
          <div class="row" id="prSaveRow"><input id="prNote" type="text" placeholder="Note de version (facultatif) : ex. ajout d’un exemple" style="flex:1;min-width:200px"><button class="btn primary" type="button" id="prSave">${icon('history', 'sm')}Enregistrer une version</button></div>
          <div class="btn-row">
            <button class="btn sm" type="button" id="prCopy">${icon('copy', 'sm')}Copier</button>
            <button class="btn sm" type="button" id="prClaude">${icon('external', 'sm')}Ouvrir dans Claude</button>
            <button class="btn sm" type="button" id="prCheck">${icon('gauge', 'sm')}Vérifier dans l’éditeur</button>
            <button class="btn sm" type="button" id="prDup">${icon('dup', 'sm')}Dupliquer</button>
            <span class="spacer"></span><span class="counter" id="prCount"></span>
            <button class="btn sm danger" type="button" id="prDel">${icon('trash', 'sm')}Supprimer</button>
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="row" style="margin-bottom:6px"><h3 style="margin:0">${icon('history', 'sm')} Historique des versions</h3><span class="spacer"></span><button class="btn sm" type="button" id="vCmp" disabled>${icon('diff', 'sm')}Comparer la sélection</button></div>
          <p class="small muted" style="margin:0 0 8px">Coche deux versions pour voir ce qui a changé. « Actuel » = le texte en cours, même non enregistré.</p>
          <ul class="versions" id="vList"></ul>
        </div>`;
      const ta = $('#prText', main);
      const upd = () => { $('#prDirty', main).innerHTML = dirty() ? '<span class="dirty">Modifications non enregistrées</span>' : '<span class="tag ok">' + icon('check', 'sm') + 'Enregistré</span>'; $('#prCount', main).textContent = `${PS.words(pr.content)} mots`; };
      ta.addEventListener('input', () => { pr.content = ta.value; pr.updatedAt = Date.now(); touch(); upd(); });
      $('#prTitle', main).addEventListener('input', (e) => { pr.title = e.target.value || 'Sans nom'; touch(); const b = $(`[data-sel="${pr.id}"] b`, root); if (b) b.textContent = pr.title; });
      $('#prTags', main).addEventListener('change', (e) => { pr.tags = PS.tagsFrom(e.target.value); e.target.value = pr.tags.join(', '); touch(); renderList(); });
      $('#prSave', main).onclick = () => {
        if (!pr.content.trim()) return PS.toast('Le prompt est vide.', 'info');
        if (!dirty()) return PS.toast('Aucun changement depuis la dernière version.', 'info');
        pr.versions.push({ id: PS.uid(), content: pr.content, note: $('#prNote', main).value.trim(), at: Date.now() });
        touch(); PS.save(); PS.toast(`Version ${pr.versions.length} enregistrée`); renderList(); renderMain();
      };
      $('#prCopy', main).onclick = () => PS.copyPrompt(pr.content);
      $('#prClaude', main).onclick = () => PS.openClaude(pr.content);
      $('#prCheck', main).onclick = () => PS.openInEditor(pr.content, { pid: p.id, prid: pr.id });
      $('#prDup', main).onclick = () => { const c = PS.newPrompt(p, { title: pr.title + ' (copie)', content: pr.content, tags: pr.tags.slice(), note: 'Copie de « ' + pr.title + ' »' }); sel = c.id; renderList(); renderMain(); PS.toast('Prompt dupliqué'); };
      $('#prDel', main).onclick = async () => {
        if (await PS.confirmDialog({ title: 'Supprimer ce prompt ?', text: `« ${esc(pr.title)} » et ses ${pr.versions.length} version(s) seront supprimés.`, ok: 'Supprimer', danger: true })) {
          p.prompts = p.prompts.filter((x) => x.id !== pr.id); sel = p.prompts[0] && p.prompts[0].id; touch(); PS.save(); renderList(); renderMain();
        }
      };
      // Versions
      const vl = $('#vList', main); const picked = [];
      const rows = [{ id: '__cur', n: 'Actuel', content: pr.content, note: dirty() ? 'Texte en cours (non enregistré)' : 'Identique à la dernière version', at: pr.updatedAt, cur: true }]
        .concat(pr.versions.map((v, i) => ({ ...v, n: 'v' + (i + 1) })).reverse());
      vl.innerHTML = rows.map((v) => `<li><input type="checkbox" data-pick="${v.id}" aria-label="Sélectionner ${esc(v.n)}"><span class="vn">${esc(v.n)}</span><span class="vm">${esc(v.note || 'Sans note')}<span>${v.cur ? 'maintenant' : PS.fmtDate(v.at)} · ${PS.words(v.content)} mots</span></span>
        ${v.cur ? '' : `<button class="btn sm ghost" type="button" data-view="${v.id}">${icon('eye', 'sm')}Voir</button><button class="btn sm" type="button" data-restore="${v.id}">${icon('history', 'sm')}Restaurer</button>`}</li>`).join('');
      const byId = (id) => rows.find((r) => r.id === id);
      vl.addEventListener('change', (e) => {
        const id = e.target.dataset.pick; if (!id) return;
        if (e.target.checked) { picked.push(id); if (picked.length > 2) { const old = picked.shift(); const cb = $(`[data-pick="${old}"]`, vl); if (cb) cb.checked = false; } }
        else picked.splice(picked.indexOf(id), 1);
        $('#vCmp', main).disabled = picked.length !== 2;
      });
      $('#vCmp', main).onclick = () => {
        const [a, b] = picked.map(byId).sort((x, y) => (x.cur ? 1 : y.cur ? -1 : x.at - y.at));
        PS.showDiff(a.content, b.content, a.n, b.n);
      };
      vl.addEventListener('click', async (e) => {
        const bv = e.target.closest('[data-view]'), br = e.target.closest('[data-restore]');
        if (bv) { const v = byId(bv.dataset.view); PS.modal({ title: `${pr.title} — ${v.n}`, wide: true, body: `<p class="small muted">${esc(v.note || 'Sans note')} · ${PS.fmtDate(v.at)}</p><pre class="prompt-box">${PS.highlight(v.content)}</pre>`, foot: `<button class="btn" type="button" data-close>Fermer</button><button class="btn primary" type="button" id="vvCopy">${icon('copy', 'sm')}Copier</button>`, onMount: (c) => { $('#vvCopy', c).onclick = () => PS.copyPrompt(v.content); } }); }
        if (br) {
          const v = byId(br.dataset.restore);
          if (await PS.confirmDialog({ title: `Restaurer ${v.n} ?`, text: dirty() ? 'Le texte actuel n’est pas enregistré : il sera d’abord gardé comme version, puis remplacé par ' + v.n + '. Rien n’est perdu.' : 'Le texte actuel sera remplacé par ' + v.n + '. Une nouvelle version est créée, l’historique reste complet.', ok: 'Restaurer' })) {
            if (dirty() && pr.content.trim()) pr.versions.push({ id: PS.uid(), content: pr.content, note: 'Sauvegarde automatique avant restauration', at: Date.now() });
            pr.content = v.content; pr.versions.push({ id: PS.uid(), content: v.content, note: `Restauré depuis ${v.n}`, at: Date.now() + 1 });
            pr.updatedAt = Date.now(); touch(); PS.save(); renderList(); renderMain(); PS.toast(`${v.n} restaurée`);
          }
        }
      });
      upd();
    }
    renderList(); renderMain();
  }

  // ================= DÉMARRER UN PROJET =================
  const TYPES = [['app', 'Site ou application'], ['contenu', 'Contenu (texte, vidéo…)'], ['analyse', 'Analyse ou étude'], ['apprendre', 'Apprentissage'], ['business', 'Activité ou business'], ['autre', 'Autre']];
  const TOOLS = [['chat', 'Claude (conversation)'], ['code', 'Claude Code'], ['api', 'API Claude']];
  V.demarrer = (root) => {
    const st = PS.state;
    const K = (st.drafts.kick = Object.assign({ name: '', type: 'app', goal: '', who: '', existing: '', constraints: '', level: 'debutant', tool: 'chat' }, st.drafts.kick || {}));
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('rocket', 'sm')} Démarrer un projet</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Ton pack de démarrage en 2 minutes</h1><p>Réponds à 7 questions courtes. Tu reçois 4 prompts prêts à l’emploi : cadrage, plan, première tâche et revue.</p></div></div>
      <div class="wiz">
        <form class="card wiz-card" id="kForm" novalidate>
          <div class="field"><label class="lbl" for="kName">1. Nom du projet</label><input id="kName" data-k="name" type="text" value="${esc(K.name)}" placeholder="Application de suivi sportif" required></div>
          <div class="field"><span class="lbl" id="kTypeL">2. Type de projet</span><div class="chips" role="group" aria-labelledby="kTypeL">${TYPES.map(([v, l]) => `<button type="button" class="chip" data-s="type" data-val="${v}" aria-pressed="${K.type === v}">${l}</button>`).join('')}</div></div>
          <div class="field"><label class="lbl" for="kGoal">3. À quoi ressemble le projet réussi ?</label><textarea id="kGoal" data-k="goal" rows="3" placeholder="Une application web où je note mes séances et vois mes progrès.">${esc(K.goal)}</textarea></div>
          <div class="field"><label class="lbl" for="kWho">4. Pour qui ?</label><input id="kWho" data-k="who" type="text" value="${esc(K.who)}" placeholder="Pour moi, puis pour mes amis de la salle"></div>
          <div class="field"><label class="lbl" for="kEx">5. Ce qui existe déjà <span class="muted">(facultatif)</span></label><textarea id="kEx" data-k="existing" rows="2" placeholder="Rien / une maquette / un fichier Excel…">${esc(K.existing)}</textarea></div>
          <div class="field"><label class="lbl" for="kCo">6. Contraintes <span class="muted">(délai, budget, outils)</span></label><textarea id="kCo" data-k="constraints" rows="2" placeholder="Gratuit, prêt dans 1 mois, utilisable sur téléphone">${esc(K.constraints)}</textarea></div>
          <div class="field"><span class="lbl" id="kLvL">7. Ton niveau sur ce sujet</span><div class="chips" role="group" aria-labelledby="kLvL">${[['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['expert', 'Expert']].map(([v, l]) => `<button type="button" class="chip" data-s="level" data-val="${v}" aria-pressed="${K.level === v}">${l}</button>`).join('')}</div></div>
          <div class="field"><span class="lbl" id="kToL">Avec quel outil vas-tu travailler ?</span><div class="chips" role="group" aria-labelledby="kToL">${TOOLS.map(([v, l]) => `<button type="button" class="chip" data-s="tool" data-val="${v}" aria-pressed="${K.tool === v}">${l}</button>`).join('')}</div></div>
          <div class="wiz-nav"><span class="spacer"></span><button class="btn primary lg" type="submit">${icon('sparkle', 'sm')}Générer mon pack</button></div>
        </form>
        <div id="kOut"></div>
      </div>`;
    const form = $('#kForm', root);
    form.addEventListener('input', (e) => { if (e.target.dataset.k) { K[e.target.dataset.k] = e.target.value; PS.saveSoon(); } });
    form.addEventListener('click', (e) => { const b = e.target.closest('[data-s]'); if (b) { K[b.dataset.s] = b.dataset.val; $$(`[data-s="${b.dataset.s}"]`, form).forEach((x) => x.setAttribute('aria-pressed', x === b)); PS.saveSoon(); } });
    form.addEventListener('submit', (e) => { e.preventDefault(); if (!K.name.trim() || !K.goal.trim()) { PS.toast('Remplis au moins le nom et l’objectif (questions 1 et 3).', 'info'); (K.name.trim() ? $('#kGoal', root) : $('#kName', root)).focus(); return; } renderPack(); });
    function renderPack() {
      const pack = buildPack(K);
      const out = $('#kOut', root); let cur = 0;
      out.innerHTML = `<div class="card preview" style="position:static;max-height:none"><div class="preview-head"><b>Ton pack « ${esc(K.name)} »</b></div>
        <div style="padding:6px 16px 0"><div class="tabs" role="tablist">${pack.map((x, i) => `<button type="button" role="tab" data-tab="${i}" aria-selected="${i === 0}">${i + 1}. ${esc(x.title)}</button>`).join('')}</div><p class="small muted" id="kHint" style="margin:0 0 10px"></p></div>
        <pre class="preview-body" id="kPrev" style="max-height:440px"></pre>
        <div class="preview-foot"><button class="btn sm" type="button" id="kCopy">${icon('copy', 'sm')}Copier</button><button class="btn sm" type="button" id="kClaude">${icon('external', 'sm')}Ouvrir dans Claude</button><span class="spacer"></span><button class="btn primary sm" type="button" id="kCreate">${icon('folder', 'sm')}Créer le projet avec les 4 prompts</button></div></div>`;
      const show = () => { $('#kPrev', out).innerHTML = PS.highlight(pack[cur].content); $('#kHint', out).textContent = pack[cur].when; $$('[data-tab]', out).forEach((b) => b.setAttribute('aria-selected', +b.dataset.tab === cur)); };
      out.firstElementChild.addEventListener('click', (e) => { const t = e.target.closest('[data-tab]'); if (t) { cur = +t.dataset.tab; show(); } });
      $('#kCopy', out).onclick = () => PS.copyPrompt(pack[cur].content);
      $('#kClaude', out).onclick = () => PS.openClaude(pack[cur].content);
      $('#kCreate', out).onclick = () => {
        const p = PS.newProject({ name: K.name.trim(), description: K.goal.trim(), tags: ['démarrage', TYPES.find((t) => t[0] === K.type)[1].split(' ')[0].toLowerCase()] });
        p.notes = `Pack de démarrage créé le ${PS.fmtDay(Date.now())}.\nOrdre conseillé : 1. Cadrage → 2. Plan → 3. Première tâche → 4. Revue.`;
        pack.slice().reverse().forEach((x) => PS.newPrompt(p, { title: `${pack.indexOf(x) + 1}. ${x.title}`, content: x.content, tags: ['pack'], note: 'Généré par le pack de démarrage' }));
        PS.save(); PS.toast('Projet créé avec 4 prompts'); location.hash = '#/projets/' + p.id;
      };
      show(); if (matchMedia('(max-width:1000px)').matches) out.scrollIntoView({ behavior: 'smooth' });
    }
  };
  function buildPack(K) {
    const lvl = { debutant: 'Je suis débutant : explique sans jargon et justifie chaque choix simplement.', intermediaire: 'J’ai un niveau intermédiaire : explique les choix importants, sans détailler les bases.', expert: 'Je suis expert : va droit au but.' }[K.level];
    const tool = { chat: 'Nous travaillons dans une conversation Claude.', code: 'Tu travailles avec Claude Code directement dans le dossier du projet : lis les fichiers existants avant de proposer quoi que ce soit, et ne modifie rien sans me montrer le plan.', api: 'Le résultat sera utilisé via l’API Claude : sois précis sur les formats d’entrée et de sortie.' }[K.tool];
    const typeL = TYPES.find((t) => t[0] === K.type)[1];
    const role = { app: 'un chef de projet technique et développeur senior', contenu: 'un directeur éditorial expérimenté', analyse: 'un analyste rigoureux', apprendre: 'un formateur expérimenté', business: 'un consultant en création d’activité, pragmatique', autre: 'un chef de projet expérimenté' }[K.type];
    const ctx = `CONTEXTE\nProjet : ${K.name.trim()} (${typeL.toLowerCase()})\nObjectif final : ${K.goal.trim()}\n${K.who.trim() ? 'Pour qui : ' + K.who.trim() + '\n' : ''}${K.existing.trim() ? 'Ce qui existe : ' + K.existing.trim() + '\n' : ''}${K.constraints.trim() ? 'Contraintes du projet : ' + K.constraints.trim() + '\n' : ''}Niveau : ${lvl}\nOutil : ${tool}`;
    const rules = (extra = []) => `CONTRAINTES / RÈGLES\n${extra.map((x) => '- ' + x + '\n').join('')}- Réponds en français.\n- Marque tes affirmations importantes [SÛR], [PROBABLE] ou [À VÉRIFIER].\n- Présente comme réels uniquement les chiffres, faits et exemples que je t’ai donnés.\n- Si une information manque, demande-la plutôt que de la supposer.`;
    const persona = `RÔLE / PERSONA\nTu es ${role}.`;
    return [
      { title: 'Cadrage', when: 'À utiliser en premier, avant toute production.', content: `${persona}\n\n${ctx}\n\nACTION\nAide-moi à cadrer ce projet avant de commencer, en une fiche de cadrage claire.\n\nÉTAPES\n1. Reformule le projet en 2 phrases.\n2. Pose-moi au maximum 5 questions, une à la fois, sur ce qui n’est pas clair.\n3. Rédige la fiche de cadrage : objectif mesurable, public, ce qui est inclus, ce qui est exclu (au moins 3 points), contraintes, critères de réussite.\n\nEXEMPLES\nCritères de réussite mesurables (« 10 personnes testent la version 1 avant le 30 juin », « le site charge en moins de 2 secondes »).\n\n${rules(['Une question à la fois, avant la fiche. C’est important !'])}\n\nMODÈLE DE RÉPONSE\nLa fiche avec un titre par rubrique, en puces.\n\nTABLEAU DES RISQUES\nTermine par : Risque | Probabilité | Impact | Parade.\n\nRAPPEL\nPose une seule question à la fois avant d’écrire la fiche. C’est important !` },
      { title: 'Plan', when: 'Une fois la fiche de cadrage validée : colle-la à la place de [FICHE DE CADRAGE].', content: `${persona}\n\n${ctx}\nFiche de cadrage :\n[Colle ici la fiche de cadrage validée]\n\nACTION\nDécoupe le projet en étapes courtes et réalistes, chacune avec un livrable vérifiable.\n\nÉTAPES\n1. Présente le plan global.\n2. Pour chaque étape : objectif, livrable vérifiable, durée estimée, dépendances.\n3. Indique ce qu’on peut couper si le temps manque.\n\n${rules(['Chaque étape tient en une semaine maximum'])}\n\nMODÈLE DE RÉPONSE\nUn tableau : Étape | Objectif | Livrable vérifiable | Durée estimée | Dépend de.\n\nÉTAPES UNE À UNE\nPrésente d’abord le plan global, puis détaille une étape à la fois quand j’écris « suivant ».\n\nRAPPEL\nChaque étape a un livrable vérifiable. C’est important !` },
      { title: 'Première tâche', when: 'Pour réaliser la première étape du plan.', content: `${persona}\n\n${ctx}\nÉtape en cours :\n[Colle ici l’étape 1 du plan]\n\nACTION\nRéalise cette étape avec moi, jusqu’à son livrable.\n\nÉTAPES\n1. Dis-moi en 3 lignes ce que tu vas faire et ce dont tu as besoin de ma part.\n2. Réalise l’étape.\n3. Termine par la liste de ce qui a été fait et de ce qui reste.\n\n${rules(['Reste dans le périmètre de cette étape uniquement'])}\n\nMODÈLE DE RÉPONSE\nLe livrable, puis deux listes à puces : « Fait » et « Reste à faire ».\n\nVÉRIFICATION FINALE (avant de répondre)\n[ ] Le livrable de l’étape est produit\n[ ] Les contraintes du projet sont respectées\n[ ] Chaque fait est réel ou signalé\n\nRAPPEL\nUniquement le périmètre de cette étape. C’est important !` },
      { title: 'Revue', when: 'Après chaque étape terminée, ou une fois par semaine.', content: `RÔLE / PERSONA\nTu es un mentor exigeant mais bienveillant, spécialiste des projets de type « ${typeL.toLowerCase()} ».\n\n${ctx}\nCe qui est fait : [à compléter]\nCe qui bloque : [à compléter]\n\nACTION\nFais une revue honnête du projet et propose une seule prochaine action.\n\nÉTAPES\n1. Résume l’état du projet en 3 phrases.\n2. Compare avec l’objectif final : est-il toujours le bon ?\n3. Identifie le principal risque actuel.\n4. Propose une seule prochaine action, faisable en moins de 2 heures.\n\n${rules()}\n\nMODÈLE DE RÉPONSE\n4 parties numérotées, courtes.\n\nRAPPEL\nUne seule prochaine action, faisable en moins de 2 heures. C’est important !` }
    ];
  }

  // ================= AVIS =================
  const FB_CATS = ['Idée', 'Problème', 'Modèle manquant', 'Design', 'Autre'];
  V.avis = (root) => {
    const st = PS.state;
    let rating = 0, cat = 'Idée';
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('chat', 'sm')} Avis et retours</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Aide-nous à améliorer le site</h1><p>Dis ce qui t’a aidé, ce qui bloque ou ce qui manque.</p></div></div>
      <div class="notice" style="margin-bottom:20px">${icon('info')}<p><b>Aucun avis publié pour l’instant.</b> Le site est nouveau : nous n’affichons ni témoignages, ni notes, ni nombre d’utilisateurs inventés. Ton avis est enregistré <b>uniquement sur cet appareil</b> ; il n’est envoyé nulle part. Tu peux l’exporter pour le transmettre.</p></div>
      <div class="grid g2" style="align-items:start">
        <form class="card" id="fbForm" novalidate>
          <h3>Donner mon avis</h3>
          <div class="field"><span class="lbl" id="stL">Ta note <span class="muted">(facultatif)</span></span><div class="stars" role="radiogroup" aria-labelledby="stL">${[1, 2, 3, 4, 5].map((n) => `<input type="radio" name="st" id="st${n}" value="${n}"><label for="st${n}" title="${n} sur 5">${icon('star')}<span class="sr">${n} sur 5</span></label>`).join('')}</div></div>
          <div class="field"><span class="lbl" id="fcL">Catégorie</span><div class="chips" role="group" aria-labelledby="fcL">${FB_CATS.map((c) => `<button type="button" class="chip" data-fc="${c}" aria-pressed="${c === cat}">${c}</button>`).join('')}</div></div>
          <div class="field"><label class="lbl" for="fbMsg">Ton message</label><textarea id="fbMsg" rows="5" maxlength="4000" placeholder="Ce qui t’a aidé, ce qui t’a bloqué, ce que tu aimerais trouver…"></textarea></div>
          <button class="btn primary" type="submit">${icon('save', 'sm')}Enregistrer mon avis</button>
        </form>
        <div class="card"><div class="row" style="margin-bottom:8px"><h3 style="margin:0">Mes avis enregistrés</h3><span class="spacer"></span><button class="btn sm" type="button" id="fbExp">${icon('download', 'sm')}Exporter</button><button class="btn sm" type="button" id="fbCp">${icon('copy', 'sm')}Copier</button></div><div id="fbList"></div></div>
      </div>`;
    const starsEl = $('.stars', root);
    const paint = () => $$('label', starsEl).forEach((l, i) => l.classList.toggle('on', i < rating));
    starsEl.addEventListener('change', (e) => { rating = +e.target.value; paint(); });
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-fc]'); if (c) { cat = c.dataset.fc; $$('[data-fc]', root).forEach((b) => b.setAttribute('aria-pressed', b === c)); }
      const d = e.target.closest('[data-fbdel]'); if (d) { st.feedback = st.feedback.filter((x) => x.id !== d.dataset.fbdel); PS.save(); list(); PS.toast('Avis supprimé', 'trash'); }
    });
    $('#fbForm', root).addEventListener('submit', (e) => {
      e.preventDefault(); const m = $('#fbMsg', root).value.trim();
      if (m.length < 3) { PS.toast('Écris quelques mots avant d’enregistrer.', 'info'); $('#fbMsg', root).focus(); return; }
      st.feedback.unshift({ id: PS.uid(), rating, category: cat, message: m, at: Date.now() }); PS.save();
      $('#fbMsg', root).value = ''; rating = 0; $$('input[name=st]', root).forEach((i) => (i.checked = false)); paint(); list();
      PS.toast('Merci ! Ton avis est enregistré sur cet appareil.');
    });
    const asText = () => st.feedback.map((f) => `[${f.category}] ${f.rating ? f.rating + '/5 — ' : ''}${PS.fmtDate(f.at)}\n${f.message}`).join('\n\n');
    $('#fbExp', root).onclick = () => { if (!st.feedback.length) return PS.toast('Aucun avis à exporter.', 'info'); PS.download('prompt-studio-avis.json', JSON.stringify({ app: 'prompt-studio', exportedAt: new Date().toISOString(), feedback: st.feedback }, null, 2)); };
    $('#fbCp', root).onclick = () => { if (!st.feedback.length) return PS.toast('Aucun avis à copier.', 'info'); PS.copyPrompt(asText(), 'Avis copiés'); };
    function list() {
      $('#fbList', root).innerHTML = st.feedback.length ? st.feedback.map((f) => `<div class="fb-item"><div class="row"><span class="tag accent">${esc(f.category)}</span>${f.rating ? `<span class="fb-stars" aria-label="${f.rating} sur 5">${'★'.repeat(f.rating)}<span class="muted">${'★'.repeat(5 - f.rating)}</span></span>` : ''}<span class="spacer"></span><span class="tiny muted">${PS.fmtDate(f.at)}</span><button class="icon-btn" type="button" data-fbdel="${f.id}" aria-label="Supprimer cet avis">${icon('trash', 'sm')}</button></div><p style="margin:8px 0 0;white-space:pre-wrap">${esc(f.message)}</p></div>`).join('')
        : `<p class="muted small" style="margin:0">Aucun avis pour l’instant. Le tien sera le premier.</p>`;
    }
    list();
  };

  // ================= RÉGLAGES =================
  V.reglages = (root) => {
    const st = PS.state;
    const n = st.projects.length, np = st.projects.reduce((a, p) => a + p.prompts.length, 0);
    const MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5'];
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('settings', 'sm')} Réglages</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Réglages</h1></div></div>
      <div class="grid g2" style="align-items:start">
        <div class="stack">
          <div class="card"><h3>Apparence</h3><p class="small muted">Le thème « Système » suit le réglage de ton appareil.</p>
            <div class="seg" role="group" aria-label="Thème">${[['system', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<button type="button" data-theme-set="${v}" aria-pressed="${st.settings.theme === v}">${l}</button>`).join('')}</div></div>
          <div class="card"><h3>Prompts</h3>${PS.toggleHtml('set', 'french', 'Ajouter « Réponds en français » par défaut', 'Utilisé par l’assistant détaillé pour les nouveaux prompts.', st.settings.french !== false)}
            <div class="field" style="margin:14px 0 0"><span class="lbl" id="sTgL">IA visée par défaut</span><span class="hint">Adapte légèrement les prompts : sections et balises pour Claude, titres et phrase de démarrage pour ChatGPT, comparaison pour Gemini. « Ouvrir dans Claude » n’apparaît que pour Claude.</span><div class="seg" role="group" aria-labelledby="sTgL">${Object.entries(PS.TARGETS).map(([v, l]) => `<button type="button" data-target-set="${v}" aria-pressed="${PS.currentTarget() === v}">${l}</button>`).join('')}</div></div>
            <div class="field" style="margin:14px 0 0"><label class="lbl" for="sProfil">Mon profil <span class="muted">(facultatif)</span></label><span class="hint">Ajouté comme « Profil fixe » aux prompts créés en une phrase. Ne mets rien de confidentiel.</span><textarea id="sProfil" rows="3" maxlength="1200" placeholder="Qui tu es, ton niveau, tes outils, tes préférences">${esc(st.settings.profil || '')}</textarea></div></div>
          <div class="card"><h3>Mes données</h3><p class="small muted">${n} projet${n > 1 ? 's' : ''}, ${np} prompt${np > 1 ? 's' : ''}, ${st.feedback.length} avis. <span id="sStore">Calcul de l’espace utilisé…</span></p>
            <div class="btn-row"><button class="btn" type="button" id="sExp">${icon('download', 'sm')}Tout exporter (JSON)</button><button class="btn" type="button" id="sImp">${icon('upload', 'sm')}Importer</button></div></div>
          <div class="card danger-zone"><h3>Tout supprimer</h3><p class="small muted">Efface projets, avis, brouillons et clé API de ce navigateur. Impossible à annuler.</p><button class="btn danger" type="button" id="sDel">${icon('trash', 'sm')}Supprimer toutes mes données</button></div>
        </div>
        <div class="stack">
          <div class="card"><h3>${icon('key', 'sm')} Clé API Claude <span class="tag">Facultatif</span></h3>
            <p class="small">Sert uniquement aux boutons « Améliorer avec Claude » et « Version IA » (qui suivent les mêmes méthodes que le site : 4 étapes, ASPECCT et blocs de fiabilité). Tout le reste du site fonctionne sans clé.</p>
            <div class="notice warn" style="margin-bottom:14px">${icon('alert')}<p>La clé est enregistrée <b>en clair dans ce navigateur</b> (localStorage) et envoyée directement à l’API d’Anthropic depuis ton appareil. N’utilise pas cette option sur un ordinateur partagé. Chaque demande est facturée sur ton compte Anthropic.</p></div>
            <div class="field"><label class="lbl" for="sKey">Clé API</label><div class="row" style="flex-wrap:nowrap"><input id="sKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(PS.getKey())}"><button class="icon-btn" type="button" id="sShow" aria-label="Afficher la clé">${icon('eye')}</button></div></div>
            <div class="field"><label class="lbl" for="sModel">Modèle</label><span class="hint">Identifiant du modèle Anthropic. Tu peux en saisir un autre.</span><input id="sModel" type="text" list="sModels" value="${esc(st.settings.model)}"><datalist id="sModels">${MODELS.map((m) => `<option value="${m}">`).join('')}</datalist></div>
            <div class="btn-row"><button class="btn primary" type="button" id="sKeySave">${icon('save', 'sm')}Enregistrer</button><button class="btn ghost" type="button" id="sKeyDel">Supprimer la clé</button></div></div>
          <div class="card flat"><h3>À propos</h3><p class="small muted" style="margin:0">Prompt Studio v1.0 — site statique, sans compte, sans traceur. Ce n’est pas un produit officiel d’Anthropic ; « Claude » est une marque d’Anthropic.</p></div>
        </div>
      </div>`;
    root.addEventListener('click', (e) => { const t = e.target.closest('[data-target-set]'); if (t) { st.settings.target = t.dataset.targetSet; PS.save(); $$('[data-target-set]', root).forEach((x) => x.setAttribute('aria-pressed', x === t)); PS.toast('IA visée : ' + PS.TARGETS[st.settings.target]); } });
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-theme-set]'); if (b) { st.settings.theme = b.dataset.themeSet; PS.save(); PS.applyTheme(); $$('[data-theme-set]', root).forEach((x) => x.setAttribute('aria-pressed', x === b)); } });
    root.addEventListener('change', (e) => { if (e.target.dataset.set) { st.settings[e.target.dataset.set] = e.target.checked; e.target.closest('.toggle').classList.toggle('on', e.target.checked); PS.save(); } });
    PS.storageInfo().then((si) => { const el = $('#sStore', root); if (!el) return;
      const mb = (x) => x < 1048576 ? Math.max(1, Math.round(x / 1024)) + ' Ko' : (x / 1048576).toFixed(1).replace('.', ',') + ' Mo';
      el.textContent = si.backend === 'idb' ? `Stockage : base de données du navigateur (IndexedDB), ${mb(si.data)} de données. Espace disponible pour le site : environ ${si.quota > 1073741824 ? (si.quota / 1073741824).toFixed(1).replace('.', ',') + ' Go' : mb(si.quota)}. Exporte quand même régulièrement : tes données ne sont que sur cet appareil.`
        : `Stockage de secours (localStorage, environ 5 Mo) : ${mb(si.used)} utilisés. IndexedDB n’est pas disponible dans ce navigateur${PS.initError ? ' (' + PS.initError.message + ')' : ''}. Exporte régulièrement.`; });
    $('#sProfil', root).addEventListener('input', (e) => { st.settings.profil = e.target.value; PS.saveSoon(); });
    $('#sShow', root).onclick = () => { const i = $('#sKey', root); i.type = i.type === 'password' ? 'text' : 'password'; };
    $('#sKeySave', root).onclick = () => { const k = $('#sKey', root).value.trim(); st.settings.model = $('#sModel', root).value.trim() || 'claude-sonnet-5-5'; PS.setKey(k); PS.save(); PS.toast(k ? 'Clé et modèle enregistrés' : 'Modèle enregistré'); };
    $('#sKeyDel', root).onclick = () => { PS.setKey(''); $('#sKey', root).value = ''; PS.toast('Clé supprimée', 'trash'); };
    $('#sExp', root).onclick = () => PS.download(`prompt-studio-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ app: 'prompt-studio', version: 1, exportedAt: new Date().toISOString(), projects: st.projects, feedback: st.feedback, settings: { theme: st.settings.theme, model: st.settings.model, french: st.settings.french, target: st.settings.target } }, null, 2));
    $('#sImp', root).onclick = () => PS.importer.pickFiles();
    $('#sDel', root).onclick = async () => {
      if (await PS.confirmDialog({ title: 'Supprimer toutes les données ?', text: 'Projets, prompts, versions, avis, brouillons et clé API seront effacés de ce navigateur.', ok: 'Tout supprimer', danger: true, typed: 'SUPPRIMER' })) {
        await PS.resetAll(); PS.applyTheme(); PS.toast('Toutes les données ont été supprimées', 'trash'); location.hash = '#/accueil';
      }
    };
  };
})();
