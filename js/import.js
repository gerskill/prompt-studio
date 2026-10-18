/* Prompt Studio — import de fichiers et de dossiers (sélection multiple, dossier, glisser-déposer) */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;

  const MAX_SIZE = 500 * 1024;          // au-delà : ignoré
  const MAX_FILES = 1000;               // garde-fou
  const MAX_DOC_SIZE = 15 * 1024 * 1024; // .docx / .odt : le texte est extrait, les images ignorées
  const BINARY_EXT = new Set(('png jpg jpeg gif webp bmp ico tif tiff heic heif avif psd ai sketch fig pdf zip gz tgz bz2 xz rar 7z tar dmg iso exe dll so dylib bin class jar war apk ipa ' +
    'mp3 wav ogg flac m4a aac mp4 mov avi mkv webm wmv woff woff2 ttf otf eot doc xls xlsx ppt pptx ods odp key numbers pages sqlite db wasm pyc o a lib').split(' '));
  const IGNORED_DIRS = new Set(['node_modules', '__MACOSX', '__pycache__']);

  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const supportsDir = 'webkitdirectory' in document.createElement('input') && !isIOS && !isAndroid;
  const coarse = matchMedia('(pointer: coarse)').matches;

  const fmtSize = (n) => (n < 1024 ? n + ' o' : n < 1024 * 1024 ? (n / 1024).toFixed(n < 10240 ? 1 : 0).replace('.', ',') + ' Ko' : n < 1073741824 ? (n / 1048576).toFixed(1).replace('.', ',') + ' Mo' : (n / 1073741824).toFixed(1).replace('.', ',') + ' Go');
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
  // ---------- Documents Word / OpenDocument : extraction du texte (zip lu sans bibliothèque) ----------
  async function unzipEntry(file, wanted) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Navigateur trop ancien pour lire ce document');
    const buf = new Uint8Array(await file.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Document illisible (archive non reconnue)');
    const count = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    for (let n = 0; n < count && off + 46 <= buf.length; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true), usize = dv.getUint32(off + 24, true);
      const nl = dv.getUint16(off + 28, true), xl = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), loc = dv.getUint32(off + 42, true);
      const name = dec.decode(buf.subarray(off + 46, off + 46 + nl));
      off += 46 + nl + xl + cl;
      if (name !== wanted) continue;
      if (usize > 20 * 1048576) throw new Error('Texte du document trop volumineux');
      const start = loc + 30 + dv.getUint16(loc + 26, true) + dv.getUint16(loc + 28, true);
      const data = buf.subarray(start, start + csize);
      if (method === 0) return dec.decode(data);
      if (method !== 8) throw new Error('Compression du document non prise en charge');
      return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    throw new Error('Document illisible (contenu introuvable)');
  }
  const xmlText = (xml, para, extra = []) => {
    let t = xml.replace(/<w:tab\/>|<text:tab\/>/g, '\t').replace(/<w:br[^>]*\/>|<text:line-break\/>/g, '\n');
    para.forEach((tag) => { t = t.replace(new RegExp('</' + tag + '>', 'g'), '\n'); });
    extra.forEach(([a, b]) => { t = t.replace(a, b); });
    t = t.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
    return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };
  async function docText(file, ext) {
    if (ext === 'docx') return xmlText(await unzipEntry(file, 'word/document.xml'), ['w:p']);
    if (ext === 'odt') return xmlText(await unzipEntry(file, 'content.xml'), ['text:p', 'text:h']);
    return null;
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
      if (ext === 'docx' || ext === 'odt') {
        if (file.size > MAX_DOC_SIZE) { res.skipped.push({ path, size: file.size, reason: 'Document trop volumineux (plus de 15 Mo)' }); continue; }
        try { const txt = await docText(file, ext); if (!txt) { res.skipped.push({ path, size: file.size, reason: 'Document sans texte' }); continue; } res.texts.push({ path, name, size: file.size, title: baseTitle(name), content: txt, converted: ext.toUpperCase() }); }
        catch (e) { console.warn('[Prompt Studio] Lecture du document impossible', path, e); res.skipped.push({ path, size: file.size, reason: e.message || 'Document illisible' }); }
        continue;
      }
      if (ext === 'pdf') { res.skipped.push({ path, size: file.size, reason: 'PDF non lisible ici : copie son texte dans un fichier .txt' }); continue; }
      if (ext === 'doc') { res.skipped.push({ path, size: file.size, reason: 'Ancien format Word (.doc) : enregistre-le en .docx' }); continue; }
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

  // Chemin relatif au dossier racine (le nom du dossier racine peut changer)
  const relPath = (path, top) => (top && path.startsWith(top + '/') ? path.slice(top.length + 1) : path);

  // ---------- Stockage ----------
  // Un prompt importé est stocké deux fois : texte courant + version initiale
  const promptCost = (t) => JSON.stringify(t.content).length * 2 + JSON.stringify(t.title).length + (t.tag || '').length + 260;

  // ---------- Aperçu ----------
  function preview(res, si) {
    const st = PS.state;
    if (!res.total) {
      return PS.modal({ title: 'Aucun fichier à importer', body: `<div class="notice warn">${icon('alert')}<p>${res.hidden ? `Le dossier ne contient que des fichiers cachés ou ignorés (${res.hidden} : .git, .DS_Store, node_modules…).` : 'Le navigateur n’a transmis aucun fichier : le dossier choisi est peut-être vide, ou ne contient que des sous-dossiers vides.'}</p></div>
        <p class="small" style="margin-top:12px">Choisis un dossier qui contient des fichiers texte (.md, .txt, .docx…), ou utilise « Des fichiers… » pour les sélectionner un par un.</p>`, foot: '<button class="btn" type="button" data-close>Fermer</button>' });
    }
    if (!res.texts.length && !res.exports.length) {
      return PS.modal({ title: 'Rien à importer', body: `<div class="notice warn">${icon('alert')}<p>Aucun fichier lisible : Prompt Studio importe le texte (.md, .txt, .docx, .odt, code, JSON…). Les images, PDF et archives ne peuvent pas devenir des prompts.</p></div>${skippedHtml(res, true)}`, foot: '<button class="btn" type="button" data-close>Fermer</button>' });
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
          <ul class="imp-list" id="impList">${res.texts.map((t, i) => `<li><label><input type="checkbox" data-imp="${i}" checked><span class="imp-name"><b>${esc(t.title)}</b><span>${esc(t.path)}</span></span>${t.converted ? `<span class="tag accent" title="Texte extrait du document">${t.converted} → texte</span>` : ''}${t.tag ? `<span class="tag">${icon('tag', 'sm')}${esc(t.tag)}</span>` : ''}<span class="imp-size">${fmtSize(t.size)}</span></label></li>`).join('')}</ul>
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
        let dest = 'new', warned = false;
        const used = si.used, quota = si.quota, isIdb = si.backend === 'idb';
        const avail = Math.max(0, quota - used);
        const upd = () => {
          const tSel = $$('[data-imp]', c).filter((x) => x.checked).map((x) => res.texts[+x.dataset.imp]);
          const eSel = $$('[data-exp]', c).filter((x) => x.checked).map((x) => exProjects[+x.dataset.exp].p);
          const fb = $('#impFb', c) && $('#impFb', c).checked ? exFeedback : [];
          const add = tSel.reduce((a, t) => a + promptCost(t), 0) + eSel.reduce((a, p) => a + JSON.stringify(p).length, 0) + JSON.stringify(fb).length + (tSel.length && dest === 'new' ? 300 : 0);
          const after = used + add;
          if ($('#impCount', c)) $('#impCount', c).textContent = `${tSel.length} fichier${tSel.length > 1 ? 's' : ''} sur ${res.texts.length} à importer`;
          const cap = isIdb ? avail * 0.9 : quota - used;
          $('#impStoreTxt', c).textContent = isIdb ? `+${fmtSize(add)} · espace disponible ≈ ${fmtSize(avail)}` : `≈ ${fmtSize(after)} sur ≈ ${fmtSize(quota)} après import (+${fmtSize(add)})`;
          const scale = isIdb ? Math.max(add + used, Math.min(quota, Math.max((add + used) * 4, 50 * 1048576))) : quota;
          $('#impMeterUsed', c).style.width = Math.min(100, (used / scale) * 100) + '%';
          $('#impMeterNew', c).style.width = Math.max(0, Math.min(100 - (used / scale) * 100, (add / scale) * 100)) + '%';
          const over = add > cap, near = !isIdb && after > quota * 0.8;
          let excess = add - cap;
          const biggest = over ? tSel.slice().sort((a, b) => promptCost(b) - promptCost(a)).filter((t) => (excess > 0 ? ((excess -= promptCost(t)), true) : false)) : [];
          $('#impStoreWarn', c).innerHTML = over ? `<div class="notice warn" style="margin-top:10px">${icon('alert')}<p><b>Pas assez de place dans le stockage du navigateur.</b> Il manque environ ${fmtSize(add - cap)}. ${biggest.length ? `Décoche par exemple les fichiers les plus gros : ${biggest.slice(0, 4).map((t) => '« ' + esc(t.title) + ' » (' + fmtSize(t.size) + ')').join(', ')}${biggest.length > 4 ? '…' : '.'}` : 'Exporte puis supprime d’anciens projets.'}</p></div>${biggest.length ? `<button class="btn sm" type="button" id="impTrim" style="margin-top:8px">Décocher les ${biggest.length} plus gros fichiers</button>` : ''}`
            : near ? `<div class="notice warn" style="margin-top:10px">${icon('alert')}<p><b>Proche de la limite du stockage (environ 5 Mo).</b> L’import devrait passer, mais pense à exporter tes projets régulièrement.</p></div>`
            : `<p class="tiny muted" style="margin:8px 0 0">Estimation. Chaque prompt importé est gardé deux fois (texte actuel + première version de l’historique).${isIdb ? '' : ' Ce navigateur utilise le stockage de secours (environ 5 Mo).'}</p>`;
          if (over && !warned) { warned = true; requestAnimationFrame(() => { const w = $('#impStoreWarn', c); if (w && w.scrollIntoView) w.scrollIntoView({ block: 'nearest' }); }); }
          const trim = $('#impTrim', c);
          if (trim) trim.onclick = () => { const set = new Set(biggest); $$('[data-imp]', c).forEach((x) => { if (set.has(res.texts[+x.dataset.imp])) x.checked = false; }); upd(); };
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
          const go = $('#impGo', c); go.disabled = true; go.textContent = 'Import en cours…';
          run(res, sel, { name, target }).then((ok) => { if (!c.isConnected || !$('#impStoreTxt', c)) return; if (ok) close(); else { go.disabled = false; upd(); } });
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
  async function run(res, sel, opts) {
    try { return await runImport(res, sel, opts); }
    catch (e) { showError('L’import n’a pas abouti', e); return false; }
  }
  async function runImport(res, { tSel, eSel, fb }, { name, target }) {
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
        src: relPath(t.path, res.top), srcHash: PS.hash(t.content),
        versions: [{ id: PS.uid(), content: t.content, note: 'Importé depuis « ' + t.path + ' »', at: now + i }] }));
      if (!target && res.top) { p.srcRoot = res.top; p.syncedAt = now; }
      p.prompts = prompts.concat(p.prompts); p.updatedAt = now;
      if (target) { st.projects = [p].concat(st.projects.filter((x) => x !== p)); }
      openId = p.id; nPrompts += prompts.length;
    }
    if (!(await PS.save())) {
      const err = PS.lastSaveError;
      PS.state = JSON.parse(snapshot); await PS.save();
      showError('Import annulé : rien n’a été modifié', err || new Error('Enregistrement refusé par le navigateur'));
      return false;
    }
    $('#modal').close();
    const ignored = res.skipped.length;
    PS.toast(`${nPrompts} prompt${nPrompts > 1 ? 's' : ''} importé${nPrompts > 1 ? 's' : ''}, ${ignored} ignoré${ignored > 1 ? 's' : ''}${eSel.length ? ` (dont ${eSel.length} projet${eSel.length > 1 ? 's' : ''} sauvegardé${eSel.length > 1 ? 's' : ''})` : ''}`, 'check', 4000);
    if (openId) { const h = '#/projets/' + openId; if (location.hash === h) PS.route(); else location.hash = h; }
    else PS.route();
    return true;
  }
  // Message d'erreur visible avec la raison, détails dans la console
  function showError(title, e) {
    console.error('[Prompt Studio] ' + title, e);
    const reason = e ? (e.name && e.name !== 'Error' ? e.name + ' : ' : '') + (e.message || String(e)) : 'raison inconnue';
    const full = e && (e.name === 'QuotaExceededError' || /quota|plein/i.test(e.message || ''));
    PS.modal({ title, body: `<div class="notice warn">${icon('alert')}<p><b>Raison :</b> ${esc(reason)}</p></div>
      <p class="small" style="margin-top:12px">${full ? 'Le stockage du navigateur est plein : décoche des fichiers, ou exporte puis supprime d’anciens projets.' : 'Réessaie, ou importe moins de fichiers à la fois. Si le problème continue, copie le détail ci-dessous et envoie-le.'}</p>
      <pre class="prompt-box tiny" id="errDetail" tabindex="0" aria-label="Détail technique" style="max-height:160px">${esc(`${title}
${reason}
Navigateur : ${navigator.userAgent}
Stockage : ${PS.backend}
${(e && e.stack) || ''}`.slice(0, 2000))}</pre>`,
      foot: `<button class="btn" type="button" id="errCopy">${icon('copy', 'sm')}Copier le détail</button><button class="btn primary" type="button" data-close>Fermer</button>`,
      onMount: (c) => { $('#errCopy', c).onclick = () => PS.copyPrompt($('#errDetail', c).textContent, 'Détail copié'); } });
  }

  // ---------- Points d'entrée ----------
  let busy = false;
  async function handle(collectPromise, source) {
    if (busy) return; busy = true;
    try {
      const collected = await collectPromise;
      const n = collected ? collected.items.length : 0;
      console.info(`[Prompt Studio] Import (${source || '?'}) : ${n} fichier(s) reçu(s)` + (collected && collected.hidden ? `, ${collected.hidden} caché(s)` : ''));
      if (n > 30) PS.toast(`Analyse de ${n} fichiers…`, 'info', 1800);
      const res = await analyze(collected || { items: [], hidden: 0 });
      const si = await PS.storageInfo();
      preview(res, si);
    } catch (e) { showError('Impossible de lire ces fichiers', e); }
    finally { busy = false; }
  }
  // Mise à jour d'un projet depuis son dossier : même lecture que l'import, puis aperçu des différences
  async function handleResync(collectPromise, pid, source) {
    if (busy) return; busy = true;
    try {
      const collected = await collectPromise;
      const n = collected ? collected.items.length : 0;
      console.info(`[Prompt Studio] Mise à jour (${source || '?'}) : ${n} fichier(s) reçu(s)`);
      if (n > 30) PS.toast(`Analyse de ${n} fichiers…`, 'info', 1800);
      const res = await analyze(collected || { items: [], hidden: 0 });
      res.flat = !!n && collected.items.every((x) => !x.path.includes('/'));
      PS.resync.open(pid, res);
    } catch (e) { showError('Impossible de lire ce dossier', e); }
    finally { busy = false; }
  }
  // Champ fichier persistant, hors écran (pas display:none : Safari et certains navigateurs l'ignorent)
  const inputs = {};
  function getInput(dir) {
    const key = dir ? 'dir' : 'files';
    let i = inputs[key];
    if (!i || !document.body.contains(i)) {
      i = document.createElement('input');
      i.type = 'file'; i.multiple = true; i.className = 'sr-file'; i.tabIndex = -1; i.id = 'psImport-' + key;
      i.setAttribute('aria-hidden', 'true');
      if (dir) { i.webkitdirectory = true; i.setAttribute('webkitdirectory', ''); i.setAttribute('directory', ''); }
      let lastAt = 0;
      const onPick = (ev) => {
        const files = Array.from(i.files || []); // lire avant toute remise à zéro
        if (!files.length && Date.now() - lastAt < 1500) return; // « input » + « change » pour la même sélection
        lastAt = Date.now();
        try { i.value = ''; } catch (e) {}
        const src = (dir ? 'dossier' : 'fichiers') + '/' + ev.type, pid = pendingResync; pendingResync = null;
        const prom = Promise.resolve({ items: fromFileList(files), hidden: 0 });
        if (pid) handleResync(prom, pid, src); else handle(prom, src);
      };
      i.addEventListener('change', onPick);
      i.addEventListener('input', onPick);
      document.body.appendChild(i);
      inputs[key] = i;
    }
    try { i.value = ''; } catch (e) {}
    return i;
  }
  let pendingResync = null; // id du projet à mettre à jour, si le sélecteur a été ouvert pour ça
  function pick(dir, resyncPid) {
    pendingResync = resyncPid || null;
    try { const i = getInput(dir); i.click(); }
    catch (e) { showError('Impossible d’ouvrir le sélecteur de fichiers', e); }
  }
  function bindDrop(root, opts = {}) {
    const ov = document.createElement('div');
    ov.className = 'drop-overlay'; ov.hidden = true;
    ov.innerHTML = `<div class="drop-card">${icon('upload', 'lg')}<b>${esc(opts.title || 'Dépose ici tes fichiers ou un dossier')}</b><span>${esc(opts.text || 'Un dossier devient un projet, chaque fichier texte devient un prompt.')}</span></div>`;
    root.appendChild(ov);
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    root.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; ov.hidden = false; });
    root.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    root.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.hidden = true; });
    root.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; ov.hidden = true; const prom = fromDataTransfer(e.dataTransfer); if (opts.onDrop) opts.onDrop(prom); else handle(prom, 'glisser-déposer'); });
  }

  PS.importer = {
    supportsDir, isIOS, isAndroid,
    noDirNote: isIOS ? 'Sur iPhone et iPad, Safari ne permet pas de choisir un dossier entier. Utilise « Des fichiers… » puis, dans l’app Fichiers, touche « Sélectionner » pour en choisir plusieurs.'
      : 'Ce navigateur ne permet pas de choisir un dossier entier. Utilise « Des fichiers… » et sélectionne plusieurs fichiers à la fois.',
    pickHint: 'Le navigateur peut demander de confirmer (« Importer N fichiers ? ») : les fichiers restent sur ton appareil, rien n’est envoyé sur Internet.',
    dropHint: coarse ? '' : 'Astuce : tu peux aussi glisser-déposer un dossier ou plusieurs fichiers sur cette page.',
    pickFiles: () => pick(false), pickDir: () => pick(true), bindDrop,
    pickResync: (pid) => pick(!!supportsDir, pid), resyncFrom: (prom, pid) => handleResync(prom, pid, 'glisser-déposer'),
    relPath, skippedHtml, fmtSize, showError,
    // exposés pour les tests
    _walkEntries: walkEntries, _analyze: analyze, _fromFileList: fromFileList, _handle: handle
  };
})();
