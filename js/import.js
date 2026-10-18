/* Prompt Studio — import de fichiers et de dossiers (sélection multiple, dossier, glisser-déposer) */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;

  const MAX_SIZE = 500 * 1024;          // au-delà : ignoré
  const MAX_FILES = 1000;               // garde-fou
  const LIMIT = 5 * 1024 * 1024;        // estimation de la limite du stockage local (caractères)
  const BINARY_EXT = new Set(('png jpg jpeg gif webp bmp ico tif tiff heic heif avif psd ai sketch fig pdf zip gz tgz bz2 xz rar 7z tar dmg iso exe dll so dylib bin class jar war apk ipa ' +
    'mp3 wav ogg flac m4a aac mp4 mov avi mkv webm wmv woff woff2 ttf otf eot doc docx xls xlsx ppt pptx odt ods odp key numbers pages sqlite db wasm pyc o a lib').split(' '));
  const IGNORED_DIRS = new Set(['node_modules', '__MACOSX', '__pycache__']);

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const supportsDir = 'webkitdirectory' in document.createElement('input') && !isIOS && !isAndroid;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const fmtSize = (n) => (n < 1024 ? n + ' o' : n < 1024 * 1024 ? (n / 1024).toFixed(n < 10240 ? 1 : 0).replace('.', ',') + ' Ko' : (n / 1048576).toFixed(1).replace('.', ',') + ' Mo');
  const isHidden = (path) => path.split('/').some((seg) => seg.startsWith('.') || IGNORED_DIRS.has(seg));
  const extOf = (name) => { const m = /\.([^./]+)$/.exec(name); return m ? m[1].toLowerCase() : ''; };
  const baseTitle = (name) => name.replace(/\.[^./]+$/, '') || name;

  // ---------- Collecte ----------
  function fromFileList(list) {
    return Array.from(list || []).map((f) => ({ path: (f.webkitRelativePath || f.name).replace(/^\/+/, ''), file: f }));
  }
  // Parcourt récursivement les entrées d'un glisser-déposer
  function readAllEntries(reader) {
    return new Promise((resolve, reject) => {
      const all = [];
      const next = () => reader.readEntries((batch) => { if (!batch.length) return resolve(all); all.push(...batch); next(); }, reject);
      next();
    });
  }
  async function walkEntries(entries, out = [], hidden = { n: 0 }) {
    for (const entry of entries) {
      if (!entry) continue;
      const path = (entry.fullPath || entry.name).replace(/^\/+/, '');
      if (isHidden(path)) { hidden.n++; continue; }
      if (entry.isFile) {
        if (out.length >= MAX_FILES * 2) continue;
        try { const file = await new Promise((res, rej) => entry.file(res, rej)); out.push({ path, file }); } catch (e) { out.push({ path, file: null, error: 'Lecture impossible' }); }
      } else if (entry.isDirectory) {
        try { await walkEntries(await readAllEntries(entry.createReader()), out, hidden); } catch (e) { out.push({ path, file: null, error: 'Dossier illisible' }); }
      }
    }
    return { items: out, hidden: hidden.n };
  }
  async function fromDataTransfer(dt) {
    const entries = [], loose = [];
    Array.from(dt.items || []).forEach((it) => {
      if (it.kind !== 'file') return;
      const en = it.webkitGetAsEntry ? it.webkitGetAsEntry() : null;
      if (en) entries.push(en); else { const f = it.getAsFile(); if (f) loose.push(f); }
    });
    if (!entries.length && !loose.length && dt.files) loose.push(...dt.files);
    const r = await walkEntries(entries);
    return { items: r.items.concat(fromFileList(loose)), hidden: r.hidden };
  }

  // ---------- Analyse ----------
  function looksBinary(bytes) {
    const n = Math.min(bytes.length, 8192); let ctrl = 0;
    for (let i = 0; i < n; i++) { const b = bytes[i]; if (b === 0) return true; if (b < 9 || (b > 13 && b < 32)) ctrl++; }
    return n > 0 && ctrl / n > 0.1;
  }
  function decode(buf) {
    const bytes = new Uint8Array(buf);
    if (looksBinary(bytes)) return null;
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, ''); }
    catch (e) { try { return new TextDecoder('windows-1252').decode(bytes); } catch (x) { return null; } }
  }
  function asExport(text) {
    let d; try { d = JSON.parse(text); } catch (e) { return null; }
    let projects = [], feedback = [];
    if (d && d.app === 'prompt-studio') {
      if (d.project) projects = [d.project];
      if (Array.isArray(d.projects)) projects = projects.concat(d.projects);
      if (Array.isArray(d.feedback)) feedback = d.feedback.filter((x) => x && typeof x.message === 'string');
    } else if (d && Array.isArray(d.projects) && d.projects.every(PS.validProject)) projects = d.projects;
    else if (PS.validProject(d)) projects = [d];
    else return null;
    projects = projects.filter(PS.validProject).map(PS.sanitizeProject);
    if (!projects.length && !feedback.length) return null;
    return { projects, feedback };
  }
  async function analyze(collected) {
    let items = collected.items, hidden = collected.hidden || 0;
    const visible = items.filter((x) => { if (isHidden(x.path)) { hidden++; return false; } return true; });
    visible.sort((a, b) => a.path.localeCompare(b.path, 'fr', { numeric: true }));
    const res = { texts: [], exports: [], skipped: [], hidden, total: visible.length };
    for (let i = 0; i < visible.length; i++) {
      const { path, file, error } = visible[i];
      const name = path.split('/').pop();
      if (error || !file) { res.skipped.push({ path, reason: error || 'Lecture impossible' }); continue; }
      if (i >= MAX_FILES) { res.skipped.push({ path, reason: `Limite de ${MAX_FILES} fichiers par import` }); continue; }
      const ext = extOf(name);
      if (BINARY_EXT.has(ext)) { res.skipped.push({ path, size: file.size, reason: 'Fichier binaire (' + ext.toUpperCase() + ')' }); continue; }
      if (file.size > MAX_SIZE) { res.skipped.push({ path, size: file.size, reason: 'Trop volumineux (plus de 500 Ko)' }); continue; }
      if (file.size === 0) { res.skipped.push({ path, size: 0, reason: 'Fichier vide' }); continue; }
      let text = null;
      try { text = decode(await file.arrayBuffer()); } catch (e) { res.skipped.push({ path, reason: 'Lecture impossible' }); continue; }
      if (text == null) { res.skipped.push({ path, size: file.size, reason: 'Fichier binaire ou encodage non reconnu' }); continue; }
      if (!text.trim()) { res.skipped.push({ path, size: file.size, reason: 'Fichier vide' }); continue; }
      if (ext === 'json') { const ex = asExport(text); if (ex) { res.exports.push({ path, size: file.size, ...ex }); continue; } }
      res.texts.push({ path, name, size: file.size, title: baseTitle(name), content: text });
    }
    // Dossier racine commun → nom du projet ; sous-dossiers → étiquettes
    const segs = res.texts.map((t) => t.path.split('/'));
    const top = segs.length && segs.every((s) => s.length > 1 && s[0] === segs[0][0]) ? segs[0][0] : '';
    res.top = top;
    res.texts.forEach((t) => { const parts = t.path.split('/').slice(top ? 1 : 0, -1); t.tag = parts.join('/'); });
    return res;
  }

  // ---------- Stockage ----------
  const usedChars = () => { try { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || '').length; } return n; } catch (e) { return 0; } };
  // Un prompt importé est stocké deux fois : texte courant + version initiale
  const promptCost = (t) => JSON.stringify(t.content).length * 2 + JSON.stringify(t.title).length + (t.tag || '').length + 260;

  // ---------- Aperçu ----------
  function preview(res) {
    const st = PS.state;
    if (!res.total && !res.hidden) return PS.toast('Aucun fichier trouvé.', 'info');
    if (!res.texts.length && !res.exports.length) {
      return PS.modal({ title: 'Rien à importer', body: `<p>Aucun fichier utilisable n’a été trouvé.</p>${skippedHtml(res, true)}`, foot: '<button class="btn" type="button" data-close>Fermer</button>' });
    }
    const exProjects = res.exports.flatMap((e) => e.projects.map((p) => ({ p, from: e.path })));
    const exFeedback = res.exports.flatMap((e) => e.feedback);
    const defName = res.top || (res.texts.length === 1 ? res.texts[0].title : `Import du ${PS.fmtDay(Date.now())}`);
    const hasProjects = st.projects.length > 0;
    PS.modal({ title: 'Importer', wide: true,
      body: `<p class="muted" style="margin-top:-6px">${res.total} fichier${res.total > 1 ? 's' : ''} analysé${res.total > 1 ? 's' : ''}. Vérifie avant d’importer : rien n’est enregistré tant que tu n’as pas confirmé.</p>
        ${res.texts.length ? `<section class="imp-sec">
          <h3>${icon('file', 'sm')} Fichiers texte → prompts</h3>
          <div class="seg" role="group" aria-label="Destination" style="margin-bottom:12px"><button type="button" data-dest="new" aria-pressed="true">Nouveau projet</button><button type="button" data-dest="existing" aria-pressed="false" ${hasProjects ? '' : 'disabled title="Aucun projet existant"'}>Projet existant</button></div>
          <div class="field" id="impNewWrap"><label class="lbl" for="impName">Nom du projet</label><input id="impName" type="text" value="${esc(defName)}" data-nofocus></div>
          <div class="field" id="impExWrap" hidden><label class="lbl" for="impProj">Ajouter dans</label><select id="impProj">${st.projects.map((p) => `<option value="${p.id}">${esc(p.name)} (${p.prompts.length} prompt${p.prompts.length > 1 ? 's' : ''})</option>`).join('')}</select></div>
          <div class="row" style="margin-bottom:6px"><b id="impCount"></b><span class="spacer"></span><button class="btn sm ghost" type="button" id="impAll">Tout cocher</button><button class="btn sm ghost" type="button" id="impNone">Tout décocher</button></div>
          <p class="tiny muted" style="margin:0 0 8px">Un prompt par fichier. Titre = nom du fichier ; le sous-dossier devient une étiquette.</p>
          <ul class="imp-list" id="impList">${res.texts.map((t, i) => `<li><label><input type="checkbox" data-imp="${i}" checked><span class="imp-name"><b>${esc(t.title)}</b><span>${esc(t.path)}</span></span>${t.tag ? `<span class="tag">${icon('tag', 'sm')}${esc(t.tag)}</span>` : ''}<span class="imp-size">${fmtSize(t.size)}</span></label></li>`).join('')}</ul>
        </section>` : ''}
        ${exProjects.length || exFeedback.length ? `<section class="imp-sec">
          <h3>${icon('folder', 'sm')} Sauvegardes Prompt Studio</h3>
          <p class="tiny muted" style="margin:0 0 8px">Chaque projet sauvegardé est importé tel quel, comme un projet séparé (avec ses versions).</p>
          <ul class="imp-list">${exProjects.map((x, i) => `<li><label><input type="checkbox" data-exp="${i}" checked><span class="imp-name"><b>${esc(x.p.name)}</b><span>${x.p.prompts.length} prompt${x.p.prompts.length > 1 ? 's' : ''} · ${esc(x.from)}</span></span></label></li>`).join('')}
          ${exFeedback.length ? `<li><label><input type="checkbox" id="impFb" checked><span class="imp-name"><b>${exFeedback.length} avis</b><span>Ajoutés à tes avis enregistrés</span></span></label></li>` : ''}</ul>
        </section>` : ''}
        ${skippedHtml(res)}
        <section class="imp-sec"><div class="row" style="margin-bottom:6px"><b>Espace de stockage</b><span class="spacer"></span><span class="small muted" id="impStoreTxt"></span></div>
          <div class="meter" aria-hidden="true"><i id="impMeterUsed"></i><i id="impMeterNew" class="new"></i></div>
          <div id="impStoreWarn"></div></section>`,
      foot: `<button class="btn ghost" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="impGo">${icon('upload', 'sm')}Importer</button>`,
      onMount: (c, close) => {
        let dest = 'new';
        const used = usedChars();
        const upd = () => {
          const tSel = $$('[data-imp]', c).filter((x) => x.checked).map((x) => res.texts[+x.dataset.imp]);
          const eSel = $$('[data-exp]', c).filter((x) => x.checked).map((x) => exProjects[+x.dataset.exp].p);
          const fb = $('#impFb', c) && $('#impFb', c).checked ? exFeedback : [];
          const add = tSel.reduce((a, t) => a + promptCost(t), 0) + eSel.reduce((a, p) => a + JSON.stringify(p).length, 0) + JSON.stringify(fb).length + (tSel.length && dest === 'new' ? 300 : 0);
          const after = used + add;
          if ($('#impCount', c)) $('#impCount', c).textContent = `${tSel.length} fichier${tSel.length > 1 ? 's' : ''} sur ${res.texts.length} à importer`;
          $('#impStoreTxt', c).textContent = `≈ ${fmtSize(after)} sur ≈ 5 Mo après import (+${fmtSize(add)})`;
          $('#impMeterUsed', c).style.width = Math.min(100, (used / LIMIT) * 100) + '%';
          $('#impMeterNew', c).style.width = Math.max(0, Math.min(100 - (used / LIMIT) * 100, (add / LIMIT) * 100)) + '%';
          const over = after > LIMIT, near = after > LIMIT * 0.8;
          $('#impStoreWarn', c).innerHTML = over ? `<div class="notice warn" style="margin-top:10px">${icon('alert')}<p><b>Trop volumineux pour le stockage du navigateur.</b> Décoche des fichiers, ou exporte puis supprime d’anciens projets.</p></div>`
            : near ? `<div class="notice warn" style="margin-top:10px">${icon('alert')}<p><b>Proche de la limite du stockage (environ 5 Mo).</b> L’import devrait passer, mais pense à exporter tes projets régulièrement.</p></div>`
            : `<p class="tiny muted" style="margin:8px 0 0">Estimation. Chaque prompt importé est gardé deux fois (texte actuel + première version de l’historique).</p>`;
          const n = tSel.length + eSel.length + fb.length;
          const go = $('#impGo', c); go.disabled = over || n === 0;
          go.innerHTML = `${icon('upload', 'sm')}Importer${tSel.length + eSel.length ? ` (${tSel.length ? tSel.length + ' prompt' + (tSel.length > 1 ? 's' : '') : ''}${tSel.length && eSel.length ? ' + ' : ''}${eSel.length ? eSel.length + ' projet' + (eSel.length > 1 ? 's' : '') : ''})` : ''}`;
          return { tSel, eSel, fb };
        };
        c.addEventListener('change', (e) => { if (e.target.matches('[data-imp],[data-exp],#impFb')) upd(); });
        c.addEventListener('click', (e) => {
          const b = e.target.closest('[data-dest]'); if (b && !b.disabled) { dest = b.dataset.dest; $$('[data-dest]', c).forEach((x) => x.setAttribute('aria-pressed', x === b)); $('#impNewWrap', c).hidden = dest !== 'new'; $('#impExWrap', c).hidden = dest !== 'existing'; upd(); }
        });
        if ($('#impAll', c)) { $('#impAll', c).onclick = () => { $$('[data-imp]', c).forEach((x) => (x.checked = true)); upd(); }; $('#impNone', c).onclick = () => { $$('[data-imp]', c).forEach((x) => (x.checked = false)); upd(); }; }
        $('#impGo', c).onclick = () => {
          const sel = upd();
          const name = ($('#impName', c) && $('#impName', c).value.trim()) || defName;
          const target = dest === 'existing' ? $('#impProj', c).value : null;
          close();
          run(res, sel, { name, target });
        };
        upd();
      } });
  }
  function skippedHtml(res, open) {
    if (!res.skipped.length && !res.hidden) return '';
    return `<section class="imp-sec"><details class="more" ${open ? 'open' : ''}><summary>${icon('info', 'sm')} ${res.skipped.length} fichier${res.skipped.length > 1 ? 's' : ''} ignoré${res.skipped.length > 1 ? 's' : ''}${res.hidden ? ` · ${res.hidden} élément${res.hidden > 1 ? 's' : ''} caché${res.hidden > 1 ? 's' : ''} non lu${res.hidden > 1 ? 's' : ''} (.git, .DS_Store, node_modules…)` : ''}</summary>
      ${res.skipped.length ? `<ul class="imp-list skipped">${res.skipped.slice(0, 200).map((s) => `<li><span class="imp-name"><b>${esc(s.path)}</b><span>${esc(s.reason)}</span></span>${s.size != null ? `<span class="imp-size">${fmtSize(s.size)}</span>` : ''}</li>`).join('')}${res.skipped.length > 200 ? `<li class="muted small">… et ${res.skipped.length - 200} autres</li>` : ''}</ul>` : ''}</details></section>`;
  }

  // ---------- Import ----------
  function run(res, { tSel, eSel, fb }, { name, target }) {
    const st = PS.state;
    const snapshot = JSON.stringify(st);
    const now = Date.now();
    let openId = null, nPrompts = 0;
    // Sauvegardes Prompt Studio
    const ids = new Set(st.projects.map((p) => p.id));
    eSel.slice().reverse().forEach((p0) => { const p = PS.clone(p0); if (ids.has(p.id)) PS.reId(p); ids.add(p.id); st.projects.unshift(p); openId = p.id; nPrompts += p.prompts.length; });
    if (fb.length) {
      const fbIds = new Set(st.feedback.map((x) => x.id));
      fb.filter((x) => !fbIds.has(x.id)).forEach((x) => st.feedback.push({ id: x.id || PS.uid(), rating: Math.max(0, Math.min(5, +x.rating || 0)), category: String(x.category || 'Autre'), message: String(x.message), at: +x.at || now }));
    }
    // Fichiers texte
    if (tSel.length) {
      let p = target && PS.findProject(target);
      if (!p) { p = { id: PS.uid(), name, description: `Importé depuis ${res.top ? 'le dossier « ' + res.top + ' »' : tSel.length > 1 ? tSel.length + ' fichiers' : 'un fichier'} le ${PS.fmtDay(now)}.`, tags: ['import'], notes: '', createdAt: now, updatedAt: now, prompts: [] }; st.projects.unshift(p); }
      const prompts = tSel.map((t, i) => ({ id: PS.uid(), title: t.title, tags: t.tag ? [t.tag] : [], content: t.content, createdAt: now + i, updatedAt: now + i,
        versions: [{ id: PS.uid(), content: t.content, note: 'Importé depuis « ' + t.path + ' »', at: now + i }] }));
      p.prompts = prompts.concat(p.prompts); p.updatedAt = now;
      if (target) { st.projects = [p].concat(st.projects.filter((x) => x !== p)); }
      openId = p.id; nPrompts += prompts.length;
    }
    if (!PS.save()) {
      PS.state = JSON.parse(snapshot); PS.save();
      PS.toast('Import annulé : le stockage du navigateur est plein. Rien n’a été modifié.', 'alert', 5000);
      return;
    }
    const ignored = res.skipped.length;
    PS.toast(`${nPrompts} prompt${nPrompts > 1 ? 's' : ''} importé${nPrompts > 1 ? 's' : ''}, ${ignored} ignoré${ignored > 1 ? 's' : ''}${eSel.length ? ` (dont ${eSel.length} projet${eSel.length > 1 ? 's' : ''} sauvegardé${eSel.length > 1 ? 's' : ''})` : ''}`, 'check', 4000);
    if (openId) { const h = '#/projets/' + openId; if (location.hash === h) PS.route(); else location.hash = h; }
    else PS.route();
  }

  // ---------- Points d'entrée ----------
  let busy = false;
  async function handle(collectPromise) {
    if (busy) return; busy = true;
    try {
      const collected = await collectPromise;
      if (!collected || (!collected.items.length && !collected.hidden)) return;
      if (collected.items.length > 30) PS.toast('Analyse des fichiers…', 'info', 1500);
      preview(await analyze(collected));
    } catch (e) { console.warn(e); PS.toast('Impossible de lire ces fichiers.', 'alert'); }
    finally { busy = false; }
  }
  function pick(dir) {
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true;
    if (dir) { i.webkitdirectory = true; i.setAttribute('webkitdirectory', ''); }
    i.style.display = 'none'; document.body.appendChild(i);
    i.addEventListener('change', () => { const list = i.files; handle(Promise.resolve({ items: fromFileList(list), hidden: 0 })); i.remove(); }, { once: true });
    i.addEventListener('cancel', () => i.remove(), { once: true });
    i.click();
  }
  function bindDrop(root) {
    const ov = document.createElement('div');
    ov.className = 'drop-overlay'; ov.hidden = true;
    ov.innerHTML = `<div class="drop-card">${icon('upload', 'lg')}<b>Dépose ici tes fichiers ou un dossier</b><span>Un dossier devient un projet, chaque fichier texte devient un prompt.</span></div>`;
    root.appendChild(ov);
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    root.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; ov.hidden = false; });
    root.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    root.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.hidden = true; });
    root.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; ov.hidden = true; handle(fromDataTransfer(e.dataTransfer)); });
  }

  PS.importer = {
    supportsDir, isIOS, isAndroid,
    noDirNote: isIOS ? 'Sur iPhone et iPad, Safari ne permet pas de choisir un dossier entier. Utilise « Des fichiers… » puis, dans l’app Fichiers, touche « Sélectionner » pour en choisir plusieurs.'
      : 'Ce navigateur ne permet pas de choisir un dossier entier. Utilise « Des fichiers… » et sélectionne plusieurs fichiers à la fois.',
    dropHint: coarse ? '' : 'Astuce : tu peux aussi glisser-déposer un dossier ou plusieurs fichiers sur cette page.',
    pickFiles: () => pick(false), pickDir: () => pick(true), bindDrop,
    // exposés pour les tests
    _walkEntries: walkEntries, _analyze: analyze, _fromFileList: fromFileList, _handle: handle
  };
})();
