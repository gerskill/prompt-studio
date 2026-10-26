/* Prompt Studio — personnalisation du mode « Une phrase ».
   Extrait de la phrase : livrable, sujet, éléments demandés, entités (actifs, outils, plateformes, technos,
   publics, quantités, durées, formats, langues, lieux), verbes d'objectif et qualificatifs.
   Puis adapte chaque section ASPECCT (persona, action, étapes, exemples, contexte, règles, modèle).
   Règles fixes, aucune IA, aucun chiffre inventé. */
(function () {
  'use strict';
  const Q = '[À PRÉCISER]';
  const norm = (s) => String(s || '').toLowerCase().replace(/[’`]/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const has = (n, re) => new RegExp('(?:^|[^a-z0-9])(?:' + re + ')(?![a-z0-9])').test(n);
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const uniq = (a) => Array.from(new Set(a.filter(Boolean)));
  const listFr = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1];
  const CHECK = (x) => `Relis ta réponse avant de l’envoyer : ${x} ; corrige ce qui manque`;

  // ---------- 1. Orthographe : accents, pluriels après déterminant, noms propres ----------
  const ACC = { resultat: 'résultat', resultats: 'résultats', donnee: 'donnée', donnees: 'données', strategie: 'stratégie', strategies: 'stratégies', stretagie: 'stratégie', stratgie: 'stratégie', creer: 'créer', cree: 'crée', 'cree-moi': 'crée-moi', reseau: 'réseau', reseaux: 'réseaux', experience: 'expérience', evenement: 'événement', evenements: 'événements', reservation: 'réservation', reservations: 'réservations', galerie: 'galerie', debutant: 'débutant', debutants: 'débutants', detaille: 'détaillé', detaillee: 'détaillée', telephone: 'téléphone', methode: 'méthode', periode: 'période', securite: 'sécurité', equipe: 'équipe', element: 'élément', elements: 'éléments', precis: 'précis', parametres: 'paramètres', parametre: 'paramètre', systeme: 'système', ecran: 'écran', ecrans: 'écrans', categorie: 'catégorie', categories: 'catégories', depenses: 'dépenses', recettes: 'recettes', seance: 'séance', seances: 'séances', grafique: 'graphique', grafiques: 'graphiques', mtn: 'maintenant', stp: 's’il te plaît' };
  const PROPER = { tradingview: 'TradingView', 'pine script': 'Pine Script', pinescript: 'Pine Script', python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript', react: 'React', instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', facebook: 'Facebook', github: 'GitHub', excel: 'Excel', notion: 'Notion', shopify: 'Shopify', wordpress: 'WordPress', binance: 'Binance', ichimoku: 'Ichimoku', bitcoin: 'Bitcoin', xauusd: 'XAUUSD', ftmo: 'FTMO', 'grok bot': 'Grok Bot' };
  const PLUR_DET = new Set(['les', 'des', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'ces', 'plusieurs', 'quelques', 'certains', 'certaines']);
  const NO_PLUR = new Set(['plus', 'moins', 'tous', 'toutes', 'autres', 'memes', 'differents', 'differentes', 'nouveaux', 'nouvelles', 'meilleurs', 'meilleures', 'premiers', 'premieres', 'derniers', 'dernieres', 'grands', 'petits', 'gens', 'et', 'ou', 'aussi', 'mais', 'sur', 'de', 'du', 'en', 'a', 'pour', 'avec', 'dans', 'qui', 'que']);
  const STOP_COORD = new Set(['mais', 'sur', 'pour', 'avec', 'dans', 'qui', 'que', 'en', 'a', 'par', 'afin', 'sans', 'de', 'du']);
  function correct(raw) {
    let t = String(raw || '').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();
    const toks = t.split(/(\s+|[,;:!?.()]+)/);
    let plural = false, wait = false;
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (!w || /^\s+$/.test(w)) continue;
      if (/^[,;:!?.()]+$/.test(w)) { if (/[;:!?.()]/.test(w)) plural = false; continue; }
      const n = norm(w);
      let out = w;
      if (ACC[n] && n === w.toLowerCase()) out = /^[A-Z]/.test(w) ? cap(ACC[n]) : ACC[n];
      if (PLUR_DET.has(n)) { plural = n; wait = true; toks[i] = out; continue; }
      if (plural) {
        if (n === 'et' || n === 'ou') { wait = 'coord'; toks[i] = out; continue; }
        if (wait === 'coord' && !PLUR_DET.has(n) && !STOP_COORD.has(n) && plural !== true) { /* noop */ }
        if (STOP_COORD.has(n)) { plural = false; toks[i] = out; continue; }
        if (wait && /^[a-zà-ÿ-]{3,}$/i.test(out) && !NO_PLUR.has(n) && !/[sxz]$/i.test(out) && !/^[A-Z]/.test(out)) out = out + (/(eau|eu|au)$/.test(n) ? 'x' : 's');
        if (wait === 'coord' && /^[a-zà-ÿ-]{3,}$/i.test(out) && !NO_PLUR.has(n)) out = plural + ' ' + out;
        if (wait) wait = false;
      }
      toks[i] = out;
    }
    t = toks.join('');
    // Tournures maladroites fréquentes
    if (/\bvoir\b/i.test(t)) t = t.replace(/\s+mais aussi sur (les|le|la|l')\s*/i, ', et de les afficher sur $1 ').replace(/l' /, "l'");
    Object.entries(PROPER).forEach(([k, v]) => { t = t.replace(new RegExp('(^|[^\\p{L}0-9])' + k.replace(/ /g, '\\s?') + '(?![\\p{L}0-9])', 'giu'), (m, a) => a + v); });
    t = t.replace(/\s+([,.])/g, '$1').replace(/\s+'/g, "'");
    return t;
  }

  // ---------- 2. Extraction ----------
  const DICT = {
    assets: [['l\'or|or|xau\\w*|gold', 'l’or (XAUUSD)'], ['xag\\w*|silver', 'l’argent (XAGUSD)'], ['bitcoin|btc\\w*', 'Bitcoin (BTC)'], ['ethereum|eth\\w*', 'Ethereum (ETH)'], ['eur ?usd', 'EUR/USD'], ['nasdaq|nas100|us100', 'Nasdaq 100'], ['s&p|sp500|spx|us500', 'S&P 500'], ['dax|ger40', 'DAX'], ['petrole|wti|brent', 'pétrole'], ['forex', 'forex'], ['crypto\\w*', 'cryptomonnaies'], ['actions?', 'actions']],
    indics: [['ichimoku', 'Ichimoku'], ['rsi', 'RSI'], ['macd', 'MACD'], ['bollinger', 'bandes de Bollinger'], ['moyennes? mobiles?|ema|sma', 'moyennes mobiles'], ['atr', 'ATR'], ['vwap', 'VWAP'], ['supertrend', 'Supertrend'], ['fibonacci|fibo', 'Fibonacci']],
    platforms: [['tradingview', 'TradingView'], ['metatrader ?5|mt5', 'MetaTrader 5'], ['metatrader ?4|mt4', 'MetaTrader 4'], ['binance', 'Binance'], ['instagram|insta', 'Instagram'], ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['facebook', 'Facebook'], ['shopify', 'Shopify'], ['wordpress', 'WordPress'], ['wix', 'Wix'], ['notion', 'Notion'], ['excel', 'Excel'], ['google sheets?|sheets', 'Google Sheets'], ['stripe', 'Stripe'], ['paypal', 'PayPal'], ['twint', 'TWINT'], ['grok ?bot', 'Grok Bot'], ['discord', 'Discord'], ['telegram', 'Telegram']],
    hosts: [['github pages', 'GitHub Pages'], ['netlify', 'Netlify'], ['vercel', 'Vercel'], ['firebase', 'Firebase'], ['supabase', 'Supabase']],
    tech: [['python', 'Python'], ['javascript|js', 'JavaScript'], ['typescript|ts', 'TypeScript'], ['react', 'React'], ['vue(?:\\.?js)?', 'Vue'], ['next(?:\\.?js)?', 'Next.js'], ['node(?:\\.?js)?', 'Node.js'], ['php', 'PHP'], ['sql|sqlite|postgres\\w*|mysql', 'SQL'], ['html', 'HTML'], ['css|tailwind', 'CSS'], ['chart\\.?js', 'Chart.js'], ['pine ?script|pine', 'Pine Script v6'], ['docker', 'Docker'], ['swift', 'Swift'], ['kotlin', 'Kotlin'], ['flutter', 'Flutter']],
    formats: [['csv', 'CSV'], ['json', 'JSON'], ['pdf', 'PDF'], ['xlsx|tableur', 'tableur (Excel)'], ['markdown|md', 'Markdown']],
    devices: [['telephone|mobile|smartphone|iphone|android', 'téléphone'], ['tablette|ipad', 'tablette'], ['ordinateur|pc|mac|desktop', 'ordinateur']]
  };
  const QUAL = [['simple|simplifie', 'simple'], ['moderne', 'moderne'], ['rapide', 'rapide'], ['gratuit|gratuite|sans payer', 'gratuit'], ['responsive|adapte au mobile', 'adapté au téléphone'], ['sombre|dark ?mode|theme sombre|noir', 'thème sombre'], ['interactif|interactive|interactifs|interactives|cliquable', 'interactif'], ['minimaliste|epure|epuree', 'épuré'], ['elegant|elegante|chic|haut de gamme', 'élégant'], ['professionnel|professionnelle|pro', 'professionnel'], ['securise|securisee|mot de passe|prive|privee', 'accès protégé'], ['en temps reel|temps reel|live', 'en temps réel'], ['automatique|automatiquement|automatise', 'automatique'], ['detaille|detaillee|complet|complete', 'détaillé'], ['multilingue|bilingue', 'multilingue']];
  const GOALS = [['voir|visualiser|afficher|consulter|montrer|regarder', 'voir'], ['suivre|surveiller|monitorer|tracker', 'suivre'], ['comparer', 'comparer'], ['analyser|analyse', 'analyser'], ['vendre|acheter|commander', 'vendre'], ['reserver|prendre rendez-vous|prise de rendez-vous', 'réserver'], ['presenter|faire connaitre|vitrine', 'présenter'], ['gerer|organiser|planifier', 'gérer'], ['apprendre|reviser|comprendre', 'apprendre'], ['automatiser', 'automatiser'], ['partager', 'partager'], ['importer|telecharger|exporter', 'importer / exporter']];
  const pick = (n, L) => uniq(L.filter(([re]) => has(n, re)).map(([, l]) => l));

  // Éléments demandés (objets) : « voir les backtests et résultats mais aussi sur les graphiques »
  const LEADV = /^(?:(?:pouvoir|me|de|d')\s+)*(?:voir|visualiser|afficher|consulter|montrer|suivre|surveiller|gérer|gerer|comparer|analyser|présenter|presenter|vendre|réserver|reserver|partager|organiser|planifier|importer|exporter|calculer|créer|creer|noter|enregistrer|lister|trouver|regarder|avoir|mettre|parler|expliquer)\b\s*/i;
  const DET = /^(?:(?:aussi|également|egalement|ainsi|surtout|notamment|tous|toutes|sur|dans|de|du|des|d'|à|a|au|aux|les|le|la|l'|mes|mon|ma|nos|notre|ses|son|sa|leurs|leur|un|une|ces|ce|cette|en|par)(?:\s+|$))+/i;
  function subjectOf(t) {
    const m = t.match(/\b(?:qui (?:me |nous )?permet(?:te|tent)? de|qui (?:affiche|montre|présente|presente|sert à|sert a)|pour (?:pouvoir )?|afin de|sur le thème d[eu]|à propos d[eu]|au sujet d[eu]|sur (?:le|la|les|l')|de suivi d[eu']s?|avec)\s*(.{3,160})$/i);
    return m ? m[1].trim() : '';
  }
  function objectsOf(subject) {
    if (!subject) return [];
    let s = subject.replace(LEADV, '');
    const parts = s.split(/\s*(?:,|;|\bet\b|\bmais aussi\b|\bainsi que\b|\bavec\b|\bou\b|\bplus\b|\+)\s*/i);
    return uniq(parts.map((p) => p.replace(LEADV, '').replace(DET, '').replace(LEADV, '').replace(DET, '').replace(/\s+(?:pour|qui|afin|en ligne|sur mon|sur ma|de mon|de ma)\b.*$/i, '').trim())
      .filter((p) => p && p.split(/\s+/).length <= 5 && p.length >= 2 && !/^(?:moi|nous|toi|lui|ça|ca|cela|en)$/i.test(p))).slice(0, 6);
  }
  function extract(sentence) {
    const fixed = correct(sentence);
    const t = fixed.replace(/[.!?…]+$/, '');
    const n = norm(t);
    const subject = subjectOf(t);
    const E = {
      fixed, subject, objects: objectsOf(subject), n,
      assets: pick(n, DICT.assets).filter((a) => a !== 'actions' || has(n, 'actions? en bourse|bourse|trading')),
      indics: pick(n, DICT.indics), platforms: pick(n, DICT.platforms), hosts: pick(n, DICT.hosts), tech: pick(n, DICT.tech),
      formats: pick(n, DICT.formats), devices: pick(n, DICT.devices), qualifiers: pick(n, QUAL), goals: pick(n, GOALS),
      quantities: uniq((t.match(/\b\d+\s*(?:pages?|articles?|posts?|publications?|idées|idees|séances?|seances?|exercices?|produits?|questions?|mots|lignes|slides?|diapos?|paires|marchés|marches|actions|cryptos?|indices|semaines?|jours?|mois|minutes?|heures?|ans|euros?|€|chf|%|trades)\b/gi) || []).map((x) => x.replace(/\s+/g, ' '))),
      timeframes: uniq((n.match(/(?:^|[^a-z0-9])(m1|m5|m15|m30|h1|h4|d1|1 ?min|5 ?min|15 ?min|journalier|hebdo\w*)(?![a-z0-9])/g) || []).map((x) => x.trim().toUpperCase())),
      place: ((t.match(/(?:^|\s)(?:à|au|en)\s+((?:[A-ZÉÈ][\p{L}-]+)(?:[\s-][A-ZÉÈ][\p{L}-]+)?)/u) || [])[1] || '').replace(/^(TradingView|Instagram|TikTok|LinkedIn|YouTube|Facebook|GitHub|Excel|Python|Notion|Shopify|Pine|Grok)\b.*$/, ''),
      business: ((n.match(/(?:mon|ma|notre|une?|du|de la|pour (?:un|une|mon|ma))\s+(restaurant|pizzeria|boulangerie|cafe|bar|salon de coiffure|salon|cabinet|garage|hotel|gite|boutique(?! en ligne)|magasin|club|association|agence|entreprise|start-?up|studio|atelier|ecole|cours|coach\w*|photographe|artisan|plombier|electricien|menuisier|fleuriste|traiteur|food ?truck|camping)(?:\s+([a-z]+))?/) || []).slice(1).filter(Boolean)).join(' ')
    };
    const lm = n.match(/(?:^|[^a-z])en (anglais|allemand|espagnol|italien|portugais|francais)(?![a-z])/); if (lm) E.lang = lm[1];
    return E;
  }

  // ---------- 3. Bibliothèque d'objets (élément demandé → page, données, exemple) ----------
  // Chaque entrée : regex sur l'objet normalisé → description adaptée. t = sujet (trading…), E = entités.
  const OBJ = [
    [/backtests?/, (E, tr) => ({ page: 'Tableau des backtests', what: 'une ligne par test : stratégie, marché, unité de temps, période, nombre de trades, facteur de profit, drawdown maximal, avec tri et filtres', data: 'les résultats de chaque backtest (export ' + (E.platforms.includes('TradingView') || tr ? 'TradingView « Liste des trades » ou rapport de stratégie' : 'de l’outil de test') + ', en CSV ou JSON)', ex: 'Colonnes utiles du tableau des backtests (stratégie, marché, unité de temps, période, nombre de trades, facteur de profit, drawdown maximal)' })],
    [/resultats?|performances?|statistiques?|stats|kpi|chiffres?/, (E, tr) => ({ page: tr ? 'Synthèse des résultats' : 'Chiffres clés', what: tr ? 'cartes de chiffres clés par backtest (gain net, taux de réussite, drawdown maximal, facteur de profit) et courbe de capital' : 'cartes de chiffres clés et évolution dans le temps', data: tr ? 'la liste des trades de chaque test (date, sens, prix d’entrée et de sortie, résultat), d’où le site calcule les chiffres clés' : 'les valeurs à suivre et leur date', ex: tr ? 'Chiffres clés à calculer depuis la liste des trades (gain net, taux de réussite, drawdown maximal, courbe de capital)' : 'Cartes de chiffres clés (valeur actuelle, variation, période)' })],
    [/graphiques?|charts?|courbes?|chandeliers?/, (E, tr) => ({ page: tr ? 'Page graphique' : 'Graphiques', what: tr ? 'le prix en chandeliers avec chaque trade dessiné dessus (flèche d’entrée, flèche de sortie, niveaux de sortie), zoom et choix du backtest' : 'courbes et barres interactives, filtre par période', data: tr ? 'les bougies du marché testé (OHLC) sur la période, plus les trades à superposer' : 'les séries de valeurs à tracer', ex: tr ? 'Superposition sur le graphique (flèches d’entrée et de sortie, lignes de sortie prévues, infobulle avec le résultat du trade)' : 'Types de graphiques adaptés (courbe d’évolution, barres de comparaison, camembert de répartition)' })],
    [/trades?|positions?|ordres?/, () => ({ page: 'Journal des trades', what: 'liste filtrable : date, sens, prix d’entrée et de sortie, résultat, durée', data: 'la liste des trades', ex: 'Champs du journal des trades (date, sens, entrée, sortie, résultat, durée)' })],
    [/menus?|cartes? des plats|plats/, () => ({ page: 'Menu', what: 'plats par catégorie, prix, allergènes, photos', data: 'la carte (plats, prix, allergènes) que tu fournis', ex: 'Organisation du menu (entrées, plats, desserts, boissons ; prix ; allergènes)' })],
    [/reservations?|rendez-vous|rdv|reserver/, () => ({ page: 'Réservation en ligne', what: 'formulaire date, heure, nombre de personnes, coordonnées, message de confirmation', data: 'les créneaux disponibles et les réservations reçues', ex: 'Champs du formulaire de réservation (date, heure, nombre de personnes, téléphone, demande particulière)' })],
    [/galeries?|photos?|portfolio|realisations?/, () => ({ page: 'Galerie photos', what: 'grille d’images légères, agrandissement au clic', data: 'tes photos (format web, texte alternatif)', ex: 'Photos à prévoir (salle, plats, équipe, réalisations), compressées pour le web' })],
    [/contacts?|coordonnees|acces|horaires?|adresse/, (E) => ({ page: 'Contact et accès', what: `adresse${E.place ? ' à ' + E.place : ''}, carte, horaires, téléphone, formulaire`, data: 'tes coordonnées et horaires', ex: 'Infos pratiques (adresse, horaires, téléphone, plan d’accès)' })],
    [/produits?|catalogue|articles? en vente|boutique/, (E, tr, o) => ({ page: /catalogue de /.test(o) ? 'Catalogue des ' + o.replace(/^catalogue de /, '') : 'Catalogue produits', what: 'fiches produits (photo, prix, variantes, stock), recherche et filtres', data: 'la liste des produits (nom, prix, photos, stock)', ex: 'Contenu d’une fiche produit (photos, prix, variantes, stock, description courte)' })],
    [/paniers?|paiements?|commandes?/, (E) => ({ page: 'Panier et paiement', what: `panier, livraison, paiement${E.platforms.filter((p) => /Stripe|PayPal|TWINT|Shopify/.test(p)).length ? ' via ' + listFr(E.platforms.filter((p) => /Stripe|PayPal|TWINT|Shopify/.test(p))) : ''}, confirmation par e-mail`, data: 'les commandes et leur statut', ex: 'Étapes du tunnel d’achat (panier, livraison, paiement, confirmation)' })],
    [/ventes?|chiffre d'affaires|ca/, () => ({ page: 'Tableau des ventes', what: 'ventes par jour, semaine et mois, par produit, comparaison avec la période précédente', data: 'les ventes (date, produit, quantité, montant)', ex: 'Vues utiles sur les ventes (par période, par produit, comparaison avec la période précédente)' })],
    [/depenses?|budgets?|finances?|comptes?/, () => ({ page: 'Suivi du budget', what: 'dépenses par catégorie et par mois, solde, alertes de dépassement', data: 'les dépenses (date, montant, catégorie)', ex: 'Catégories de dépenses (logement, courses, transport, loisirs)' })],
    [/repas|calories|nutrition|recettes?/, () => ({ page: 'Journal des repas', what: 'ajout rapide d’un repas, totaux du jour et de la semaine', data: 'les repas saisis (date, aliment, quantité)', ex: 'Saisie d’un repas (moment, aliment, quantité, note)' })],
    [/vue d.ensemble|accueil/, (E) => ({ page: 'Vue d’ensemble', what: 'les chiffres clés en haut, la tendance de la période, les alertes', data: 'les indicateurs calculés à partir des données détaillées', ex: 'Contenu de la vue d’ensemble (3 à 5 chiffres clés, une courbe de tendance, un sélecteur de période)' })],
    [/historique/, () => ({ page: 'Historique', what: 'tout ce qui a été saisi, par jour et par semaine, avec recherche', data: 'les saisies passées (date, valeur)', ex: 'Vues de l’historique (jour, semaine, mois) et export CSV' })],
    [/reglages|parametres/, () => ({ page: 'Réglages', what: 'objectifs personnels, unités, sauvegarde et export des données', data: 'les préférences de l’utilisateur', ex: 'Réglages utiles (objectif personnel, unités, export ou sauvegarde des données)' })],
    [/taches?|todo|to-do/, () => ({ page: 'Liste de tâches', what: 'ajout, statut, échéance, priorité', data: 'les tâches (titre, statut, échéance)', ex: 'Champs d’une tâche (titre, échéance, priorité, statut)' })]
  ];
  function describe(obj, E, tr) {
    const n = norm(obj);
    for (const [re, f] of OBJ) if (re.test(n)) return Object.assign({ obj }, f(E, tr, obj));
    return { obj, page: 'Page « ' + cap(obj) + ' »', what: 'ce qu’il faut montrer sur « ' + obj + ' », les actions possibles', data: 'les données de « ' + obj + ' »', ex: 'Éléments à montrer pour « ' + obj + ' » (liste, détail, recherche)' };
  }

  // ---------- 4. Variantes du domaine web ----------
  function webKind(E, topic) {
    const n = E.n;
    if (has(n, 'vitrine|landing ?page|page d\'accueil|portfolio|site perso\\w*|presenter|presentation')) return 'vitrine';
    if (has(n, 'e-?commerce|boutique en ligne|vendre|panier|shop|magasin en ligne|paiement en ligne')) return 'shop';
    if (has(n, 'app|appli|application|outil|web ?app') && !has(n, 'dashboard|tableau de bord|backtests?') && topic !== 'trading') return 'app';
    if (topic === 'trading' || has(n, 'dashboard|tableau de bord|voir|visualiser|afficher|suivre|suivi|statistiques?|stats|graphiques?|backtests?|resultats|kpi|donnees|performances?|ventes')) return 'dash';
    if (E.business) return 'vitrine';
    return 'app';
  }
  const KIND = {
    dash: { art: 'le ', label: 'tableau de bord de données', spec: 'la visualisation de données', enjeux: 'Des chiffres mal présentés ou impossibles à vérifier font prendre de mauvaises décisions' },
    vitrine: { art: 'le ', label: 'site vitrine', spec: 'les sites vitrines qui donnent envie de venir ou de contacter', enjeux: 'Un visiteur qui ne trouve pas l’info pratique en quelques secondes part chez un concurrent' },
    shop: { art: 'la ', label: 'boutique en ligne', spec: 'les boutiques en ligne simples, sûres et rapides', enjeux: 'Un paiement peu rassurant ou un tunnel d’achat compliqué fait abandonner le panier' },
    app: { art: 'l’', label: 'application web', spec: 'les applications web utiles au quotidien', enjeux: 'Une application lente ou compliquée est abandonnée après quelques jours' }
  };

  function personalizeWeb(g, E) {
    const tr = g.topic === 'trading' || E.assets.length || E.indics.length || /backtest|trad/.test(E.n);
    const kind = webKind(E, tr ? 'trading' : g.topic), K = KIND[kind];
    const bizHead = E.business ? norm(E.business.split(' ')[0]) : '';
    let objs = (E.objects.length ? E.objects : (kind === 'vitrine' ? ['accueil', 'contact'] : [])).filter((o) => !bizHead || !norm(o).includes(bizHead));
    const FEM = /^(boulangerie|pizzeria|ecole|association|agence|entreprise|boutique|start-?up|camping)/;
    const bizArt = E.business ? (FEM.test(norm(E.business)) ? 'ma ' : 'mon ') + E.business : '';
    const bizUn = E.business ? (FEM.test(norm(E.business)) ? 'une ' : 'un ') + E.business : '';
    const objTxt = listFr(objs);
    if (kind === 'shop') objs = objs.map((o, i) => i === 0 && !OBJ.some(([re]) => re.test(norm(o))) ? 'catalogue de ' + o : o);
    if (kind === 'dash' && objs.length < 2) objs = ['vue d’ensemble'].concat(objs);
    if (kind === 'app' && objs.length < 3) objs = objs.concat(['historique', 'réglages']).slice(0, 3);
    const D = objs.map((o) => describe(o, E, tr));
    if (kind === 'vitrine' && !D.some((d) => /Contact/.test(d.page))) D.push(describe('contact', E, tr));
    const subj = E.business ? (bizArt + (E.place ? ' à ' + E.place : '')) : (tr ? 'les backtests de trading' : (objTxt || g.topic || 'ton besoin'));
    const host = E.hosts[0] || '';
    const libs = tr ? 'Lightweight Charts (bibliothèque open source de TradingView) pour les chandeliers et les marqueurs de trades, Chart.js pour les courbes' : kind === 'dash' ? 'Chart.js pour les graphiques' : '';
    // Persona
    const spec = tr ? 'la visualisation de données de trading : tableaux de backtests, courbes de résultats et graphiques de prix avec les trades superposés'
      : kind === 'vitrine' ? `${K.spec}${E.business ? ', en particulier pour ' + bizUn : ''}${E.place ? ' (référencement local à ' + E.place + ')' : ''}`
      : kind === 'shop' ? K.spec + (E.platforms.length ? ' (' + listFr(E.platforms) + ')' : '')
      : kind === 'dash' ? `${K.spec}${objTxt ? ' : ' + objTxt : ''}` : `${K.spec}${objTxt ? ' : ' + objTxt : ''}`;
    g.role = 'un développeur full-stack senior, spécialisé en ' + (tr ? 'visualisation de données de backtests de trading' : kind === 'vitrine' ? 'sites vitrines' + (E.business ? ' pour ' + E.business.split(' ')[0].replace(/([^sx])$/, '$1s') : '') : kind === 'shop' ? 'boutiques en ligne' : kind === 'dash' ? 'tableaux de bord et visualisation de données' + (E.objects.length ? ' (' + listFr(E.objects) + ')' : '') : 'applications web' + (E.objects.length ? ' de suivi (' + listFr(E.objects) + ')' : ''));
    g.persona = Object.assign({}, g.persona, { spec, persp: tr ? 'un résultat de backtest n’a de valeur que s’il est vérifiable : chaque chiffre affiché doit pouvoir se retrouver sur le graphique, trade par trade' : kind === 'vitrine' ? 'un visiteur doit savoir en 5 secondes ce que propose ' + (E.business ? bizArt.replace(/^mon /, 'le ').replace(/^ma /, 'la ') : 'le site') + ' et comment agir' : kind === 'shop' ? 'chaque clic en trop entre le produit et le paiement fait perdre une vente' : g.persona.persp });
    // Étapes
    const pages = D.map((d) => d.page + ' (' + d.what + ')');
    const S = [];
    S.push(`Reformule les besoins : ${kind === 'vitrine' ? 'qui visite le site de ' + subj + ', ce qu’il cherche' : 'qui utilise ' + K.art + K.label + ', ce qu’il doit pouvoir ' + (E.goals[0] || 'faire')}${objTxt ? ' (' + objTxt + ')' : ''}, et ce que la version 1 doit absolument permettre`);
    S.push(`Liste les pages : ${kind === 'vitrine' ? 'Accueil ; ' : ''}${pages.join(' ; ') || Q}`);
    if (kind === 'vitrine') S.push(`Décris les données et contenus à fournir pour chaque page (${D.map((d) => d.data).join(' ; ')}) et ce qui doit rester facile à modifier`);
    else S.push(`Décris les données : ${D.map((d) => d.data).join(' ; ') || 'source, format et champs'} — source${E.formats.length ? ' (' + listFr(E.formats) + ')' : ''}, format, fréquence de mise à jour et comment le site les charge`);
    S.push(`Choisis la stack la plus simple ${E.tech.length ? 'en utilisant ' + listFr(E.tech) + ' comme demandé' : 'adaptée'}${libs ? ' (ex. ' + libs + ')' : kind === 'shop' ? ' (site statique + paiement ' + (E.platforms.find((p) => /Stripe|PayPal|TWINT|Shopify/.test(p)) || 'Stripe ou équivalent') + ')' : ''}, et justifie chaque choix en une ligne`);
    S.push(`Propose une maquette textuelle de ${D.length ? listFr(D.map((d) => d.page.toLowerCase())) : 'chaque page'}${tr ? ', avec le lien entre une ligne du tableau des backtests et ses trades sur le graphique' : ''}${E.devices.includes('téléphone') ? ', version téléphone d’abord' : ''}`);
    S.push('Écris le code complet et commenté, fichier par fichier, avec l’arborescence du projet');
    S.push(`Explique comment tester en local avec ${tr ? 'un petit export de backtest d’essai marqué « Exemple fictif », et vérifie qu’un trade du tableau apparaît au bon prix et à la bonne date sur le graphique' : kind === 'shop' ? 'un paiement en mode test' : kind === 'vitrine' ? 'un affichage sur téléphone et ordinateur, et un envoi de formulaire' : 'des données d’essai marquées « Exemple fictif »'}`);
    S.push(`Explique le déploiement pas à pas sur ${host || (kind === 'shop' ? 'un hébergeur compatible paiement (ex. Netlify, Vercel)' : 'GitHub Pages, Netlify ou Vercel')}${kind === 'vitrine' ? ', avec nom de domaine et fiche Google' : ''}, et la mise à jour ${kind === 'vitrine' ? 'des contenus' : 'des données'}`);
    S.push(CHECK(`${objTxt ? 'chaque élément demandé (' + objTxt + ') a sa page ou sa zone' : 'chaque besoin couvert'}, code complet sans morceau manquant, données réelles ou exemples signalés, test et déploiement décrits`));
    g.etapes = S;
    // Exemples
    const X = D.map((d) => d.ex).slice(0, 3);
    if (tr) X.push('Piste : « je clique sur un backtest et je vois tous ses trades directement sur le graphique du prix »');
    else if (kind === 'vitrine') X.push(`Piste : « en 5 secondes, le visiteur sait ce que propose ${E.business ? bizArt.replace(/^mon /, 'le ').replace(/^ma /, 'la ') : 'le site'}${E.place ? ' à ' + E.place : ''} et comment ${objs.some((o) => /reserv/i.test(norm(o))) ? 'réserver' : 'le contacter'} »`);
    else if (kind === 'shop') X.push('Piste : « du produit au paiement en 3 clics, sur téléphone »');
    else X.push(`Piste : « j’ouvre ${K.label === 'application web' ? 'l’application' : 'le tableau de bord'} et je vois l’essentiel sur ${objTxt || 'mon sujet'} en 5 secondes »`);
    X.push(`Format d’une page dans la maquette : **${D[0] ? D[0].page : 'Nom de la page'}** — zones — action principale`);
    g.exemplesNote = X.slice(0, 5).map((x) => '- ' + x).join('\n');
    // Règles
    const Rr = ['Livre un code complet, fonctionnel et commenté, chaque fichier écrit en entier'];
    if (tr) Rr.push('Affiche uniquement des résultats issus de vrais backtests (fichiers ou exports fournis) ; pour la démo, marque les données « Exemple fictif »', 'Place chaque trade sur le graphique à sa date et à son prix exacts, identiques à ceux du tableau');
    else if (kind === 'vitrine') Rr.push('Utilise uniquement les textes, photos, prix et avis que je fournis ; sinon, écris [À COMPLÉTER]', `Mets ${E.place ? 'l’adresse à ' + E.place + ', ' : ''}les horaires et le bouton d’action principal visibles dès l’accueil`);
    else if (kind === 'shop') Rr.push('Utilise un paiement hébergé et reconnu (pas de numéro de carte stocké sur le site)', 'Affiche prix, frais de livraison et conditions avant le paiement');
    else Rr.push('Affiche uniquement des données réelles issues des sources indiquées ; pour une démo, marque les données « Exemple fictif »');
    if (E.tech.length) Rr.push('Utilise ' + listFr(E.tech) + ', comme demandé');
    if (E.qualifiers.length) Rr.push('Respecte ces qualités demandées : ' + listFr(E.qualifiers));
    Rr.push('Rends le site lisible sur téléphone comme sur ordinateur', 'Commence par la version 1 la plus simple qui marche, puis propose les améliorations');
    g.contraintes = uniq(Rr).slice(0, 6);
    g.rappel = g.contraintes[1];
    // Modèle
    const M = [`## 1. Ce que ${kind === 'vitrine' ? 'le site de ' + subj : 'le site'} doit permettre${objTxt ? ' : ' + objTxt : ''}`, '## 2. Pages et maquette'];
    D.forEach((d) => M.push(`- **${d.page}** : rôle — éléments principaux`));
    M.push(kind === 'vitrine' ? '## 3. Contenus à fournir' : `## 3. Données ${tr ? 'des backtests et du prix' : objTxt ? 'de ' + objTxt : ''} et sources`.replace(/\s+et sources/, ' et sources'), '## 4. Stack choisie', '- **Choix** : pourquoi, en une ligne', '## 5. Code complet', '(arborescence, puis chaque fichier dans un bloc de code)', `## 6. Tester en local${tr ? ' (contrôle tableau ↔ graphique)' : ''}`, `## 7. Mettre en ligne${host ? ' sur ' + host : ''}`, '## 8. Améliorations possibles');
    g.modele = M;
    // Contexte
    g.ctxRich = { sit: `Je veux ${kind === 'vitrine' ? 'un site vitrine' : kind === 'shop' ? 'une boutique en ligne' : kind === 'dash' ? 'un site de type tableau de bord' : 'une application web'}${E.business ? ' pour ' + subj : tr ? ' pour consulter mes backtests de trading' : ''}`, but: E.business ? `Présenter ${subj}${objTxt ? ' et proposer : ' + objTxt : ''}` : E.subject ? 'Pouvoir ' + E.subject.replace(/^(?:me |nous )/, '').replace(/^pouvoir /, '').replace(/, et de /g, ', et ') : 'Un site qui fonctionne et que je peux mettre en ligne moi-même', enjeux: K.enjeux, inconnues: [] };
    const F = [['Sujet du site', (E.subject || Q) + (g.topic === 'trading' || tr ? ' (thème : trading, backtests et résultats)' : g.topic ? ' (thème : ' + g.topic + ')' : '')], ['Type de site', K.label]];
    if (objs.length) F.push(['Éléments demandés', objTxt]);
    [['Marchés', E.assets], ['Indicateurs', E.indics], ['Plateformes', E.platforms], ['Technologies imposées', E.tech], ['Hébergement', E.hosts], ['Formats', E.formats], ['Appareils', E.devices], ['Qualités demandées', E.qualifiers], ['Lieu', E.place ? [E.place] : []], ['Quantités', E.quantities]].forEach(([k, v]) => { if (v.length) F.push([k, listFr(v)]); });
    g.facts = F;
    const U = [];
    if (tr) { if (!E.platforms.length && !E.formats.length) U.push('Source des backtests (export TradingView, fichiers CSV, autre outil)'); if (!E.assets.length) U.push('Marchés et unités de temps testés'); U.push('Nombre de backtests à afficher et fréquence d’ajout'); }
    else if (kind === 'vitrine') { if (!E.business) U.push('Activité présentée'); if (!E.place) U.push('Adresse et zone desservie'); U.push('Textes et photos déjà disponibles', 'Nom de domaine souhaité'); if (objs.some((o) => /reserv/i.test(norm(o)))) U.push('Réservation : outil existant ou formulaire maison, et qui reçoit les demandes'); }
    else if (kind === 'shop') { U.push('Nombre de produits et variantes', 'Pays de livraison et frais'); if (!E.platforms.some((p) => /Stripe|PayPal|TWINT|Shopify/.test(p))) U.push('Moyen de paiement souhaité'); }
    else { if (!E.formats.length) U.push('Source et format des données'); }
    U.push('Utilisateurs (moi seul, mon équipe, le public)' + (E.qualifiers.includes('accès protégé') ? '' : ' et accès protégé ou non'));
    if (!E.devices.length && !E.qualifiers.includes('adapté au téléphone')) U.push('Appareils visés (ordinateur, téléphone)');
    if (!E.hosts.length) U.push('Hébergement souhaité et budget');
    g.ctxRich.inconnues = U;
    g.subKind = kind;
  }

  // ---------- 5. Personnalisation générique (tous les autres domaines) ----------
  function personalizeGeneric(g, E) {
    const subj = E.subject || '';
    const fin = g.domain === 'trading' || g.domain === 'analyse';
    const ents = uniq([].concat(fin ? E.assets : [], fin ? E.indics : [], E.platforms, E.tech, E.formats, E.timeframes, E.quantities));
    const short = (subj || ents.join(', ')).replace(/^(?:me |nous )/, '');
    if (short && g.persona) g.persona = Object.assign({}, g.persona, { spec: g.persona.spec + ' — appliquée ici à ' + short });
    if (short) g.role = g.role + ', ici sur : ' + short;
    // Variantes (rédaction : article / e-mail ; marketing : plateforme)
    if (g.domain === 'redaction' && has(E.n, 'article|billet|blog')) {
      g.subKind = 'article';
      g.etapes = [`Définis l’angle de l’article sur ${short || 'le sujet'} et le lecteur visé`, 'Propose 3 titres, puis choisis le plus clair', `Construis le plan : introduction, ${E.quantities[0] || '3 à 5'} parties avec intertitres, conclusion`, `Rédige chaque partie avec un exemple concret lié à ${short || 'ton sujet'}`, 'Ajoute une conclusion avec une action ou une idée à retenir', CHECK('angle tenu, intertitres clairs, exemples concrets, aucun chiffre sans source')];
      g.exemplesNote = ['Angles possibles (guide pratique, erreurs fréquentes, questions que tout le monde se pose, histoire vécue)', `Exemples concrets liés à ${short || 'ton sujet'}, signalés « Exemple fictif » s’ils sont inventés`, 'Piste : « un article qu’un lecteur pressé comprend en lisant seulement les intertitres »'].map((x) => '- ' + x).join('\n');
      g.ctxRich = Object.assign({}, g.ctxRich, { sit: 'Je veux publier un article', but: 'Un article clair que le lecteur lit jusqu’au bout', enjeux: 'Un article vague ou inexact fait perdre la confiance du lecteur', inconnues: ['Où l’article sera publié (blog, LinkedIn, journal)', 'Longueur visée'] });
      g.modele = ['## Titre retenu (et 2 alternatives)', '## Chapeau (2 à 3 lignes)', `## Parties sur ${short || 'le sujet'}`, '(intertitres **en gras**, paragraphes courts)', '## Conclusion', '## Sources à vérifier'];
    } else if (g.etapes && g.etapes.length) {
      g.etapes = g.etapes.slice();
      if (short) g.etapes[0] = g.etapes[0] + ` — ici : ${short}`;
    }
    if (g.domain === 'marketing' && E.platforms.length) {
      g.subKind = 'post-' + norm(E.platforms[0]);
      const P = E.platforms[0];
      const fmt = { Instagram: 'visuel + légende, première ligne visible avant « plus »', TikTok: 'vidéo courte : accroche dans les 2 premières secondes', LinkedIn: 'texte aéré, accroche sur 2 lignes, ton professionnel', Facebook: 'texte court + image, question au public', YouTube: 'titre + miniature + description' }[P] || 'format natif de la plateforme';
      g.etapes.splice(Math.max(0, g.etapes.length - 1), 0, `Adapte le message au format ${P} (${fmt})`);
      g.modele = g.modele.map((l, i) => i === 0 ? l + ` (${P})` : l);
    }
    if (g.etapes && ents.length && g.etapes.length < 8 && g.domain !== 'marketing') g.etapes.splice(g.etapes.length - 1, 0, `Intègre précisément ${listFr(ents)} dans ta réponse, en citant leur nom exact`);
    if (g.etapes && g.etapes.length > 8) g.etapes = g.etapes.slice(0, 7).concat(g.etapes.slice(-1));
    // Exemples
    const ex = (g.exemplesNote || '').split('\n').filter(Boolean);
    if (E.objects.length) ex.unshift(`- Éléments de ta demande à traiter un par un (${listFr(E.objects)})`);
    else if (ents.length) ex.unshift(`- Éléments cités dans ta demande à exploiter (${listFr(ents)})`);
    g.exemplesNote = ex.slice(0, 5).join('\n');
    // Règles
    const R = g.contraintes.slice();
    const addR = (c) => { if (!R.includes(c)) R.splice(Math.min(2, R.length), 0, c); };
    if (E.quantities.length) addR('Respecte exactement les quantités demandées : ' + listFr(E.quantities));
    if (E.tech.length && g.domain !== 'trading') addR('Utilise ' + listFr(E.tech) + ', comme demandé');
    if (E.platforms.length && g.domain === 'marketing') addR('Respecte les usages et limites de ' + listFr(E.platforms));
    if (E.timeframes.length && g.domain === 'trading') addR('Travaille en ' + listFr(E.timeframes) + ', comme demandé');
    g.contraintes = R.slice(0, 7);
    // Modèle : premier titre adapté
    if (g.modele && g.modele.length && short && g.subKind !== 'article') g.modele = [g.modele[0] + ' — ' + short].concat(g.modele.slice(1));
    if (g.contraintes && g.contraintes.length > 7) g.contraintes = g.contraintes.slice(0, 7);
    // Ancrage du sujet dans chaque étape, titre de modèle et règle : deux demandes différentes donnent des prompts différents.
    if (short) {
      const tag = ` (${short})`;
      if (g.etapes) g.etapes = g.etapes.map((x, i) => (i === 0 || i === g.etapes.length - 1 || x.includes(short)) ? x : x + tag);
      if (g.modele) g.modele = g.modele.map((l, i) => (/^##/.test(l) && i > 0 && !l.includes(short)) ? l + ' — ' + short : l);
      if (g.contraintes) g.contraintes = g.contraintes.map((r, i) => (i < 3 && !r.includes(short) && !/hypothèse/i.test(r)) ? r + ` — pour ${short}` : r);
    }
    // Questions : retirer celles déjà réglées par la phrase
    if (g.ctxRich) {
      const inc = g.ctxRich.inconnues.filter((x) => {
        const k = norm(x);
        if (/unite de temps/.test(k) && E.timeframes.length) return false;
        if (/plateforme|canal/.test(k) && E.platforms.length) return false;
        if (/langage/.test(k) && E.tech.length) return false;
        if (/public/.test(k) && g.audience && !/^moi/i.test(g.audience)) return false;
        return true;
      });
      g.ctxRich = Object.assign({}, g.ctxRich, { inconnues: inc, sit: g.ctxRich.sit + (short ? ` (${short})` : '') });
      const F = (g.facts || []).slice();
      if (!F.length) { if (short) F.push(['Sujet', short]); [['Outils et plateformes', [].concat(E.platforms, E.tech)], ['Quantités', E.quantities], ['Qualités demandées', E.qualifiers]].forEach(([k, v]) => { if (v.length) F.push([k, listFr(v)]); }); }
      g.facts = F;
    }
  }

  function apply(g, sentence) {
    const E = extract(sentence);
    g.extract = E;
    if (g.domain === 'web') personalizeWeb(g, E); else personalizeGeneric(g, E);
    return g;
  }
  PS.perso = { correct, extract, apply, webKind };
})();
