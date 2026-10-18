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
    settings: { theme: 'system', model: 'claude-sonnet-5-5', french: true, profil: '', target: 'claude' },
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
    stats: 'Utilise uniquement des chiffres vérifiables : si un chiffre serait utile mais que tu ne l’as pas, écris [CHIFFRE À SOURCER].',
    examples: 'Présente comme réels uniquement les exemples, témoignages et citations que tu peux attribuer ; sinon, annonce « Exemple fictif : ».',
    obs: 'Sépare clairement ce qui est observé (constaté) de ce qui est certain (établi).',
    spec: 'Présente toute spéculation comme telle, en commençant par « Hypothèse : ».',
    sources: 'Cite tes sources quand tu en as ; sinon, dis que tu n’en as pas.',
    unknown: 'Si tu ne sais pas, dis-le clairement et indique ce qu’il faudrait vérifier.'
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
      text: () => 'VÉRIFICATION FINALE (avant d’envoyer ta réponse)\n[ ] L’objectif est atteint\n[ ] Les contraintes sont respectées\n[ ] Le format demandé est respecté\n[ ] Chaque chiffre et exemple est réel ou signalé comme tel\n[ ] La contrainte clé du RAPPEL est respectée\nCorrige ce qui ne va pas avant de répondre.',
      short: () => 'Avant d’envoyer, vérifie : objectif atteint, contraintes et format respectés, chaque fait est réel ou signalé.' }
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
      format: 'libre', formatDetail: '', ton: [], tonExtra: '', longueur: 'auto', longueurDetail: '', exemples: '', exemplesNote: '', etapes: '', rappel: '',
      proof: { stats: true, examples: true, obs: true, spec: true, sources: false, unknown: true },
      blocks: { profil: false, mode: false, reflexion: true, etapes: false, tags: true, risques: false, verif: true },
      profilText: '', modeDefault: 'complet', french: true };
  }
  const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const bullets = (s) => lines(s).map((l) => (/^[-•*\d]/.test(l) ? l.replace(/^[•*]\s*/, '- ') : '- ' + l)).join('\n');

  // ---------- Règles formulées positivement ----------
  // Renvoie une reformulation positive d'une règle négative (« N'invente pas… » → « Utilise uniquement… »), ou null
  const capF = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  const endDot = (x) => (/[.!?:»)]$/.test(x) ? x : x + '.');
  const NEG_RE = /(?:^|[\s(«"'])(?:ne|n['’])\s*\p{L}+(?:-\p{L}+)?\s+(?:pas|jamais|aucun|aucune|rien|plus)(?![\p{L}])|^\s*(?:[-•*]\s*)?(?:pas de|pas d['’]|aucun|aucune|jamais|évite|éviter|interdit|surtout pas)(?![\p{L}])/iu;
  function positive(line) {
    const raw = String(line).trim(); const m0 = raw.match(/^([-•*]\s*|\d+[.)]\s*)/); const pre = m0 ? m0[1] : ''; const t = raw.slice(pre.length).replace(/[.;]\s*$/, '');
    const R = [
      [/^(?:n['’]|ne\s+)?invente\s+(?:aucun|aucune|pas de|pas d['’]|rien)\s*(.*)$/i, (m) => `Utilise uniquement des ${plur(m[1] || 'informations')} que tu peux vérifier ou que je fournis ; sinon, écris [À VÉRIFIER]`],
      [/^aucun(?:e)?\s+(.+?)\s+(?:inventé|inventée|inventés|inventées|fabriqué|fabriquée|fabriqués)(?=[\s:,;.]|$)\s*[:,;]?\s*(.*)$/i, (m) => `Utilise uniquement des ${plur(m[1])} que tu peux vérifier ou que je fournis${m[2] ? ' : ' + m[2] : ''}`],
      [/^(?:n['’])utilise\s+(?:pas|jamais|aucun|aucune)\s+(de\s+|d['’]|les\s+|des\s+)?(.+)$/i, (m) => `Utilise uniquement [ce que tu veux à la place] plutôt que ${({ 'de': 'des ', 'les': 'les ', 'des': 'des ' })[(m[1] || '').trim()] || (m[1] ? 'd’' : '')}${m[2]}`],
      [/^(?:n['’]|ne\s+)ajoute\s+(?:aucun|aucune|rien|pas de|pas d['’])\s*(.*)$/i, (m) => (m[1] && !/^qui /.test(m[1]) ? `Utilise uniquement les ${m[1]} fournis` : 'Utilise uniquement ce qui est fourni')],
      [/^(?:pas de|sans|évite(?:r)?(?: le| du)?|aucun)\s+jargon\b.*$/i, () => 'Utilise des mots simples de tous les jours, et explique chaque terme technique'],
      [/^(?:ne\s+|n['’])?dépasse\s+pas\s+(.+)$/i, (m) => `${capF(m[1])} maximum`],
      [/^(?:ne\s+)change\s+pas\s+(.+)$/i, (m) => `Garde ${m[1]} tel quel`],
      [/^(?:n['’])oublie\s+pas\s+(?:de\s+|d['’])?(.+)$/i, (m) => `Pense à ${m[1]}`],
      [/^(?:ne\s+)?(?:traduis|traduit)\s+pas\s+mot\s+à\s+mot(.*)$/i, (m) => `Traduis le sens, avec des tournures naturelles${m[1] || ''}`],
      [/^(?:ne\s+)?(?:mets|met)\s+pas\s+(.+)$/i, (m) => `Laisse de côté ${m[1]}`],
      [/^(?:pas de|pas d['’]|aucun|aucune|évite|éviter|interdit\s*:?|surtout pas)\s+(.+)$/i, (m) => `Laisse de côté : ${m[1]}`]
    ];
    for (const [re, f] of R) { const m = t.match(re); if (m) return pre + endDot(capF(f(m).trim())); }
    return null;
  }
  const plur = (x) => x.split(' ').map((w, i) => (i === 0 && !/[sxz]$/.test(w) ? w + 's' : w)).join(' ');
  const isNegative = (line) => NEG_RE.test(String(line)) && !/^\s*(?:si |s['’]il )/i.test(line);

  // ---------- Construction du prompt (méthode ASPECCT + blocs V2) ----------
  // Action, Étapes, Persona, Exemples, Contexte, Contraintes, Modèle, puis rappel final de la contrainte clé
  const TARGETS = { claude: 'Claude', chatgpt: 'ChatGPT', gemini: 'Gemini', autre: 'Autre IA' };
  const currentTarget = () => (state && state.settings && TARGETS[state.settings.target] ? state.settings.target : 'claude');
  const stripNum = (l) => l.replace(/^(?:\d+[.)]|[-•*])\s*/, '');
  const numbered = (s) => lines(s).map((l, i) => `${i + 1}. ${stripNum(l)}`).join('\n');
  function keyConstraint(w) {
    const r = (w.rappel || '').trim();
    if (r) return r;
    const c = lines(w.contraintes)[0];
    return c ? stripNum(c) : '';
  }
  // Rend les sections selon l'IA visée (Claude : balises XML pour le contexte et les exemples ; ChatGPT : titres Markdown)
  function renderSections(S, target = 'claude') {
    const TAG = { contexte: 'contexte', action: 'tache', exemples: 'exemples' };
    return S.filter((x) => x && (x.b || x.h)).map((x) => {
      let b = x.b;
      if (target === 'claude' && TAG[x.k] && b) b = `<${TAG[x.k]}>\n${b}\n</${TAG[x.k]}>`;
      const h = x.h ? (target === 'chatgpt' ? '## ' + x.h : x.h) : '';
      return [h, b].filter(Boolean).join('\n');
    }).join('\n\n');
  }
  const roleLine = (w, P) => (w.role.trim() ? `Tu es ${w.role.trim().replace(/^(tu es|vous êtes)\s+/i, '')}${w.roleExtra.trim() ? '. ' + w.roleExtra.trim() : ''}.`.replace(/\.\.$/, '.') : `Tu es ${P}.`);
  const parts3 = (w) => ({
    tone: [...(w.ton || []), w.tonExtra].filter((x) => x && x.trim()).join(', '),
    fmt: [FORMATS[w.format] || '', w.formatDetail].filter(Boolean).join(' '),
    len: w.longueur === 'perso' ? w.longueurDetail : [LENGTHS[w.longueur] || '', w.longueur !== 'perso' && w.longueurDetail ? w.longueurDetail : ''].filter(Boolean).join(' ')
  });
  const proofsOf = (w) => { const p = Object.keys(PROOF).filter((k) => w.proof && w.proof[k]).map((k) => PROOF[k]); if (w.french) p.push('Réponds en français.'); return p; };
  const consOf = (w) => { const c = lines(w.contraintes).map((l) => positive(l) || l); lines(w.exclure).forEach((l) => c.push(positive(l) || `Laisse de côté : ${stripNum(l).replace(/[.;]$/, '')}.`)); return c; };
  function sectionsOf(w, opt = {}) {
    const P = '[à compléter]';
    const target = opt.target || currentTarget();
    const { tone, fmt, len } = parts3(w);
    const proofs = proofsOf(w);
    const blocks = BLOCK_ORDER.filter((k) => w.blocks && w.blocks[k]);
    const cons = consOf(w);
    const key = keyConstraint(w);
    const keyPos = key ? (positive(key) || key) : '';
    const S = [];
    S.push({ k: 'role', h: 'RÔLE / PERSONA', b: roleLine(w, P) });
    if (blocks.includes('profil')) { const t = BLOCKS.profil.text(w).split('\n'); S.push({ k: 'profil', h: t[0], b: t.slice(1).join('\n') }); }
    if (w.contexte.trim()) S.push({ k: 'contexte', h: w.contexteTitle || 'CONTEXTE', b: w.contexte.trim() });
    S.push({ k: 'action', h: 'ACTION', b: `${w.objectif.trim() || P}${w.livrable.trim() ? '\nC’est réussi quand : ' + w.livrable.trim() : ''}` });
    if (w.audience.trim() || w.niveau) S.push({ k: 'audience', h: 'AUDIENCE', b: [w.audience.trim(), LEVELS[w.niveau] ? 'Niveau : ' + LEVELS[w.niveau] + '.' : ''].filter(Boolean).join('\n') });
    if (lines(w.etapes).length) S.push({ k: 'etapes', h: 'ÉTAPES', b: numbered(w.etapes) + (target === 'claude' && !blocks.includes('reflexion') ? '\nRéfléchis à chaque étape avant de passer à la suivante.' : '') });
    const ex = (w.exemples || '').trim(), exN = (w.exemplesNote || '').trim();
    if (ex || exN) S.push({ k: 'exemples', h: 'EXEMPLES' + (ex ? ' (pour le style et le niveau attendus, pas à recopier)' : ''), b: [exN, ex ? '"""\n' + ex + '\n"""' : ''].filter(Boolean).join('\n') });
    if (cons.length) S.push({ k: 'contraintes', h: 'CONTRAINTES / RÈGLES', b: cons.map((c) => '- ' + stripNum(c)).join('\n') });
    const fl = [fmt && 'Format : ' + fmt, len && 'Longueur : ' + len, tone && 'Ton : ' + tone + '.'].filter(Boolean);
    if (target === 'gemini') fl.push('Si plusieurs approches sont possibles, compare-les en quelques lignes (points forts, limites) avant de recommander la meilleure.');
    if (fl.length) S.push({ k: 'modele', h: 'MODÈLE DE RÉPONSE', b: fl.join('\n') });
    if (blocks.includes('reflexion')) S.push({ k: 'reflexion', b: BLOCKS.reflexion.text(w) });
    if (blocks.includes('etapes')) S.push({ k: 'pas', b: BLOCKS.etapes.text(w) });
    if (blocks.includes('mode')) S.push({ k: 'mode', b: BLOCKS.mode.text(w) });
    if (proofs.length) S.push({ k: 'preuve', h: 'RÈGLES DE PREUVE', b: proofs.map((p) => '- ' + p).join('\n') });
    if (blocks.includes('tags')) S.push({ k: 'tags', b: BLOCKS.tags.text(w) });
    if (blocks.includes('risques')) S.push({ k: 'risques', b: BLOCKS.risques.text(w) });
    if (blocks.includes('verif')) S.push({ k: 'verif', b: BLOCKS.verif.text(w) });
    if (keyPos) S.push({ k: 'rappel', h: 'RAPPEL', b: `${endDot(stripNum(keyPos))} C’est important !` });
    if (target === 'chatgpt') S.push({ k: 'start', b: 'Pour commencer : confirme en une phrase ce que tu as compris de la tâche, puis réponds.' });
    return S;
  }
  function buildPrompt(w, mode = 'complet', opt = {}) {
    const P = '[à compléter]';
    const target = opt.target || currentTarget();
    if (mode !== 'court') return renderSections(sectionsOf(w, { target }), target);
    const { tone, fmt, len } = parts3(w);
    const proofs = proofsOf(w);
    const blocks = BLOCK_ORDER.filter((k) => w.blocks && w.blocks[k]);
    const parts = [roleLine(w, P)];
    if (blocks.includes('profil')) parts.push(BLOCKS.profil.short(w));
    parts.push(`Action : ${endDot(w.objectif.trim() || P)}${w.livrable.trim() ? ' C’est réussi quand : ' + endDot(w.livrable.trim()) : ''}`);
    if (w.audience.trim() || w.niveau) parts.push(`Pour : ${[w.audience.trim(), LEVELS[w.niveau] ? 'niveau ' + LEVELS[w.niveau] : ''].filter(Boolean).join(', ')}.`);
    if (w.contexte.trim()) parts.push(`Contexte : ${w.contexte.trim()}`);
    if (lines(w.etapes).length) parts.push(`Étapes : ${lines(w.etapes).map((l, i) => `${i + 1}) ${stripNum(l).replace(/[.;]$/, '')}`).join(' ; ')}.`);
    const cons = consOf(w).map((c) => stripNum(c).replace(/[.;]$/, ''));
    if (cons.length) parts.push(`Règles : ${cons.join(' ; ')}.`);
    const fl = [fmt && 'Format : ' + fmt, tone && 'Ton : ' + tone + '.', len && 'Longueur : ' + len].filter(Boolean).join(' ');
    if (fl) parts.push(fl);
    if ((w.exemplesNote || '').trim()) parts.push('Exemples : ' + w.exemplesNote.trim());
    if ((w.exemples || '').trim()) parts.push('Exemple :\n"""\n' + w.exemples.trim() + '\n"""');
    blocks.filter((b) => b !== 'profil').forEach((b) => parts.push(BLOCKS[b].short(w)));
    if (proofs.length) parts.push('Preuves : ' + proofs.map((p) => p.replace(/\.$/, '')).join(' ; ') + '.');
    const key = keyConstraint(w); if (key) parts.push(`Rappel : ${endDot(stripNum(positive(key) || key))} C’est important !`);
    if (target === 'chatgpt') parts.push('Commence par confirmer en une phrase ce que tu as compris.');
    return parts.map((p) => p.replace(/\.\.$/, '.')).join('\n');
  }

  // ---------- Analyse heuristique ----------
  const B = '(?<![\\p{L}\\p{N}_])', E = '(?![\\p{L}\\p{N}_])';
  const rx = (alts) => new RegExp(B + '(?:' + alts + ')' + E, 'iu');
  // Critères : d'abord les 7 éléments de la méthode ASPECCT, puis les compléments (public, longueur, ton, preuves, vérification)
  const lastPart = (t) => { const L = t.trim().split('\n'); return L.slice(Math.max(0, L.length - Math.max(4, Math.ceil(L.length * 0.2)))).join('\n'); };
  function keyFromText(t) {
    const L = String(t).split('\n'); let inC = false;
    for (const l of L) {
      const h = l.trim().replace(/^#+\s*/, '');
      if (/^[A-ZÀ-ÝŒ][A-ZÀ-ÝŒ /’'()-]{2,}$/.test(h)) { inC = /CONTRAINTE|RÈGLE|REGLE/.test(h) && !/PREUVE/.test(h); continue; }
      if (inC && l.trim()) return stripNum(l.trim());
    }
    return '';
  }
  const CRITERIA = [
    { id: 'goal', g: 'A', w: 16, name: 'Action explicite', ok: 'La tâche est dite clairement, avec un verbe d’action.', no: 'Écris la tâche en une phrase avec un verbe d’action (rédige, analyse, crée…). Tu peux y glisser la contrainte clé : « Rédige un post de moins de 280 caractères ».',
      test: rx("action|objectif|but|mission|tâche|je veux|j['’]aimerais|j['’]ai besoin|aide-moi|crée|créer|rédige|rédiger|écris|écrire|génère|analyse|analyser|résume|résumer|traduis|explique|corrige|propose|conçois|liste|compare|goal|task|write|create"), insert: 'ACTION\n[La tâche en une phrase, avec un verbe d’action et la contrainte clé]\nC’est réussi quand : [critère vérifiable]' },
    { id: 'steps', g: 'É', w: 9, name: 'Étapes', ok: 'Une suite d’étapes guide l’IA.', no: 'Donne une suite numérotée d’étapes à suivre : l’IA avance dans l’ordre au lieu de deviner.',
      test: (t) => (t.match(/^\s*(?:\d+[.)]|étape\s*\d)/gimu) || []).length >= 2 || rx("étapes|d['’]abord|ensuite|pour finir|enfin|steps?").test(t), insert: 'ÉTAPES\n1. [Ce que l’IA fait en premier]\n2. [Ensuite]\n3. [Pour finir]' },
    { id: 'role', g: 'P', w: 12, name: 'Persona (rôle)', ok: 'L’IA sait quel expert elle doit être, avec quelle voix.', no: 'Dis quel expert l’IA doit incarner (« Tu es un… ») : cela fixe sa voix et son point de vue.',
      test: rx("tu es|vous êtes|agis comme|agis en|joue le rôle|en tant que|rôle|persona|you are|act as|incarne"), insert: 'RÔLE / PERSONA\nTu es un expert en [domaine], avec [nombre] ans d’expérience en [spécialité].' },
    { id: 'examples', g: 'E', w: 8, name: 'Exemples', ok: 'Des exemples montrent ce qui est attendu.', no: 'Montre ce que tu attends : plusieurs exemples variés valent mieux qu’un seul exemple trop précis. Tu peux les lister entre parenthèses.',
      test: (t) => rx("exemples?|par ex|ex\\s?:|comme ceci|comme ça|example").test(t) || /"""|```|<exemples?>/i.test(t), insert: 'EXEMPLES (plusieurs exemples variés, pas à recopier)\n- [Exemple 1]\n- [Exemple 2, différent du premier]\nOu en une ligne : (exemple 1, exemple 2, exemple 3)' },
    { id: 'context', g: 'C', w: 10, name: 'Contexte', ok: 'L’environnement et la situation sont décrits.', no: 'Explique la situation : pourquoi tu demandes, ce qui existe déjà, dans quel cadre.',
      test: (t) => rx("contexte|situation|actuellement|aujourd['’]hui|en ce moment|mon projet|mon entreprise|j['’]ai déjà|voici|background|context").test(t) || words(t) > 120, insert: 'CONTEXTE\n[La situation, ce qui existe déjà, pourquoi tu demandes]' },
    { id: 'constraints', g: 'C', w: 10, name: 'Contraintes / règles', ok: 'Des règles ou limites sont posées.', no: 'Ajoute les règles à respecter, formulées positivement (« Utilise uniquement… » plutôt que « N’utilise pas… »).',
      test: rx("ne (?:pas|jamais)|n['’]\\p{L}+ (?:pas|jamais)|évite|éviter|interdit|maximum|minimum|max|au plus|au moins|limite|contraintes?|règles?|obligatoire|doit|doivent|uniquement|seulement|sans|must|don['’]t|never"), insert: 'CONTRAINTES / RÈGLES\n- [Utilise uniquement…]\n- [Garde…]' },
    { id: 'format', g: 'M', w: 10, name: 'Modèle de réponse', ok: 'La forme de la réponse est précisée.', no: 'Précise la forme : Markdown, bloc de code, tableau, puces avec justification, formule pour les titres…',
      test: rx("format|modèle de réponse|tableau|liste|puces|json|markdown|titres?|intertitres?|sections?|structure|structuré|paragraphes?|plan|code|csv|table|bullet"), insert: 'MODÈLE DE RÉPONSE\n[Markdown / bloc de code / tableau / puces avec une justification par point…]' },
    { id: 'rappel', g: '+', w: 5, name: 'Rappel final de la contrainte clé', ok: 'La contrainte la plus importante est répétée à la fin.', no: 'Répète ta contrainte la plus importante tout à la fin : c’est ce que l’IA lit en dernier.',
      test: (t) => rx("rappel|c['’]est important|n['’]oublie pas|souviens-toi|surtout|important").test(lastPart(t)),
      insert: (t) => { const k = keyFromText(t || ''); return `RAPPEL\n${k ? endDot(positive(k) || k) : '[Ta contrainte la plus importante, répétée ici.]'} C’est important !`; } },
    { id: 'positive', g: '+', w: 4, name: 'Règles formulées positivement', ok: 'Les règles disent quoi faire plutôt que quoi éviter.', no: 'Certaines règles disent seulement quoi éviter : dis plutôt quoi faire (voir les suggestions plus bas).',
      test: (t) => !negLines(t).length, insert: null },
    { id: 'audience', g: '+', w: 6, name: 'Public visé', ok: 'L’IA sait pour qui elle écrit.', no: 'Précise pour qui est la réponse et son niveau.',
      test: rx("audience|public|lecteurs?|lectrices?|destiné|destinée|cible|clients?|utilisateurs?|débutants?|novices?|niveau|pour (?:des|les|un|une|mon|ma|mes)|élèves?|étudiants?|enfants?|équipe|recruteurs?"), insert: 'AUDIENCE\n[Pour qui est la réponse ?] — Niveau : [débutant / intermédiaire / expert]' },
    { id: 'length', g: '+', w: 4, name: 'Longueur', ok: 'Une longueur est indiquée.', no: 'Indique une longueur (par exemple « 200 mots maximum »).',
      test: (t) => /\d+\s*(?:mots|lignes|phrases|caractères|pages|paragraphes|points|idées|words|lines)/iu.test(t) || rx("court|courte|bref|brève|concis|concise|détaillé|détaillée|longueur|résumé en").test(t), insert: 'LONGUEUR\n[Par exemple : 300 mots maximum]' },
    { id: 'tone', g: '+', w: 4, name: 'Ton', ok: 'Le ton est précisé.', no: 'Précise le ton (simple, professionnel, chaleureux…).',
      test: rx("ton|style|registre|formel|formelle|informel|tutoie|tutoiement|vouvoie|chaleureux|professionnel|amical|direct|pédagogue|pédagogique|sans jargon|simple|simplement|tone"), insert: 'TON\n[Simple, direct, chaleureux…]' },
    { id: 'proof', g: '+', w: 5, name: 'Gestion de l’incertitude', ok: 'L’IA sait quoi faire quand elle n’est pas sûre.', no: 'Demande à l’IA de signaler ce qui est incertain plutôt que de deviner.',
      test: rx("invent\\p{L}*|sources?|incertain\\p{L}*|à vérifier|sûr|probable|certitudes?|hypothèses?|je ne sais pas|spécul\\p{L}*|fabriqu\\p{L}*|vérifiable\\p{L}*|vérifier"), insert: BLOCKS.tags.text() + '\n- Si tu ne sais pas, dis-le clairement et indique ce qu’il faudrait vérifier.' },
    { id: 'verify', g: '+', w: 4, name: 'Vérification finale', ok: 'L’IA se relit avant de répondre.', no: 'Ajoute une liste de contrôle que l’IA vérifie avant d’envoyer.',
      test: rx("vérifi\\p{L}*|relis|relire|contrôle|checklist|check-list|avant de répondre|avant d['’]envoyer|assure-toi|double-check"), insert: BLOCKS.verif.text() }
  ];
  // Lignes de règles formulées négativement, avec une reformulation positive quand elle est sûre
  function negLines(t) {
    const out = []; const seen = new Set();
    String(t || '').split('\n').forEach((l, i) => {
      const x = l.trim(); if (!x || x.length > 220 || seen.has(x)) return;
      if (BOILER().some((b) => b.includes(x))) return; // blocs standard du site : laissés tels quels
      if (isNegative(x)) { seen.add(x); out.push({ line: i, text: x, fix: positive(x) }); }
    });
    return out;
  }
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
    const results = CRITERIA.map((c) => { const src = c.id === 'proof' || c.id === 'verify' ? t : core; return { id: c.id, g: c.g, name: c.name, weight: c.w, pass: wc > 0 && (typeof c.test === 'function' ? c.test(src) : c.test.test(src)), ok: c.ok, no: c.no, insert: typeof c.insert === 'function' ? c.insert(t) : c.insert }; });
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
    return { score, level, results, amb, notes, neg: wc ? negLines(t) : [], words: wc, chars: t.length };
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
      body: JSON.stringify(Object.assign({ model: state.settings.model || 'claude-sonnet-5-5', max_tokens: opts.max_tokens || 4096, messages: [{ role: 'user', content: prompt }] }, opts.system ? { system: opts.system } : {})),
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
  const improveMeta = (p, withMethod = true) => `${withMethod && PS.method ? PS.method.SYSTEM + '\n\n' : ''}Améliore le prompt ci-dessous pour qu'il soit plus clair, plus précis et plus efficace, sans changer son intention.
- Garde la langue d'origine.
- Ajoute ce qui manque (persona, action, étapes, exemples, contexte, contraintes formulées positivement, modèle de réponse, rappel final) uniquement si c'est utile ; mets entre crochets [ ] ce que l'auteur doit compléter lui-même.
- Présente comme réels uniquement les faits, chiffres et exemples fournis.

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
    PROOF, PROOF_LABELS, BLOCKS, BLOCK_ORDER, FORMAT_LABELS, LENGTH_LABELS, FORMATS, LEVELS, emptyWizard, buildPrompt, sectionsOf, renderSections, positive, isNegative, keyConstraint, TARGETS, currentTarget,
    CRITERIA, analyze, negLines, keyFromText, diffLines, varsOf, fillVars, CLAUDE_URL_MAX, claudeLink, callClaude, improveMeta,
    download, pickFile, projectToMarkdown, slug, copy, KEY, KEY_API
  });
  Object.defineProperty(window.PS, 'state', { get: () => state, set: (v) => { state = v; }, configurable: true });
  Object.defineProperty(window.PS, 'backend', { get: () => backend, configurable: true });
  Object.defineProperty(window.PS, 'initError', { get: () => initError, configurable: true });
})();
