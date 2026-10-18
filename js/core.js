/* Prompt Studio — noyau : stockage, utilitaires, construction de prompt, analyse, diff, API */
(function () {
  'use strict';
  const KEY = 'ps.v1';
  const KEY_API = 'ps.apikey';

  // ---------- Utilitaires ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
  const words = (s) => (String(s).trim().match(/\S+/g) || []).length;
  const fmtDate = (t) => new Date(t).toLocaleString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtDay = (t) => new Date(t).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' });
  const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  // Empreinte rapide d'un texte (FNV-1a 32 bits) pour savoir si un fichier a changé
  const hash = (s) => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0') + s.length.toString(36); };
  const tagsFrom = (s) => Array.from(new Set(String(s || '').split(',').map((x) => x.trim()).filter(Boolean)));

  // ---------- Stockage ----------
  const defaults = () => ({
    version: 1,
    settings: { theme: 'system', model: 'claude-sonnet-5-5', french: true, profil: '' },
    projects: [],
    feedback: [],
    drafts: { wizard: null, editor: '', phrase: null }
  });
  let state;
  const normalize = (raw) => {
    const st = Object.assign(defaults(), raw || {});
    st.settings = Object.assign(defaults().settings, st.settings || {});
    st.drafts = Object.assign(defaults().drafts, st.drafts || {});
    if (!Array.isArray(st.projects)) st.projects = [];
    if (!Array.isArray(st.feedback)) st.feedback = [];
    return st;
  };
  // Lecture synchrone depuis localStorage (ancien stockage, et secours si IndexedDB est indisponible)
  function load() {
    try { state = normalize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { state = defaults(); }
    return state;
  }

  // ---------- IndexedDB (stockage principal, bien plus grand que localStorage) ----------
  const DB_NAME = 'prompt-studio', DB_STORE = 'kv';
  let db = null, backend = 'local', initError = null;
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window) || !window.indexedDB) return reject(new Error('IndexedDB indisponible'));
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('IndexedDB ne répond pas')); } }, 5000);
      let r;
      try { r = indexedDB.open(DB_NAME, 1); } catch (e) { clearTimeout(timer); return reject(e); }
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(DB_STORE)) r.result.createObjectStore(DB_STORE); };
      r.onsuccess = () => { if (done) return; done = true; clearTimeout(timer); resolve(r.result); };
      r.onerror = () => { if (done) return; done = true; clearTimeout(timer); reject(r.error || new Error('Ouverture IndexedDB refusée')); };
      r.onblocked = () => { if (done) return; done = true; clearTimeout(timer); reject(new Error('IndexedDB bloquée par un autre onglet')); };
    });
  }
  const idbGet = (k) => new Promise((res, rej) => { try { const q = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); } catch (e) { rej(e); } });
  const idbPut = (k, v) => new Promise((res, rej) => {
    try { const tx = db.transaction(DB_STORE, 'readwrite'); tx.objectStore(DB_STORE).put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error || new Error('Écriture refusée')); tx.onabort = () => rej(tx.error || new Error('Écriture annulée (stockage plein ?)')); }
    catch (e) { rej(e); }
  });
  let readyResolve; const ready = new Promise((r) => (readyResolve = r));
  async function init() {
    try {
      db = await openDB();
      const stored = await idbGet('state');
      if (stored) state = normalize(stored);
      else {
        load(); // migration automatique depuis localStorage
        await idbPut('state', state);
        const check = await idbGet('state');
        if (!check) throw new Error('Migration non vérifiée');
        try { if (localStorage.getItem(KEY)) { localStorage.removeItem(KEY); console.info('[Prompt Studio] Données déplacées de localStorage vers IndexedDB.'); } } catch (e) {}
      }
      backend = 'idb';
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {
      initError = e; backend = 'local'; db = null;
      console.warn('[Prompt Studio] IndexedDB indisponible, utilisation de localStorage :', e);
      load();
    }
    writeTheme();
    readyResolve(backend);
    return backend;
  }
  function writeTheme() { try { localStorage.setItem('ps.theme', (state && state.settings && state.settings.theme) || 'system'); } catch (e) {} }

  let saveErr = false, chain = Promise.resolve(true);
  const saveFailed = (e) => {
    console.error('[Prompt Studio] Enregistrement impossible :', e);
    const full = e && (e.name === 'QuotaExceededError' || /quota|plein/i.test(e.message || ''));
    if (!saveErr) { saveErr = true; PS.toast(full ? 'Impossible d’enregistrer : le stockage du navigateur est plein.' : 'Impossible d’enregistrer : ' + ((e && (e.message || e.name)) || 'erreur inconnue'), 'alert', 5000); }
    PS.lastSaveError = e;
    return false;
  };
  // Renvoie une promesse : true si l'enregistrement a réussi, false sinon
  function save() {
    if (!state) return Promise.resolve(false);
    writeTheme();
    if (backend === 'idb' && db) {
      chain = chain.then(() => idbPut('state', state)).then(() => { saveErr = false; return true; }, saveFailed);
      return chain;
    }
    try { localStorage.setItem(KEY, JSON.stringify(state)); saveErr = false; return Promise.resolve(true); }
    catch (e) { return Promise.resolve(saveFailed(e)); }
  }
  const saveSoon = debounce(save, 300);
  // Espace utilisé / disponible
  async function storageInfo() {
    const size = (() => { try { return JSON.stringify(state).length; } catch (e) { return 0; } })();
    if (backend === 'idb') {
      let quota = 0, usage = size;
      try { if (navigator.storage && navigator.storage.estimate) { const est = await navigator.storage.estimate(); quota = est.quota || 0; usage = Math.max(size, est.usage || 0); } } catch (e) {}
      return { backend, used: usage, data: size, quota: quota || 500 * 1048576 };
    }
    let used = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); used += k.length + (localStorage.getItem(k) || '').length; } } catch (e) {}
    return { backend, used, data: size, quota: 5 * 1048576 };
  }
  async function resetAll() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(KEY_API); localStorage.removeItem('ps.theme'); } catch (e) {}
    state = defaults();
    return save();
  }
  const getKey = () => { try { return localStorage.getItem(KEY_API) || ''; } catch (e) { return ''; } };
  const setKey = (k) => { try { k ? localStorage.setItem(KEY_API, k) : localStorage.removeItem(KEY_API); } catch (e) {} };

  // ---------- Projets ----------
  function newProject(data = {}) {
    const now = Date.now();
    const p = { id: uid(), name: data.name || 'Nouveau projet', description: data.description || '', tags: data.tags || [], notes: data.notes || '', createdAt: now, updatedAt: now, prompts: [] };
    state.projects.unshift(p); save(); return p;
  }
  function newPrompt(project, data = {}) {
    const now = Date.now();
    const content = data.content || '';
    const pr = { id: uid(), title: data.title || 'Nouveau prompt', tags: data.tags || [], content, createdAt: now, updatedAt: now, versions: [] };
    if (data.gen) pr.gen = data.gen;
    if (content.trim()) pr.versions.push({ id: uid(), content, note: data.note || 'Version initiale', at: now });
    project.prompts.unshift(pr); project.updatedAt = now; save(); return pr;
  }
  const findProject = (id) => state.projects.find((p) => p.id === id);

  // ---------- Construction du prompt (assistant) ----------
  const PROOF = {
    stats: 'Aucune statistique inventée : si un chiffre serait utile mais que tu ne l’as pas, écris [CHIFFRE À SOURCER].',
    examples: 'Aucun exemple, témoignage ou citation fabriqué présenté comme réel.',
    obs: 'Sépare clairement ce qui est observé (constaté) de ce qui est certain (établi).',
    spec: 'Présente toute spéculation comme telle, en commençant par « Hypothèse : ».',
    sources: 'Cite tes sources quand tu en as ; sinon, dis que tu n’en as pas.',
    unknown: 'Si tu ne sais pas, dis-le au lieu d’inventer.'
  };
  const PROOF_LABELS = {
    stats: 'Aucune statistique inventée', examples: 'Aucun exemple ou témoignage fabriqué', obs: 'Séparer observations et certitudes',
    spec: 'Signaler les spéculations', sources: 'Citer ses sources', unknown: 'Dire « je ne sais pas » plutôt qu’inventer'
  };
  const BLOCKS = {
    profil: { title: 'Profil fixe', desc: 'Des informations sur toi que Claude garde en tête pendant toute la conversation.',
      text: (w) => `PROFIL FIXE (à garder en tête pendant toute la conversation)\n${(w && w.profilText && w.profilText.trim()) || '[Qui tu es, ton niveau, tes outils, tes préférences]'}`,
      short: (w) => `Mon profil, à garder en tête : ${(w && w.profilText && w.profilText.trim()) || '[ton profil]'}.` },
    mode: { title: 'Mode court / complet', desc: 'Tu choisis la longueur de chaque réponse en écrivant « court » ou « complet ».',
      text: (w) => `MODE DE RÉPONSE\nPar défaut, réponds en mode ${(w && w.modeDefault) || 'complet'}. Si j’écris « court », donne l’essentiel en 3 à 5 lignes. Si j’écris « complet », développe avec tous les détails utiles.`,
      short: (w) => `Réponds en mode ${(w && w.modeDefault) || 'complet'} par défaut ; « court » = l’essentiel, « complet » = tous les détails.` },
    reflexion: { title: 'Réflexion préalable', desc: 'Claude reformule ta demande et pose ses questions avant de se lancer.',
      text: () => 'RÉFLEXION PRÉALABLE\nAvant de répondre, réfléchis : reformule ma demande en une phrase, liste les informations qui manquent, et pose-moi au maximum 3 questions si c’est nécessaire. Ensuite seulement, réponds.',
      short: () => 'Avant de répondre, reformule ma demande et pose-moi au maximum 3 questions si quelque chose manque.' },
    etapes: { title: 'Étapes une à une', desc: 'Claude avance par étape et attend que tu écrives « suivant ».',
      text: () => 'ÉTAPES UNE À UNE\nDécoupe le travail en étapes. Présente une seule étape à la fois, puis attends que j’écrive « suivant » avant de continuer.',
      short: () => 'Avance une étape à la fois et attends que j’écrive « suivant ».' },
    tags: { title: 'Niveaux de confiance', desc: 'Chaque affirmation importante est marquée [SÛR], [PROBABLE] ou [À VÉRIFIER].',
      text: () => 'NIVEAUX DE CONFIANCE\nMarque chaque affirmation importante :\n[SÛR] = établi ou vérifié\n[PROBABLE] = très vraisemblable, mais pas vérifié\n[À VÉRIFIER] = hypothèse ou information à contrôler',
      short: () => 'Marque tes affirmations importantes [SÛR], [PROBABLE] ou [À VÉRIFIER].' },
    risques: { title: 'Tableau des risques', desc: 'Les risques du plan proposé, avec une parade pour chacun.',
      text: () => 'TABLEAU DES RISQUES\nTermine par un tableau : Risque | Probabilité | Impact | Parade.',
      short: () => 'Termine par un tableau Risque | Probabilité | Impact | Parade.' },
    verif: { title: 'Vérification finale', desc: 'Claude relit sa réponse avec une liste de contrôle avant de l’envoyer.',
      text: () => 'VÉRIFICATION FINALE (avant d’envoyer ta réponse)\n[ ] L’objectif est atteint\n[ ] Les contraintes sont respectées\n[ ] Le format demandé est respecté\n[ ] Aucun chiffre ni exemple inventé\nCorrige ce qui ne va pas avant de répondre.',
      short: () => 'Avant d’envoyer, vérifie : objectif atteint, contraintes et format respectés, rien d’inventé.' }
  };
  const BLOCK_ORDER = ['profil', 'mode', 'reflexion', 'etapes', 'tags', 'risques', 'verif'];

  const FORMATS = {
    libre: '', liste: 'Une liste à puces claire.', paragraphes: 'Des paragraphes courts avec des intertitres.',
    tableau: 'Un tableau, avec une courte explication avant.', etapes: 'Un plan numéroté, étape par étape.',
    code: 'Du code complet et commenté, puis une courte explication.', json: 'Uniquement du JSON valide, sans texte autour.',
    mail: 'Un e-mail prêt à envoyer, avec un objet.'
  };
  const FORMAT_LABELS = { libre: 'Libre', liste: 'Liste à puces', paragraphes: 'Paragraphes', tableau: 'Tableau', etapes: 'Étapes numérotées', code: 'Code', json: 'JSON', mail: 'E-mail' };
  const LENGTHS = { auto: '', courte: 'Courte : 150 mots maximum.', moyenne: 'Moyenne : environ 300 à 600 mots.', longue: 'Détaillée : aussi long que nécessaire, sans remplissage.', perso: '' };
  const LENGTH_LABELS = { auto: 'Laisser Claude choisir', courte: 'Courte', moyenne: 'Moyenne', longue: 'Détaillée', perso: 'Personnalisée' };
  const LEVELS = { '': '', debutant: 'débutant (explique sans jargon)', intermediaire: 'intermédiaire', expert: 'expert (va droit au but)' };

  function emptyWizard() {
    return { role: '', roleExtra: '', objectif: '', livrable: '', audience: '', niveau: '', contexte: '', contraintes: '', exclure: '',
      format: 'libre', formatDetail: '', ton: [], tonExtra: '', longueur: 'auto', longueurDetail: '', exemples: '',
      proof: { stats: true, examples: true, obs: true, spec: true, sources: false, unknown: true },
      blocks: { profil: false, mode: false, reflexion: true, etapes: false, tags: true, risques: false, verif: true },
      profilText: '', modeDefault: 'complet', french: true };
  }
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const bullets = (s) => lines(s).map((l) => (/^[-•*\d]/.test(l) ? l.replace(/^[•*]\s*/, '- ') : '- ' + l)).join('\n');

  function buildPrompt(w, mode = 'complet') {
    const P = '[à compléter]';
    const tone = [...(w.ton || []), w.tonExtra].filter((x) => x && x.trim()).join(', ');
    const fmt = [FORMATS[w.format] || '', w.formatDetail].filter(Boolean).join(' ');
    const len = w.longueur === 'perso' ? w.longueurDetail : [LENGTHS[w.longueur] || '', w.longueur !== 'perso' && w.longueurDetail ? w.longueurDetail : ''].filter(Boolean).join(' ');
    const proofs = Object.keys(PROOF).filter((k) => w.proof && w.proof[k]).map((k) => PROOF[k]);
    if (w.french) proofs.push('Réponds en français.');
    const blocks = BLOCK_ORDER.filter((k) => w.blocks && w.blocks[k]);
    const role = w.role.trim() ? `Tu es ${w.role.trim().replace(/^(tu es|vous êtes)\s+/i, '')}${w.roleExtra.trim() ? '. ' + w.roleExtra.trim() : ''}.`.replace(/\.\.$/, '.') : `Tu es ${P}.`;

    if (mode === 'court') {
      const parts = [role];
      if (blocks.includes('profil')) parts.push(BLOCKS.profil.short(w));
      const dot = (x) => (/[.!?:»)]$/.test(x) ? x : x + '.');
      parts.push(`Objectif : ${dot(w.objectif.trim() || P)}${w.livrable.trim() ? ' Résultat attendu : ' + dot(w.livrable.trim()) : ''}`);
      if (w.audience.trim() || w.niveau) parts.push(`Pour : ${[w.audience.trim(), LEVELS[w.niveau] ? 'niveau ' + LEVELS[w.niveau] : ''].filter(Boolean).join(', ')}.`);
      if (w.contexte.trim()) parts.push(`Contexte : ${w.contexte.trim()}`);
      if (w.contraintes.trim()) parts.push(`Contraintes : ${lines(w.contraintes).join(' ; ')}.`);
      if (w.exclure.trim()) parts.push(`À éviter : ${lines(w.exclure).join(' ; ')}.`);
      const fl = [fmt && 'Format : ' + fmt, tone && 'Ton : ' + tone + '.', len && 'Longueur : ' + len].filter(Boolean).join(' ');
      if (fl) parts.push(fl);
      if (w.exemples.trim()) parts.push(`Exemple :\n"""\n${w.exemples.trim()}\n"""`);
      blocks.filter((b) => b !== 'profil').forEach((b) => parts.push(BLOCKS[b].short(w)));
      if (proofs.length) parts.push('Règles : ' + proofs.map((p) => p.replace(/\.$/, '')).join(' ; ') + '.');
      return parts.map((p) => p.replace(/\.\.$/, '.')).join('\n');
    }

    const S = [];
    S.push(`RÔLE\n${role}`);
    if (blocks.includes('profil')) S.push(BLOCKS.profil.text(w));
    if (w.contexte.trim()) S.push(`${w.contexteTitle || 'CONTEXTE'}\n${w.contexte.trim()}`);
    S.push(`OBJECTIF\n${w.objectif.trim() || P}${w.livrable.trim() ? '\nRésultat attendu : ' + w.livrable.trim() : ''}`);
    if (w.audience.trim() || w.niveau) S.push(`AUDIENCE\n${[w.audience.trim(), LEVELS[w.niveau] ? 'Niveau : ' + LEVELS[w.niveau] + '.' : ''].filter(Boolean).join('\n')}`);
    if (w.contraintes.trim()) S.push(`CONTRAINTES\n${bullets(w.contraintes)}`);
    if (w.exclure.trim()) S.push(`À NE PAS INCLURE\n${bullets(w.exclure)}`);
    const fl = [fmt && 'Format : ' + fmt, len && 'Longueur : ' + len, tone && 'Ton : ' + tone + '.'].filter(Boolean);
    if (fl.length) S.push(`FORMAT DE LA RÉPONSE\n${fl.join('\n')}`);
    if (w.exemples.trim()) S.push(`EXEMPLE (pour le style et le niveau attendus, pas à recopier)\n"""\n${w.exemples.trim()}\n"""`);
    if (blocks.includes('reflexion')) S.push(BLOCKS.reflexion.text(w));
    if (blocks.includes('etapes')) S.push(BLOCKS.etapes.text(w));
    if (blocks.includes('mode')) S.push(BLOCKS.mode.text(w));
    if (proofs.length) S.push(`RÈGLES DE PREUVE\n${proofs.map((p) => '- ' + p).join('\n')}`);
    if (blocks.includes('tags')) S.push(BLOCKS.tags.text(w));
    if (blocks.includes('risques')) S.push(BLOCKS.risques.text(w));
    if (blocks.includes('verif')) S.push(BLOCKS.verif.text(w));
    return S.join('\n\n');
  }

  // ---------- Analyse heuristique ----------
  const B = '(?<![\\p{L}\\p{N}_])', E = '(?![\\p{L}\\p{N}_])';
  const rx = (alts) => new RegExp(B + '(?:' + alts + ')' + E, 'iu');
  const CRITERIA = [
    { id: 'role', w: 12, name: 'Rôle défini', ok: 'Claude sait quel expert il doit être.', no: 'Dis à Claude quel expert il doit être (« Tu es un… »).',
      test: rx("tu es|vous êtes|agis comme|agis en|joue le rôle|en tant que|rôle|you are|act as|incarne"), insert: 'RÔLE\nTu es un expert en [domaine], avec [nombre] ans d’expérience en [spécialité].' },
    { id: 'goal', w: 16, name: 'Objectif clair', ok: 'La tâche demandée est identifiable.', no: 'Écris ce que tu veux obtenir, avec un verbe d’action (rédige, analyse, crée…).',
      test: rx("objectif|but|mission|tâche|je veux|j['’]aimerais|j['’]ai besoin|aide-moi|crée|créer|rédige|rédiger|écris|écrire|génère|analyse|analyser|résume|résumer|traduis|explique|corrige|propose|conçois|liste|compare|goal|task|write|create"), insert: 'OBJECTIF\n[Ce que tu veux obtenir, avec un verbe d’action]\nC’est réussi quand : [critère vérifiable]' },
    { id: 'audience', w: 9, name: 'Public visé', ok: 'Claude sait pour qui il écrit.', no: 'Précise pour qui est la réponse et son niveau.',
      test: rx("audience|public|lecteurs?|lectrices?|destiné|destinée|cible|clients?|utilisateurs?|débutants?|novices?|niveau|pour (?:des|les|un|une|mon|ma|mes)|élèves?|étudiants?|enfants?|équipe|recruteurs?"), insert: 'AUDIENCE\n[Pour qui est la réponse ?] — Niveau : [débutant / intermédiaire / expert]' },
    { id: 'context', w: 11, name: 'Contexte donné', ok: 'Il y a des éléments de contexte.', no: 'Explique la situation : pourquoi tu demandes, ce qui existe déjà.',
      test: (t) => rx("contexte|situation|actuellement|aujourd['’]hui|en ce moment|mon projet|mon entreprise|j['’]ai déjà|voici|background|context").test(t) || words(t) > 120, insert: 'CONTEXTE\n[La situation, ce qui existe déjà, pourquoi tu demandes]' },
    { id: 'format', w: 10, name: 'Format de réponse', ok: 'La forme de la réponse est précisée.', no: 'Dis sous quelle forme tu veux la réponse (liste, tableau, plan, code…).',
      test: rx("format|tableau|liste|puces|json|markdown|titres?|intertitres?|sections?|structure|structuré|étapes|paragraphes?|plan|code|csv|table|bullet"), insert: 'FORMAT DE LA RÉPONSE\n[Liste / tableau / étapes numérotées / code…]' },
    { id: 'constraints', w: 10, name: 'Contraintes', ok: 'Des limites ou exigences sont posées.', no: 'Ajoute ce qui est obligatoire ou interdit.',
      test: rx("ne (?:pas|jamais)|n['’]\\p{L}+ (?:pas|jamais)|évite|éviter|interdit|maximum|minimum|max|au plus|au moins|limite|contraintes?|obligatoire|doit|doivent|uniquement|seulement|sans|must|don['’]t|never"), insert: 'CONTRAINTES\n- [Ce qui est obligatoire]\n- [Ce qui est interdit]' },
    { id: 'length', w: 6, name: 'Longueur', ok: 'Une longueur est indiquée.', no: 'Indique une longueur (par exemple « 200 mots maximum »).',
      test: (t) => /\d+\s*(?:mots|lignes|phrases|caractères|pages|paragraphes|points|idées|words|lines)/iu.test(t) || rx("court|courte|bref|brève|concis|concise|détaillé|détaillée|longueur|résumé en").test(t), insert: 'LONGUEUR\n[Par exemple : 300 mots maximum]' },
    { id: 'tone', w: 6, name: 'Ton', ok: 'Le ton est précisé.', no: 'Précise le ton (simple, professionnel, chaleureux…).',
      test: rx("ton|style|registre|formel|formelle|informel|tutoie|tutoiement|vouvoie|chaleureux|professionnel|amical|direct|pédagogue|pédagogique|sans jargon|simple|simplement|tone"), insert: 'TON\n[Simple, direct, chaleureux…]' },
    { id: 'examples', w: 7, name: 'Exemple fourni', ok: 'Un exemple ou un modèle guide Claude.', no: 'Donne un exemple de ce que tu attends : c’est souvent ce qui aide le plus.',
      test: (t) => rx("exemples?|par ex|ex\\s?:|comme ceci|comme ça|modèle|example").test(t) || /"""|```|<exemple>/i.test(t), insert: 'EXEMPLE (pour le style attendu, pas à recopier)\n"""\n[Colle un exemple ici]\n"""' },
    { id: 'proof', w: 7, name: 'Gestion de l’incertitude', ok: 'Claude sait quoi faire quand il n’est pas sûr.', no: 'Demande à Claude de signaler ce qui est incertain plutôt que d’inventer.',
      test: rx("invent\\p{L}*|sources?|incertain\\p{L}*|à vérifier|sûr|probable|certitudes?|hypothèses?|je ne sais pas|spécul\\p{L}*|fabriqu\\p{L}*|vérifiable"), insert: BLOCKS.tags.text() + '\n- Si tu ne sais pas, dis-le au lieu d’inventer.' },
    { id: 'verify', w: 6, name: 'Vérification finale', ok: 'Claude se relit avant de répondre.', no: 'Ajoute une liste de contrôle que Claude vérifie avant d’envoyer.',
      test: rx("vérifi\\p{L}*|relis|relire|contrôle|checklist|check-list|avant de répondre|avant d['’]envoyer|assure-toi|double-check"), insert: BLOCKS.verif.text() }
  ];
  const AMBIGUOUS = [
    ['quelque chose', 'dis précisément quoi'], ['des trucs', 'nomme les éléments'], ['truc', 'nomme l’élément'], ['trucs', 'nomme les éléments'],
    ['etc', 'liste tout ce qui compte, ou écris « au minimum : … »'], ['genre', 'donne un exemple précis'], ['un peu', 'donne une quantité'],
    ['plusieurs', 'donne un nombre'], ['quelques', 'donne un nombre'], ['certains', 'précise lesquels'], ['beaucoup', 'donne un ordre de grandeur'],
    ['bon', 'dis à quoi on reconnaît « bon »'], ['meilleur', 'meilleur selon quel critère ?'], ['meilleure', 'meilleure selon quel critère ?'],
    ['optimal', 'optimal selon quel critère ?'], ['optimiser', 'optimiser quoi, et mesuré comment ?'], ['intéressant', 'intéressant pour qui, pourquoi ?'], ['sympa', 'décris l’effet voulu'],
    ['joli', 'décris le style voulu'], ['moderne', 'cite un style ou une référence'], ['rapidement', 'donne un délai ou une durée'], ['correctement', 'dis ce que « correct » veut dire ici'],
    ['de qualité', 'liste tes critères de qualité'], ['approprié', 'approprié selon quoi ?'], ['adéquat', 'adéquat selon quoi ?'],
    ['ça', 'remplace « ça » par ce dont tu parles'], ['cela', 'remplace « cela » par ce dont tu parles'], ['improve', 'précise ce qu’il faut améliorer']
  ];
  let boilerCache = null;
  const BOILER = () => boilerCache || (boilerCache = BLOCK_ORDER.filter((k) => k !== 'profil').flatMap((k) => [BLOCKS[k].text({}), BLOCKS[k].short({}), BLOCKS[k].text({ modeDefault: 'court' }), BLOCKS[k].short({ modeDefault: 'court' })])
    .concat(Object.values(PROOF), Object.values(PROOF).map((p) => p.replace(/\.$/, ''))).sort((a, b) => b.length - a.length));
  function analyze(text) {
    const t = String(text || '');
    const wc = words(t);
    // Les blocs standard (vérification, confiance…) contiennent des mots comme « format » ou « contraintes » :
    // on les retire avant de tester les autres critères, pour ne pas compter ce qui n'a pas été précisé.
    let core = t;
    BOILER().forEach((b) => { if (b) core = core.split(b).join(' '); });
    const results = CRITERIA.map((c) => { const src = c.id === 'proof' || c.id === 'verify' ? t : core; return { id: c.id, name: c.name, weight: c.w, pass: wc > 0 && (typeof c.test === 'function' ? c.test(src) : c.test.test(src)), ok: c.ok, no: c.no, insert: c.insert }; });
    const total = CRITERIA.reduce((a, c) => a + c.w, 0);
    let score = results.reduce((a, r) => a + (r.pass ? r.weight : 0), 0);
    score = Math.round((score / total) * 100);
    const amb = [];
    AMBIGUOUS.forEach(([w, tip]) => {
      const m = t.match(new RegExp(B + w.replace(/ /g, '\\s+') + E, 'giu'));
      if (m) amb.push({ word: w, count: m.length, tip });
    });
    const notes = [];
    if (wc === 0) notes.push({ kind: 'info', text: 'Colle ou écris un prompt pour lancer l’analyse.' });
    else {
      if (wc < 25) notes.push({ kind: 'warn', text: `Prompt très court (${wc} mots). Claude devra deviner beaucoup de choses.` });
      if (wc > 1800) notes.push({ kind: 'info', text: `Prompt long (${wc} mots). Ce n’est pas un problème en soi, mais vérifie que l’essentiel est facile à trouver (titres, ordre).` });
      if (wc > 80 && !/\n/.test(t.trim())) notes.push({ kind: 'warn', text: 'Tout est sur un seul bloc. Des sections avec des titres rendent le prompt plus facile à suivre.' });
      if (/(court|bref|concis)/iu.test(t) && /(détaillé|exhaustif|complet)/iu.test(t) && !/mode/iu.test(t)) notes.push({ kind: 'warn', text: 'Le prompt demande à la fois du « court » et du « détaillé ». Vérifie que ce n’est pas contradictoire.' });
      if (/\[(?:à compléter|[^\]]{2,40})\]/iu.test(t) && /\[(?:à compléter)/iu.test(t)) notes.push({ kind: 'warn', text: 'Il reste des zones [à compléter].' });
      const ph = (t.match(/\[[^\]\n]{2,60}\]/g) || []).filter((m) => !/^\[(?:SÛR|PROBABLE|À VÉRIFIER|CHIFFRE À SOURCER|INTERPRÉTATION|OBSERVÉ|HYPOTHÈSE|CONFIRMÉ| ?x? ?)\]$/i.test(m) && !/compléter/i.test(m));
      if (ph.length) notes.push({ kind: 'warn', text: `Zones entre crochets à remplir : ${Array.from(new Set(ph)).slice(0, 5).join(', ')}${ph.length > 5 ? '…' : ''}.` });
      if (/\{\{[^}]+\}\}/.test(t)) notes.push({ kind: 'warn', text: 'Il reste des variables {{…}} non remplies.' });
    }
    const level = score >= 80 ? 'Solide' : score >= 55 ? 'À compléter' : 'Fragile';
    return { score, level, results, amb, notes, words: wc, chars: t.length };
  }

  // ---------- Diff (lignes, LCS) ----------
  function diffLines(a, b) {
    const A = String(a).split('\n'), Bv = String(b).split('\n');
    const n = A.length, m = Bv.length;
    if (n * m > 4e6) return [{ t: 'same', s: '(Textes trop longs pour comparer ligne par ligne.)' }];
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === Bv[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (A[i] === Bv[j]) { out.push({ t: 'same', s: A[i] }); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: 'del', s: A[i] }); i++; }
      else { out.push({ t: 'add', s: Bv[j] }); j++; }
    }
    while (i < n) out.push({ t: 'del', s: A[i++] });
    while (j < m) out.push({ t: 'add', s: Bv[j++] });
    return out;
  }

  // ---------- Variables {{...}} ----------
  const varsOf = (body) => Array.from(new Set((String(body).match(/\{\{([^}]+)\}\}/g) || []).map((m) => m.slice(2, -2).trim())));
  const fillVars = (body, vals, keep = true) => String(body).replace(/\{\{([^}]+)\}\}/g, (m, k) => { const v = vals[k.trim()]; return v && v.trim() ? v.trim() : keep ? m : ''; });

  // ---------- Claude ----------
  const CLAUDE_URL_MAX = 6000; // au-delà, le lien risque d'être tronqué
  function claudeLink(prompt) { return 'https://claude.ai/new?q=' + encodeURIComponent(prompt); }
  async function callClaude(prompt, opts = {}) {
    const key = getKey();
    if (!key) throw new Error('Aucune clé API enregistrée. Ajoute-la dans les réglages.');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: state.settings.model || 'claude-sonnet-5-5', max_tokens: opts.max_tokens || 4096, messages: [{ role: 'user', content: prompt }] }),
      signal: opts.signal
    });
    let data = null; try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) || res.statusText;
      if (res.status === 401) throw new Error('Clé API refusée (401). Vérifie-la dans les réglages.');
      if (res.status === 429) throw new Error('Trop de demandes ou crédit épuisé (429). Réessaie plus tard.');
      throw new Error(`Erreur ${res.status} : ${msg}`);
    }
    return (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
  }
  const improveMeta = (p) => `Tu es un expert en rédaction de prompts pour Claude.

Améliore le prompt ci-dessous pour qu'il soit plus clair, plus précis et plus efficace, sans changer son intention.
- Garde la langue d'origine.
- Ajoute ce qui manque (rôle, objectif, public, contexte, format, contraintes, exemple, vérification) uniquement si c'est utile ; mets entre crochets [ ] ce que l'auteur doit compléter lui-même.
- N'invente aucun fait, chiffre ou exemple présenté comme réel.

Réponds exactement dans ce format :
<prompt>
(le prompt amélioré)
</prompt>
<changements>
(liste courte des changements et pourquoi)
</changements>

PROMPT À AMÉLIORER
"""
${p}
"""`;

  // ---------- Fichiers ----------
  function download(name, content, type = 'application/json') {
    const blob = new Blob([content], { type: type + ';charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function pickFile(accept = '.json,application/json') {
    return new Promise((resolve) => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
      i.onchange = () => { const f = i.files[0]; if (!f) return resolve(null); const r = new FileReader(); r.onload = () => resolve({ name: f.name, text: r.result }); r.readAsText(f); };
      i.click();
    });
  }
  function projectToMarkdown(p) {
    let md = `# ${p.name}\n\n`;
    if (p.description) md += `${p.description}\n\n`;
    if (p.tags.length) md += `Étiquettes : ${p.tags.join(', ')}\n\n`;
    md += `_Exporté le ${fmtDate(Date.now())} depuis Prompt Studio._\n\n`;
    if (p.notes) md += `## Notes\n\n${p.notes}\n\n`;
    p.prompts.forEach((pr) => {
      md += `## ${pr.title}\n\n`;
      if (pr.tags.length) md += `Étiquettes : ${pr.tags.join(', ')}  \n`;
      md += `Versions enregistrées : ${pr.versions.length}\n\n\`\`\`text\n${pr.content}\n\`\`\`\n\n`;
    });
    return md;
  }
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'export';

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (x) {} ta.remove(); return ok;
    }
  }

  window.PS = Object.assign(window.PS || {}, {
    $, $$, uid, esc, icon, words, fmtDate, fmtDay, debounce, clone, tagsFrom, hash,
    load, init, ready, save, saveSoon, storageInfo, resetAll, defaults, getKey, setKey,
    newProject, newPrompt, findProject,
    PROOF, PROOF_LABELS, BLOCKS, BLOCK_ORDER, FORMAT_LABELS, LENGTH_LABELS, emptyWizard, buildPrompt,
    CRITERIA, analyze, diffLines, varsOf, fillVars, CLAUDE_URL_MAX, claudeLink, callClaude, improveMeta,
    download, pickFile, projectToMarkdown, slug, copy, KEY, KEY_API
  });
  Object.defineProperty(window.PS, 'state', { get: () => state, set: (v) => { state = v; }, configurable: true });
  Object.defineProperty(window.PS, 'backend', { get: () => backend, configurable: true });
  Object.defineProperty(window.PS, 'initError', { get: () => initError, configurable: true });
})();
