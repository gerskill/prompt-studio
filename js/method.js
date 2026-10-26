/* Prompt Studio — optimisation en 4 étapes (Décomposer, Diagnostiquer, Développer, Livrer),
   modes Rapide / Détaillé, IA visée, et notes « Ce qui a changé / Techniques appliquées / Astuce ».
   Tout est fait par des règles locales : rien n'est envoyé sans la clé de l'utilisateur. */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, "'");
  const has = (n, re) => new RegExp('(?:^|[^a-z0-9])(?:' + re + ')(?![a-z0-9])').test(n);
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const dot = (x) => (/[.!?:»)]$/.test(x) ? x : x + '.');
  const DOM = () => Object.fromEntries(PS.phrase.DOMAINS.map((d) => [d.id, d]));

  // ---------- Type de demande → techniques ----------
  const TYPES = {
    creatif: { label: 'Créative', tech: ['Plusieurs points de vue', 'Ton précisé'] },
    technique: { label: 'Technique', tech: ['Contraintes précises', 'Précision des noms, versions et unités'] },
    pedagogique: { label: 'Pédagogique', tech: ['Exemples à imiter', 'Structure claire'] },
    complexe: { label: 'Complexe', tech: ['Raisonnement étape par étape', 'Cadre systématique'] }
  };
  function detectType(text, g) {
    const n = norm(text);
    if (['code', 'trading', 'analyse', 'traduction'].includes(g.domain)) return 'technique';
    if (['projet', 'web', 'conseil', 'sport'].includes(g.domain)) return 'complexe';
    if (['idees', 'marketing', 'redaction', 'emploi'].includes(g.domain)) return 'creatif';
    if (g.domain === 'apprendre' || has(n, 'expliqu\\w*|comprendre|apprendre|cours|lecon|reviser')) return 'pedagogique';
    if (['projet', 'conseil'].includes(g.domain) || has(n, 'strategie|plan d\'action|feuille de route|business plan|etape par etape|decider|choisir entre')) return 'complexe';
    if (['idees', 'marketing'].includes(g.domain) || has(n, 'histoire|poeme|slogan|nom pour|noms? de|creati\\w*|imagine|invente|chanson|recit|scenario|blague')) return 'creatif';
    if (PS.words(text) > 60) return 'complexe';
    return g.domain === 'redaction' ? 'creatif' : 'pedagogique';
  }
  // Simple → Rapide ; complexe ou professionnel → Détaillé
  function complexity(text, g, type) {
    const n = norm(text), w = PS.words(text), why = [];
    if (type === 'complexe') why.push('demande en plusieurs parties');
    if (['projet', 'conseil', 'emploi', 'analyse', 'trading'].includes(g.domain)) why.push('domaine ' + g.domainLabel.toLowerCase());
    if (w > 30) why.push(w + ' mots');
    if (has(n, 'professionnel\\w*|clients?|entreprise|equipe|strategie|investisseurs?|contrat|budget|lancement|recrut\\w*')) why.push('usage professionnel');
    // « usage professionnel » seul ne suffit pas : une demande pro courte reste en Rapide
    const strong = why.filter((x) => x !== 'usage professionnel').length || (why.length && w >= 18);
    return { mode: strong ? 'detaille' : 'rapide', why };
  }

  // ---------- Décomposer : ce qui est fourni / ce qui manque ----------
  function decompose(text, a) {
    const r = Object.fromEntries(a.results.map((x) => [x.id, x.pass]));
    const K = new Set(PS.phrase.keywords(text));
    const kws = Array.from(new Set((String(text).match(/[\p{L}\d][\p{L}\d'’-]{3,}/gu) || []).filter((x) => K.has(norm(x).slice(0, 7))).map((x) => x.toLowerCase()))).slice(0, 5);
    return [
      { id: 'intention', label: 'Intention', ok: r.goal, detail: r.goal ? 'Tâche identifiable' : 'Tâche à préciser (verbe d’action)' },
      { id: 'entites', label: 'Éléments clés', ok: kws.length > 0, detail: kws.length ? kws.join(', ') : 'Aucun mot-clé net' },
      { id: 'contexte', label: 'Contexte', ok: r.context, detail: r.context ? 'Situation décrite' : 'Situation absente' },
      { id: 'sortie', label: 'Résultat attendu', ok: r.format || r.length, detail: [r.format && 'forme', r.length && 'longueur', r.tone && 'ton'].filter(Boolean).join(', ') || 'Forme, longueur et ton absents' },
      { id: 'contraintes', label: 'Contraintes', ok: r.constraints, detail: r.constraints ? 'Règles présentes' : 'Aucune règle' }
    ];
  }
  // ---------- Diagnostiquer ----------
  function diagnose(text, a) {
    const t = String(text), lines = t.split('\n').filter((l) => l.trim());
    const heads = lines.filter((l) => isHeading(l)).length;
    const nums = (t.match(/\d+/g) || []).length;
    const missing = a.results.filter((x) => x.g !== '+' && !x.pass).length;
    return [
      { id: 'clarte', label: 'Clarté', ok: a.amb.length === 0, detail: a.amb.length ? `${a.amb.length} mot${a.amb.length > 1 ? 's' : ''} vague${a.amb.length > 1 ? 's' : ''} (${a.amb.slice(0, 3).map((x) => '« ' + x.word + ' »').join(', ')})` : 'Pas de mot vague repéré' },
      { id: 'precision', label: 'Précision', ok: nums > 0 || a.results.find((x) => x.id === 'length').pass, detail: nums ? 'Contient des quantités ou des repères chiffrés' : 'Aucune quantité (nombre, durée, longueur)' },
      { id: 'completude', label: 'Complétude', ok: missing <= 1, detail: missing ? `${missing} élément${missing > 1 ? 's' : ''} ASPECCT sur 7 manquant${missing > 1 ? 's' : ''}` : 'Les 7 éléments ASPECCT sont là' },
      { id: 'structure', label: 'Structure', ok: heads >= 3, detail: heads >= 3 ? `${heads} sections titrées` : 'Pas ou peu de sections titrées' }
    ];
  }

  // ---------- Questions du mode Détaillé (2 ou 3, réponses par défaut déjà choisies) ----------
  const FMT = (v) => [v, PS.FORMAT_LABELS[v] || v];
  function questions(g, text, a) {
    const n = norm(text), h = PS.phrase.hints(text), d = DOM()[g.domain] || DOM().general;
    const r = a ? Object.fromEntries(a.results.map((x) => [x.id, x.pass])) : {};
    const Q = [];
    const add = (q) => { if (Q.length < 3 && !Q.some((x) => x.id === q.id)) Q.push(q); };
    const POOL = {
      objectif: { marketing: ['Quel résultat vises-tu ?', ['Plus de ventes', 'Plus de visibilité', 'Fidéliser mes clients']], projet: ['Où en est le projet ?', ['Juste une idée', 'Déjà commencé', 'Version 1 en ligne']], emploi: ['Pour quel type de poste ?', ['Premier emploi ou stage', 'Changement de poste', 'Reconversion']], trading: ['Sur quel marché et quelle unité de temps ?', ['BTC en 4 h', 'Actions en journalier', 'À toi de proposer']], sport: ['Combien de temps par séance ?', ['30 min', '45 min', '1 h']], code: ['Quel langage ou environnement ?', ['JavaScript', 'Python', 'Je ne sais pas : propose']], conseil: ['Quel critère compte le plus ?', ['Le prix', 'La simplicité', 'La qualité sur la durée']], analyse: ['Que veux-tu décider avec ces chiffres ?', ['Où agir en premier', 'Ce qui marche ou pas', 'Une prévision prudente']] },
      donnees: { resume: 'le texte', traduction: 'le texte', analyse: 'les données', emploi: 'ton parcours et l’annonce' }
    };
    if (POOL.objectif[g.domain]) { const [q, o] = POOL.objectif[g.domain]; add({ id: 'objectif', q, opts: o.map((x) => [x, x]), def: o[0] }); }
    if (POOL.donnees[g.domain]) { const w = POOL.donnees[g.domain]; add({ id: 'donnees', q: `As-tu ${w} à fournir ?`, opts: [['coller', 'Je le colle juste après'], ['deja', 'Déjà dans la conversation'], ['aide', 'Pas encore : aide-moi à le préparer']], def: 'coller' }); }
    if (!h.audience && !(a && r.audience)) { const o = [[g.audience, g.audience.replace(/\.$/, '')], ['Des débutants', 'Des débutants'], ['Des professionnels', 'Des professionnels']]; add({ id: 'audience', q: 'Pour qui est la réponse ?', opts: o, def: g.audience }); }
    if (!h.format && !(a && r.format)) { const base = [g.format, ...['liste', 'tableau', 'etapes', 'paragraphes'].filter((x) => x !== g.format)].filter((x) => x !== 'libre').slice(0, 3); add({ id: 'format', q: 'Sous quelle forme ?', opts: base.map(FMT), def: base[0] }); }
    if (!h.longueur && !(a && r.length)) add({ id: 'longueur', q: 'Quelle longueur ?', opts: [['courte', 'Courte'], ['moyenne', 'Moyenne'], ['longue', 'Détaillée']], def: g.longueur === 'auto' ? 'moyenne' : g.longueur });
    if (!h.niveau) add({ id: 'niveau', q: 'Quel est ton niveau sur ce sujet ?', opts: [['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['expert', 'Expert']], def: g.niveau || 'debutant' });
    return Q;
  }
  const answersOf = (qs, ans) => Object.fromEntries(qs.map((q) => [q.id, ans && ans[q.id] != null ? ans[q.id] : q.def]));
  // Réponses → réglages (ov) et lignes de contexte
  function applyAnswers(qs, ans) {
    const A = answersOf(qs, ans), ov = {}, ctx = [], labels = [];
    qs.forEach((q) => {
      const v = A[q.id]; const l = (q.opts.find((o) => o[0] === v) || [v, v])[1];
      labels.push(`${q.q.replace(/\s*\?$/, '')} : ${l.toLowerCase()}`);
      if (['audience', 'format', 'longueur', 'niveau'].includes(q.id)) ov[q.id] = v;
      else if (q.id === 'donnees') ctx.push(v === 'coller' ? 'Je te fournis les éléments à traiter juste après ce message.' : v === 'deja' ? 'Les éléments à traiter sont déjà dans notre conversation.' : 'Je n’ai pas encore les éléments : commence par me dire précisément quoi rassembler.');
      else ctx.push(`${q.q.replace(/\s*\?$/, '')} : ${l}.`);
    });
    return { ov, ctx, labels };
  }

  // ---------- Développer : techniques selon le type ----------
  function develop(w, type, mode) {
    const applied = ['Rôle attribué (persona)', 'Structure logique (méthode ASPECCT)'];
    const cons = w.contraintes.split('\n').filter(Boolean);
    const addC = (c) => { if (!cons.some((x) => norm(x).includes(norm(c).slice(0, 25)))) cons.push(c); };
    if (type === 'creatif') { addC('Propose plusieurs points de vue ou angles différents avant de choisir'); applied.push('Plusieurs points de vue'); if (w.ton.length || w.tonExtra) applied.push('Ton précisé'); }
    if (type === 'technique') { addC('Sois précis : noms exacts, versions, unités et hypothèses annoncées'); applied.push('Contraintes précises'); }
    if (type === 'pedagogique') { if (!w.exemplesNote) w.exemplesNote = 'Donne au moins deux exemples concrets et différents (un du quotidien, un plus proche de mon cas).'; applied.push('Exemples à imiter', 'Structure claire'); }
    if (type === 'complexe') { w.blocks.reflexion = true; applied.push('Raisonnement étape par étape', 'Cadre systématique'); }
    if (mode === 'detaille') { w.blocks.reflexion = true; w.blocks.verif = true; if (!applied.includes('Raisonnement étape par étape')) applied.push('Réflexion préalable'); }
    w.contraintes = cons.join('\n');
    if (w.contexte.trim()) applied.push('Contexte enrichi');
    return applied;
  }

  // ---------- Notes « Ce qui a changé / Techniques / Astuce » (déduites des règles appliquées) ----------
  const TARGET_NOTE = { claude: 'Pour Claude : la tâche (et, s’il y en a, le contexte et les exemples) est entourée de balises XML comme <tache>, pour bien séparer la consigne du reste.', chatgpt: 'Pour ChatGPT : titres en Markdown (##) et une phrase de démarrage pour qu’il confirme la tâche.', gemini: 'Pour Gemini : consigne de comparer plusieurs approches avant de recommander.', grokbot: 'Pour Grok Bot : sections avec titres Markdown (##), et une section « Comment travailler » : il peut utiliser ses outils et son ordinateur, puis doit te montrer le résultat avant de publier.', autre: 'Pour une autre IA : sections simples, sans balises particulières.' };
  const TIPS = { claude: 'Colle le prompt dans une nouvelle conversation Claude. S’il pose des questions, réponds-y avant qu’il commence.', chatgpt: 'Colle le prompt dans une nouvelle conversation ChatGPT : il va d’abord reformuler la tâche ; corrige-le si besoin avant qu’il continue.', gemini: 'Colle le prompt dans Gemini. Si tu hésites entre deux pistes, demande-lui de les comparer dans un tableau.', grokbot: 'Envoie le prompt à Grok Bot dans le chat. Il peut agir lui-même (navigateur, fichiers, code) : il te montrera le résultat et te demandera ton accord avant de publier.', autre: 'Colle le prompt tel quel. Si l’outil limite la longueur, utilise la version courte de l’assistant détaillé.' };
  function notes(w, g, o) {
    const ch = [];
    const S = PS.sectionsOf(w, { target: o.target });
    const k = (id) => S.find((x) => x.k === id);
    if (g && g.objectif) ch.push(`Action écrite en une phrase claire : « ${g.objectif.split('\n')[0]} »`);
    if (w.role) ch.push(`Persona ajouté : ${w.role.split(',')[0]}`);
    const et = w.etapes.split('\n').filter(Boolean).length; if (et) ch.push(`Étapes ajoutées (${et}) pour que l’IA avance dans l’ordre`);
    if (k('exemples')) ch.push('Exemples ajoutés pour montrer la variété attendue');
    if (o.ctxFiles) ch.push(`Contexte du projet ajouté (${o.ctxFiles} fichier${o.ctxFiles > 1 ? 's' : ''})`); else if (w.contexte.trim()) ch.push('Contexte précisé');
    const neg = w.contraintes.split('\n').filter((l) => l.trim() && PS.positive(l)).length;
    if (neg) ch.push(`${neg} règle${neg > 1 ? 's' : ''} reformulée${neg > 1 ? 's' : ''} positivement`);
    if (k('modele')) ch.push(`Modèle de réponse précisé : ${(PS.FORMAT_LABELS[w.format] || 'libre').toLowerCase()}${w.longueur !== 'auto' ? ', longueur ' + (PS.LENGTH_LABELS[w.longueur] || '').toLowerCase() : ''}`);
    const r = k('rappel'); if (r) ch.push(`Rappel final de la contrainte clé : « ${r.b.replace(/\s*C’est important !$/, '')} »`);
    const bl = PS.BLOCK_ORDER.filter((b) => w.blocks[b]).map((b) => PS.BLOCKS[b].title); if (bl.length) ch.push('Blocs de fiabilité : ' + bl.join(', '));
    if (o.answers && o.answers.length) ch.push('Tes réponses prises en compte : ' + o.answers.join(' ; '));
    ch.push(TARGET_NOTE[o.target] || TARGET_NOTE.claude);
    const tech = o.techniques || [];
    let tip = TIPS[o.target] || TIPS.claude;
    if (/\[à compléter\]|\[À COMPLÉTER\]/.test(o.text || '')) tip = 'Remplace d’abord les zones entre crochets [ ] par tes informations. ' + tip;
    else if (w.blocks.etapes) tip += ' Écris « suivant » pour passer à l’étape d’après.';
    return { changes: ch, techniques: tech, tip };
  }

  // ---------- Pipeline « Une phrase » ----------
  function phrasePipeline(text, o = {}) {
    const target = o.target || PS.currentTarget();
    const g0 = PS.phrase.infer(text, o.ov || {});
    const type = detectType(text, g0);
    const cx = complexity(text, g0, type);
    const mode = o.mode || cx.mode;
    const qs = mode === 'detaille' ? questions(g0, text) : [];
    const ap = applyAnswers(qs, o.answers);
    const g = PS.phrase.infer(text, Object.assign({}, ap.ov, o.ov || {}), o.extra || {});
    const w = PS.phrase.toWizard(g, o.ctx);
    if (ap.ctx.length) w.contexte = [w.contexte, ap.ctx.join('\n')].filter((x) => x && x.trim()).join('\n\n');
    const techniques = develop(w, type, mode);
    const prompt = PS.buildPrompt(w, 'complet', { target });
    const nt = notes(w, g, { target, techniques, answers: mode === 'detaille' ? ap.labels : [], text: prompt, ctxFiles: o.ctx && o.ctx.used ? o.ctx.used.length : 0 });
    return { prompt, g, w, type, mode, auto: cx, qs, answers: answersOf(qs, o.answers), notes: nt, target };
  }

  // ---------- Optimiseur d'un prompt existant ----------
  const isHeading = (l) => { const h = l.trim().replace(/^#+\s*/, ''); return h.length >= 3 && h.length < 70 && /^[A-ZÀ-ÝŒ][A-ZÀ-ÝŒ0-9 /’'()«»:,.-]+$/.test(h) && !/^\[/.test(h) && /[A-ZÀ-Ý]{3}/.test(h); };
  const KEYMAP = [
    ['role', /^(RÔLE|ROLE|PERSONA)/], ['action', /^(OBJECTIF|MISSION|TÂCHE|TACHE|ACTION|BUT|DEMANDE)\b/], ['etapes', /^(ÉTAPES|ETAPES|MÉTHODE|METHODE|PROCESSUS|DÉROULÉ)(?!\s+UNE)/],
    ['exemples', /^EXEMPLES?\b/], ['contraintes', /^(CONTRAINTES|RÈGLES?|REGLES?)(?!\s+DE\s+PREUVE)/], ['modele', /^(FORMAT|MODÈLE|MODELE|STRUCTURE DE LA RÉPONSE|FORME)/], ['rappel', /^RAPPEL\b/],
    ['contexte', /^(CONTEXTE|SITUATION|SUJET|DONNÉES|DONNEES|PROFIL(?! FIXE)|PRODUIT|CLIENT|STRATÉGIE|MON PROJET|PROJET)/]
  ];
  const CANON = { role: 'RÔLE / PERSONA', action: 'ACTION', etapes: 'ÉTAPES', exemples: 'EXEMPLES', contraintes: 'CONTRAINTES / RÈGLES', modele: 'MODÈLE DE RÉPONSE', rappel: 'RAPPEL' };
  function parse(text) {
    const L = String(text).replace(/\r/g, '').split('\n'); const S = []; let cur = { k: 'pre', h: '', body: [] };
    L.forEach((l) => {
      if (isHeading(l)) { S.push(cur); const h = l.trim().replace(/^#+\s*/, ''); const m = KEYMAP.find(([, re]) => re.test(h)); cur = { k: m ? m[0] : 'autre', h, body: [] }; }
      else cur.body.push(l);
    });
    S.push(cur);
    return S.map((x) => ({ k: x.k, h: x.h, b: x.body.join('\n').trim() })).filter((x) => x.h || x.b);
  }
  function optimize(text, o = {}) {
    const target = o.target || PS.currentTarget();
    const t = String(text || '').trim();
    const a = PS.analyze(t);
    const g = PS.phrase.infer(t.slice(0, 600));
    const type = detectType(t, g);
    const cx = complexity(t, g, type);
    const mode = o.mode || cx.mode;
    const decomp = decompose(t, a), diag = diagnose(t, a);
    const S = parse(t);
    const structured = S.filter((x) => x.h).length >= 1;
    const qs = mode === 'detaille' ? questions(g, t, a) : [];
    const ap = applyAnswers(qs, o.answers);
    // Demande courte et sans structure : même chemin que « Une phrase »
    if (!structured && PS.words(t) <= 60 && !/\n\s*\n/.test(t)) {
      const r = phrasePipeline(t, { target, mode, answers: o.answers });
      return Object.assign(r, { decomp, diag, analysis: a, kind: 'phrase', original: t });
    }
    const ch = [], tech = ['Structure logique (méthode ASPECCT)'];
    let out = S.map((x) => Object.assign({}, x));
    if (!structured) out = [{ k: 'pre', h: '', b: t }];
    // Début sans titre : « Tu es… » → persona ; première phrase d'action → ACTION ; le reste → CONTEXTE
    const pi = out.findIndex((x) => x.k === 'pre');
    if (pi >= 0) {
      const paras = out[pi].b.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean); const rep = []; let gotAct = out.some((x) => x.k === 'action');
      const goalRe = PS.CRITERIA.find((c) => c.id === 'goal').test;
      paras.forEach((pp) => {
        if (/^(?:tu es|vous êtes|agis comme|tu joues)\b/i.test(pp) && !rep.some((x) => x.k === 'role')) { rep.push({ k: 'role', h: CANON.role, b: pp }); ch.push('Le rôle du début devient la section RÔLE / PERSONA'); }
        else if (!gotAct && goalRe.test(pp)) { gotAct = true; rep.push({ k: 'action', h: 'ACTION', b: pp }); ch.push(structured ? 'Le début du texte devient la section ACTION' : 'Ta demande est placée dans une section ACTION'); }
        else { const c = rep.find((x) => x.k === 'contexte'); if (c) c.b += '\n\n' + pp; else rep.push({ k: 'contexte', h: 'CONTEXTE', b: pp }); }
      });
      if (!gotAct && !structured && rep.some((x) => x.k === 'contexte') && !rep.some((x) => x.k === 'action')) { const c = rep.find((x) => x.k === 'contexte'); c.k = 'action'; c.h = 'ACTION'; ch.push('Ta demande est placée dans une section ACTION'); }
      out.splice(pi, 1, ...rep);
    }
    out.forEach((x) => { if (CANON[x.k] && x.h !== CANON[x.k]) { ch.push(`« ${x.h} » renommé « ${CANON[x.k]} »`); x.h = CANON[x.k]; } });
    const hasRole = out.some((x) => x.k === 'role') || /(?:^|\n)\s*(?:tu es|vous êtes|agis comme)/i.test(t);
    if (!hasRole) { out.unshift({ k: 'role', h: CANON.role, b: `Tu es ${g.role}.` }); ch.push(`Persona ajouté : ${g.role.split(',')[0]}`); tech.unshift('Rôle attribué (persona)'); }
    const idx = (k) => out.findIndex((x) => x.k === k);
    if (!out.some((x) => x.k === 'action')) { out.splice(idx('role') + 1, 0, { k: 'action', h: 'ACTION', b: '[La tâche en une phrase, avec un verbe d’action]' }); ch.push('Section ACTION ajoutée (à compléter)'); }
    const hasSteps = out.some((x) => x.k === 'etapes') || (t.match(/^\s*\d+[.)]/gm) || []).length >= 2;
    if (!hasSteps) { const d = PS.phrase.DOMAINS.find((x) => x.id === g.domain) || {}; const et = d.etapes || []; if (et.length) { out.splice(idx('action') + 1, 0, { k: 'etapes', h: 'ÉTAPES', b: et.map((x, i) => `${i + 1}. ${x}`).join('\n') }); ch.push(`Étapes ajoutées (${et.length}), adaptées au domaine « ${g.domainLabel.toLowerCase()} »`); } }
    if (ap.ctx.length || (mode === 'detaille' && ap.ov.audience)) {
      const add = [ap.ov.audience && !a.results.find((r) => r.id === 'audience').pass ? 'Pour : ' + dot(ap.ov.audience) : '', ...ap.ctx].filter(Boolean).join('\n');
      const c = out.find((x) => x.k === 'contexte');
      if (c) c.b = [c.b, add].filter(Boolean).join('\n'); else out.splice(idx('role') + 1, 0, { k: 'contexte', h: 'CONTEXTE', b: add });
      tech.push('Contexte enrichi');
    }
    // règles négatives → positives (dans tout le texte, sauf blocs standard)
    let nNeg = 0;
    out.forEach((x) => { x.b = x.b.split('\n').map((l) => { if (!PS.isNegative(l)) return l; const f = PS.positive(l); if (f && f !== l.trim()) { nNeg++; return l.match(/^\s*/)[0] + f; } return l; }).join('\n'); });
    if (nNeg) ch.push(`${nNeg} règle${nNeg > 1 ? 's' : ''} reformulée${nNeg > 1 ? 's' : ''} positivement`);
    const left = PS.negLines(out.map((x) => x.b).join('\n')).length;
    if (!out.some((x) => x.k === 'modele') && !a.results.find((r) => r.id === 'format').pass || (mode === 'detaille' && ap.ov.format && !out.some((x) => x.k === 'modele'))) {
      const f = ap.ov.format || g.format; const lenK = ap.ov.longueur;
      const b = [PS.FORMATS[f] ? 'Format : ' + PS.FORMATS[f] : '', lenK && PS.LENGTH_LABELS[lenK] ? 'Longueur : ' + PS.LENGTH_LABELS[lenK].toLowerCase() + '.' : ''].filter(Boolean).join('\n');
      if (b) { const at = out.findIndex((x) => !['pre', 'role', 'contexte', 'action', 'audience', 'etapes', 'exemples', 'contraintes', 'autre'].includes(x.k)); out.splice(at < 0 ? out.length : at, 0, { k: 'modele', h: CANON.modele, b }); ch.push('Modèle de réponse ajouté : ' + (PS.FORMAT_LABELS[f] || f).toLowerCase()); }
    }
    if (type === 'complexe' && !/réfléchis|étape par étape|reformule ma demande/i.test(t)) { out.push({ k: 'reflexion', b: PS.BLOCKS.reflexion.text() }); ch.push('Réflexion préalable ajoutée (demande complexe)'); }
    TYPES[type].tech.forEach((x) => { if (!tech.includes(x) && !(x === 'Ton précisé' && !a.results.find((r) => r.id === 'tone').pass)) tech.push(x); });
    if (type === 'creatif' && !/points? de vue|angles?/i.test(t)) { const c = out.find((x) => x.k === 'contraintes'); const r = 'Propose plusieurs points de vue ou angles différents avant de choisir.'; if (c) c.b += '\n- ' + r; else out.push({ k: 'contraintes', h: CANON.contraintes, b: '- ' + r }); ch.push('Consigne ajoutée : plusieurs points de vue'); }
    if (type === 'technique' && !/versions?|unités?|noms exacts/i.test(t)) { const c = out.find((x) => x.k === 'contraintes'); const r = 'Sois précis : noms exacts, versions, unités et hypothèses annoncées.'; if (c) c.b += '\n- ' + r; else out.push({ k: 'contraintes', h: CANON.contraintes, b: '- ' + r }); ch.push('Consigne de précision ajoutée'); }
    if (type === 'pedagogique' && !out.some((x) => x.k === 'exemples')) { out.splice(Math.max(0, idx('contraintes')), 0, { k: 'exemples', h: 'EXEMPLES', b: 'Donne au moins deux exemples concrets et différents (un du quotidien, un plus proche de mon cas).' }); ch.push('Demande d’exemples variés ajoutée'); }
    if (!out.some((x) => x.k === 'rappel') && !a.results.find((r) => r.id === 'rappel').pass) {
      const key = PS.keyFromText(out.map((x) => (x.h ? x.h + '\n' : '') + x.b).join('\n\n'));
      if (key) { out.push({ k: 'rappel', h: 'RAPPEL', b: `${dot(PS.positive(key) || key)} C’est important !` }); ch.push(`Rappel final de la contrainte clé : « ${key.replace(/[.;]$/, '')} »`); }
    }
    // Ordre ASPECCT : persona, contexte, action, audience, étapes, exemples, contraintes, modèle, autres blocs, rappel
    const RANK = { role: 0, contexte: 1, action: 2, audience: 3, etapes: 4, exemples: 5, contraintes: 6, modele: 7, rappel: 20 };
    const before = out.map((x) => x.k).join();
    out = out.map((x, i) => [x, i]).sort((A, B) => (RANK[A[0].k] ?? 10) - (RANK[B[0].k] ?? 10) || A[1] - B[1]).map((x) => x[0]);
    for (let i = out.length - 1; i > 0; i--) { const j = out.findIndex((x) => x.k === out[i].k); if (j < i && ['contraintes', 'contexte', 'exemples', 'etapes'].includes(out[i].k)) { out[j].b = [out[j].b, out[i].b].filter(Boolean).join('\n'); out.splice(i, 1); } }
    if (out.map((x) => x.k).join() !== before) ch.push('Sections remises dans l’ordre ASPECCT');
    if (target === 'chatgpt') out.push({ k: 'start', b: 'Pour commencer : confirme en une phrase ce que tu as compris de la tâche, puis réponds.' });
    if (target === 'grokbot') out.push({ k: 'agir', h: 'COMMENT TRAVAILLER', b: PS.GROKBOT_ACT });
    if (mode === 'detaille' && ap.labels.length) ch.push('Tes réponses prises en compte : ' + ap.labels.join(' ; '));
    ch.push(TARGET_NOTE[target]);
    const prompt = PS.renderSections(out.map((x) => ({ k: x.k, h: x.h, b: x.b })), target);
    let tip = TIPS[target];
    if (left) tip = `${left} règle${left > 1 ? 's' : ''} reste${left > 1 ? 'nt' : ''} formulée${left > 1 ? 's' : ''} en négatif : réécris-la${left > 1 ? 's' : ''} en disant quoi faire. ` + tip;
    if (/\[[^\]\n]{3,}\]/.test(prompt) && /compléter|La tâche/.test(prompt)) tip = 'Remplace d’abord les zones entre crochets [ ] par tes informations. ' + tip;
    if (!ch.length || ch.length === 1) ch.unshift('Le prompt contenait déjà l’essentiel : seules des retouches ont été faites');
    return { prompt, notes: { changes: ch, techniques: tech, tip }, type, mode, auto: cx, qs, answers: answersOf(qs, o.answers), decomp, diag, analysis: a, kind: 'structure', original: t, target };
  }

  // ---------- Morceaux d'interface partagés ----------
  const STEPS4 = [['Décomposer', 'Ce que dit ta demande'], ['Diagnostiquer', 'Ce qui manque ou reste flou'], ['Développer', 'Les techniques choisies'], ['Livrer', 'Le prompt et les explications']];
  const progressHtml = (n = 4) => `<ol class="d4" aria-label="Optimisation en 4 étapes">${STEPS4.map(([t, s], i) => `<li class="${i < n ? 'done' : ''}"><span class="d4-n" aria-hidden="true">${i < n ? icon('check', 'sm') : i + 1}</span><span><b>${t}</b><small>${s}</small></span></li>`).join('')}</ol>`;
  const targetHtml = (cur, id) => `<div class="seg tg" role="group" aria-label="IA visée" id="${id}">${Object.entries(PS.TARGETS).map(([k, l]) => `<button type="button" data-target="${k}" aria-pressed="${k === cur}">${esc(l)}</button>`).join('')}</div>`;
  const modeHtml = (mode, auto, id) => `<div class="mrow" id="${id}"><div class="seg" role="group" aria-label="Mode"><button type="button" data-mode4="rapide" aria-pressed="${mode === 'rapide'}">${icon('bolt', 'sm')}Rapide</button><button type="button" data-mode4="detaille" aria-pressed="${mode === 'detaille'}">${icon('layers', 'sm')}Détaillé</button></div>
    <p class="tiny muted mnote">${auto.mode === mode ? (mode === 'detaille' ? `Mode Détaillé choisi automatiquement (${esc(auto.why.join(', '))}) : 2 ou 3 questions, réponses par défaut déjà cochées.` : 'Mode Rapide choisi automatiquement : demande simple, prompt prêt tout de suite.') : `Tu as choisi le mode ${mode === 'detaille' ? 'Détaillé' : 'Rapide'} (suggestion : ${auto.mode === 'detaille' ? 'Détaillé' : 'Rapide'}).`}</p></div>`;
  const questionsHtml = (qs, A) => (qs.length ? `<div class="q4" aria-label="Questions du mode Détaillé">${qs.map((q) => `<div class="q4-item" role="group" aria-labelledby="q4-${q.id}"><span class="q4-q" id="q4-${q.id}">${esc(q.q)}</span><div class="chips">${q.opts.map(([v, l]) => `<button type="button" class="chip" data-q="${q.id}" data-qv="${esc(v)}" aria-pressed="${A[q.id] === v}">${esc(l)}</button>`).join('')}</div></div>`).join('')}<p class="tiny muted" style="margin:6px 0 0">Les réponses par défaut sont déjà choisies : change-les d’un geste, le prompt se met à jour.</p></div>` : '');
  const notesHtml = (n, open) => `<details class="more n4" ${open ? 'open' : ''}><summary>${icon('info', 'sm')}<span>Ce qui a changé · Techniques appliquées · Astuce</span></summary>
    <div class="n4-body"><h4>Ce qui a changé</h4><ul>${n.changes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h4>Techniques appliquées</h4><div class="chips">${n.techniques.map((x) => `<span class="tag">${esc(x)}</span>`).join('')}</div>
    <h4>Astuce</h4><p>${esc(n.tip)}</p>
    <p class="tiny muted">Ces explications viennent des règles réellement appliquées par le site, pas d’une IA.</p></div></details>`;
  const mapHtml = (decomp, diag) => `<div class="m4"><div><h4>Fourni / manquant</h4><ul class="checks">${decomp.map((x) => `<li><span class="st ${x.ok ? 'ok' : 'no'}">${icon(x.ok ? 'check' : 'plus')}</span><span class="txt"><b>${esc(x.label)}</b><span>${esc(x.detail)}</span></span></li>`).join('')}</ul></div>
    <div><h4>Diagnostic</h4><ul class="checks">${diag.map((x) => `<li><span class="st ${x.ok ? 'ok' : 'info'}">${icon(x.ok ? 'check' : 'info')}</span><span class="txt"><b>${esc(x.label)}</b><span>${esc(x.detail)}</span></span></li>`).join('')}</ul></div></div>`;
  const openLabel = (t) => (t === 'claude' ? 'Ouvrir dans Claude' : '');
  const PRIVACY = 'Confidentialité : l’optimisation se fait sur ton appareil, rien n’est envoyé sur Internet (sauf si tu demandes la « Version IA » avec ta clé). Rien n’est enregistré dans tes projets tant que tu ne cliques pas sur Enregistrer ; seul le brouillon en cours reste sur cet appareil pour ne pas le perdre.';

  // Consigne système pour la version IA (avec la clé de l'utilisateur)
  const SYSTEM = `Tu es un spécialiste de l'optimisation de prompts. Tu écris en français.
Tu appliques une méthode en 4 étapes :
1. Décomposer : intention, éléments clés, contexte, résultat attendu, contraintes ; repère ce qui est fourni et ce qui manque.
2. Diagnostiquer : clarté, ambiguïtés, précision, complétude, structure.
3. Développer : choisis les techniques selon le type de demande (créative : plusieurs points de vue et ton ; technique : contraintes et précision ; pédagogique : exemples à imiter et structure claire ; complexe : raisonnement étape par étape et cadre systématique). Attribue un rôle, enrichis le contexte, organise logiquement.
4. Livrer : le prompt optimisé.
Le prompt suit la méthode ASPECCT, avec des titres en majuscules : RÔLE / PERSONA, CONTEXTE, ACTION (une phrase explicite, la contrainte clé peut y figurer), ÉTAPES (numérotées), EXEMPLES (plusieurs exemples variés valent mieux qu'un seul ; ils peuvent être listés entre parenthèses), CONTRAINTES / RÈGLES (formulées positivement : « Utilise uniquement… » plutôt que « N'utilise pas… » ; « C'est important ! » pour les règles critiques), MODÈLE DE RÉPONSE (Markdown, bloc de code, formule pour les titres, puces avec justification…), puis RAPPEL : répète la contrainte la plus importante tout à la fin.
Garde, quand ils sont utiles, les blocs : PROFIL FIXE, MODE DE RÉPONSE (court / complet), RÉFLEXION PRÉALABLE, ÉTAPES UNE À UNE (« suivant »), NIVEAUX DE CONFIANCE [SÛR] / [PROBABLE] / [À VÉRIFIER], TABLEAU DES RISQUES, VÉRIFICATION FINALE.
Présente comme réels uniquement les faits, chiffres et exemples fournis ou vérifiables : écris [à compléter] pour ce que l'auteur doit fournir. Garde l'intention d'origine.`;
  const TARGET_SYS = { claude: 'Claude : sections nettes, contexte et exemples entre balises XML (<contexte>, <exemples>), consigne de réflexion étape par étape.', chatgpt: 'ChatGPT : sections avec titres Markdown (##) et, à la fin, une phrase de démarrage qui lui demande de confirmer la tâche.', gemini: 'Gemini : demande-lui de comparer plusieurs approches avant de recommander.', grokbot: 'Grok Bot : sections avec titres Markdown (##) et une section finale « COMMENT TRAVAILLER » qui l’autorise à utiliser ses outils et son ordinateur, et lui demande de montrer le résultat avant de publier.', autre: 'une IA quelconque : sections simples et universelles, sans balises particulières.' };
  const systemFor = (target) => `${SYSTEM}\nAdapte la forme du prompt à ${TARGET_SYS[target] || TARGET_SYS.claude}`;

  PS.method = { TYPES, detectType, complexity, decompose, diagnose, questions, applyAnswers, answersOf, develop, notes, phrasePipeline, optimize, parse, isHeading,
    progressHtml, targetHtml, modeHtml, questionsHtml, notesHtml, mapHtml, openLabel, PRIVACY, SYSTEM, systemFor };
})();
