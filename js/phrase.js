/* Prompt Studio — mode « Une phrase » : déduction locale (règles et mots-clés), contexte de projet, vues */
(function () {
  'use strict';
  const { $, $$, esc, icon } = PS;
  const V = PS.views;
  const norm = (s) => String(s || '').toLowerCase().replace(/[’`]/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const has = (n, re) => new RegExp('(?:^|[^a-z0-9])(?:' + re + ')(?![a-z0-9])').test(n);
  const count = (n, re) => (n.match(new RegExp('(?:^|[^a-z0-9])(?:' + re + ')(?![a-z0-9])', 'g')) || []).length;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- Domaines ----------
  // kw : [expression régulière sur texte normalisé (sans accents), poids]
  const BASE_PROOF = { stats: true, examples: true, obs: false, spec: false, sources: false, unknown: true };
  const DOMAINS = [
    { id: 'traduction', label: 'Traduction', kw: [['tradui\\w*|traduction|translate|translation', 4]],
      role: 'un traducteur professionnel, attentif au sens et au ton', audience: 'Des lecteurs natifs de la langue d’arrivée.', ton: ['neutre'], format: 'libre', longueur: 'auto',
      contraintes: ['Garde le sens, le ton et la mise en forme du texte d’origine', 'Traduis le sens, avec des tournures naturelles plutôt que mot à mot', 'Signale entre crochets les expressions sans équivalent direct'],
      proof: { unknown: true }, blocks: { verif: true }, etapes: ['Lis tout le texte pour saisir le sens et le ton', 'Traduis paragraphe par paragraphe', 'Relis la traduction comme un lecteur natif et corrige ce qui sonne faux', 'Liste les passages délicats et explique tes choix'], verb: 'Traduis', livrable: 'La traduction se lit comme un texte écrit directement dans la langue d’arrivée.', needsText: true },
    { id: 'resume', label: 'Résumé', kw: [['resum\\w*|synthes\\w*|synthetis\\w*|points? cles?|tl;?dr|compte[- ]rendu|condense\\w*', 3]],
      role: 'un expert en synthèse, clair et fidèle au texte', audience: 'Moi : je veux l’essentiel sans tout relire.', ton: ['neutre'], format: 'liste', longueur: 'courte',
      contraintes: ['Utilise uniquement les informations présentes dans le texte', 'Garde les chiffres et les noms exacts', 'Commence par l’idée principale en une phrase'],
      proof: { examples: true, obs: true, spec: true, unknown: true }, blocks: { verif: true }, etapes: ['Lis le texte en entier', 'Repère l’idée principale et les points clés', 'Rédige le résumé', 'Vérifie que chaque point vient bien du texte'], rappel: 'Utilise uniquement les informations présentes dans le texte', verb: 'Résume', livrable: 'Je comprends l’essentiel en moins d’une minute.', needsText: true },
    { id: 'emploi', label: 'Emploi / CV', kw: [['lettre de motivation|cv|curriculum|entretien d\'embauche|candidature|candidater|postuler|offre d\'emploi', 5], ['entretien|recrut\\w*|embauche|emploi|job|stage|alternance|linkedin', 3]],
      role: 'un recruteur expérimenté et coach en candidature', audience: 'Un recruteur qui lit vite (moins d’une minute par candidature).', ton: ['professionnel', 'chaleureux'], format: 'paragraphes', longueur: 'moyenne',
      contraintes: ['Utilise uniquement les expériences, diplômes, compétences et chiffres que je fournis ; sinon, écris [À COMPLÉTER]', 'Mets en avant ce qui correspond le mieux au poste visé', 'Phrases courtes, verbes d’action'],
      proof: { stats: true, examples: true, unknown: true }, blocks: { reflexion: true, verif: true }, etapes: ['Repère les attentes principales du poste', 'Relie chaque attente à un élément réel de mon parcours', 'Rédige le texte', 'Liste ce que je dois compléter ou vérifier'], exemplesNote: 'Verbes d’action possibles (piloté, conçu, amélioré, formé, négocié).', verb: 'Rédige', livrable: 'Le texte est prêt à envoyer après avoir complété les crochets.', needsProfile: true },
    { id: 'trading', label: 'Trading / Pine', kw: [['pine ?script|pine|tradingview|backtest\\w*', 4], ['trading|trader|bourse|crypto\\w*|bitcoin|btc|forex|indicateur|rsi|macd|bollinger|chandeliers?|scalping|swing|stop[- ]loss|take[- ]profit|portefeuille|etf|actions? en bourse', 2], ['ichimoku|xauusd|xau|kumo|tenkan|kijun|prop ?firm|ftmo', 3], ['strategie de trading|strategie', 1]],
      role: 'un analyste quantitatif prudent, expert en Pine Script et en backtests', audience: 'Moi, trader particulier.', ton: ['direct', 'technique'], format: 'etapes', longueur: 'auto',
      contraintes: ['Présente uniquement des résultats issus d’un vrai backtest ; sinon, écris [À TESTER]', 'Parle de risques et de frais plutôt que de gains promis', 'Distingue ce qui est testé de ce qui est une idée'],
      proof: { stats: true, examples: true, obs: true, spec: true, unknown: true }, blocks: { reflexion: true, tags: true, risques: true, verif: true }, etapes: ['Reformule la stratégie et ses règles', 'Écris le code ou la méthode', 'Explique comment la tester (période, frais, nombre de trades)', 'Termine par les risques et les limites'], rappel: 'Présente uniquement des résultats issus d’un vrai backtest ; sinon, écris [À TESTER]', verb: 'Crée', livrable: 'Je peux tester le résultat moi-même et je connais ses limites.' },
    { id: 'code', label: 'Code / dev', kw: [['code|coder|codage|programmer|programmation|script|python|javascript|typescript|js|php|sql|html|css|react|vue|node|nodejs|api|bug|bugs|debug\\w*|debogu\\w*|stack ?trace|fonction|regex|refactor\\w*|algorithme|git|github|docker|backend|frontend|base de donnees|requete|swift|kotlin|java|c\\+\\+|rust|excel formule|formule excel|macro|vba', 2], ['erreur|plante|crash\\w*|compile\\w*', 1]],
      role: 'un développeur senior, rigoureux et pédagogue', audience: 'Moi : je dois comprendre et réutiliser le code.', ton: ['direct', 'technique'], format: 'code', longueur: 'auto',
      contraintes: ['Donne du code complet et fonctionnel, en entier (chaque partie écrite)', 'Explique en une phrase chaque choix important', 'S’il manque une information (langage, version, environnement), pose la question ou annonce ton hypothèse'],
      proof: { unknown: true }, blocks: { reflexion: true, verif: true }, etapes: ['Reformule le problème et annonce tes hypothèses', 'Propose la solution la plus simple qui fonctionne', 'Donne le code complet et commenté', 'Explique comment le tester'], verb: 'Écris', livrable: 'Le code fonctionne tel quel et je sais comment l’utiliser.' },
    { id: 'sport', label: 'Sport / nutrition', kw: [['sport|seances?|musculation|muscu|entrainement|s\'entrainer|course a pied|courir|running|marathon|semi-marathon|fitness|crossfit|cardio|nutrition|regime|repas|calories|proteines|maigrir|perdre du poids|prise de masse|seche|yoga|pilates|velo|natation|abdos|pompes|squat|etirements|mobilite|coach sportif', 2]],
      role: 'un coach sportif diplômé, avec de solides bases en nutrition', audience: 'Moi, avec mon niveau actuel.', ton: ['simple', 'chaleureux'], format: 'tableau', longueur: 'auto',
      contraintes: ['Adapte le volume et l’intensité à mon niveau', 'Propose une alternative pour chaque exercice si je n’ai pas le matériel', 'Reste sur l’entraînement et l’alimentation ; pour tout souci de santé, dis-moi de consulter un professionnel'],
      proof: { stats: true, examples: true, obs: true, spec: true, unknown: true }, blocks: { reflexion: true, tags: true, verif: true }, etapes: ['Pars de mon niveau et de mes contraintes', 'Construis le plan séance par séance', 'Explique comment progresser d’une semaine à l’autre', 'Indique les signaux qui doivent me faire ralentir'], verb: 'Crée', livrable: 'Je peux suivre le plan dès demain, sans matériel ou connaissance que je n’ai pas.',
      formatDetail: { tableau: 'Un tableau par séance : exercice, séries, répétitions, repos.' } },
    { id: 'marketing', label: 'Marketing / réseaux', kw: [['marketing|reseaux sociaux|instagram|insta|tiktok|facebook|youtube|post|posts|publication|publicite|pub|slogan|campagne|newsletter|seo|referencement|accroche|landing page|page de vente|marque|branding|abonnes|followers|community|influence\\w*|hashtags?|caption|legende', 2], ['vendre|clients?|produit|promo\\w*|lancement', 1]],
      role: 'un expert en marketing et en rédaction persuasive', audience: 'Mes clients potentiels.', ton: ['enthousiaste'], format: 'liste', longueur: 'courte',
      contraintes: ['Une accroche forte dans la première ligne', 'Un seul appel à l’action clair', 'Utilise uniquement des chiffres, avis clients et résultats réels que je fournis'],
      proof: { stats: true, examples: true, unknown: true }, blocks: { reflexion: true, verif: true }, etapes: ['Identifie le public et son besoin principal', 'Propose plusieurs angles différents', 'Rédige la meilleure version', 'Termine par l’appel à l’action'], exemplesNote: 'Angles possibles (conseil pratique, coulisses, question au public, avant / après, erreur fréquente). Des angles variés valent mieux qu’un seul répété.', rappel: 'Utilise uniquement des chiffres, avis clients et résultats réels que je fournis', verb: 'Rédige', livrable: 'Le texte donne envie d’agir et peut être publié tel quel.' },
    { id: 'redaction', label: 'Rédaction / e-mail', kw: [['mail|e-mail|email|courriel|lettre|courrier|message|sms|discours|invitation|faire-part|relance|relancer|repondre a|reponse a|remerciement|excuses|reclamation|article|texte|rediger|redige|ecrire|ecris|reformuler|reecrire|corriger|orthographe', 2]],
      role: 'un rédacteur professionnel, clair et efficace', audience: 'Le destinataire ou les lecteurs du texte.', ton: ['professionnel'], format: 'paragraphes', longueur: 'courte',
      contraintes: ['Phrases courtes, un message principal', 'Adapte le niveau de langue au destinataire', 'Mets entre crochets les informations que je dois compléter (noms, dates, montants)'],
      proof: { examples: true, unknown: true }, blocks: { verif: true }, etapes: ['Identifie le destinataire et le message principal', 'Rédige un premier jet clair', 'Relis pour raccourcir et ajuster le ton', 'Mets entre crochets ce que je dois compléter'], verb: 'Rédige', livrable: 'Le texte est prêt à envoyer après avoir complété les crochets.' },
    { id: 'analyse', label: 'Analyse / données', kw: [['analyse\\w*|analyser|donnees|data|statistiques?|stats|chiffres|tableur|excel|csv|graphiques?|kpi|indicateurs? cles|tendances?|rapport|dashboard|tableau de bord|sondage|enquete|correlation|moyenne', 2]],
      role: 'un analyste de données rigoureux', audience: 'Moi, pour prendre une décision à partir des résultats.', ton: ['neutre', 'direct'], format: 'paragraphes', longueur: 'moyenne',
      contraintes: ['Appuie chaque conclusion sur les données fournies', 'Signale les données manquantes ou douteuses', 'Termine par 3 actions concrètes'],
      proof: { stats: true, examples: true, obs: true, spec: true, sources: true, unknown: true }, blocks: { reflexion: true, tags: true, verif: true }, etapes: ['Vérifie la qualité des données (manques, doublons, valeurs bizarres)', 'Décris les tendances principales', 'Explique ce qu’elles signifient', 'Propose 3 actions concrètes'], rappel: 'Appuie chaque conclusion sur les données fournies', verb: 'Analyse', livrable: 'Je sais ce que disent les données et quoi faire ensuite.', needsText: true },
    { id: 'apprendre', label: 'Apprendre / expliquer', kw: [['expliqu\\w*|comprendre|apprendre|cours|lecon|reviser|revision|examen|quiz|exercices?|enseigner|c\'est quoi|qu\'est-ce que|qu\'est ce que|comment (ca )?fonctionne|comment marche|pourquoi|definition', 2]],
      role: 'un professeur patient et pédagogue', audience: 'Moi, qui veux comprendre le sujet.', niveau: 'debutant', ton: ['pédagogique', 'simple'], format: 'paragraphes', longueur: 'moyenne',
      contraintes: ['Pars de ce que je connais déjà, sans jargon (ou explique chaque terme)', 'Donne un exemple concret de la vie courante', 'Termine par 3 questions pour vérifier que j’ai compris'],
      proof: { stats: true, examples: true, obs: true, spec: true, sources: true, unknown: true }, blocks: { reflexion: true, tags: true, verif: true }, etapes: ['Explique l’idée principale simplement', 'Donne une analogie et un exemple concret', 'Détaille les points importants', 'Termine par 3 questions de vérification'], exemplesNote: 'Analogies du quotidien bienvenues (cuisine, sport, argent de poche, transports). Plusieurs exemples variés aident plus qu’un seul très précis.', verb: 'Explique', livrable: 'Je peux réexpliquer le sujet avec mes mots.' },
    { id: 'web', label: 'Site / app web', kw: [['site web|site internet|page web|application web|web ?app|dashboard|tableau de bord|interface web|front-?end|back-?end|pwa|extension (?:chrome|navigateur)', 3], ['site|app|appli|application|outil en ligne|plateforme web|heberg\\w*|deploy\\w*|deploie\\w*|github pages|vercel|netlify', 1]],
      role: 'un développeur full-stack senior, spécialiste des sites et applications web', audience: 'Moi, et les personnes qui utiliseront le site ou l’application.', ton: ['direct', 'technique'], format: 'etapes', longueur: 'auto',
      contraintes: ['Livre un code complet, fonctionnel et commenté, chaque fichier écrit en entier', 'Commence par la version 1 la plus simple qui marche, puis propose les améliorations'],
      proof: { examples: true, spec: true, unknown: true }, blocks: { reflexion: true, verif: true }, etapes: ['Reformule les besoins', 'Liste les pages', 'Écris le code', 'Explique le déploiement'], verb: 'Crée', livrable: 'Je peux ouvrir le site, l’utiliser tout de suite et je sais comment le mettre en ligne.' },
    { id: 'projet', label: 'Projet / lancement', kw: [['projet|app|appli|application|site|site web|site internet|startup|start-up|mvp|plateforme|logiciel|saas|roadmap|feuille de route|cahier des charges|maquette|prototype|lancer|lancement|business plan|entreprise|boutique en ligne|e-commerce', 2]],
      role: 'un chef de projet produit expérimenté', audience: 'Moi et les personnes qui travailleront sur le projet.', ton: ['direct', 'simple'], format: 'etapes', longueur: 'auto',
      contraintes: ['Commence par le plus petit résultat utile (version 1)', 'Pour chaque étape : objectif, actions, résultat attendu', 'Signale ce qui coûte du temps ou de l’argent'],
      proof: { stats: true, examples: true, spec: true, unknown: true }, blocks: { reflexion: true, etapes: true, risques: true, verif: true }, etapes: ['Reformule le projet et son objectif', 'Définis la version 1 la plus simple', 'Découpe en étapes avec un résultat attendu pour chacune', 'Signale les risques, les coûts et le temps nécessaire'], verb: 'Prépare', livrable: 'Je sais exactement quoi faire en premier.' },
    { id: 'idees', label: 'Idées / brainstorm', kw: [['idees?|brainstorm\\w*|trouver un nom|noms? pour|noms? de', 3], ['inspiration|suggestions?|propositions?|creatif|creative|imaginer|invente\\w*|originale?s?', 2]],
      role: 'un directeur de création inventif', audience: 'Moi, pour choisir les meilleures idées.', ton: ['enthousiaste'], format: 'liste', longueur: 'moyenne',
      contraintes: ['Propose 10 idées variées, des plus sûres aux plus audacieuses', 'Une ligne d’explication par idée', 'Termine par tes 3 favorites et pourquoi'],
      proof: { examples: true, unknown: true }, blocks: { verif: true }, etapes: ['Explore plusieurs directions différentes', 'Propose 10 idées, des plus sûres aux plus audacieuses', 'Explique chaque idée en une ligne', 'Choisis tes 3 favorites et dis pourquoi'], exemplesNote: 'Directions possibles (classique, humour, jeu de mots, émotion, chiffre ou lieu). Varie les styles.', verb: 'Trouve', livrable: 'J’ai au moins 2 idées que j’ai envie de tester.' },
    { id: 'conseil', label: 'Conseil / décision', kw: [['choisir|choix|decider|decision|hesite|j\'hesite|conseil\\w*|dois-je|est-ce que je dois|faut-il|vaut-il mieux|vaut mieux|ou bien|vs|versus|avantages|inconvenients|pour ou contre|comparer|comparatif|acheter|changer de', 2]],
      role: 'un conseiller neutre et méthodique', audience: 'Moi, pour décider.', ton: ['neutre', 'direct'], format: 'tableau', longueur: 'moyenne',
      contraintes: ['Pose d’abord mes critères s’ils manquent', 'Compare les options sur les mêmes critères', 'Termine par une recommandation claire et ce qui la ferait changer'],
      proof: { stats: true, examples: true, obs: true, spec: true, unknown: true }, blocks: { reflexion: true, tags: true, risques: true, verif: true }, etapes: ['Liste mes critères (ou demande-les s’ils manquent)', 'Compare les options sur ces critères', 'Donne ta recommandation', 'Dis ce qui ferait changer ta recommandation'], verb: 'Aide-moi à', livrable: 'Je sais quoi choisir et pourquoi.',
      formatDetail: { tableau: 'Un tableau comparatif des options, puis ta recommandation argumentée.' } },
    { id: 'general', label: 'Général', kw: [],
      role: 'un expert polyvalent, précis et pédagogue', audience: 'Moi.', ton: ['simple'], format: 'libre', longueur: 'auto',
      contraintes: ['Va à l’essentiel, puis développe si c’est utile'],
      proof: { stats: true, examples: true, spec: true, unknown: true }, blocks: { reflexion: true, tags: true, verif: true }, etapes: ['Reformule la demande en une phrase', 'Réponds à l’essentiel', 'Développe si c’est utile', 'Termine par la prochaine action possible'], verb: 'Aide-moi', livrable: '' }
  ];
  const DOM = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));

  const TONES = ['simple', 'chaleureux', 'professionnel', 'direct', 'pédagogique', 'enthousiaste', 'neutre', 'technique', 'drôle', 'poli'];
  const LANGS = { francais: 'français', anglais: 'anglais', allemand: 'allemand', espagnol: 'espagnol', italien: 'italien', portugais: 'portugais', neerlandais: 'néerlandais', chinois: 'chinois', japonais: 'japonais', arabe: 'arabe', russe: 'russe' };
  const LANG_RE = Object.keys(LANGS).join('|');
  const PEOPLE = 'clients?|clientes?|eleves?|enfants?|ados?|adolescents?|collegues?|equipe|patron|patronne|manager|chef|recruteurs?|lecteurs?|abonnes?|etudiants?|parents?|debutants?|utilisateurs?|investisseurs?|amis?|famille|public|jury|profs?|professeurs?|benevoles?|membres?|joueurs?|seniors?|retraites?|salaries?|employes?|proprietaire|locataires?|voisins?|banquier|assurance|medecin|grand-mere|grand-pere|mere|pere|femme|mari|copine|copain|fils|fille';

  // Verbes à l'infinitif → impératif (tutoiement)
  const VERBS = { ecrire: 'Écris', rediger: 'Rédige', creer: 'Crée', faire: 'Fais', trouver: 'Trouve', expliquer: 'Explique', preparer: 'Prépare', analyser: 'Analyse', corriger: 'Corrige', traduire: 'Traduis', resumer: 'Résume', organiser: 'Organise', ameliorer: 'Améliore', coder: 'Code', developper: 'Développe', construire: 'Construis', generer: 'Génère', planifier: 'Planifie', optimiser: 'Optimise', reecrire: 'Réécris', reformuler: 'Reformule', proposer: 'Propose', lister: 'Liste', comparer: 'Compare', calculer: 'Calcule', concevoir: 'Conçois', definir: 'Définis', verifier: 'Vérifie', transformer: 'Transforme', convertir: 'Convertis', mettre: 'Mets', donner: 'Donne', dire: 'Dis', imaginer: 'Imagine', inventer: 'Invente', chercher: 'Cherche', relancer: 'Relance', repondre: 'Réponds', modifier: 'Modifie', ajouter: 'Ajoute', supprimer: 'Supprime', tester: 'Teste', automatiser: 'Automatise', structurer: 'Structure', simplifier: 'Simplifie', synthetiser: 'Synthétise',
    apprendre: 'Aide-moi à apprendre', comprendre: 'Aide-moi à comprendre', choisir: 'Aide-moi à choisir', decider: 'Aide-moi à décider', lancer: 'Aide-moi à lancer', reussir: 'Aide-moi à réussir', perdre: 'Aide-moi à perdre', progresser: 'Aide-moi à progresser', vendre: 'Aide-moi à vendre', obtenir: 'Aide-moi à obtenir' };
  const IMPERATIVES = new Set(Object.values(VERBS).filter((v) => !v.startsWith('Aide')).map((v) => norm(v)).concat(['fais', 'aide-moi', 'aide', 'donne-moi', 'explique-moi', 'dis-moi', 'ecris-moi', 'redige-moi', 'cree-moi', 'trouve-moi', 'propose-moi', 'montre-moi', 'montre', 'fais-moi', 'prepare-moi', 'liste-moi', 'genere-moi']));
  const QUESTION_START = /^(comment|pourquoi|c'est quoi|qu'est-ce|qu'est ce|quel|quelle|quels|quelles|est-ce|combien|quand|qui|ou |dois-je|faut-il|vaut-il|peut-on|y a-t-il)/;

  function stripPrefix(t) {
    const re = /^(?:(?:bonjour|salut|hello|coucou|hey)[\s,!.]*|(?:s'il te pla[iî]t|stp|svp|merci)[\s,!.]*|(?:est-ce que |est ce que )?(?:tu peux|tu pourrais|peux-tu|pourrais-tu|pourriez-vous|pouvez-vous|tu veux bien)\s+(?:m'aider (?:a|à)\s+)?|(?:je veux|je voudrais|j'aimerais|je souhaite|j'ai besoin d'(?:aide pour\s+)?|j'ai besoin de\s+|il me faut|aide-moi (?:a|à)|aide moi (?:a|à)|j'ai envie de|j'aurais besoin d'|j'aurais besoin de\s+)\s*)/i;
    let prev;
    do { prev = t; t = t.replace(re, '').trim(); } while (t !== prev && t);
    return t;
  }
  function reform(sentence, d) {
    let t = String(sentence).replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!…]+$/, '');
    if (!t) return '';
    const isQ = /\?$/.test(t) || QUESTION_START.test(norm(t));
    t = stripPrefix(t) || t;
    const n = norm(t);
    if (isQ) return `Réponds à cette question : « ${cap(t.replace(/\s*\?*$/, ''))} ? »`;
    const first = n.split(/[\s,]/)[0].replace(/^(m'|t'|l')/, '');
    let out;
    if (VERBS[first]) out = VERBS[first] + t.slice(t.split(/[\s,]/)[0].length);
    else if (IMPERATIVES.has(first)) out = cap(t);
    else if (/^(un|une|des|le|la|les|l'|mon|ma|mes|notre|nos|ce|cet|cette|ces|du|de la|quelques|\d)/.test(n)) out = (d.verb === 'Aide-moi' || d.verb === 'Aide-moi à' ? 'Crée' : d.verb) + ' ' + t.charAt(0).toLowerCase() + t.slice(1);
    else if (/er$/.test(first) && first.length > 3) out = 'Aide-moi à ' + t;
    else out = cap(t);
    return out.replace(/\s+/g, ' ').replace(/[.!]?$/, '.');
  }

  // ---------- Déduction ----------
  // Livrable principal (ce qu'on veut obtenir) : pèse plus que les mots du sujet.
  // « un site qui affiche des backtests » → site web (le trading n'est que le sujet).
  const DELIV = [
    ['web', 'boutique en ligne|e-?commerce|site(?: web| internet)?|page web|app|appli|application(?: web| mobile)?|web ?app|dashboard|tableau de bord|outil(?: en ligne| web)?|interface(?: web)?|plateforme(?: web)?|extension(?: chrome| navigateur)?|pwa'],
    ['emploi', 'lettre de motivation|cv|curriculum'],
    ['code', 'script|programme (?:python|javascript|en python|en js)|bot|robot|fonction|macro|api|requete sql'],
    ['trading', 'strategie(?: de trading)?|indicateur|backtest'],
    ['redaction', 'article|mail|e-mail|email|lettre|discours|message'],
    ['marketing', 'post|publication|slogan|campagne|newsletter']
  ];
  // Verbe d'action qui décide seul du domaine (« Résume cet article » reste un résumé)
  const LEAD = [['traduction', 'tradui\\w*'], ['resume', 'resum\\w*|synthetis\\w*'], ['analyse', 'analys\\w*'], ['apprendre', 'expliqu\\w*']];
  const BUILD = '(?:^|cree\\w*|creer|fai\\w*|developpe\\w*|code\\w*|construi\\w*|concoi\\w*|concevoir|genere\\w*|ecri\\w*|redige\\w*|prepare\\w*|veux|voudrais|faut|besoin d\'|besoin de|un|une|mon|ma|nouveau|nouvelle|petit|petite|mini)';
  function deliverable(n) {
    const t = stripPrefix(n);
    if (LEAD.some(([, re]) => new RegExp('^(?:' + re + ')(?![a-z])').test(t))) return null;
    let best = null;
    DELIV.forEach(([id, re]) => {
      const m = new RegExp('(?:^|[^a-z0-9])' + BUILD + '(?:[\\s\'-]+(?:moi|un|une|des|le|la|les|l\'|mon|ma|mes|petit|petite|mini|nouveau|nouvelle|simple))*[\\s\'-]*(' + re + ')(?![a-z0-9])').exec(t);
      if (m && (!best || m.index < best.i || (m.index === best.i && m[1].length > best.len))) best = { id, i: m.index, len: m[1].length, word: m[1] };
    });
    return best;
  }
  function detectDomain(n) {
    let best = DOM.general, bestScore = 0;
    const scores = {};
    DOMAINS.forEach((d) => {
      const s = d.kw.reduce((a, [re, w]) => a + Math.min(3, count(n, re)) * w, 0);
      scores[d.id] = s;
    });
    const dv = deliverable(n);
    if (dv) scores[dv.id] = (scores[dv.id] || 0) + 12;
    DOMAINS.forEach((d) => { if (scores[d.id] > bestScore) { best = d; bestScore = scores[d.id]; } });
    // Sujet : le meilleur autre domaine (ex. trading pour un site de backtests)
    let topic = null, ts = 0;
    DOMAINS.forEach((d) => { if (d.id !== best.id && d.id !== 'projet' && d.id !== 'web' && d.id !== 'general' && scores[d.id] > ts) { topic = d.id; ts = scores[d.id]; } });
    return { d: best, scores, deliverable: dv, topic: ts >= 2 ? topic : null };
  }
  function hints(sentence) {
    const n = norm(sentence);
    const raw = String(sentence).replace(/[’`]/g, "'");
    const h = { ton: [], constraints: [], why: [] };
    if (has(n, 'court|courte|courts|courtes|bref|breve|concis|concise|en quelques lignes|en (?:une|1|deux|2|trois|3) (?:phrases?|lignes?)|tres court')) { h.longueur = 'courte'; h.why.push('« court »'); }
    else if (has(n, 'detaille|detaillee|detailles|detaillees|approfondi|approfondie|en profondeur|exhaustif|exhaustive|complet et detaille|tres complet|long|longue')) { h.longueur = 'longue'; h.why.push('« détaillé »'); }
    const mw = n.match(/(\d{2,5})\s*mots/); if (mw) { h.longueur = 'perso'; h.longueurDetail = `Environ ${mw[1]} mots.`; }
    if (has(n, 'debutants?|debutantes?|novices?|nul en|je n\'y connais rien|je ne connais rien|sans jargon|simplement|pour (?:un |une |des )?enfants?|comme a un enfant|de \\d+ ans|niveau zero|grand public')) { h.niveau = 'debutant'; h.why.push('« débutant »'); }
    else if (has(n, 'experts?|avances?|avancee|niveau pro|confirme|confirmes')) { h.niveau = 'expert'; }
    else if (has(n, 'intermediaire')) h.niveau = 'intermediaire';
    const T = [['drole|humour|humoristique|marrant|fun|decale|blague', 'drôle'], ['professionnel|professionnelle|pro|formel|formelle|serieux|serieuse|soutenu', 'professionnel'], ['chaleureux|chaleureuse|amical|amicale|sympa|bienveillant|bienveillante|gentil', 'chaleureux'], ['direct|directe|cash|franc|franche|sans detour|ferme', 'direct'], ['enthousiaste|dynamique|motivant|motivante|punchy|energique', 'enthousiaste'], ['neutre|objectif|objective|factuel', 'neutre'], ['poli|polie|courtois|courtoise|diplomate', 'poli'], ['pedagogique|pedagogue', 'pédagogique'], ['technique', 'technique']];
    T.forEach(([re, t]) => { if (has(n, re) && !(t === 'professionnel' && has(n, 'pro(?=\\s*(?:du|de la|des))'))) h.ton.push(t); });
    if (has(n, '(?:en|un|sous forme de|dans un|forme d\'un|avec un) tableaux?|tableau comparatif|tableau recapitulatif')) h.format = 'tableau';
    else if (has(n, 'json')) h.format = 'json';
    else if (has(n, 'en liste|une liste|liste de|liste des|sous forme de liste|a puces|points cles|checklist|check-list')) h.format = 'liste';
    else if (has(n, 'etape par etape|pas a pas|en etapes|par etapes|plan d\'action')) h.format = 'etapes';
    else if (has(n, 'mail|e-mail|email|courriel')) h.format = 'mail';
    else if (has(n, 'paragraphes?')) h.format = 'paragraphes';
    const lm = n.match(new RegExp('(?:^|[^a-z])(?:en|vers l\'|vers le|in) (' + LANG_RE + '|english)(?![a-z])'));
    if (lm) h.lang = lm[1] === 'english' ? 'anglais' : lm[1];
    const sm = n.match(new RegExp('(?:de|du) l?\'?(' + LANG_RE + ')(?: (?:vers|en))'));
    if (sm) h.fromLang = sm[1];
    if (has(n, 'tutoie|tutoyer|tutoiement')) h.tutoie = true;
    if (has(n, 'vouvoie|vouvoyer|vouvoiement')) h.vouvoie = true;
    // « pour mes clients », « pour des débutants »…
    const am = raw.match(new RegExp('\\bpour\\s+((?:mes|mon|ma|nos|notre|des|les|un|une|le|la|l\'|ses|son|sa|leur|leurs)\\s*[^,.;!?]{2,45})', 'i'));
    if (am && has(norm(am[1]), PEOPLE)) h.audience = cap(am[1].trim().replace(/\s+(?:qui|afin|pour|avec|en)\s.*$/i, ''));
    // « sans … »
    const sx = raw.match(/\bsans\s+([^,.;!?]{2,40}?)(?=$|[,.;!?]|\s+(?:et|pour|avec|qui|mais)\s)/i);
    if (sx) { h.constraints.push('Sans ' + sx[1].trim()); h.key = 'Sans ' + sx[1].trim(); }
    // numbers / durations kept in the objective; money / facts / multi-step
    h.money = has(n, 'argent|budget|euros?|chf|francs?|dollars?|prix|couts?|investir|investissement|placement|epargne|credit|pret|impots?|salaire|depenses?|rentabilite|\\d+ ?(?:€|\\$|k€|chf)') || /\d\s?(?:€|\$)/.test(raw);
    h.facts = has(n, 'chiffres?|statistiques?|donnees|histoire|historique|loi|lois|juridique|droit|legal|sante|medical|medicament|maladie|science|scientifique|vrai ou faux|sources?|etudes?|actualite|fiable');
    h.health = has(n, 'sante|medical|medicament|maladie|douleur|blessure|symptomes?|grossesse|enceinte');
    h.legal = has(n, 'loi|lois|juridique|droit du|contrat|legal|avocat|litige|tribunal');
    h.multi = has(n, 'etape par etape|pas a pas|tutoriel|guide complet|accompagne-moi|accompagner|une etape a la fois|plan d\'action|feuille de route|roadmap|de a a z');
    h.explain = has(n, 'expliqu\\w*|comprendre|c\'est quoi|qu\'est-ce|qu\'est ce|comment (?:ca )?(?:fonctionne|marche)');
    return h;
  }

  // Déduit tous les réglages d'une phrase ; ov = choix faits par l'utilisateur sur les puces
  function infer(sentence, ov = {}, extra = {}) {
    const n = norm(sentence);
    const det = detectDomain(n);
    let d = ov.domain && DOM[ov.domain] ? DOM[ov.domain] : det.d;
    if (!ov.domain && d.id === 'general' && extra.hintText) { const d2 = detectDomain(norm(extra.hintText)).d; if (d2.id !== 'general') d = d2; }
    const h = hints(sentence);
    const g = {
      sentence: String(sentence || '').trim(), topic: d.id === det.d.id ? det.topic : null, domain: d.id, domainLabel: d.label, auto: det.d.id, scores: det.scores,
      role: d.role, audience: h.audience || d.audience, niveau: h.niveau || d.niveau || '',
      ton: h.ton.length ? h.ton.slice(0, 2) : d.ton.slice(), format: h.format || d.format, formatDetail: '',
      longueur: h.longueur || d.longueur, longueurDetail: h.longueurDetail || '',
      lang: h.lang && d.id !== 'traduction' ? h.lang : 'français', target: d.id === 'traduction' ? (h.lang || '[langue d’arrivée]') : '', fromLang: h.fromLang || '',
      contraintes: d.contraintes.slice(), exclure: [], proof: Object.assign({}, BASE_PROOF, { stats: false, examples: false, unknown: false }, d.proof),
      blocks: Object.assign({ profil: false, mode: false, reflexion: false, etapes: false, tags: false, risques: false, verif: true }, d.blocks),
      etapes: (d.etapes || []).slice(), exemplesNote: d.exemplesNote || '', rappel: d.rappel || '',
      objectif: reform(PS.perso ? PS.perso.correct(sentence) : sentence, d), livrable: d.livrable, why: h.why, tutoie: !!h.tutoie, vouvoie: !!h.vouvoie, needsText: !!d.needsText, needsProfile: !!d.needsProfile
    };
    if (g.format === 'code' && d.id !== 'code' && d.id !== 'trading') g.format = 'libre';
    if (d.id === 'trading' && has(n, 'pine ?script|pine|tradingview|indicateur|backtest\\w*')) { g.format = 'code'; g.contraintes.unshift('Code Pine Script v6 complet, commenté, qui compile dans TradingView'); }
    if (d.id === 'redaction' && has(n, 'mail|e-mail|email|courriel|relance|relancer') && !h.format) g.format = 'mail';
    if (d.id === 'emploi' && has(n, 'cv|curriculum') && !h.format) g.format = 'liste';
    if (d.id === 'emploi' && has(n, 'entretien') && !h.format) { g.format = 'liste'; g.contraintes = ['Prépare les questions probables, avec pour chacune une réponse structurée (situation, action, résultat) à partir de mon parcours', 'Utilise uniquement mes expériences réelles : mets [À COMPLÉTER] là où il faut un exemple personnel']; }
    if (d.id === 'apprendre' && has(n, 'quiz|exercices?|reviser|revision|examen') && !h.format) g.format = 'liste';
    if (d.formatDetail && d.formatDetail[g.format]) g.formatDetail = d.formatDetail[g.format];
    if (d.id === 'traduction') { g.objectif = reform(sentence, d); g.contraintes.unshift(`Langue d’arrivée : ${g.target}${g.fromLang ? ` (depuis le ${LANGS[g.fromLang] || g.fromLang})` : ''}`); }
    // Indices transversaux
    if (h.explain && d.id !== 'apprendre') { if (!g.ton.includes('pédagogique')) g.ton = [g.ton[0], 'pédagogique'].filter(Boolean).slice(0, 2); g.blocks.tags = true; }
    if (h.money) { g.blocks.risques = true; g.blocks.tags = true; g.proof.stats = true; }
    if (h.facts) { g.blocks.tags = true; g.proof.sources = true; g.proof.obs = true; }
    if (h.health) { g.blocks.tags = true; if (!g.contraintes.some((c) => /médical/.test(c))) g.contraintes.push('Donne des informations générales et dis-moi quand consulter un professionnel de santé (diagnostic et traitement relèvent d’un médecin)'); g.blocks.risques = true; }
    if (h.legal) { g.blocks.tags = true; g.contraintes.push('Précise que ce n’est pas un avis juridique et quand consulter un professionnel'); }
    if (h.multi) g.blocks.etapes = true;
    if (h.format === 'etapes') g.blocks.etapes = g.blocks.etapes || h.multi;
    h.constraints.forEach((c) => g.contraintes.push(c));
    if (h.key && !d.rappel) g.rappel = h.key; // « sans matériel » : contrainte explicite de la phrase = contrainte clé
    if (h.longueurDetail && !g.rappel) g.rappel = 'Longueur : ' + h.longueurDetail.charAt(0).toLowerCase() + h.longueurDetail.slice(1);
    if (g.niveau === 'debutant' && !g.contraintes.some((c) => /jargon/.test(c))) g.contraintes.push('Utilise des mots simples de tous les jours, et explique chaque terme technique');
    if (h.tutoie) g.tonExtra = 'Tutoie-moi';
    if (h.vouvoie) g.tonExtra = 'Vouvoiement';
    // Base ASPECCT détaillée (persona riche, étapes, exemples, contexte, règles, modèle)
    const RX = PS.rich && PS.rich.R[d.id];
    if (RX) {
      g.rich = true; g.persona = RX.persona; g.modele = RX.modele.slice(); g.ctxRich = RX.ctx; g.facts = PS.rich.facts(sentence, d.id, g.topic);
      if (RX.topicRules && g.topic && RX.topicRules[g.topic]) RX.topicRules[g.topic].forEach((c) => { if (!g.contraintes.includes(c)) g.contraintes.splice(2, 0, c); });
      if (!(d.id === 'emploi' && has(n, 'entretien'))) g.etapes = RX.etapes.slice();
      g.exemplesNote = RX.exemples.map((x) => '- ' + x).join('\n');
      const key0 = (s) => norm(s).replace(/[^a-z ]/g, '').slice(0, 28);
      const core = (x) => norm(x).replace(/^(ecris|utilise|donne|propose|termine par|place|mets|garde|fais)\s+/, '').replace(/[^a-z ]/g, '').trim();
      const dup = (c) => g.contraintes.some((x) => key0(x) === key0(c) || core(x).includes(core(c)) || core(c).includes(core(x)));
      const addR = (c, max) => { if (g.contraintes.length < max && !dup(c)) g.contraintes.push(c); };
      RX.regles.forEach((c) => addR(c, 6)); PS.rich.COMMON.forEach((c) => addR(c, 7));
      if (!g.rappel) g.rappel = g.contraintes[0] || '';
      g.roleAuto0 = g.role;
      if (PS.perso) PS.perso.apply(g, sentence);
      g.roleAuto = g.role;
    }
    const prof = (PS.state && PS.state.settings && PS.state.settings.profil || '').trim();
    if (prof) { g.blocks.profil = true; g.profilText = prof; }
    // Choix explicites de l'utilisateur (puces)
    ['role', 'audience', 'niveau', 'format', 'longueur', 'lang'].forEach((k) => { if (ov[k] != null) g[k] = ov[k]; });
    if (ov.format != null) g.formatDetail = (d.formatDetail && d.formatDetail[ov.format]) || '';
    if (ov.longueur != null) g.longueurDetail = '';
    if (ov.ton != null) g.ton = [ov.ton];
    if (ov.blocks) Object.assign(g.blocks, ov.blocks);
    if (!prof) g.blocks.profil = false;
    return g;
  }

  // Réglages déduits → objet de l'assistant (réutilise PS.buildPrompt)
  function toWizard(g, ctx) {
    const w = PS.emptyWizard();
    w.role = g.role; w.objectif = g.objectif;
    w.livrable = g.livrable;
    w.audience = g.audience; w.niveau = g.niveau;
    w.format = g.format; w.formatDetail = g.formatDetail; w.ton = g.ton.slice(); w.tonExtra = g.tonExtra || '';
    w.longueur = g.longueur; w.longueurDetail = g.longueurDetail;
    w.etapes = (g.etapes || []).join('\n');
    const dd = DOM[g.domain];
    if (g.rich) {
      w.rich = true; w.modele = (g.modele || []).join('\n');
      if (g.persona && dd && (g.role === dd.role || g.role === g.roleAuto)) { const P = g.persona; w.roleExtra = `Tu as ${P.xp}.\nTa spécialité : ${P.spec}.\nTa conviction : ${P.persp}.\nTa voix : ${P.voix}. Tu parles avec ce point de vue d’expert dans toute ta réponse`; }
    } w.exemplesNote = g.exemplesNote || ''; w.rappel = g.rappel || '';
    const cons = g.contraintes.slice();
    if (ctx && ctx.text) cons.unshift('Appuie-toi sur le contexte du projet ci-dessus ; si une information manque, demande-la au lieu de la supposer');
    w.contraintes = cons.join('\n');
    w.exclure = g.exclure.join('\n');
    w.proof = Object.assign({}, g.proof);
    w.blocks = Object.assign({}, g.blocks); w.profilText = g.profilText || '';
    w.french = g.lang === 'français';
    if (g.lang !== 'français' && g.domain !== 'traduction') w.contraintes += `\nRéponds en ${g.lang}`;
    const C = g.rich && g.ctxRich ? [`Situation : ${g.ctxRich.sit}.`, `Objectif : ${g.ctxRich.but}.`, `Enjeux : ${g.ctxRich.enjeux}.`].concat((g.facts || []).map(([k, v]) => `${k} : ${v}`), g.ctxRich.inconnues.filter((x) => !(g.facts || []).some(([k]) => norm(x).startsWith(norm(k).slice(0, 8)))).map((x) => `${x} : [À PRÉCISER]`)).join('\n') : '';
    if (ctx && ctx.text) { w.contexte = ctx.text + (C ? '\n\nSITUATION ET ENJEUX\n' + C : ''); w.contexteTitle = 'CONTEXTE DU PROJET'; }
    else if (g.needsText) w.contexte = (C ? C + '\n\n' : '') + `Le texte à traiter est ci-dessous (ou je te l’envoie juste après) :\n"""\n[à compléter]\n"""`;
    else if (g.needsProfile) w.contexte = (C ? C + '\n\n' : '') + 'Mon parcours (expériences, diplômes, compétences) : [à compléter]\nLe poste ou l’offre visé(e) : [à compléter]';
    else if (C) w.contexte = C;
    if (C) w.contexte += '\nPour chaque [À PRÉCISER] : si l’information te manque pour bien répondre, pose-moi la question ; sinon, annonce ton hypothèse.';
    // phrase d'origine, si la reformulation l'a modifiée
    const flat = (x) => norm(x).replace(/[^a-z0-9]/g, '');
    if (g.sentence && !flat(g.objectif).includes(flat(stripPrefix(g.sentence.replace(/[’`]/g, "'").trim().replace(/[.!?…]+$/, ''))))) w.objectif += `\nMa demande telle que je l’ai écrite : « ${g.sentence.replace(/\s+/g, ' ')} »`;
    return w;
  }
  const build = (g, ctx) => PS.buildPrompt(toWizard(g, ctx), 'complet');

  // ---------- Contexte d'un projet ----------
  const STOP = new Set('avec dans pour plus moins tout tous toutes toute faire fais fait comme mais donc alors cette celui celle ceux elles elle nous vous leur leurs mon mes notre nos votre vos sont etre avoir quoi quel quelle quels quelles aussi tres bien encore deja entre sans sous chez vers depuis pendant apres avant ajoute ajouter cree creer ecris ecrire veux voudrais besoin aide aider peux pourrais merci prompt projet fichier fichiers chose choses partie page mettre donne donner'.split(' '));
  const keywords = (s) => Array.from(new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w)))).map((w) => w.slice(0, Math.min(w.length, 7)));
  const fmtN = (x) => x.toLocaleString('fr-CH').replace(/[\u202f\u00a0’']/g, ' ');
  function ctxItems(p) {
    const list = p.prompts.filter((x) => !x.gen).map((x) => {
      const v0 = x.versions && x.versions[0];
      const m = v0 && /Importé depuis « (.+) »/.exec(v0.note || '');
      const label = x.src ? (p.srcRoot ? p.srcRoot + '/' + x.src : x.src) : m ? m[1] : x.title;
      return { id: x.id, label, file: !!(x.src || m), tags: x.tags || [], content: x.content || '', updatedAt: x.updatedAt };
    });
    // dossier racine commun (ex. « coach-killian/ ») retiré des noms pour qu'ils restent lisibles
    const files = list.filter((x) => x.file);
    const top = files.length > 1 && /^[^/]+\//.test(files[0].label) ? files[0].label.split('/')[0] + '/' : '';
    if (top && files.every((x) => x.label.startsWith(top))) files.forEach((x) => { x.label = x.label.slice(top.length); });
    list.root = top ? top.slice(0, -1) : '';
    return list;
  }
  const normCache = new Map();
  const normBody = (it) => { const c = normCache.get(it.id); if (c && c.src === it.content) return c.n; const n = norm(it.content); normCache.set(it.id, { src: it.content, n }); if (normCache.size > 800) normCache.delete(normCache.keys().next().value); return n; };
  function relevance(items, sentence) {
    const kws = keywords(sentence);
    return items.map((it) => {
      if (!kws.length) return Object.assign({ score: 0 }, it);
      const lab = norm(it.label + ' ' + it.tags.join(' ')), body = normBody(it);
      let s = 0;
      kws.forEach((k) => { if (lab.includes(k)) s += 4; let c = 0, i = body.indexOf(k); while (i >= 0 && c < 5) { c++; i = body.indexOf(k, i + k.length); } s += c; });
      return Object.assign({ score: s }, it);
    });
  }
  const DEFAULT_BUDGET = 15000;
  // Extraits autour des mots-clés (pour les longs fichiers) : début du fichier + fenêtres fusionnées
  function snippets(content, kws, room, id) {
    const lc = id ? normBody({ id, content }) : norm(content);
    if (lc.length !== content.length || !kws.length) return null;
    const hits = [];
    kws.forEach((k, ki) => { let i = lc.indexOf(k), c = 0; while (i >= 0 && c < 40) { hits.push([i, ki]); c++; i = lc.indexOf(k, i + k.length); } });
    if (!hits.length) return null;
    const W = Math.max(250, Math.min(900, Math.floor(room / 6)));
    const head = Math.min(300, Math.floor(room / 10));
    // densité : nombre de mots-clés différents autour de chaque occurrence
    const ranked = hits.map(([q]) => [q, new Set(hits.filter(([r]) => Math.abs(r - q) <= W).map(([, k]) => k)).size]).sort((x, y) => y[1] - x[1] || x[0] - y[0]);
    const picked = [[0, head]]; let budget = room - head;
    for (const [q] of ranked) {
      if (budget < 200) break;
      if (picked.some(([a, z]) => q >= a && q <= z)) continue;
      const st = Math.max(0, content.lastIndexOf('\n', Math.max(0, q - W)) + 1), en = Math.min(content.length, (content.indexOf('\n', q + W) + 1 || content.length));
      picked.push([st, en]); budget -= en - st + 20;
    }
    picked.sort((x, y) => x[0] - y[0]);
    const wins = [];
    picked.forEach(([st, en]) => { const last = wins[wins.length - 1]; if (last && st <= last[1] + 40) last[1] = Math.max(last[1], en); else wins.push([st, en]); });
    let out = '', used = 0;
    for (const [st, en] of wins) {
      const sep = st > 0 ? `\n[… ligne ${content.slice(0, st).split('\n').length} …]\n` : '';
      const piece = content.slice(st, en);
      if (used + sep.length + piece.length > room) { const r = room - used - sep.length; if (r > 200) { out += sep + piece.slice(0, r); used = room; } break; }
      out += sep + piece; used += sep.length + piece.length;
    }
    return out;
  }
  // Construit la section « Contexte du projet » avec une limite de taille
  function projectContext(p, sentence, opt = {}) {
    const budget = Math.max(2000, +opt.budget || DEFAULT_BUDGET);
    const raw = ctxItems(p);
    const items = relevance(raw, sentence);
    const kws = keywords(sentence);
    const gens = p.prompts.filter((x) => x.gen);
    const H = [`Projet : ${p.name}`];
    if (p.description && p.description.trim()) H.push(`Description : ${p.description.trim()}`);
    if (p.status && p.status.trim()) H.push(`Où j’en suis : ${p.status.trim()}`);
    if (p.notes && p.notes.trim()) { const nt = p.notes.trim(); H.push(`Notes du projet :\n"""\n${nt.length > 2000 ? nt.slice(0, 2000) + '\n[… notes tronquées]' : nt}\n"""`); }
    const all = items.concat(gens.map((x) => ({ id: x.id, label: x.title, gen: true, tags: [] })));
    if (all.length) {
      const L = all.slice(0, 60).map((it) => `- ${it.gen ? '(prompt déjà créé) ' : ''}${it.label}${it.tags && it.tags.length ? ' [' + it.tags.join(', ') + ']' : ''}`);
      if (all.length > 60) L.push(`- … et ${all.length - 60} autres`);
      H.push(`Fichiers et prompts du projet (${all.length})${raw.root ? ` — dossier importé « ${raw.root} »` : ''} :\n${L.join('\n')}`);
    }
    const head = H.join('\n');
    // Choix des contenus
    const manual = opt.mode === 'manual' && Array.isArray(opt.ids);
    const byScore = items.slice().sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);
    let chosen, excerpt = false;
    if (manual) chosen = byScore.filter((it) => opt.ids.includes(it.id));
    else {
      chosen = byScore.filter((it) => it.score > 0);
      if (!chosen.length) { excerpt = true; chosen = byScore.slice().sort((a, b) => (/readme|index|main|plan|todo|notes?|cahier/i.test(b.label) ? 1 : 0) - (/readme|index|main|plan|todo|notes?|cahier/i.test(a.label) ? 1 : 0)); }
    }
    chosen = chosen.filter((it) => it.content.trim());
    let left = budget - head.length - 200;
    const used = [], blocks = [];
    let skipped = 0, truncated = 0;
    const per = excerpt ? 600 : chosen.length <= 1 ? left : Math.max(1500, Math.floor(left * 0.6));
    for (const it of chosen) {
      if (left < 400) { skipped++; continue; }
      const room = Math.min(per, left - 80);
      const c = it.content.trim();
      let part = c, how = '';
      if (c.length > room) { const sn = !excerpt && snippets(it.content, kws, room, it.id); if (sn) { part = sn; how = 'passages qui contiennent les mots de ta demande'; } else { part = c.slice(0, room); how = 'début du fichier'; } }
      const cut = part.length < c.length;
      if (cut) truncated++;
      const b = `--- ${it.file ? 'FICHIER' : 'PROMPT'} : ${it.label} ---\n${part}${cut ? `\n[… extrait (${how}) : ${fmtN(part.length)} caractères sur ${fmtN(c.length)}]` : ''}\n--- FIN ---`;
      blocks.push(b); left -= b.length + 2;
      used.push({ id: it.id, label: it.label, chars: part.length, total: c.length, cut, score: it.score });
    }
    let text = head;
    if (blocks.length) text += `\n\n${excerpt ? 'Extraits des fichiers (aucun ne correspond directement à la demande) :' : 'Contenu des fichiers utiles pour cette demande :'}\n${blocks.join('\n\n')}`;
    const partial = truncated || skipped || (!manual && !excerpt && items.length > used.length);
    if (partial) text += `\n\nNote : contexte partiel (limite de ${fmtN(budget)} caractères)${skipped ? ` : ${skipped} fichier${skipped > 1 ? 's' : ''} non inclus faute de place` : ''}${truncated ? `${skipped ? ',' : ' :'} ${truncated} extrait${truncated > 1 ? 's' : ''} tronqué${truncated > 1 ? 's' : ''}` : ''}. Les autres fichiers ne sont listés que par leur nom : demande-moi leur contenu si tu en as besoin.`;
    return { text, used, items: byScore, skipped, truncated, partial: !!partial, excerpt, budget, chars: text.length, manual };
  }

  // ---------- Version IA (facultative, avec la clé de l'utilisateur) ----------
  const aiMeta = (g, local, target) => `Transforme la demande ci-dessous (écrite en une seule phrase) en un prompt complet, prêt à coller dans ${PS.TARGETS[target || 'claude'] || 'Claude'}.
- Langue du prompt : français${g.lang !== 'français' ? ` (la réponse devra être en ${g.lang})` : ''}.
- Suis la méthode ASPECCT et la méthode en 4 étapes décrites dans tes consignes ; garde seulement les blocs de fiabilité utiles.
- Déduis le meilleur rôle expert, le public, le ton, le format et la longueur. Les réglages devinés ci-dessous sont un point de départ : améliore-les si besoin.
- N’invente aucun fait sur l’utilisateur : écris [à compléter] pour ce qu’il doit fournir.
- Réponds uniquement avec le prompt, entre <prompt> et </prompt>.

Réglages devinés : rôle = ${g.role} ; public = ${g.audience}${g.niveau ? ' (' + g.niveau + ')' : ''} ; ton = ${g.ton.join(', ')} ; format = ${PS.FORMAT_LABELS[g.format] || g.format} ; longueur = ${PS.LENGTH_LABELS[g.longueur] || g.longueur}.

Version construite automatiquement (à dépasser) :
"""
${local}
"""

DEMANDE
"""
${g.sentence}
"""`;

  // ---------- Puces « Ce que j'ai deviné » ----------
  const NIVEAUX = [['', 'Non précisé'], ['debutant', 'Débutant'], ['intermediaire', 'Intermédiaire'], ['expert', 'Expert']];
  const BLOCK_CHIPS = [['reflexion', 'Réflexion préalable'], ['tags', 'Niveaux de confiance'], ['etapes', 'Étapes une à une'], ['risques', 'Tableau des risques'], ['verif', 'Vérification finale'], ['profil', 'Profil fixe']];
  function guessHtml(g) {
    const opt = (list, cur) => { const L = list.slice(); if (!L.some(([v]) => v === cur)) L.unshift([cur, cur]); return L.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join(''); };
    const roles = Array.from(new Set(DOMAINS.map((d) => d.role)));
    const sel = (k, label, html) => `<label class="gchip${k === 'role' ? ' wide' : ''}"><span>${label}</span><select data-ov="${k}">${html}</select></label>`;
    const prof = (PS.state.settings.profil || '').trim();
    return `<div class="gchips">
      ${sel('domain', 'Domaine', opt(DOMAINS.map((d) => [d.id, d.label]), g.domain))}
      ${sel('role', 'Rôle', opt(roles.map((r) => [r, cap(r.replace(/^un |^une /, ''))]), g.role))}
      ${sel('niveau', 'Niveau', opt(NIVEAUX, g.niveau))}
      ${sel('ton', 'Ton', opt(TONES.map((t) => [t, cap(t)]), g.ton[0] || 'simple'))}
      ${sel('format', 'Format', opt(Object.entries(PS.FORMAT_LABELS), g.format))}
      ${sel('longueur', 'Longueur', opt(Object.entries(PS.LENGTH_LABELS).filter(([v]) => v !== 'perso' || g.longueur === 'perso'), g.longueur))}
      ${sel('lang', 'Langue', opt(Object.values(LANGS).map((l) => [l, cap(l)]), g.lang))}
    </div>
    <div class="gchips gblocks" role="group" aria-label="Blocs inclus">${BLOCK_CHIPS.filter(([k]) => k !== 'profil' || prof).map(([k, l]) => `<button type="button" class="chip" data-blk="${k}" aria-pressed="${!!g.blocks[k]}">${g.blocks[k] ? icon('check', 'sm') : icon('plus', 'sm')}${l}</button>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0"><b>Public :</b> ${esc(g.audience)}</p>`;
  }
  // Applique un changement de puce sur ov
  function applyChip(ov, el, g) {
    if (el.dataset.ov) {
      const k = el.dataset.ov, v = el.value;
      if (k === 'domain') { Object.keys(ov).forEach((x) => delete ov[x]); ov.domain = v; return; }
      ov[k] = v;
    } else if (el.dataset.blk) { ov.blocks = Object.assign({}, ov.blocks, { [el.dataset.blk]: !g.blocks[el.dataset.blk] }); }
  }
  const guessSummary = (g) => `Rôle : ${cap(g.role.replace(/^un |^une /, '').split(',')[0])} · Ton : ${g.ton.join(', ')} · Format : ${(PS.FORMAT_LABELS[g.format] || g.format).toLowerCase()}`;

  const titleOf = (s) => { const t = String(s).replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, ''); return cap(t.length > 60 ? t.slice(0, 57).replace(/\s+\S*$/, '') + '…' : t); };

  // ================= VUE « UNE PHRASE » =================
  const EXAMPLES = ['Un mail pour relancer un client qui n’a pas payé sa facture', 'Explique-moi les intérêts composés simplement', 'Un programme de musculation de 4 semaines pour débutant, sans matériel'];
  V.rapide = (root) => {
    const st = PS.state;
    const D = st.drafts.phrase = Object.assign({ text: '', ov: {}, ans: {}, mode: null, shown: false, ver: 'local' }, st.drafts.phrase || {});
    if (!D.ans) D.ans = {};
    const M = PS.method;
    const tgt = () => PS.currentTarget();
    let ia = null; // { for: texte local, text } — non conservé
    root.innerHTML = `
      <section class="qp">
        <span class="eyebrow">${icon('bolt', 'sm')} Une phrase</span>
        <h1 class="qp-title">Décris ton besoin en une phrase</h1>
        <p class="qp-lead">Le site devine le rôle, le ton, le format et les règles, puis construit le prompt complet. Tout se fait sur ton appareil.</p>
        <form class="card qp-form" id="qpForm" autocomplete="off">
          <label class="sr" for="qpText">Ta demande, en une phrase</label>
          <textarea id="qpText" rows="2" enterkeyhint="go" placeholder="Décris ce que tu veux en une phrase…">${esc(D.text)}</textarea>
          <div class="qp-foot">
            <div class="qp-ex" aria-label="Exemples de phrases">${EXAMPLES.map((e) => `<button type="button" class="ex" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div>
            <button class="btn primary lg" type="submit" id="qpGo">${icon('bolt', 'sm')}Créer mon prompt</button>
          </div>
        </form>
      </section>
      <div id="qpOut"></div>`;
    const ta = $('#qpText', root), out = $('#qpOut', root);
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(220, ta.scrollHeight + 2) + 'px'; };
    ta.addEventListener('input', () => { D.text = ta.value; grow(); PS.saveSoon(); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } });
    $('#qpForm', root).addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) { ta.value = b.dataset.ex; D.text = ta.value; grow(); submit(); } });
    function submit() {
      const t = ta.value.trim();
      if (!t) { ta.focus(); return PS.toast('Écris d’abord ta demande en une phrase.', 'info'); }
      D.text = t; D.ov = {}; D.ans = {}; D.mode = null; D.shown = true; D.ver = 'local'; ia = null; PS.save();
      render(true);
    }
    const run = () => M.phrasePipeline(D.text, { ov: D.ov, mode: D.mode || undefined, answers: D.ans, target: tgt() });
    const local = () => run().prompt;
    const current = () => (D.ver === 'ia' && ia && ia.for === local() ? ia.text : local());
    function render(scroll) {
      root.classList.toggle('qp-done', !!(D.shown && D.text.trim()));
      if (!D.shown || !D.text.trim()) { out.innerHTML = ''; return; }
      const R = run(), g = R.g, txt = D.ver === 'ia' && ia && ia.for === R.prompt ? ia.text : R.prompt;
      const hasKey = !!PS.getKey(), T = tgt();
      out.innerHTML = `<section class="card qp-res" aria-labelledby="qpResT">
        <div class="row qp-res-head"><h2 id="qpResT">Ton prompt est prêt</h2><span class="spacer"></span><span class="counter">${PS.words(txt)} mots</span></div>
        ${M.progressHtml(4)}
        <div class="o4-opts">${M.modeHtml(R.mode, R.auto, 'qpMode')}<div class="tgrow"><span class="tiny muted" id="qpTgL">Pour :</span>${M.targetHtml(T, 'qpTarget')}</div></div>
        ${M.questionsHtml(R.qs, R.answers)}
        ${hasKey ? `<div class="seg" role="group" aria-label="Version du prompt" style="margin-bottom:12px"><button type="button" data-ver="local" aria-pressed="${D.ver !== 'ia'}">Version locale</button><button type="button" data-ver="ia" aria-pressed="${D.ver === 'ia'}">${icon('sparkle', 'sm')} Version IA</button></div>` : ''}
        <div class="qp-actions">
          <button class="btn primary lg" type="button" id="qpCopy">${icon('copy')}Copier</button>
          ${T === 'claude' ? `<button class="btn lg" type="button" id="qpClaude">${icon('external')}Ouvrir dans Claude</button>` : ''}
          <button class="btn lg" type="button" id="qpSave">${icon('save')}Enregistrer dans un projet</button>
        </div>
        <div id="qpIA"></div>
        <pre class="prompt-box qp-prompt" id="qpPrompt" tabindex="0" aria-label="Prompt généré">${PS.highlight(txt)}</pre>
        ${M.notesHtml(R.notes, D.notesOpen)}
        <p class="tiny muted privacy">${icon('shield', 'sm')} ${esc(M.PRIVACY)}</p>
        <details class="more qp-guess" id="qpGuess" ${D.open ? 'open' : ''}><summary>${icon('wand', 'sm')} Ce que j’ai deviné <span class="qp-sum">${esc(guessSummary(g))}</span></summary>
          <div class="qp-guess-body">${guessHtml(g)}
          <p class="tiny muted" style="margin:10px 0 0">Déduit automatiquement à partir des mots de ta phrase (règles fixes, pas d’IA). Change une puce : le prompt se met à jour tout de suite.</p>
          <div class="btn-row" style="margin-top:12px"><button class="btn sm" type="button" id="qpWiz">${icon('edit', 'sm')}Ajuster en détail</button><button class="btn sm ghost" type="button" id="qpEd">${icon('gauge', 'sm')}Vérifier dans l’éditeur</button>${Object.keys(D.ov).length ? `<button class="btn sm ghost" type="button" id="qpReset">${icon('history', 'sm')}Revenir aux suppositions</button>` : ''}</div></div>
        </details>
      </section>`;
      $('#qpGuess', out).addEventListener('toggle', (e) => { D.open = e.target.open; });
      $('#qpCopy', out).onclick = () => PS.copyPrompt(current(), T === 'claude' ? 'Prompt copié' : `Prompt copié : colle-le dans ${PS.TARGETS[T]}`);
      const oc = $('#qpClaude', out); if (oc) oc.onclick = () => PS.openClaude(current());
      $('.n4', out).addEventListener('toggle', (e) => { D.notesOpen = e.target.open; });
      $('#qpSave', out).onclick = () => PS.saveToProject(current(), { title: titleOf(D.text), note: 'Créé en une phrase', gen: { phrase: D.text } });
      $('#qpWiz', out).onclick = () => toWizardView(g);
      $('#qpEd', out).onclick = () => PS.openInEditor(current());
      const rs = $('#qpReset', out); if (rs) rs.onclick = () => { D.ov = {}; render(); };
      out.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => { if (b.dataset.ver === 'ia') runIA(g); else { D.ver = 'local'; render(); } }));
      if (scroll) setTimeout(() => out.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
      PS.saveSoon();
    }
    out.addEventListener('change', (e) => { if (e.target.dataset.ov) { applyChip(D.ov, e.target); D.ver = 'local'; render(); const s = $(`[data-ov="${e.target.dataset.ov}"]`, out); if (s) s.focus(); } });
    out.addEventListener('click', (e) => {
      const m4 = e.target.closest('[data-mode4]'), tg = e.target.closest('[data-target]'), q = e.target.closest('[data-q]');
      if (m4 || tg || q) {
        if (m4) D.mode = m4.dataset.mode4;
        if (tg) { PS.state.settings.target = tg.dataset.target; }
        if (q) D.ans = Object.assign({}, D.ans, { [q.dataset.q]: q.dataset.qv });
        D.ver = 'local'; render(); PS.save();
        const sel = m4 ? `[data-mode4="${m4.dataset.mode4}"]` : tg ? `[data-target="${tg.dataset.target}"]` : `[data-q="${q.dataset.q}"][data-qv="${CSS.escape(q.dataset.qv)}"]`;
        const nb = $(sel, out); if (nb) nb.focus();
        return;
      }
      const b = e.target.closest('[data-blk]'); if (b) { applyChip(D.ov, b, run().g); D.ver = 'local'; render(); const n = $(`[data-blk="${b.dataset.blk}"]`, out); if (n) n.focus(); } });
    async function runIA(g) {
      const loc = local();
      if (ia && ia.for === loc) { D.ver = 'ia'; render(); return; }
      const box = $('#qpIA', out); const ctrl = new AbortController();
      box.innerHTML = `<div class="notice" style="margin:12px 0 0">${icon('sparkle')}<p><b>Claude prépare une version améliorée…</b> Ta phrase est envoyée à l’API Anthropic avec ta clé. <button class="btn sm ghost" type="button" id="qpIAStop">Annuler</button></p></div>`;
      $('#qpIAStop', box).onclick = () => ctrl.abort();
      try {
        const res = await PS.callClaude(aiMeta(g, loc, tgt()), { signal: ctrl.signal, system: M.systemFor(tgt()) });
        const m = res.match(/<prompt>\s*([\s\S]*?)\s*<\/prompt>/i);
        ia = { for: loc, text: (m ? m[1] : res).trim() }; D.ver = 'ia'; render();
        $('#qpIA', out).innerHTML = `<p class="tiny muted" style="margin:10px 0 0">Version proposée par Claude (${esc(PS.state.settings.model)}). Relis-la : elle peut changer une intention. La version locale reste disponible.</p>`;
      } catch (err) {
        box.innerHTML = err.name === 'AbortError' ? '' : `<div class="notice warn" style="margin:12px 0 0">${icon('alert')}<p><b>La version IA n’a pas abouti.</b> ${esc(err.message)} La version locale reste utilisable.</p></div>`;
      }
    }
    grow();
    render(!!D.fromHome);
    if (D.fromHome) { delete D.fromHome; }
    if (!D.shown && matchMedia('(min-width: 861px)').matches) ta.focus({ preventScroll: true });
  };

  async function toWizardView(g, ctx) {
    const st = PS.state;
    const cur = st.drafts.wizard && st.drafts.wizard.w;
    if (cur && cur.objectif && cur.objectif.trim()) {
      const ok = await PS.confirmDialog({ title: 'Remplacer le brouillon de l’assistant ?', text: 'L’assistant détaillé contient déjà des réponses. Elles seront remplacées par ce prompt. Tes projets ne sont pas touchés.', ok: 'Remplacer' });
      if (!ok) return;
    }
    st.drafts.wizard = { w: toWizard(g, ctx), step: 0, mode: 'complet' };
    PS.save(); PS.toast('Prompt ouvert dans l’assistant détaillé : tout est modifiable', 'edit');
    location.hash = '#/generateur';
  }

  // Formulaire d'accueil : envoie la phrase vers le mode rapide
  PS.startPhrase = (text) => {
    PS.state.drafts.phrase = { text: String(text || '').trim(), ov: {}, shown: !!String(text || '').trim(), ver: 'local', fromHome: true };
    PS.save();
    if (location.hash === '#/rapide') PS.route(); else location.hash = '#/rapide';
  };

  // ================= AJOUT RAPIDE DANS UN PROJET =================
  // Renvoie le HTML de la carte ; bind() branche les événements
  function quickAddHtml(p) {
    return `<section class="card qa" id="qaCard" aria-labelledby="qaT">
      <div class="qa-head"><h2 id="qaT" class="qa-title">${icon('bolt', 'sm')} Nouveau prompt en une phrase</h2><span class="tiny muted hide-sm">Le prompt connaîtra ce projet.</span></div>
      <form class="qa-row" id="qaForm" autocomplete="off"><label class="sr" for="qaText">Ta demande pour ce projet, en une phrase</label>
        <textarea id="qaText" rows="1" enterkeyhint="go" placeholder="Décris ce que tu veux en une phrase…"></textarea>
        <button class="btn primary" type="submit" id="qaGo">${icon('bolt', 'sm')}Créer</button></form>
      <div class="qa-meta"><span id="qaCtx" aria-live="polite"></span><button class="btn sm ghost" type="button" id="qaPick">${icon('layers', 'sm')}Choisir les fichiers</button></div>
      <div class="qa-status"><label class="lbl" for="qaStatus">Où j’en suis <span class="muted">(facultatif, ajouté au contexte)</span></label><input id="qaStatus" type="text" maxlength="300" value="${esc(p.status || '')}" placeholder="En une ligne : ce qui est fait, ce qui reste"></div>
    </section>`;
  }
  function bindQuickAdd(root, p, onAdded) {
    const ta = $('#qaText', root);
    p.ctx = Object.assign({ mode: 'auto', ids: [], budget: DEFAULT_BUDGET }, p.ctx || {});
    PS.resync.cleanCtx(p); // fichiers retirés (mise à jour depuis le dossier, suppression) : plus dans la sélection
    const line = () => {
      const c = projectContext(p, ta.value, p.ctx);
      const n = c.used.length, nf = c.items.length;
      $('#qaCtx', root).innerHTML = nf
        ? `${icon('file', 'sm')} Contexte inclus : <b>${n} fichier${n > 1 ? 's' : ''}</b> sur ${nf}${c.excerpt && n ? ' (extraits)' : ''} · ≈ ${fmtN(c.chars)} caractères${c.partial ? ' · <span class="tag warn">partiel</span>' : ''}${p.ctx.mode === 'manual' ? ' · <span class="tag">ta sélection</span>' : ''}`
        : `${icon('file', 'sm')} Contexte inclus : nom, description${p.status ? ', où j’en suis' : ''}${p.notes ? ', notes' : ''}`;
      return c;
    };
    const lineSoon = PS.debounce(line, 200);
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(160, ta.scrollHeight + 2) + 'px'; lineSoon(); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); } });
    $('#qaForm', root).addEventListener('submit', (e) => { e.preventDefault(); go(); });
    $('#qaStatus', root).addEventListener('input', (e) => { p.status = e.target.value; p.updatedAt = Date.now(); PS.saveSoon(); lineSoon(); });
    $('#qaPick', root).onclick = () => pickFiles(p, ta.value, line);
    function go() {
      const t = ta.value.trim();
      if (!t) { ta.focus(); return PS.toast('Écris d’abord ta demande en une phrase.', 'info'); }
      const c = projectContext(p, t, p.ctx);
      const hint = [p.name, p.description, p.status, c.items.map((x) => x.label).join(' ')].join(' ');
      const g = infer(t, {}, { hintText: hint });
      const content = build(g, c);
      const pr = PS.newPrompt(p, { title: titleOf(t), content, tags: ['une phrase'], note: `Créé en une phrase : « ${t} »`, gen: { phrase: t, files: c.used.map((u) => u.label) } });
      ta.value = ''; ta.style.height = ''; line();
      PS.toast(`Prompt ajouté au projet${c.used.length ? ` avec ${c.used.length} fichier${c.used.length > 1 ? 's' : ''} en contexte` : ''}`, 'check', 3200);
      onAdded(pr);
    }
    line();
  }
  function pickFiles(p, sentence, after) {
    const c0 = projectContext(p, sentence, p.ctx);
    const usedIds = new Set(c0.used.map((u) => u.id));
    const items = c0.items;
    if (!items.length) return PS.toast('Ce projet n’a pas encore de fichiers ou de prompts à inclure.', 'info');
    const budgets = [5000, 15000, 30000, 60000];
    PS.modal({ title: 'Contexte du projet', wide: true,
      body: `<p class="small muted" style="margin-top:-6px">Le nom, la description, « Où j’en suis », les notes et la liste des fichiers sont toujours inclus. Ici, tu choisis quels contenus de fichiers Claude reçoit.</p>
        <div class="row" style="margin-bottom:10px;gap:10px 16px"><div class="seg" role="group" aria-label="Mode de sélection"><button type="button" data-cm="auto" aria-pressed="${p.ctx.mode !== 'manual'}">Automatique</button><button type="button" data-cm="manual" aria-pressed="${p.ctx.mode === 'manual'}">Ma sélection</button></div>
          <span class="row" style="gap:8px;flex-wrap:nowrap"><label class="small" for="cxBudget" style="white-space:nowrap">Taille maximale</label><select id="cxBudget" style="width:auto;padding:6px 10px">${budgets.map((b) => `<option value="${b}" ${b === +p.ctx.budget ? 'selected' : ''}>${fmtN(b)} caractères</option>`).join('')}</select></span></div>
        <p class="tiny muted" id="cxMode" style="margin:0 0 8px"></p>
        <div class="row" style="margin-bottom:8px"><button class="btn sm" type="button" id="cxAll">Tout cocher</button><button class="btn sm ghost" type="button" id="cxNone">Tout décocher</button><span class="spacer"></span><span class="small" id="cxSum"></span></div>
        <ul class="imp-list" id="cxList">${items.map((it) => `<li><label><input type="checkbox" data-cx="${it.id}" ${usedIds.has(it.id) ? 'checked' : ''}><span class="imp-name"><b>${esc(it.label)}</b><span>${fmtN(it.content.length)} caractères${it.score > 0 ? ' · contient des mots de ta phrase' : ''}</span></span>${it.score > 0 ? '<span class="tag accent">pertinent</span>' : ''}</label></li>`).join('')}</ul>`,
      foot: `<button class="btn primary" type="button" data-close>Terminé</button>`,
      onMount: (c) => {
        const upd = () => {
          const r = projectContext(p, sentence, p.ctx);
          const ids = new Set(r.used.map((u) => u.id));
          if (p.ctx.mode !== 'manual') $$('[data-cx]', c).forEach((x) => (x.checked = ids.has(x.dataset.cx)));
          $$('[data-cm]', c).forEach((b) => b.setAttribute('aria-pressed', b.dataset.cm === (p.ctx.mode === 'manual' ? 'manual' : 'auto')));
          $('#cxMode', c).textContent = p.ctx.mode === 'manual' ? 'Ma sélection : seuls les fichiers cochés sont envoyés (dans la limite choisie).' : (sentence.trim() ? 'Automatique : les fichiers qui contiennent les mots de ta phrase, sinon de courts extraits.' : 'Automatique : écris ta phrase pour que le choix s’adapte. En attendant : de courts extraits.');
          $('#cxSum', c).innerHTML = `${r.used.length} inclus · ≈ ${fmtN(r.chars)} caractères${r.partial ? ' · <span class="tag warn">partiel</span>' : ''}`;
          PS.saveSoon(); after();
        };
        c.addEventListener('change', (e) => {
          if (e.target.dataset.cx) { const ids = $$('[data-cx]', c).filter((x) => x.checked).map((x) => x.dataset.cx); p.ctx.mode = 'manual'; p.ctx.ids = ids; upd(); }
          if (e.target.id === 'cxBudget') { p.ctx.budget = +e.target.value; upd(); }
        });
        c.addEventListener('click', (e) => {
          const b = e.target.closest('[data-cm]');
          if (b) { p.ctx.mode = b.dataset.cm; if (p.ctx.mode === 'manual') p.ctx.ids = $$('[data-cx]', c).filter((x) => x.checked).map((x) => x.dataset.cx); upd(); }
        });
        $('#cxAll', c).onclick = () => { p.ctx.mode = 'manual'; p.ctx.ids = items.map((x) => x.id); $$('[data-cx]', c).forEach((x) => (x.checked = true)); upd(); };
        $('#cxNone', c).onclick = () => { p.ctx.mode = 'manual'; p.ctx.ids = []; $$('[data-cx]', c).forEach((x) => (x.checked = false)); upd(); };
        upd();
      } });
  }

  PS.phrase = { DOMAINS, infer, build, toWizard, reform, hints, projectContext, keywords, quickAddHtml, bindQuickAdd, titleOf, aiMeta, DEFAULT_BUDGET };
})();
