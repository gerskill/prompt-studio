/* Prompt Studio — vues : accueil, assistant, éditeur, modèles */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;
  const V = (PS.views = PS.views || {});

  // ================= ACCUEIL =================
  V.accueil = (root) => {
    const st = PS.state;
    const recent = st.projects.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
    root.innerHTML = `
    <section class="hero"><div class="hero-grid"><div>
      <span class="eyebrow">${icon('sparkle', 'sm')} Pour Claude, en français</span>
      <h1>Des prompts clairs, <em>sans jargon</em>.</h1>
      <p class="lead">Écris ta demande en une phrase : le site devine le reste et construit le prompt complet.</p>
      <form class="hero-form" id="hForm" autocomplete="off">
        <label class="sr" for="hText">Ta demande, en une phrase</label>
        <textarea id="hText" rows="1" enterkeyhint="go" placeholder="Décris ce que tu veux en une phrase…"></textarea>
        <button class="btn primary lg" type="submit" id="hGo">${icon('bolt')}Créer mon prompt</button>
      </form>
      <div class="hero-links"><a href="#/generateur">${icon('wand', 'sm')}Assistant détaillé</a><a href="#/modeles">${icon('grid', 'sm')}Modèles</a><a href="#/editeur">${icon('gauge', 'sm')}Vérifier un prompt</a></div>
      <div class="hero-pills">
        <span class="pill">${icon('check')}Gratuit, sans compte</span>
        <span class="pill">${icon('check')}Tes données restent sur ton appareil</span>
        <span class="pill">${icon('check')}Fonctionne sans clé API</span>
      </div></div>
      <div class="hero-visual" aria-hidden="true"><span class="tag accent hv-tag">Illustration</span>
        <div class="hv-head"><span class="dots"><i></i><i></i><i></i></span><span>Structure d’un prompt</span></div>
        ${[['RÔLE', 'Tu es un coach sportif diplômé.'], ['OBJECTIF', 'Crée un programme de 4 semaines.'], ['AUDIENCE', 'Débutant : explique sans jargon.'], ['FORMAT', 'Un tableau par séance.'], ['VÉRIFICATION FINALE', 'Relis ta réponse avant de l’envoyer.']].map(([a, b]) => `<div class="hv-line"><span class="ok">${icon('check')}</span><span><b>${a}</b>${b}</span></div>`).join('')}
      </div></div>
    </section>

    <h2 class="sr">Par où commencer</h2>
    <div class="paths p4">
      <a class="card card-link path" href="#/rapide">
        <span class="tag accent level">Le plus rapide</span>
        <span class="card-icon">${icon('bolt', 'lg')}</span>
        <h3>Une phrase</h3>
        <p>Tu écris ce que tu veux, le site devine le rôle, le ton et le format. Tu ajustes ensuite si besoin.</p>
        <span class="go">Essayer ${icon('arrow', 'sm')}</span>
      </a>
      <a class="card card-link path" href="#/generateur">
        <span class="tag level">Débutant</span>
        <span class="card-icon">${icon('wand', 'lg')}</span>
        <h3>Assistant détaillé</h3>
        <p>Une question à la fois : rôle, objectif, public, format… Tu vois ton prompt se construire en direct.</p>
        <span class="go">Commencer ${icon('arrow', 'sm')}</span>
      </a>
      <a class="card card-link path" href="#/editeur">
        <span class="tag level">Expert</span>
        <span class="card-icon">${icon('gauge', 'lg')}</span>
        <h3>Éditeur libre</h3>
        <p>Écris ou colle ton prompt. Une vérification instantanée signale ce qui manque, et tu ajoutes les blocs en un clic.</p>
        <span class="go">Ouvrir l’éditeur ${icon('arrow', 'sm')}</span>
      </a>
      <a class="card card-link path" href="#/demarrer">
        <span class="tag level">Projet</span>
        <span class="card-icon">${icon('rocket', 'lg')}</span>
        <h3>Démarrer un projet</h3>
        <p>Décris ton projet en 2 minutes et reçois un pack de 4 prompts : cadrage, plan, première tâche et revue.</p>
        <span class="go">Lancer mon projet ${icon('arrow', 'sm')}</span>
      </a>
    </div>

    ${recent.length ? `<section class="section"><div class="row" style="margin-bottom:14px"><h2 style="margin:0">Reprendre</h2><span class="spacer"></span><a class="btn ghost sm" href="#/projets">Tous les projets ${icon('right', 'sm')}</a></div>
      <div class="proj-grid">${recent.map(projCard).join('')}</div></section>` : ''}

    <section class="section">
      <div class="section-head"><h2>Comment ça marche</h2><p>Trois étapes, du premier jet au prompt que tu réutilises.</p></div>
      <div class="steps">
        <div class="card step"><h3>Décris ce que tu veux</h3><p class="muted">En une phrase, avec l’assistant détaillé, un modèle ou ton propre texte. Les zones à compléter sont mises en évidence.</p></div>
        <div class="card step"><h3>Vérifie et complète</h3><p class="muted">La vérification repère les éléments absents (rôle, format, exemple…) et les mots trop vagues.</p></div>
        <div class="card step"><h3>Utilise et range</h3><p class="muted">Copie le prompt ou ouvre-le dans Claude. Enregistre-le dans un projet pour garder ses versions.</p></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Les blocs qui rendent un prompt solide</h2><p>Chaque bloc s’active ou se désactive dans l’assistant et s’insère en un clic dans l’éditeur.</p></div>
      <div class="blocks-list">
        ${[['Rôle expert', 'Claude sait quel spécialiste il doit être.']].concat(PS.BLOCK_ORDER.map((k) => [PS.BLOCKS[k].title, PS.BLOCKS[k].desc])).map(([t, d]) => `<div class="bl"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>En toute transparence</h2></div>
      <div class="honest">
        <div class="card yes"><h3>Ce que fait le site</h3><ul>
          <li>${icon('check')}Il t’aide à structurer tes demandes et à ne rien oublier.</li>
          <li>${icon('check')}Il range tes prompts et leurs versions dans ton navigateur.</li>
          <li>${icon('check')}En mode « Une phrase », il devine les réglages avec des règles fixes (mots-clés), sans IA : vérifie ce qu’il a deviné.</li>
          <li>${icon('check')}Il fonctionne hors ligne une fois chargé.</li></ul></div>
        <div class="card no"><h3>Ce qu’il ne fait pas</h3><ul>
          <li>${icon('x')}Il ne garantit pas la qualité de la réponse de Claude : la note est une vérification automatique, pas un jugement.</li>
          <li>${icon('x')}Il n’envoie rien à un serveur, sauf si tu utilises ta propre clé API.</li>
          <li>${icon('x')}Il n’est pas un produit officiel d’Anthropic.</li></ul></div>
      </div>
    </section>`;
    const ht = $('#hText', root);
    ht.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#hForm', root).requestSubmit ? $('#hForm', root).requestSubmit() : PS.startPhrase(ht.value); } });
    ht.addEventListener('input', () => { ht.style.height = 'auto'; ht.style.height = Math.min(180, ht.scrollHeight + 2) + 'px'; });
    $('#hForm', root).addEventListener('submit', (e) => { e.preventDefault(); if (!ht.value.trim()) { ht.focus(); return PS.toast('Écris d’abord ta demande en une phrase.', 'info'); } PS.startPhrase(ht.value); });
  };

  function projCard(p) {
    return `<a class="card card-link proj" href="#/projets/${p.id}">
      <h3 style="margin:0">${esc(p.name)}</h3>
      <p class="desc">${esc(p.description || 'Pas de description.')}</p>
      ${p.tags.length ? `<div class="chips">${p.tags.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="foot"><span>${p.prompts.length} prompt${p.prompts.length > 1 ? 's' : ''}</span><span>Modifié le ${PS.fmtDay(p.updatedAt)}</span></div></a>`;
  }
  PS.projCard = projCard;

  // ================= ASSISTANT =================
  const ROLE_SUGG = ['un rédacteur web expérimenté', 'un développeur senior', 'un coach sportif diplômé', 'un professeur patient', 'un expert marketing', 'un analyste de données', 'un recruteur', 'un chef de projet'];
  const TONS = ['Simple', 'Chaleureux', 'Professionnel', 'Direct', 'Pédagogique', 'Enthousiaste', 'Neutre', 'Technique'];
  const STEPS = [
    { id: 'role', t: 'Rôle', q: 'Quel expert doit être Claude ?', intro: 'Donner un rôle aide Claude à choisir le bon vocabulaire et le bon niveau de détail.',
      html: (w) => `<div class="field"><label class="lbl" for="w-role">Claude est…</label><input id="w-role" type="text" data-k="role" value="${esc(w.role)}" placeholder="un coach sportif diplômé"><div class="suggest" aria-label="Suggestions">${ROLE_SUGG.map((s) => `<button type="button" data-fill="role" data-val="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>
        <div class="field"><label class="lbl" for="w-roleExtra">Expérience ou spécialité <span class="muted">(facultatif)</span></label><input id="w-roleExtra" type="text" data-k="roleExtra" value="${esc(w.roleExtra)}" placeholder="Spécialisé dans les débutants, 10 ans d’expérience"></div>` },
    { id: 'objectif', t: 'Objectif', q: 'Que veux-tu obtenir ?', intro: 'Commence par un verbe : rédige, explique, crée, corrige, compare…',
      html: (w) => `<div class="field"><label class="lbl" for="w-objectif">Ta demande</label><textarea id="w-objectif" data-k="objectif" rows="4" placeholder="Crée un programme de musculation de 4 semaines pour reprendre le sport.">${esc(w.objectif)}</textarea></div>
        <div class="field"><label class="lbl" for="w-livrable">C’est réussi quand… <span class="muted">(facultatif)</span></label><span class="hint">Un critère simple pour savoir si la réponse convient.</span><input id="w-livrable" type="text" data-k="livrable" value="${esc(w.livrable)}" placeholder="Chaque séance dure moins d’1 h 15, échauffement compris"></div>` },
    { id: 'audience', t: 'Audience', q: 'Pour qui est la réponse ?', intro: 'Toi-même, tes clients, une équipe, des élèves… Le niveau change tout.',
      html: (w) => `<div class="field"><label class="lbl" for="w-audience">Public</label><input id="w-audience" type="text" data-k="audience" value="${esc(w.audience)}" placeholder="Moi, 28 ans, je reprends le sport après 2 ans d’arrêt"></div>
        <div class="field"><span class="lbl" id="lv">Niveau</span><div class="chips" role="group" aria-labelledby="lv">${[['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['expert', 'Expert']].map(([v, l]) => `<button type="button" class="chip" data-single="niveau" data-val="${v}" aria-pressed="${w.niveau === v}">${l}</button>`).join('')}</div></div>` },
    { id: 'contexte', t: 'Contexte', q: 'Qu’est-ce que Claude doit savoir ?', intro: 'La situation, ce qui existe déjà, ce que tu as déjà essayé. C’est souvent ce qui fait la plus grande différence.',
      html: (w) => `<div class="field"><label class="lbl" for="w-contexte">Contexte</label><textarea id="w-contexte" data-k="contexte" rows="6" placeholder="Je m’entraîne en salle 3 fois par semaine. J’ai une petite douleur à l’épaule droite.">${esc(w.contexte)}</textarea></div>` },
    { id: 'contraintes', t: 'Contraintes', q: 'Quelles sont les règles à respecter ?', intro: 'Une règle par ligne. Ce qui est obligatoire, puis ce que tu ne veux pas.',
      html: (w) => `<div class="field"><label class="lbl" for="w-contraintes">Obligatoire</label><textarea id="w-contraintes" data-k="contraintes" rows="4" placeholder="Matériel : haltères et banc uniquement&#10;3 séances par semaine">${esc(w.contraintes)}</textarea></div>
        <div class="field"><label class="lbl" for="w-exclure">À ne pas inclure</label><textarea id="w-exclure" data-k="exclure" rows="3" placeholder="Pas de compléments alimentaires&#10;Pas de jargon">${esc(w.exclure)}</textarea></div>` },
    { id: 'format', t: 'Format', q: 'Sous quelle forme veux-tu la réponse ?', intro: 'Choisis une forme, puis précise si besoin.',
      html: (w) => `<div class="field"><div class="chips" role="group" aria-label="Format">${Object.entries(PS.FORMAT_LABELS).map(([v, l]) => `<button type="button" class="chip" data-single="format" data-val="${v}" aria-pressed="${w.format === v}">${l}</button>`).join('')}</div></div>
        <div class="field"><label class="lbl" for="w-formatDetail">Précisions <span class="muted">(facultatif)</span></label><input id="w-formatDetail" type="text" data-k="formatDetail" value="${esc(w.formatDetail)}" placeholder="Un tableau par séance : exercice, séries, répétitions, repos"></div>` },
    { id: 'ton', t: 'Ton', q: 'Quel ton doit avoir la réponse ?', intro: 'Tu peux en choisir plusieurs.',
      html: (w) => `<div class="field"><div class="chips" role="group" aria-label="Ton">${TONS.map((t) => `<button type="button" class="chip" data-multi="ton" data-val="${t.toLowerCase()}" aria-pressed="${w.ton.includes(t.toLowerCase())}">${t}</button>`).join('')}</div></div>
        <div class="field"><label class="lbl" for="w-tonExtra">Autre précision <span class="muted">(facultatif)</span></label><input id="w-tonExtra" type="text" data-k="tonExtra" value="${esc(w.tonExtra)}" placeholder="Tutoie-moi"></div>` },
    { id: 'longueur', t: 'Longueur', q: 'Quelle longueur ?', intro: 'Une indication évite les réponses trop courtes ou trop longues.',
      html: (w) => `<div class="field"><div class="chips" role="group" aria-label="Longueur">${Object.entries(PS.LENGTH_LABELS).map(([v, l]) => `<button type="button" class="chip" data-single="longueur" data-val="${v}" aria-pressed="${w.longueur === v}">${l}</button>`).join('')}</div></div>
        <div class="field"><label class="lbl" for="w-longueurDetail">${w.longueur === 'perso' ? 'Ta longueur' : 'Précision'} <span class="muted">(facultatif)</span></label><input id="w-longueurDetail" type="text" data-k="longueurDetail" value="${esc(w.longueurDetail)}" placeholder="200 mots maximum"></div>` },
    { id: 'exemples', t: 'Exemple', q: 'As-tu un exemple de ce que tu attends ?', intro: 'Un court extrait du style ou du résultat voulu. Claude s’en inspire sans le recopier. Laisse vide si tu n’en as pas.',
      html: (w) => `<div class="field"><label class="lbl" for="w-exemples">Exemple <span class="muted">(facultatif)</span></label><textarea id="w-exemples" data-k="exemples" rows="6" class="code" placeholder="Séance A — Pompes : 3 × 10, repos 90 s">${esc(w.exemples)}</textarea></div>` },
    { id: 'preuve', t: 'Règles de preuve', q: 'Comment Claude doit-il gérer ce qu’il ne sait pas ?', intro: 'Ces règles réduisent le risque d’informations inventées.',
      html: (w) => `<div class="blocks">${Object.keys(PS.PROOF).map((k) => toggle('proof', k, PS.PROOF_LABELS[k], PS.PROOF[k], w.proof[k])).join('')}${toggle('flag', 'french', 'Réponds en français', 'Ajoute la consigne de langue au prompt.', w.french)}</div>` },
    { id: 'blocs', t: 'Blocs avancés', q: 'Blocs du prompt universel', intro: 'Des blocs prêts à l’emploi pour des réponses plus fiables. Active ceux qui te servent.',
      html: (w) => `<div class="row" style="margin-bottom:12px"><button type="button" class="btn sm" data-allblocks>${icon('layers', 'sm')}Tout activer</button><button type="button" class="btn sm ghost" data-noblocks>Tout désactiver</button></div>
        <div class="blocks">${PS.BLOCK_ORDER.map((k) => toggle('block', k, PS.BLOCKS[k].title, PS.BLOCKS[k].desc, w.blocks[k]) +
          (k === 'profil' && w.blocks.profil ? `<div class="field" style="margin:0 0 4px"><label class="lbl" for="w-profilText">Ton profil</label><textarea id="w-profilText" data-k="profilText" rows="3" placeholder="Je m’appelle…, j’ai 28 ans, je suis débutant, j’utilise Claude sur mon téléphone.">${esc(w.profilText)}</textarea></div>` : '') +
          (k === 'mode' && w.blocks.mode ? `<div class="row" style="margin-bottom:4px"><span class="small muted">Par défaut :</span><div class="seg">${['court', 'complet'].map((m) => `<button type="button" data-single="modeDefault" data-val="${m}" aria-pressed="${w.modeDefault === m}">${m === 'court' ? 'Court' : 'Complet'}</button>`).join('')}</div></div>` : '')).join('')}</div>` }
  ];
  function toggle(kind, key, title, desc, on) {
    return `<label class="toggle ${on ? 'on' : ''}"><input type="checkbox" data-${kind}="${key}" ${on ? 'checked' : ''}><span class="switch" aria-hidden="true"></span><span><b>${esc(title)}</b><small>${esc(desc)}</small></span></label>`;
  }
  PS.toggleHtml = toggle;
  const stepDone = (s, w) => ({ role: !!w.role.trim(), objectif: !!w.objectif.trim(), audience: !!(w.audience.trim() || w.niveau), contexte: !!w.contexte.trim(), contraintes: !!(w.contraintes.trim() || w.exclure.trim()), format: w.format !== 'libre' || !!w.formatDetail.trim(), ton: w.ton.length > 0 || !!w.tonExtra.trim(), longueur: w.longueur !== 'auto', exemples: !!w.exemples.trim(), preuve: Object.values(w.proof).some(Boolean), blocs: Object.values(w.blocks).some(Boolean) }[s.id]);

  V.generateur = (root) => {
    const st = PS.state;
    if (!st.drafts.wizard) st.drafts.wizard = { w: Object.assign(PS.emptyWizard(), { french: st.settings.french !== false }), step: 0, mode: 'complet' };
    const D = st.drafts.wizard;
    D.w = Object.assign(PS.emptyWizard(), D.w);
    const w = D.w;
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('wand', 'sm')} Assistant détaillé</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Construis ton prompt pas à pas</h1><p class="hide-sm">Toutes les questions sont facultatives sauf l’objectif. Pressé ? <a href="#/rapide">Écris juste une phrase</a>.</p></div>
        <button class="btn ghost sm" type="button" id="wReset">${icon('history', 'sm')}Recommencer</button></div>
      <div class="wiz">
        <div>
          <div class="stepper" id="wSteps" role="list"></div>
          <div class="progress" aria-hidden="true"><i id="wProg"></i></div>
          <div class="card wiz-card" id="wCard"></div>
        </div>
        <aside class="card preview" aria-label="Aperçu du prompt">
          <div class="preview-head"><b>Aperçu en direct</b><span class="spacer"></span>
            <div class="seg" role="group" aria-label="Version du prompt"><button type="button" data-mode="court">Court</button><button type="button" data-mode="complet">Complet</button></div></div>
          <pre class="preview-body" id="wPrev" tabindex="0"></pre>
          <div class="preview-foot">
            <button class="btn primary sm" type="button" id="wCopy">${icon('copy', 'sm')}Copier</button>
            <button class="btn sm" type="button" id="wClaude">${icon('external', 'sm')}Ouvrir dans Claude</button>
            <button class="btn sm" type="button" id="wSave">${icon('save', 'sm')}Enregistrer</button>
            <button class="btn sm ghost" type="button" id="wEdit">${icon('gauge', 'sm')}Vérifier</button>
            <span class="spacer"></span><span class="counter" id="wCount"></span>
          </div>
        </aside>
      </div>
      <button class="mob-prev" type="button" id="wMob">${icon('eye', 'sm')}Voir l’aperçu<span class="counter" id="wMobCount"></span></button>`;
    const prev = $('#wPrev', root);
    const mob = $('#wMob', root);
    mob.onclick = () => $('.preview', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => mob.classList.toggle('hide', en[0].isIntersecting), { threshold: 0.05 }); io.observe($('.preview', root)); }
    const text = () => PS.buildPrompt(w, D.mode);
    function renderPreview() {
      const t = text();
      prev.innerHTML = PS.highlight(t);
      $('#wCount', root).textContent = `${PS.words(t)} mots · ${t.length} caractères`;
      $('#wMobCount', root).textContent = `${PS.words(t)} mots`;
      $$('[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === D.mode));
      $$('#wSteps button', root).forEach((b, i) => b.classList.toggle('done', !!stepDone(STEPS[i], w)));
      PS.saveSoon();
    }
    function renderStep() {
      const s = STEPS[D.step];
      $('#wSteps', root).innerHTML = STEPS.map((x, i) => `<button type="button" role="listitem" data-go="${i}" ${i === D.step ? 'aria-current="step"' : ''}><span class="n">${i + 1}</span>${x.t}</button>`).join('');
      $('#wProg', root).style.width = ((D.step + 1) / STEPS.length) * 100 + '%';
      const last = D.step === STEPS.length - 1;
      $('#wCard', root).innerHTML = `<span class="tiny muted">Étape ${D.step + 1} sur ${STEPS.length}</span><h2>${esc(s.q)}</h2><p class="q-intro">${esc(s.intro)}</p>${s.html(w)}
        <div class="wiz-nav"><button class="btn" type="button" data-prev ${D.step === 0 ? 'disabled' : ''}>${icon('left', 'sm')}Précédent</button><span class="spacer"></span>
        ${last ? `<button class="btn primary" type="button" data-finish>${icon('check', 'sm')}Terminer</button>` : `<button class="btn ghost" type="button" data-next>Passer</button><button class="btn primary" type="button" data-next>Suivant${icon('right', 'sm')}</button>`}</div>`;
      const cur = $('#wSteps [aria-current]', root); if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      renderPreview();
    }
    const go = (i) => { D.step = Math.max(0, Math.min(STEPS.length - 1, i)); renderStep(); const f = $('#wCard input, #wCard textarea', root); if (f && matchMedia('(min-width: 861px)').matches) f.focus({ preventScroll: true }); };
    root.addEventListener('input', (e) => {
      const k = e.target.dataset.k; if (k) { w[k] = e.target.value; renderPreview(); }
    });
    root.addEventListener('change', (e) => {
      const t = e.target; let hit = true;
      if (t.dataset.proof) w.proof[t.dataset.proof] = t.checked;
      else if (t.dataset.block) { w.blocks[t.dataset.block] = t.checked; if (['profil', 'mode'].includes(t.dataset.block)) { renderStep(); return; } }
      else if (t.dataset.flag) w[t.dataset.flag] = t.checked;
      else hit = false;
      if (hit) { t.closest('.toggle').classList.toggle('on', t.checked); renderPreview(); }
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.go) go(+b.dataset.go);
      else if (b.hasAttribute('data-next')) go(D.step + 1);
      else if (b.hasAttribute('data-prev')) go(D.step - 1);
      else if (b.hasAttribute('data-finish')) finish();
      else if (b.dataset.fill) { w[b.dataset.fill] = b.dataset.val; const i = $(`[data-k="${b.dataset.fill}"]`, root); if (i) i.value = b.dataset.val; renderPreview(); }
      else if (b.dataset.single) { w[b.dataset.single] = w[b.dataset.single] === b.dataset.val && b.dataset.single === 'niveau' ? '' : b.dataset.val; renderStep(); }
      else if (b.dataset.multi) { const arr = w[b.dataset.multi]; const i = arr.indexOf(b.dataset.val); i >= 0 ? arr.splice(i, 1) : arr.push(b.dataset.val); b.setAttribute('aria-pressed', i < 0); renderPreview(); }
      else if (b.dataset.mode) { D.mode = b.dataset.mode; renderPreview(); }
      else if (b.hasAttribute('data-allblocks') || b.hasAttribute('data-noblocks')) { const on = b.hasAttribute('data-allblocks'); PS.BLOCK_ORDER.forEach((k) => (w.blocks[k] = on)); renderStep(); }
    });
    $('#wCopy', root).onclick = () => PS.copyPrompt(text());
    $('#wClaude', root).onclick = () => PS.openClaude(text());
    $('#wSave', root).onclick = () => PS.saveToProject(text(), { title: w.objectif.trim().slice(0, 60) });
    $('#wEdit', root).onclick = () => PS.openInEditor(text());
    $('#wReset', root).onclick = async () => {
      if (await PS.confirmDialog({ title: 'Recommencer ?', text: 'Toutes les réponses de l’assistant seront effacées. Les prompts déjà enregistrés dans tes projets ne sont pas touchés.', ok: 'Recommencer', danger: true })) {
        st.drafts.wizard = null; PS.save(); PS.route();
      }
    };
    function finish() {
      const t = text();
      if (!w.objectif.trim()) { go(1); PS.toast('Ajoute au moins un objectif.', 'info'); return; }
      const a = PS.analyze(t);
      PS.modal({ title: 'Ton prompt est prêt', body: `<div class="score" style="margin-bottom:14px"><div class="ring" style="--v:${a.score};--c:${PS.scoreColor(a.score)}"><span>${a.score}<small>/100</small></span></div><div><b>${a.level}</b><p class="small muted" style="margin:4px 0 0">Vérification automatique de la structure, pas une garantie de résultat.</p></div></div><pre class="prompt-box">${PS.highlight(t)}</pre>`,
        foot: `<button class="btn ghost" type="button" data-close>Continuer à modifier</button><button class="btn" type="button" id="fSave">${icon('save', 'sm')}Enregistrer</button><button class="btn" type="button" id="fClaude">${icon('external', 'sm')}Ouvrir dans Claude</button><button class="btn primary" type="button" id="fCopy">${icon('copy', 'sm')}Copier</button>`,
        onMount: (c, close) => { $('#fCopy', c).onclick = () => PS.copyPrompt(t); $('#fClaude', c).onclick = () => PS.openClaude(t); $('#fSave', c).onclick = () => { close(); PS.saveToProject(t, { title: w.objectif.trim().slice(0, 60) }); }; } });
    }
    renderStep();
  };

  // ================= ÉDITEUR / OPTIMISEUR =================
  const INSERTS = [['role', 'Rôle'], ['goal', 'Objectif'], ['context', 'Contexte'], ['audience', 'Audience'], ['format', 'Format'], ['constraints', 'Contraintes'], ['examples', 'Exemple']];
  PS.openInEditor = (text, source) => { PS.state.drafts.editor = text; PS.state.drafts.editorSource = source || null; PS.save(); location.hash = '#/editeur'; };

  V.editeur = (root) => {
    const st = PS.state;
    const src = st.drafts.editorSource;
    const srcP = src && PS.findProject(src.pid); const srcPr = srcP && srcP.prompts.find((x) => x.id === src.prid);
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('gauge', 'sm')} Éditeur libre et vérification</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Écris, colle, améliore</h1><p>La vérification se met à jour pendant que tu tapes. Elle cherche des indices dans le texte : c’est une aide, pas un verdict.</p></div></div>
      ${srcPr ? `<div class="notice" style="margin-bottom:16px">${icon('folder')}<p>Ouvert depuis le projet <b>${esc(srcP.name)}</b> — prompt « ${esc(srcPr.title)} ». <button class="btn sm" type="button" id="eToVersion" style="margin-left:6px">${icon('history', 'sm')}Enregistrer comme nouvelle version</button></p></div>` : ''}
      <div class="ed">
        <div class="stack">
          <div class="card ed-area">
            <div class="ed-toolbar" role="toolbar" aria-label="Insérer une section">
              <span class="tiny muted" style="align-self:center;margin-right:4px">Insérer :</span>
              ${INSERTS.map(([id, l]) => `<button class="chip" type="button" data-ins="${id}">${icon('plus', 'sm')}${l}</button>`).join('')}
              <details class="menu" id="eMenu"><summary class="chip dark">${icon('layers', 'sm')}Blocs avancés</summary><div class="menu-panel" role="menu">${PS.BLOCK_ORDER.map((k) => `<button type="button" role="menuitem" data-blk="${k}"><b>${esc(PS.BLOCKS[k].title)}</b><span>${esc(PS.BLOCKS[k].desc)}</span></button>`).join('')}</div></details>
            </div>
            <label class="sr" for="eText">Ton prompt</label>
            <textarea id="eText" class="code" spellcheck="true" placeholder="Colle ici un prompt existant, ou commence à écrire.&#10;&#10;Astuce : utilise les boutons au-dessus pour ajouter des sections.">${esc(st.drafts.editor || '')}</textarea>
            <div class="ed-foot">
              <button class="btn primary sm" type="button" id="eCopy">${icon('copy', 'sm')}Copier</button>
              <button class="btn sm" type="button" id="eClaude">${icon('external', 'sm')}Ouvrir dans Claude</button>
              <button class="btn sm" type="button" id="eSave">${icon('save', 'sm')}Enregistrer</button>
              <button class="btn sm" type="button" id="eAI">${icon('sparkle', 'sm')}Améliorer avec Claude</button>
              <span class="spacer"></span><span class="counter" id="eCount"></span>
              <button class="btn sm ghost" type="button" id="eClear" aria-label="Effacer le texte">${icon('trash', 'sm')}</button>
            </div>
          </div>
          <div id="eAIOut"></div>
        </div>
        <aside class="stack" aria-label="Résultat de la vérification">
          <div class="card">
            <div class="score"><div class="ring" id="eRing"><span id="eScore">0<small>/100</small></span></div>
            <div><b id="eLevel" style="font-size:1.1rem">—</b><p class="small muted" style="margin:4px 0 0">Vérification heuristique locale : elle repère la présence d’éléments, elle ne juge pas leur qualité.</p></div></div>
          </div>
          <div class="card"><h3>Éléments du prompt</h3><ul class="checks" id="eChecks"></ul></div>
          <div class="card" id="eAmbCard"><h3>Mots à préciser</h3><p class="small muted" style="margin:0 0 6px">Ces mots ne sont pas des erreurs, mais ils laissent Claude deviner.</p><div id="eAmb"></div></div>
          <div id="eNotes" class="stack"></div>
        </aside>
      </div>`;
    const ta = $('#eText', root);
    function update() {
      const t = ta.value; st.drafts.editor = t; PS.saveSoon();
      const a = PS.analyze(t);
      const ring = $('#eRing', root); ring.style.setProperty('--v', a.score); ring.style.setProperty('--c', PS.scoreColor(a.score));
      $('#eScore', root).innerHTML = `${a.score}<small>/100</small>`;
      $('#eLevel', root).textContent = a.words ? a.level : 'En attente de texte';
      $('#eCount', root).textContent = `${a.words} mots · ${a.chars} caractères`;
      $('#eChecks', root).innerHTML = a.results.map((r) => `<li><span class="st ${r.pass ? 'ok' : 'no'}">${icon(r.pass ? 'check' : 'plus')}</span><span class="txt"><b>${esc(r.name)}</b><span>${esc(r.pass ? r.ok : r.no)}</span></span>${r.pass ? '' : `<button class="btn sm" type="button" data-fix="${r.id}">Ajouter</button>`}</li>`).join('');
      $('#eAmb', root).innerHTML = a.amb.length ? `<div class="amb">${a.amb.map((x) => `<span class="tag warn" title="${esc(x.tip)}">« ${esc(x.word)} »${x.count > 1 ? ' ×' + x.count : ''}</span>`).join('')}</div><ul class="checks" style="margin-top:8px">${a.amb.slice(0, 6).map((x) => `<li><span class="st info">${icon('info')}</span><span class="txt"><b>« ${esc(x.word)} »</b><span>${esc(x.tip)}</span></span></li>`).join('')}</ul>` : `<p class="small" style="margin:0">${a.words ? 'Aucun mot vague repéré.' : '—'}</p>`;
      $('#eNotes', root).innerHTML = a.notes.map((n) => `<div class="notice ${n.kind === 'warn' ? 'warn' : ''}">${icon(n.kind === 'warn' ? 'alert' : 'info')}<p>${esc(n.text)}</p></div>`).join('');
    }
    function insert(block) {
      const t = ta.value;
      const pos = ta.selectionStart != null && document.activeElement === ta ? ta.selectionEnd : t.length;
      const before = t.slice(0, pos), after = t.slice(pos);
      const sepB = before.trim() ? (before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n') : '';
      const sepA = after.trim() ? '\n\n' : '';
      ta.value = before + sepB + block + sepA + after;
      const c = (before + sepB + block).length; ta.focus(); ta.setSelectionRange(c, c);
      update(); PS.toast('Bloc ajouté : complète les zones entre crochets', 'plus');
    }
    ta.addEventListener('input', update);
    document.addEventListener('click', function closeMenu(e) { const m = $('#eMenu', root); if (!m) return document.removeEventListener('click', closeMenu); if (m.open && !m.contains(e.target)) m.open = false; });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ins || b.dataset.fix) { const c = PS.CRITERIA.find((x) => x.id === (b.dataset.ins || b.dataset.fix)); insert(c.insert); }
      else if (b.dataset.blk) { $('#eMenu', root).open = false; insert(PS.BLOCKS[b.dataset.blk].text()); }
    });
    $('#eCopy', root).onclick = () => PS.copyPrompt(ta.value);
    $('#eClaude', root).onclick = () => PS.openClaude(ta.value);
    $('#eSave', root).onclick = () => PS.saveToProject(ta.value, { title: (ta.value.split('\n').find((l) => l.trim()) || '').slice(0, 60) });
    $('#eClear', root).onclick = async () => { if (!ta.value.trim()) return; if (await PS.confirmDialog({ title: 'Effacer le texte ?', text: 'Le texte de l’éditeur sera vidé. Ce qui est enregistré dans tes projets n’est pas touché.', ok: 'Effacer', danger: true })) { ta.value = ''; st.drafts.editorSource = null; update(); } };
    const tv = $('#eToVersion', root);
    if (tv) tv.onclick = () => {
      if (ta.value === srcPr.content && srcPr.versions.length && srcPr.versions[srcPr.versions.length - 1].content === ta.value) return PS.toast('Aucun changement depuis la dernière version.', 'info');
      srcPr.content = ta.value; srcPr.updatedAt = srcP.updatedAt = Date.now();
      srcPr.versions.push({ id: PS.uid(), content: ta.value, note: 'Modifié dans l’éditeur', at: Date.now() }); PS.save();
      PS.toast(`Version ${srcPr.versions.length} enregistrée dans « ${srcP.name} »`);
    };
    $('#eAI', root).onclick = () => improveWithClaude(ta, root, update);
    update();
  };

  async function improveWithClaude(ta, root, update) {
    const out = $('#eAIOut', root);
    if (!ta.value.trim()) return PS.toast('Écris ou colle d’abord un prompt.', 'info');
    if (!PS.getKey()) {
      PS.modal({ title: 'Améliorer avec Claude', body: `<p>Cette option envoie ton prompt à Claude avec <b>ta propre clé API Anthropic</b>. Elle est facultative : tout le reste du site fonctionne sans clé.</p><p class="small muted">Sans clé, tu peux aussi copier ce prompt d’amélioration et le coller dans Claude toi-même.</p>`,
        foot: `<button class="btn" type="button" id="aiCopy">${icon('copy', 'sm')}Copier la demande d’amélioration</button><a class="btn primary" href="#/reglages" data-close>${icon('key', 'sm')}Ajouter ma clé</a>`,
        onMount: (c, close) => { $('#aiCopy', c).onclick = () => { PS.copyPrompt(PS.improveMeta(ta.value), 'Demande copiée : colle-la dans Claude'); close(); }; } });
      return;
    }
    const ctrl = new AbortController();
    out.innerHTML = `<div class="card"><div class="row"><b>Claude réfléchit…</b><span class="spacer"></span><button class="btn sm ghost" type="button" id="aiStop">Annuler</button></div><p class="small muted" style="margin:6px 0 0">Ton prompt est envoyé à l’API Anthropic avec ta clé. Cela peut prendre jusqu’à une minute.</p></div>`;
    $('#aiStop', out).onclick = () => ctrl.abort();
    try {
      const original = ta.value;
      const res = await PS.callClaude(PS.improveMeta(original), { signal: ctrl.signal });
      const m = res.match(/<prompt>\s*([\s\S]*?)\s*<\/prompt>/i); const ch = res.match(/<changements>\s*([\s\S]*?)\s*<\/changements>/i);
      const improved = m ? m[1] : res;
      out.innerHTML = `<div class="card"><div class="row" style="margin-bottom:10px"><h3 style="margin:0">Proposition de Claude</h3><span class="spacer"></span><span class="tag">${esc(PS.state.settings.model)}</span></div>
        ${ch ? `<details class="more" open><summary>Changements expliqués</summary><div class="ai-out" style="font-family:var(--font)">${esc(ch[1])}</div></details>` : ''}
        <pre class="ai-out" style="margin-top:10px">${esc(improved)}</pre>
        <div class="btn-row" style="margin-top:12px"><button class="btn primary sm" type="button" id="aiUse">${icon('check', 'sm')}Remplacer mon texte</button><button class="btn sm" type="button" id="aiDiff">${icon('diff', 'sm')}Voir les différences</button><button class="btn sm" type="button" id="aiCp">${icon('copy', 'sm')}Copier</button><button class="btn sm ghost" type="button" id="aiX">Ignorer</button></div>
        <p class="tiny muted" style="margin:10px 0 0">Relis la proposition : Claude peut se tromper ou changer une intention.</p></div>`;
      $('#aiUse', out).onclick = () => { ta.value = improved; update(); out.innerHTML = ''; PS.toast('Texte remplacé. Ton ancien texte reste dans tes projets s’il y était enregistré.'); };
      $('#aiDiff', out).onclick = () => PS.showDiff(original, improved, 'Ton texte', 'Proposition');
      $('#aiCp', out).onclick = () => PS.copyPrompt(improved);
      $('#aiX', out).onclick = () => { out.innerHTML = ''; };
    } catch (e) {
      out.innerHTML = e.name === 'AbortError' ? '' : `<div class="notice warn">${icon('alert')}<p><b>La demande n’a pas abouti.</b><br>${esc(e.message)}</p></div>`;
    }
  }

  PS.showDiff = (a, b, la = 'Avant', lb = 'Après') => {
    const d = PS.diffLines(a, b);
    const add = d.filter((x) => x.t === 'add').length, del = d.filter((x) => x.t === 'del').length;
    PS.modal({ title: `Comparer : ${la} → ${lb}`, wide: true,
      body: `<div class="row" style="margin-bottom:10px"><span class="tag ok">+ ${add} ligne${add > 1 ? 's' : ''} ajoutée${add > 1 ? 's' : ''}</span><span class="tag bad">− ${del} ligne${del > 1 ? 's' : ''} retirée${del > 1 ? 's' : ''}</span>${!add && !del ? '<span class="tag">Aucune différence</span>' : ''}</div>
        <div class="diff" role="region" aria-label="Différences" tabindex="0">${d.map((x) => `<div class="${x.t}">${esc(x.s) || '&nbsp;'}</div>`).join('')}</div>`,
      foot: `<button class="btn" type="button" data-close>Fermer</button>` });
  };

  // ================= MODÈLES =================
  V.modeles = (root, params) => {
    let cat = 'all', q = '';
    root.innerHTML = `
      <div class="page-head"><div><span class="eyebrow">${icon('grid', 'sm')} Modèles</span><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">Des modèles prêts à remplir</h1><p>${PS_TEMPLATES.length} modèles rédigés pour ce site. Remplis les zones entre accolades, puis copie, ouvre dans Claude ou enregistre.</p></div></div>
      <div class="row" style="margin-bottom:14px"><div class="search" style="flex:1;min-width:220px">${icon('search')}<label class="sr" for="tQ">Rechercher un modèle</label><input id="tQ" type="search" placeholder="Rechercher : lettre, code, backtest…"></div></div>
      <div class="cat-scroll" role="group" aria-label="Catégories"><button class="chip" type="button" data-cat="all" aria-pressed="true">Tous</button>${PS_CATEGORIES.map((c) => `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="false">${esc(c.name)}</button>`).join('')}</div>
      <div class="tpl-grid" id="tGrid"></div>`;
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    function render() {
      const list = PS_TEMPLATES.filter((t) => (cat === 'all' || t.cat === cat) && (!q || norm(t.title + ' ' + t.desc + ' ' + t.body).includes(norm(q))));
      $('#tGrid', root).innerHTML = list.length ? list.map((t) => `<button class="card card-link tpl" type="button" data-tpl="${t.id}"><span class="tag accent" style="align-self:flex-start;margin-bottom:10px">${esc(PS_CATEGORIES.find((c) => c.id === t.cat).name)}</span><h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p><span class="meta"><span class="tag">${esc(t.level)}</span><span class="tag">${PS.varsOf(t.body).length} champs</span></span></button>`).join('')
        : `<div class="empty" style="grid-column:1/-1"><h3>Aucun modèle trouvé</h3><p>Essaie un autre mot, ou crée ton prompt avec l’assistant.</p><a class="btn" href="#/generateur">Ouvrir l’assistant</a></div>`;
    }
    $('#tQ', root).addEventListener('input', (e) => { q = e.target.value.trim(); render(); });
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; $$('[data-cat]', root).forEach((b) => b.setAttribute('aria-pressed', b === c)); render(); return; }
      const t = e.target.closest('[data-tpl]'); if (t) openTemplate(PS_TEMPLATES.find((x) => x.id === t.dataset.tpl));
    });
    render();
    if (params && params[0]) { const t = PS_TEMPLATES.find((x) => x.id === params[0]); if (t) openTemplate(t); }
  };
  function openTemplate(t) {
    const vars = PS.varsOf(t.body); const vals = {};
    PS.modal({ title: t.title, wide: true,
      body: `<p class="muted" style="margin-top:-6px">${esc(t.desc)}</p><div class="fill-grid">
        <div>${vars.map((v, i) => `<div class="field"><label class="lbl" for="tv${i}">${esc(v)}</label>${/colle|code|texte|annonce|cv|résultats|extrait|parcours|expériences/i.test(v) ? `<textarea id="tv${i}" data-var="${esc(v)}" rows="4"></textarea>` : `<input id="tv${i}" type="text" data-var="${esc(v)}">`}</div>`).join('')}
        <p class="tiny muted">Les champs laissés vides restent visibles entre accolades dans le prompt.</p></div>
        <div><div class="row" style="margin-bottom:8px"><b>Aperçu</b><span class="spacer"></span><span class="counter" id="tvLeft"></span></div><pre class="prompt-box" id="tvPrev" style="max-height:60vh"></pre></div></div>`,
      foot: `<button class="btn ghost" type="button" id="tvEdit">${icon('edit', 'sm')}Modifier dans l’éditeur</button><button class="btn" type="button" id="tvSave">${icon('save', 'sm')}Enregistrer</button><button class="btn" type="button" id="tvClaude">${icon('external', 'sm')}Ouvrir dans Claude</button><button class="btn primary" type="button" id="tvCopy">${icon('copy', 'sm')}Copier</button>`,
      onMount: (c, close) => {
        const out = () => PS.fillVars(t.body, vals);
        const upd = () => { $('#tvPrev', c).innerHTML = PS.highlight(out()); const left = PS.varsOf(out()).length; $('#tvLeft', c).textContent = left ? `${left} champ${left > 1 ? 's' : ''} à remplir` : 'Tout est rempli'; };
        c.addEventListener('input', (e) => { if (e.target.dataset.var) { vals[e.target.dataset.var] = e.target.value; upd(); } });
        const warnLeft = () => { const n = PS.varsOf(out()).length; if (n) PS.toast(`Attention : ${n} champ${n > 1 ? 's' : ''} encore vide${n > 1 ? 's' : ''}.`, 'alert', 3200); };
        $('#tvCopy', c).onclick = () => { PS.copyPrompt(out()); warnLeft(); };
        $('#tvClaude', c).onclick = () => { warnLeft(); PS.openClaude(out()); };
        $('#tvSave', c).onclick = () => { const o = out(); close(); PS.saveToProject(o, { title: t.title }); };
        $('#tvEdit', c).onclick = () => { const o = out(); close(); PS.openInEditor(o); };
        upd();
      } });
  }
})();
