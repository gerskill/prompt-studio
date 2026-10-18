/* Modèles prêts à l'emploi. Ce sont des gabarits rédigés pour ce site,
   pas des exemples d'utilisateurs. Les zones {{...}} sont à remplir. */
window.PS_CATEGORIES = [
  { id: 'code', name: 'Code et dev' },
  { id: 'redaction', name: 'Rédaction' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'data', name: 'Analyse de données' },
  { id: 'apprendre', name: 'Apprentissage' },
  { id: 'trading', name: 'Trading et backtest' },
  { id: 'sport', name: 'Sport et nutrition' },
  { id: 'emploi', name: "Recherche d'emploi" },
  { id: 'projet', name: 'Démarrage de projet' }
];

window.PS_TEMPLATES = [
  // ---------- CODE ----------
  { id: 'code-review', cat: 'code', level: 'Tous niveaux', title: 'Relecture de code',
    desc: 'Fais relire un morceau de code : bugs, lisibilité, sécurité, avec des corrections concrètes.',
    body: `RÔLE
Tu es un développeur senior spécialisé en {{Langage ou framework}}. Tu fais des revues de code précises et bienveillantes.

CONTEXTE
Ce code sert à : {{À quoi sert ce code}}.
Il tourne dans cet environnement : {{Environnement (navigateur, serveur, version...)}}.

MISSION
Relis le code ci-dessous et trouve :
1. Les bugs réels ou probables
2. Les problèmes de sécurité
3. Ce qui rend le code difficile à lire ou à maintenir

FORMAT
Un tableau : Ligne | Problème | Gravité (haute / moyenne / basse) | Correction proposée.
Puis le code corrigé complet, avec un commentaire sur chaque changement.

RÈGLES
- Marque chaque point [SÛR], [PROBABLE] ou [À VÉRIFIER].
- Ne change pas ce qui fonctionne déjà sans le justifier.
- Si une information manque pour juger, dis-le au lieu de deviner.

CODE
"""
{{Colle ton code ici}}
"""` },
  { id: 'code-feature', cat: 'code', level: 'Intermédiaire', title: 'Ajouter une fonctionnalité',
    desc: 'Décris une fonctionnalité et obtiens un plan puis le code, étape par étape.',
    body: `RÔLE
Tu es un développeur expert en {{Langage ou framework}}.

CONTEXTE
Mon projet : {{Description courte du projet}}.
Structure actuelle des fichiers : {{Liste des fichiers principaux}}.

MISSION
Ajoute cette fonctionnalité : {{Fonctionnalité voulue}}.
Elle est terminée quand : {{Critère de réussite vérifiable}}.

MÉTHODE
1. Avant de coder, pose-moi au maximum 3 questions si quelque chose n'est pas clair.
2. Propose un plan court (fichiers touchés, étapes).
3. Avance une étape à la fois et attends que j'écrive "suivant".

CONTRAINTES
- Pas de nouvelle dépendance sans me demander.
- Code commenté, noms de variables clairs.
- {{Autre contrainte (ou supprime cette ligne)}}

VÉRIFICATION FINALE
Avant chaque réponse, vérifie : le code compile, rien d'existant n'est cassé, le critère de réussite est couvert.` },
  { id: 'code-debug', cat: 'code', level: 'Débutant', title: 'Comprendre et corriger une erreur',
    desc: "Colle un message d'erreur et obtiens une explication simple et une correction.",
    body: `Tu es un professeur de programmation patient. Explique sans jargon.

J'ai cette erreur :
"""
{{Message d'erreur complet}}
"""

Voici le code concerné :
"""
{{Code concerné}}
"""

Ce que j'essayais de faire : {{Ce que tu voulais obtenir}}.

Réponds dans cet ordre :
1. Ce que veut dire l'erreur, en 2 phrases simples.
2. La cause la plus probable, et les autres causes possibles.
3. La correction, avec le code corrigé.
4. Comment vérifier que c'est réglé.
Si tu n'es pas sûr de la cause, dis-le clairement.` },

  // ---------- RÉDACTION ----------
  { id: 'redac-article', cat: 'redaction', level: 'Tous niveaux', title: 'Article ou billet de blog',
    desc: 'Un article structuré, adapté à ton public, sans chiffres inventés.',
    body: `RÔLE
Tu es un rédacteur expérimenté qui écrit pour {{Public visé}}.

SUJET
{{Sujet de l'article}}

OBJECTIF
Après lecture, le lecteur doit pouvoir : {{Ce que le lecteur saura ou fera}}.

FORMAT
- Un titre et 3 propositions de titres alternatifs
- Une introduction de 3 phrases maximum
- Des intertitres clairs
- Une conclusion avec une action concrète
Longueur : environ {{Nombre de mots}} mots.

TON
{{Ton (par ex. simple et chaleureux)}}

RÈGLES DE PREUVE
- Aucune statistique inventée. Si un chiffre serait utile, écris [CHIFFRE À SOURCER].
- Aucun témoignage ou exemple fabriqué présenté comme réel.
- Sépare clairement les faits établis et les opinions.` },
  { id: 'redac-mail', cat: 'redaction', level: 'Débutant', title: 'E-mail clair et poli',
    desc: 'Rédige un e-mail court pour une situation délicate ou importante.',
    body: `Aide-moi à écrire un e-mail.

Destinataire : {{Qui reçoit l'e-mail (rôle, relation)}}
Situation : {{Ce qui se passe}}
Ce que je veux obtenir : {{Résultat attendu}}
Ton : {{Ton voulu (par ex. poli mais ferme)}}

Contraintes :
- 150 mots maximum
- Un objet d'e-mail clair
- Une seule demande précise à la fin

Propose 2 versions : une plus formelle, une plus directe.` },
  { id: 'redac-resume', cat: 'redaction', level: 'Tous niveaux', title: 'Résumer un document',
    desc: "Résumé fidèle d'un texte, avec les points clés et ce qui reste incertain.",
    body: `Tu es un analyste rigoureux.

Résume le texte ci-dessous pour {{Pour qui est le résumé}}.

Format :
1. L'idée principale en une phrase
2. Les {{Nombre de points}} points clés, en puces
3. Ce que le texte ne dit pas ou laisse flou
4. Les termes techniques expliqués simplement

Règles :
- N'ajoute aucune information absente du texte.
- Si tu interprètes, signale-le avec [INTERPRÉTATION].

TEXTE
"""
{{Colle le texte ici}}
"""` },

  // ---------- MARKETING ----------
  { id: 'mkt-landing', cat: 'marketing', level: 'Intermédiaire', title: "Texte d'une page d'accueil",
    desc: 'Titre, sous-titre, bénéfices et appel à l’action pour une page web.',
    body: `RÔLE
Tu es un copywriter spécialisé dans les pages web qui convertissent, sans exagération.

PRODUIT
{{Ton produit ou service}}

CLIENT IDÉAL
{{Qui est ton client idéal}}
Son problème principal : {{Le problème qu'il veut résoudre}}

MISSION
Écris le texte de la page d'accueil :
- 3 propositions de titre (10 mots maximum)
- Un sous-titre
- 3 bénéfices concrets
- Une réponse aux 3 objections les plus probables
- Un appel à l'action

RÈGLES
- Aucune promesse que le produit ne peut pas tenir.
- Aucun chiffre, avis client ou logo de client inventé.
- Ton : {{Ton de la marque}}` },
  { id: 'mkt-posts', cat: 'marketing', level: 'Débutant', title: 'Série de posts réseaux sociaux',
    desc: 'Plusieurs posts adaptés à un réseau, avec des angles différents.',
    body: `Tu es un créateur de contenu expérimenté sur {{Réseau social}}.

Sujet : {{Sujet des posts}}
Public : {{Public visé}}
Objectif : {{Objectif (visibilité, ventes, communauté...)}}

Écris {{Nombre de posts}} posts, chacun avec un angle différent (conseil, histoire, question, coulisses...).
Pour chaque post : une accroche de première ligne forte, le texte, et une idée de visuel.

Contraintes : longueur adaptée au réseau, pas de faux chiffres, pas de témoignages inventés.` },
  { id: 'mkt-persona', cat: 'marketing', level: 'Intermédiaire', title: 'Comprendre sa clientèle',
    desc: 'Construis des profils de clients à partir de ce que tu sais vraiment.',
    body: `Tu es un stratège marketing.

Mon activité : {{Ton activité}}
Ce que je sais déjà de mes clients : {{Ce que tu sais (observations réelles)}}

Mission : propose 3 profils de clients probables.
Pour chacun : besoins, freins, où le trouver, message qui lui parle.

Important :
- Sépare ce qui vient de mes informations [OBSERVÉ] et ce que tu supposes [HYPOTHÈSE].
- Termine par 3 questions simples à poser à de vrais clients pour vérifier ces hypothèses.` },

  // ---------- DATA ----------
  { id: 'data-explore', cat: 'data', level: 'Tous niveaux', title: 'Explorer un jeu de données',
    desc: 'Premières observations sur un tableau, sans conclusions hâtives.',
    body: `RÔLE
Tu es un analyste de données prudent et pédagogue.

DONNÉES
Description des colonnes : {{Colonnes et leur sens}}
Extrait :
"""
{{Colle un extrait (quelques dizaines de lignes)}}
"""

QUESTION
{{Ce que tu veux comprendre}}

MISSION
1. Vérifie la qualité : valeurs manquantes, doublons, valeurs bizarres.
2. Donne 3 à 5 observations, chacune marquée [SÛR], [PROBABLE] ou [À VÉRIFIER].
3. Propose les graphiques utiles et dis ce que chacun montrerait.
4. Dis ce que ces données NE permettent PAS de conclure.

RÈGLE
Ne calcule rien sur des lignes que tu n'as pas vues : si l'extrait ne suffit pas, dis-le.` },
  { id: 'data-formule', cat: 'data', level: 'Débutant', title: 'Formule Excel ou Google Sheets',
    desc: 'Obtiens la bonne formule et une explication pas à pas.',
    body: `Tu es un expert {{Excel ou Google Sheets}} qui explique simplement.

Mon tableau : {{Ce que contient chaque colonne (A, B, C...)}}
Ce que je veux obtenir : {{Résultat voulu}}
Exemple attendu : {{Un exemple de résultat attendu sur une ligne}}

Donne :
1. La formule à copier
2. Son explication morceau par morceau
3. Une version plus simple si elle existe
4. Les erreurs fréquentes avec cette formule` },

  // ---------- APPRENDRE ----------
  { id: 'learn-plan', cat: 'apprendre', level: 'Débutant', title: "Plan d'apprentissage",
    desc: 'Un plan sur plusieurs semaines, adapté à ton temps et à ton niveau.',
    body: `Tu es un professeur expérimenté en {{Sujet à apprendre}}.

Mon niveau : {{Ton niveau actuel}}
Mon objectif : {{Ce que tu veux savoir faire}}
Temps disponible : {{Temps par semaine}} sur {{Nombre de semaines}} semaines.

Crée un plan semaine par semaine avec :
- l'objectif de la semaine
- les notions à apprendre
- un exercice pratique
- un petit test pour vérifier que c'est acquis

Avance une semaine à la fois : présente la semaine 1, puis attends que j'écrive "suivant".` },
  { id: 'learn-explain', cat: 'apprendre', level: 'Tous niveaux', title: 'Expliquer une notion',
    desc: 'Une notion expliquée à ton niveau, avec une analogie et un test.',
    body: `Explique-moi {{Notion à comprendre}}.

Mon niveau : {{Débutant, intermédiaire ou avancé}}
Pourquoi je veux comprendre : {{Contexte}}

Structure :
1. Une explication en 3 phrases, sans jargon
2. Une analogie de la vie courante
3. Un exemple concret
4. Les erreurs de compréhension fréquentes
5. 3 questions pour vérifier que j'ai compris (réponses à la fin)

Si une partie de l'explication fait débat chez les experts, dis-le.` },

  // ---------- TRADING ----------
  { id: 'trade-pine', cat: 'trading', level: 'Expert', title: 'Stratégie Pine Script v6',
    desc: 'Coder une stratégie TradingView testable, sans repaint, avec gestion du risque.',
    body: `RÔLE
Tu es un expert Pine Script v6 et en gestion du risque.

STRATÉGIE
Marché : {{Symbole}} — Unité de temps : {{Unité de temps}}
Règles d'entrée : {{Règles d'entrée précises}}
Règles de sortie : {{Stop, objectif, sortie anticipée}}
Risque par trade : {{Risque en % du capital}} — Capital : {{Capital}}

MISSION
Écris la stratégie complète en Pine Script v6.

CONTRAINTES
- Aucun repaint : request.security avec lookahead désactivé et données confirmées.
- Taille de position calculée pour risquer exactement le % voulu, adaptée à l'actif (syminfo.pointvalue).
- Stop sur 100 % de la position.
- Commission et slippage réalistes dans strategy().
- Code commenté qui compile.

RÈGLES DE PREUVE
- N'invente aucun résultat de backtest.
- Marque tes affirmations [SÛR], [PROBABLE] ou [À VÉRIFIER].

TABLEAU DES RISQUES
Termine par : risque | probabilité | impact | parade (sur-ajustement, peu de trades, frais, différence avec le broker).

VÉRIFICATION FINALE
[ ] Pas de repaint [ ] Taille juste [ ] Stop sur toute la position [ ] Compile en v6` },
  { id: 'trade-backtest', cat: 'trading', level: 'Intermédiaire', title: 'Lire un backtest',
    desc: 'Faire analyser des résultats de backtest de façon critique.',
    body: `Tu es un analyste quantitatif sceptique.

Voici les résultats de mon backtest :
"""
{{Colle les résultats (profit factor, drawdown, nb de trades, etc.)}}
"""
Stratégie : {{Description courte}}
Période testée : {{Période}}

Analyse :
1. Les résultats sont-ils fiables ? (nombre de trades, période, frais)
2. Les signes de sur-ajustement
3. Ce qu'il faut tester ensuite, UNE seule chose à la fois
4. Un tableau des risques : risque | probabilité | impact | parade

N'invente aucun chiffre absent des résultats. Ceci n'est pas un conseil financier : signale les limites.` },

  // ---------- SPORT ----------
  { id: 'sport-programme', cat: 'sport', level: 'Tous niveaux', title: "Programme d'entraînement",
    desc: 'Un programme adapté à ton niveau, ton matériel et ton temps.',
    body: `RÔLE
Tu es un coach sportif diplômé, prudent sur les blessures.

PROFIL
Âge : {{Âge}} — Niveau : {{Niveau}}
Objectif : {{Objectif (prise de muscle, perte de poids, endurance...)}}
Matériel : {{Matériel disponible}}
Disponibilité : {{Nombre de séances}} séances par semaine, {{Durée max}} par séance, échauffement compris.
Limites physiques : {{Blessures ou douleurs (ou "aucune")}}

MISSION
Crée un programme sur 4 semaines : exercices, séries, répétitions, repos, et comment progresser.

FORMAT
Un tableau par séance, avec la durée totale estimée.

RÈGLES
- Respecte la durée maximale.
- En cas de douleur signalée, propose une alternative et conseille de consulter un professionnel.` },
  { id: 'sport-repas', cat: 'sport', level: 'Débutant', title: 'Plan de repas',
    desc: 'Des repas simples qui respectent tes objectifs et tes goûts.',
    body: `Tu es un diététicien pragmatique.

Objectif : {{Objectif}}
Besoin estimé : {{Calories ou "à estimer"}}
Aliments aimés : {{Aliments aimés}}
Aliments à éviter : {{Allergies ou aliments refusés}}
Budget et temps de cuisine : {{Budget et temps}}

Crée un plan de repas sur {{Nombre de jours}} jours avec : les repas, les quantités, et une liste de courses groupée par rayon.
Indique que les valeurs nutritionnelles sont des estimations.
Pour toute condition médicale, conseille de consulter un professionnel de santé.` },

  // ---------- EMPLOI ----------
  { id: 'job-lettre', cat: 'emploi', level: 'Débutant', title: 'Lettre de motivation',
    desc: "Une lettre courte et précise, basée sur ton vrai parcours et l'annonce.",
    body: `Tu es un recruteur expérimenté dans le secteur {{Secteur}}.

L'annonce :
"""
{{Colle l'annonce}}
"""

Mon parcours (vrai, sans exagérer) :
{{Tes expériences et compétences}}

Écris une lettre de motivation :
- 250 mots maximum
- relie 3 exigences de l'annonce à des éléments réels de mon parcours
- ton : {{Ton (par ex. motivé et simple)}}

N'invente aucune expérience, diplôme ou chiffre. Si quelque chose manque, dis-moi quoi ajouter.` },
  { id: 'job-entretien', cat: 'emploi', level: 'Tous niveaux', title: "Préparer un entretien",
    desc: "Questions probables, réponses à préparer et simulation d'entretien.",
    body: `Tu es un recruteur pour le poste de {{Poste}} chez {{Entreprise ou type d'entreprise}}.

Mon profil : {{Ton profil en quelques lignes}}

1. Liste les 10 questions les plus probables pour ce poste.
2. Pour chacune, donne la structure d'une bonne réponse (pas une réponse toute faite).
3. Ensuite, simule l'entretien : pose-moi une question à la fois, attends ma réponse, donne-moi un retour honnête, puis passe à la suivante quand j'écris "suivant".` },
  { id: 'job-cv', cat: 'emploi', level: 'Débutant', title: 'Améliorer son CV',
    desc: 'Un CV plus clair et plus adapté à un poste précis.',
    body: `Tu es un spécialiste du recrutement en {{Pays ou région}}.

Poste visé : {{Poste visé}}
Mon CV actuel :
"""
{{Colle ton CV}}
"""

1. Ce qui est clair et ce qui ne l'est pas
2. Les mots-clés du poste qui manquent
3. Une nouvelle version de chaque expérience, avec des verbes d'action
4. Ce qu'il faut supprimer

Règle : ne rajoute aucune compétence ou expérience que je n'ai pas mentionnée.` },

  // ---------- PROJET ----------
  { id: 'proj-cadrage', cat: 'projet', level: 'Tous niveaux', title: 'Cadrer un nouveau projet',
    desc: 'Clarifie objectif, public, contraintes et risques avant de commencer.',
    body: `RÔLE
Tu es un chef de projet expérimenté qui pose les bonnes questions.

MON PROJET
{{Description du projet}}

OBJECTIF
Avant de commencer, aide-moi à clarifier le projet.

MÉTHODE
1. Pose-moi 5 questions maximum sur ce qui n'est pas clair, une à la fois.
2. Ensuite, écris une fiche de cadrage : objectif mesurable, public, ce qui est inclus, ce qui est exclu, contraintes, critères de réussite.
3. Termine par un tableau des risques : risque | probabilité | impact | parade.

RÈGLES
- Distingue ce que je t'ai dit [CONFIRMÉ] de tes suppositions [HYPOTHÈSE].
- Reste simple, sans jargon.` },
  { id: 'proj-plan', cat: 'projet', level: 'Intermédiaire', title: 'Découper en étapes',
    desc: 'Un plan réaliste en étapes courtes, avec des livrables vérifiables.',
    body: `Tu es un chef de projet pragmatique.

Projet : {{Description du projet}}
Délai : {{Délai}}
Ressources : {{Qui travaille dessus et combien de temps}}

Découpe le projet en étapes de {{Durée d'une étape (par ex. 1 semaine)}} maximum.
Pour chaque étape : objectif, tâches, livrable vérifiable, dépendances.
Signale les étapes risquées et propose ce qu'on peut couper si le temps manque.
Présente une étape à la fois et attends "suivant".` },
  { id: 'proj-revue', cat: 'projet', level: 'Tous niveaux', title: "Faire le point sur l'avancement",
    desc: "Une revue honnête : ce qui avance, ce qui bloque, et la prochaine action.",
    body: `Tu es un mentor exigeant mais bienveillant.

Projet : {{Nom et objectif du projet}}
Ce qui est fait : {{Ce qui est terminé}}
Ce qui bloque : {{Blocages}}
Prochaine échéance : {{Échéance}}

1. Résume l'état du projet en 3 phrases.
2. Identifie le principal risque actuel.
3. Propose UNE prochaine action concrète, faisable en moins de 2 heures.
4. Vérifie que l'objectif de départ est toujours le bon.` }
];
