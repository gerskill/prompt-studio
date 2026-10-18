/* Prompt Studio — mise à jour d'un projet depuis son dossier (resynchronisation), corbeille, annulation */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;
  const DAY = 86400000, TRASH_DAYS = 30, STALE_DAYS = 7;
  const NOTE_RE = /^Importé depuis « (.+) »$/;
  const fmtSize = (n) => PS.importer.fmtSize(n);
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

  // ---------- Origine des prompts ----------
  const notePath = (pr) => { const v0 = pr.versions && pr.versions[0]; const m = v0 && NOTE_RE.exec(v0.note || ''); return m ? m[1] : null; };
  // Anciens imports : le chemin complet est dans la note de la première version ; on retire le dossier racine commun
  function legacyRoot(p) {
    if (p.srcRoot) return p.srcRoot;
    const paths = p.prompts.filter((x) => !x.src && !x.gen).map(notePath).filter(Boolean);
    if (!paths.length) return '';
    const first = paths[0].split('/');
    return first.length > 1 && paths.every((x) => x.includes('/') && x.split('/')[0] === first[0]) ? first[0] : '';
  }
  function srcOf(pr, root) {
    if (pr.gen) return null;
    if (pr.src) return pr.src;
    const path = notePath(pr); if (!path) return null;
    return root && path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
  }
  function imported(p) { const root = legacyRoot(p); return p.prompts.map((pr) => ({ pr, key: srcOf(pr, root), legacy: !pr.src })).filter((x) => x.key); }
  const isImported = (p) => !!p.syncedAt || imported(p).length > 0;
  function lastSync(p) {
    if (p.syncedAt) return { at: p.syncedAt, legacy: false };
    const ats = imported(p).map((x) => x.pr.versions && x.pr.versions[0] && x.pr.versions[0].at).filter(Boolean);
    return ats.length ? { at: Math.min(...ats), legacy: true } : null;
  }
  function purgeTrash(p) {
    if (!Array.isArray(p.trash)) { if (p.trash) delete p.trash; return false; }
    const n = p.trash.length; const now = Date.now();
    p.trash = p.trash.filter((t) => now - t.removedAt < TRASH_DAYS * DAY);
    return p.trash.length !== n;
  }
  const cleanCtx = (p) => { if (p.ctx && Array.isArray(p.ctx.ids)) { const ids = new Set(p.prompts.map((x) => x.id)); p.ctx.ids = p.ctx.ids.filter((id) => ids.has(id)); } };

  // ---------- Différences ----------
  const lastVer = (pr) => pr.versions && pr.versions.length ? pr.versions[pr.versions.length - 1].content : null;
  function diff(p, res) {
    const top = res.top || '';
    const rel = (path) => PS.importer.relPath(path, top);
    const files = res.texts.map((t) => ({ t, key: rel(t.path) }));
    const byKey = new Map(files.map((f) => [f.key, f]));
    const skippedKeys = new Set(res.skipped.map((s) => rel(s.path)));
    const skippedBase = new Set(res.skipped.map((s) => s.path.split('/').pop()));
    const imp = imported(p);
    const used = new Set();
    const out = { deleted: [], modified: [], added: [], unchanged: [], localOnly: [], present: [], manual: [], files: files.length, top, flat: !!res.flat };
    for (const it of imp) {
      let f = byKey.get(it.key);
      if (f && used.has(f)) f = null;
      if (!f) {
        const base = it.key.split('/').pop();
        // nom de fichier seul (fichiers choisis sans dossier, ou sous-dossier renommé) : seulement si unique
        let c = files.filter((x) => !used.has(x) && x.key.split('/').pop() === base);
        if (c.length === 1 && (res.flat || it.legacy || !files.some((x) => x.key === it.key))) f = c[0];
        else if (it.legacy) { c = files.filter((x) => !used.has(x) && x.t.title === it.pr.title && (x.t.tag || '') === (it.pr.tags[0] || '')); if (c.length === 1) f = c[0]; }
      }
      if (f) {
        used.add(f);
        const fc = f.t.content, entry = { pr: it.pr, key: res.flat ? it.key : f.key, f }; // fichiers choisis à plat : on garde le chemin connu
        if (fc === it.pr.content) out.unchanged.push(entry);
        else if (it.pr.srcHash && PS.hash(fc) === it.pr.srcHash) out.localOnly.push(entry); // fichier inchangé, texte modifié dans le site : on garde
        else {
          const d = PS.diffLines(it.pr.content, fc);
          entry.add = d.filter((x) => x.t === 'add').length; entry.del = d.filter((x) => x.t === 'del').length;
          entry.localEdit = it.pr.srcHash ? PS.hash(it.pr.content) !== it.pr.srcHash : (lastVer(it.pr) != null && lastVer(it.pr) !== it.pr.content) || (it.pr.versions || []).length > 1;
          out.modified.push(entry);
        }
      } else if (skippedKeys.has(it.key) || (res.flat && skippedBase.has(it.key.split('/').pop()))) out.present.push({ pr: it.pr, key: it.key });
      else out.deleted.push({ pr: it.pr, key: it.key });
    }
    files.forEach((f) => { if (!used.has(f)) out.added.push(f); });
    const impIds = new Set(imp.map((x) => x.pr.id));
    out.manual = p.prompts.filter((x) => !impIds.has(x.id));
    const n = imp.length, matched = n - out.deleted.length;
    out.suspicious = n > 0 && (matched === 0 ? 'none' : res.flat && out.deleted.length ? 'flat' : out.deleted.length > n / 2 ? 'many' : '');
    return out;
  }

  // ---------- Aperçu ----------
  function open(pid, res) {
    const p = PS.findProject(pid);
    if (!p) return PS.toast('Projet introuvable.', 'alert');
    const d = diff(p, res);
    const delOn = !d.suspicious;
    const row = (kind, i, name, meta, on, extra = '') => `<li><label><input type="checkbox" data-${kind}="${i}" ${on ? 'checked' : ''}><span class="imp-name"><b>${esc(name)}</b><span>${meta}</span></span>${extra}</label></li>`;
    const sec = (id, title, hint, items) => items ? `<section class="imp-sec rs-sec" id="${id}"><div class="row" style="margin-bottom:4px"><b>${title}</b></div><p class="tiny muted" style="margin:0 0 8px">${hint}</p>${items}</section>` : '';
    const warn = { none: 'Aucun fichier de ce dossier ne correspond aux fichiers du projet. Est-ce le bon dossier ?', many: 'Plus de la moitié des fichiers du projet n’existent plus dans ce dossier. Vérifie que c’est le bon dossier.', flat: 'Tu as choisi des fichiers, pas un dossier : les fichiers non choisis apparaissent comme supprimés.' }[d.suspicious];
    const nothing = !d.deleted.length && !d.modified.length && !d.added.length;
    PS.modal({ title: 'Mettre à jour depuis le dossier', wide: true,
      body: `<p class="muted" style="margin-top:-6px">${d.top ? `Dossier « ${esc(d.top)} » · ` : ''}${plural(d.files, 'fichier lisible', 'fichiers lisibles')}. Rien n’est modifié tant que tu n’as pas confirmé.</p>
        ${warn ? `<div class="notice warn" style="margin-bottom:12px">${icon('alert')}<p><b>${warn}</b> Les suppressions sont décochées par précaution.</p></div>` : ''}
        ${nothing ? `<div class="notice" style="margin-bottom:12px">${icon('check')}<p><b>Tout est déjà à jour.</b> Aucun fichier supprimé, modifié ou nouveau.</p></div>` : ''}
        ${sec('rsDel', `${icon('trash', 'sm')} Supprimés du dossier (${d.deleted.length})`, 'Ces fichiers n’existent plus : leurs prompts vont dans la corbeille du projet (restaurables pendant 30 jours).', d.deleted.length && `<ul class="imp-list">${d.deleted.map((x, i) => row('del', i, x.key, `${plural(x.pr.versions.length, 'version', 'versions')} · ${esc(x.pr.title)}`, delOn)).join('')}</ul>`)}
        ${sec('rsMod', `${icon('edit', 'sm')} Modifiés (${d.modified.length})`, 'Le texte est remplacé par celui du fichier ; l’ancien reste dans l’historique des versions.', d.modified.length && `<ul class="imp-list">${d.modified.map((x, i) => row('mod', i, x.key, `+${x.add} / −${x.del} ligne${x.add + x.del > 1 ? 's' : ''}`, true, x.localEdit ? '<span class="tag warn" title="Ta version du site est gardée dans l’historique">modifié aussi ici</span>' : '')).join('')}</ul>`)}
        ${sec('rsNew', `${icon('plus', 'sm')} Nouveaux (${d.added.length})`, 'Ajoutés au projet, un prompt par fichier.', d.added.length && `<ul class="imp-list">${d.added.map((x, i) => row('new', i, x.key, fmtSize(x.t.size) + (x.t.converted ? ` · ${x.t.converted} → texte` : ''), true)).join('')}</ul>`)}
        <section class="imp-sec" id="rsSame"><p class="small" style="margin:0">${icon('check', 'sm')} <b>Inchangés : ${d.unchanged.length + d.localOnly.length + d.present.length}</b>${d.localOnly.length ? ` · dont ${plural(d.localOnly.length, 'prompt modifié', 'prompts modifiés')} seulement ici (ta version est gardée)` : ''}${d.present.length ? ` · ${plural(d.present.length, 'fichier toujours présent mais ignoré', 'fichiers toujours présents mais ignorés')} (gardé${d.present.length > 1 ? 's' : ''})` : ''}</p>
          <p class="small" style="margin:6px 0 0">${icon('shield', 'sm')} <b>Jamais touchés : ${d.manual.length}</b> prompt${d.manual.length > 1 ? 's' : ''} créé${d.manual.length > 1 ? 's' : ''} à la main, en une phrase ou depuis un modèle${d.manual.length ? ` (${d.manual.slice(0, 4).map((x) => '« ' + esc(x.title) + ' »').join(', ')}${d.manual.length > 4 ? '…' : ''})` : ''}.</p></section>
        ${PS.importer.skippedHtml(res)}`,
      foot: `<button class="btn ghost" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="rsGo">${icon('history', 'sm')}Mettre à jour</button>`,
      onMount: (c, close) => {
        const upd = () => {
          const n = ['del', 'mod', 'new'].reduce((a, k) => a + $$(`[data-${k}]`, c).filter((x) => x.checked).length, 0);
          const b = $('#rsGo', c);
          b.innerHTML = nothing ? `${icon('check', 'sm')}Marquer comme à jour` : `${icon('history', 'sm')}Mettre à jour${n ? ` (${plural(n, 'changement', 'changements')})` : ''}`;
          b.disabled = !nothing && n === 0;
        };
        c.addEventListener('change', upd);
        $('#rsGo', c).onclick = async () => {
          const pick = (k, arr) => $$(`[data-${k}]`, c).filter((x) => x.checked).map((x) => arr[+x.dataset[k]]);
          const ok = await apply(p, d, { del: pick('del', d.deleted), mod: pick('mod', d.modified), add: pick('new', d.added) }, res);
          if (ok) close();
        };
        upd();
      } });
  }

  // ---------- Application, annulation ----------
  async function apply(p, d, sel, res) {
    const snapshot = JSON.stringify(p);
    const now = Date.now();
    purgeTrash(p);
    if (!Array.isArray(p.trash)) p.trash = [];
    sel.del.forEach((x) => { p.prompts = p.prompts.filter((y) => y !== x.pr); p.trash.unshift({ id: PS.uid(), prompt: x.pr, key: x.key, removedAt: now, reason: 'Supprimé du dossier' }); });
    sel.mod.forEach((x, i) => {
      const pr = x.pr, fc = x.f.t.content;
      if (pr.content.trim() && lastVer(pr) !== pr.content) pr.versions.push({ id: PS.uid(), content: pr.content, note: 'Sauvegarde automatique avant mise à jour depuis le dossier', at: now + i });
      pr.content = fc; pr.updatedAt = now; pr.src = x.key; pr.srcHash = PS.hash(fc);
      pr.versions.push({ id: PS.uid(), content: fc, note: `Mis à jour depuis le dossier (« ${x.key} »)`, at: now + i + 1 });
    });
    d.unchanged.concat(d.localOnly, d.present).forEach((x) => { if (!x.pr.src) x.pr.src = x.key; if (!x.pr.srcHash && x.f && x.f.t.content === x.pr.content) x.pr.srcHash = PS.hash(x.pr.content); });
    const added = sel.add.map((x, i) => ({ id: PS.uid(), title: x.t.title, tags: x.t.tag ? [x.t.tag] : [], content: x.t.content, createdAt: now + i, updatedAt: now + i, src: x.key, srcHash: PS.hash(x.t.content),
      versions: [{ id: PS.uid(), content: x.t.content, note: 'Importé depuis « ' + x.t.path + ' »', at: now + i }] }));
    p.prompts = added.concat(p.prompts);
    p.syncedAt = now; if (d.top) p.srcRoot = d.top;
    cleanCtx(p);
    p.updatedAt = now;
    if (!(await PS.save())) {
      const err = PS.lastSaveError;
      restore(p.id, snapshot); await PS.save();
      PS.importer.showError('Mise à jour annulée : rien n’a été modifié', err || new Error('Enregistrement refusé par le navigateur'));
      return false;
    }
    const parts = [sel.del.length && plural(sel.del.length, 'supprimé', 'supprimés'), sel.mod.length && plural(sel.mod.length, 'modifié', 'modifiés'), sel.add.length && plural(sel.add.length, 'nouveau', 'nouveaux')].filter(Boolean);
    $('#modal').close();
    rerender(p.id);
    PS.toast(parts.length ? `Projet mis à jour : ${parts.join(', ')}` : 'Projet marqué comme à jour', 'check', 10000, parts.length ? { label: 'Annuler', onClick: () => undo(p.id, snapshot) } : null);
    return true;
  }
  function restore(pid, snapshot) {
    const i = PS.state.projects.findIndex((x) => x.id === pid);
    const old = JSON.parse(snapshot);
    if (i >= 0) PS.state.projects[i] = old; else PS.state.projects.unshift(old);
    return old;
  }
  async function undo(pid, snapshot) {
    restore(pid, snapshot);
    const ok = await PS.save();
    rerender(pid);
    PS.toast(ok ? 'Mise à jour annulée : le projet est revenu à l’état précédent' : 'Annulation impossible à enregistrer', ok ? 'history' : 'alert');
  }
  function rerender(pid) { if (location.hash.startsWith('#/projets/' + pid)) { const h = '#/projets/' + pid; if (location.hash !== h) history.replaceState(null, '', h); PS.route(); } }

  // ---------- Corbeille ----------
  function trashDialog(p) {
    purgeTrash(p);
    let dirty = false;
    const d = $('#modal');
    const onClose = () => { d.removeEventListener('close', onClose); if (dirty) rerender(p.id); };
    const render = (c) => {
      const T = p.trash || [];
      $('#trBody', c).innerHTML = T.length ? `<ul class="imp-list" id="trList">${T.map((t, i) => { const left = Math.max(1, Math.ceil((t.removedAt + TRASH_DAYS * DAY - Date.now()) / DAY)); return `<li><div class="tr-row"><span class="imp-name"><b>${esc(t.prompt.title)}</b><span>${esc(t.reason || 'Supprimé')} · ${esc(t.key || '')} · encore ${plural(left, 'jour', 'jours')}</span></span><button class="btn sm" type="button" data-tr-restore="${i}">${icon('history', 'sm')}Restaurer</button><button class="icon-btn" type="button" data-tr-purge="${i}" aria-label="Supprimer définitivement « ${esc(t.prompt.title)} »" title="Supprimer définitivement">${icon('trash')}</button></div></li>`; }).join('')}</ul>`
        : `<div class="empty" style="padding:24px"><h3>La corbeille est vide</h3><p>Les prompts retirés lors d’une mise à jour depuis le dossier arrivent ici.</p></div>`;
      $('#trEmpty', c).hidden = !T.length;
    };
    PS.modal({ title: 'Corbeille du projet', wide: true,
      body: `<p class="small muted" style="margin-top:-6px">Restaurables pendant ${TRASH_DAYS} jours, puis supprimés automatiquement. Ils ne sont pas utilisés dans le contexte des prompts « Une phrase ».</p><div id="trBody"></div>`,
      foot: `<button class="btn danger" type="button" id="trEmpty">${icon('trash', 'sm')}Vider la corbeille</button><span class="spacer"></span><button class="btn primary" type="button" data-close>Fermer</button>`,
      onMount: (c) => {
        render(c);
        d.addEventListener('close', onClose);
        c.addEventListener('click', async (e) => {
          const r = e.target.closest('[data-tr-restore]'), x = e.target.closest('[data-tr-purge]');
          if (r) { const t = p.trash.splice(+r.dataset.trRestore, 1)[0]; p.prompts.unshift(t.prompt); p.updatedAt = Date.now(); cleanCtx(p); dirty = true; await PS.save(); render(c); PS.toast(`« ${t.prompt.title} » restauré`, 'history'); }
          if (x) { const t = p.trash.splice(+x.dataset.trPurge, 1)[0]; dirty = true; await PS.save(); render(c); PS.toast(`« ${t.prompt.title} » supprimé définitivement`, 'trash'); }
        });
        $('#trEmpty', c).onclick = async () => {
          const n = (p.trash || []).length;
          if (!n) return;
          d.removeEventListener('close', onClose);
          if (await PS.confirmDialog({ title: 'Vider la corbeille ?', text: `${plural(n, 'prompt sera supprimé', 'prompts seront supprimés')} définitivement.`, ok: 'Vider', danger: true })) { p.trash = []; await PS.save(); PS.toast('Corbeille vidée', 'trash'); }
          rerender(p.id);
        };
      } });
  }

  // ---------- Barre « Dernière mise à jour » sur la page projet ----------
  function barHtml(p) {
    const imp = isImported(p), nT = (p.trash || []).length;
    if (!imp && !nT) return '';
    const ls = lastSync(p);
    const old = ls && Date.now() - ls.at > STALE_DAYS * DAY;
    const days = ls ? Math.floor((Date.now() - ls.at) / DAY) : 0;
    return `<section class="sync-bar${old ? ' stale' : ''}" id="syncBar" aria-label="Lien avec le dossier">
      <div class="sync-txt">${icon('folder', 'sm')}<span>${ls ? (ls.legacy ? `Importé depuis un dossier le <b>${PS.fmtDate(ls.at)}</b>, jamais mis à jour` : `Dernière mise à jour depuis le dossier${p.srcRoot ? ` « ${esc(p.srcRoot)} »` : ''} : <b>${PS.fmtDate(ls.at)}</b>`) : 'Ce projet n’a plus de fichiers issus d’un dossier.'}</span></div>
      ${old ? `<p class="sync-hint">${icon('info', 'sm')}Il y a ${days} jours : si tu as changé des fichiers depuis (ajouts, suppressions), mets le projet à jour pour que Claude ait la bonne version.</p>` : ''}
      <div class="btn-row">${imp ? `<button class="btn sm${old ? ' primary' : ''}" type="button" id="syncGo">${icon('history', 'sm')}Mettre à jour depuis le dossier</button>` : ''}${nT ? `<button class="btn sm ghost" type="button" id="syncTrash">${icon('trash', 'sm')}Corbeille (${nT})</button>` : ''}</div>
    </section>`;
  }
  function bindBar(root, p) {
    const g = $('#syncGo', root); if (g) g.onclick = () => startResync(p);
    const t = $('#syncTrash', root); if (t) t.onclick = () => trashDialog(p);
  }
  function startResync(p) {
    if (!PS.importer.supportsDir) {
      PS.modal({ title: 'Mettre à jour depuis le dossier', body: `<p>${esc(PS.importer.noDirNote)}</p><p class="small muted">Choisis <b>tous</b> les fichiers du dossier : ceux que tu ne choisis pas apparaîtront comme supprimés (décochés par précaution).</p>`,
        foot: `<button class="btn ghost" type="button" data-close>Annuler</button><button class="btn primary" type="button" id="rsPick">${icon('upload', 'sm')}Choisir les fichiers</button>`,
        onMount: (c, close) => { $('#rsPick', c).onclick = () => { close(); PS.importer.pickResync(p.id); }; } });
      return;
    }
    PS.importer.pickResync(p.id);
  }
  // Glisser-déposer sur la page d'un projet : proposer la mise à jour
  function dropChoice(p, prom) {
    PS.modal({ title: 'Que faire de ce dossier ?',
      body: `<div class="choice-list">
        <button class="card card-link choice" type="button" id="dcSync"><span class="card-icon">${icon('history')}</span><span><b>Mettre à jour « ${esc(p.name)} »</b><span>Comparer avec le projet : fichiers supprimés, modifiés, nouveaux. Tu vois tout avant de confirmer.</span></span></button>
        <button class="card card-link choice" type="button" id="dcImp"><span class="card-icon">${icon('upload')}</span><span><b>Importer comme d’habitude</b><span>Nouveau projet, ou ajouter les fichiers à un projet sans rien retirer.</span></span></button></div>`,
      foot: `<button class="btn ghost" type="button" data-close>Annuler</button>`,
      onMount: (c, close) => {
        $('#dcSync', c).onclick = () => { close(); PS.importer.resyncFrom(prom, p.id); };
        $('#dcImp', c).onclick = () => { close(); PS.importer._handle(prom, 'glisser-déposer'); };
      } });
  }

  PS.resync = { open, diff, apply, undo, imported, isImported, lastSync, purgeTrash, trashDialog, barHtml, bindBar, startResync, dropChoice, cleanCtx, TRASH_DAYS };
})();
