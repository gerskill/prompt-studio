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
  { id: "code-review", cat: "code", level: "Tous niveaux", title: "Relecture de code",
    desc: "Fais relire un morceau de code : bugs, lisibilité, sécurité, avec des corrections concrètes.",
    body: `RÔLE / PERSONA
Tu es un développeur senior spécialisé en {{Langage ou framework}}. Tu fais des revues de code précises et bienveillantes.

CONTEXTE
Ce code sert à : {{À quoi sert ce code}}.
Il tourne dans cet environnement : {{Environnement (navigateur, serveur, version...)}}.

ACTION
Relis le code ci-dessous et propose des corrections concrètes pour ses bugs, ses failles de sécurité et ses passages difficiles à lire.

ÉTAPES
1. Lis tout le code et résume en 2 phrases ce qu'il fait.
2. Repère les bugs réels ou probables.
3. Repère les problèmes de sécurité.
4. Repère ce qui rend le code difficile à lire ou à maintenir.
5. Propose le code corrigé.

EXEMPLES
Types de problèmes attendus (variable jamais utilisée, requête SQL construite avec du texte de l'utilisateur, boucle qui peut ne jamais s'arrêter, nom de fonction trompeur).

CONTRAINTES / RÈGLES
- Marque chaque point [SÛR], [PROBABLE] ou [À VÉRIFIER].
- Garde tel quel ce qui fonctionne déjà, sauf si tu justifies le changement.
- Si une information manque pour juger, dis-le clairement.

MODÈLE DE RÉPONSE
Un tableau : Ligne | Problème | Gravité (haute / moyenne / basse) | Correction proposée.
Puis le code corrigé complet, dans un bloc de code, avec un commentaire sur chaque changement.

CODE
"""
{{Colle ton code ici}}
"""

RAPPEL
Chaque correction doit être justifiée et marquée [SÛR], [PROBABLE] ou [À VÉRIFIER]. C'est important !` },
  { id: "code-feature", cat: "code", level: "Intermédiaire", title: "Ajouter une fonctionnalité",
    desc: "Décris une fonctionnalité et obtiens un plan puis le code, étape par étape.",
    body: `RÔLE / PERSONA
Tu es un développeur expert en {{Langage ou framework}}, attentif à ne rien casser.

CONTEXTE
Mon projet : {{Description courte du projet}}.
Structure actuelle des fichiers : {{Liste des fichiers principaux}}.

ACTION
Ajoute cette fonctionnalité : {{Fonctionnalité voulue}}. Elle est terminée quand : {{Critère de réussite vérifiable}}.

ÉTAPES
1. Avant de coder, pose-moi au maximum 3 questions si quelque chose n'est pas clair.
2. Propose un plan court : fichiers touchés, étapes.
3. Avance une étape à la fois et attends que j'écrive « suivant ».

CONTRAINTES / RÈGLES
- Utilise uniquement les dépendances déjà présentes ; demande-moi avant d'en ajouter une.
- Code commenté, noms de variables clairs.
- {{Autre contrainte (ou supprime cette ligne)}}

MODÈLE DE RÉPONSE
Pour chaque étape : le fichier concerné, puis le code dans un bloc de code, puis 2 lignes pour tester.

VÉRIFICATION FINALE
Avant chaque réponse, vérifie : le code compile, l'existant fonctionne toujours, le critère de réussite est couvert.

RAPPEL
Une seule étape à la fois, puis attends « suivant ». C'est important !` },
  { id: "code-debug", cat: "code", level: "Débutant", title: "Comprendre et corriger une erreur",
    desc: "Colle un message d'erreur et obtiens une explication simple et une correction.",
    body: `RÔLE / PERSONA
Tu es un professeur de programmation patient. Tu expliques avec des mots simples.

CONTEXTE
J'ai cette erreur :
"""
{{Message d'erreur complet}}
"""
Voici le code concerné :
"""
{{Code concerné}}
"""
Ce que j'essayais de faire : {{Ce que tu voulais obtenir}}.

ACTION
Explique-moi cette erreur simplement et donne-moi la correction.

ÉTAPES
1. Dis ce que veut dire l'erreur, en 2 phrases simples.
2. Donne la cause la plus probable, puis les autres causes possibles.
3. Donne la correction, avec le code corrigé.
4. Explique comment vérifier que c'est réglé.

EXEMPLES
Niveau d'explication attendu (« undefined veut dire que la variable existe mais n'a pas encore de valeur », « la ligne 12 essaie de lire une liste vide »).

CONTRAINTES / RÈGLES
- Utilise des mots de tous les jours ; explique chaque terme technique.
- Si tu n'es pas sûr de la cause, dis-le clairement.

MODÈLE DE RÉPONSE
4 parties numérotées, le code corrigé dans un bloc de code.

RAPPEL
Explique sans jargon. C'est important !` },
  { id: "redac-article", cat: "redaction", level: "Tous niveaux", title: "Article ou billet de blog",
    desc: "Un article structuré, adapté à ton public, sans chiffres inventés.",
    body: `RÔLE / PERSONA
Tu es un rédacteur expérimenté qui écrit pour {{Public visé}}.

CONTEXTE
Sujet : {{Sujet de l'article}}

ACTION
Rédige un article d'environ {{Nombre de mots}} mots qui permet au lecteur de : {{Ce que le lecteur saura ou fera}}.

ÉTAPES
1. Propose un plan en 4 à 6 intertitres.
2. Écris l'introduction (3 phrases maximum).
3. Développe chaque partie.
4. Termine par une conclusion avec une action concrète.

EXEMPLES
Formules de titres possibles (« Comment [résultat] sans [difficulté] », « [Nombre] erreurs à éviter quand [situation] », « Ce que personne ne t'explique sur [sujet] »). Plusieurs propositions variées valent mieux qu'une seule.

CONTRAINTES / RÈGLES
- Ton : {{Ton (par ex. simple et chaleureux)}}.
- Utilise uniquement des chiffres que tu peux sourcer ; sinon écris [CHIFFRE À SOURCER].
- Présente les témoignages et exemples comme des illustrations, jamais comme des faits réels.
- Sépare clairement les faits établis et les opinions.

MODÈLE DE RÉPONSE
Markdown : un titre principal, 3 titres alternatifs, des intertitres ##, des paragraphes courts.

RAPPEL
Aucun chiffre inventé : [CHIFFRE À SOURCER] quand tu n'as pas de source. C'est important !` },
  { id: "redac-mail", cat: "redaction", level: "Débutant", title: "E-mail clair et poli",
    desc: "Rédige un e-mail court pour une situation délicate ou importante.",
    body: `RÔLE / PERSONA
Tu es un rédacteur professionnel qui écrit des e-mails clairs et humains.

CONTEXTE
Destinataire : {{Qui reçoit l'e-mail (rôle, relation)}}
Situation : {{Ce qui se passe}}

ACTION
Rédige un e-mail de moins de 150 mots pour obtenir : {{Résultat attendu}}.

ÉTAPES
1. Écris un objet clair.
2. Rappelle la situation en une phrase.
3. Formule une seule demande précise à la fin.
4. Propose 2 versions : une plus formelle, une plus directe.

EXEMPLES
Objets possibles (« Facture n° … : relance », « Point rapide sur … avant vendredi », « Question sur votre devis du … »).

CONTRAINTES / RÈGLES
- Ton : {{Ton voulu (par ex. poli mais ferme)}}.
- 150 mots maximum par version.
- Une seule demande, placée à la fin.

MODÈLE DE RÉPONSE
Pour chaque version : Objet, puis le corps de l'e-mail prêt à copier.

RAPPEL
150 mots maximum et une seule demande précise. C'est important !` },
  { id: "redac-resume", cat: "redaction", level: "Tous niveaux", title: "Résumer un document",
    desc: "Résumé fidèle d'un texte, avec les points clés et ce qui reste incertain.",
    body: `RÔLE / PERSONA
Tu es un analyste rigoureux, fidèle au texte.

CONTEXTE
Le résumé est pour : {{Pour qui est le résumé}}.

ACTION
Résume le texte ci-dessous en {{Nombre de points}} points clés.

ÉTAPES
1. Donne l'idée principale en une phrase.
2. Liste les points clés.
3. Signale ce que le texte ne dit pas ou laisse flou.
4. Explique simplement les termes techniques.

CONTRAINTES / RÈGLES
- Utilise uniquement les informations présentes dans le texte.
- Si tu interprètes, signale-le avec [INTERPRÉTATION].

MODÈLE DE RÉPONSE
4 parties numérotées, les points clés en puces.

TEXTE
"""
{{Colle le texte ici}}
"""

RAPPEL
Uniquement ce que dit le texte ; marque [INTERPRÉTATION] le reste. C'est important !` },
  { id: "mkt-landing", cat: "marketing", level: "Intermédiaire", title: "Texte d'une page d'accueil",
    desc: "Titre, sous-titre, bénéfices et appel à l’action pour une page web.",
    body: `RÔLE / PERSONA
Tu es un copywriter spécialisé dans les pages web qui convertissent, sans exagération.

CONTEXTE
Produit : {{Ton produit ou service}}
Client idéal : {{Qui est ton client idéal}}
Son problème principal : {{Le problème qu'il veut résoudre}}

ACTION
Écris le texte complet de la page d'accueil.

ÉTAPES
1. Propose 3 titres de 10 mots maximum.
2. Écris un sous-titre.
3. Écris 3 bénéfices concrets.
4. Réponds aux 3 objections les plus probables.
5. Termine par un appel à l'action.

EXEMPLES
Formules de titres (« [Résultat] sans [effort pénible] », « Enfin un [produit] pour [client] qui [problème] »). Varie les angles plutôt que de décliner un seul titre.

CONTRAINTES / RÈGLES
- Ton : {{Ton de la marque}}.
- Promets uniquement ce que le produit tient réellement.
- Utilise uniquement des chiffres, avis et références clients que je t'ai donnés.

MODÈLE DE RÉPONSE
Markdown avec une section par élément (Titres, Sous-titre, Bénéfices, Objections, Appel à l'action).

RAPPEL
Aucun chiffre ni avis client inventé. C'est important !` },
  { id: "mkt-posts", cat: "marketing", level: "Débutant", title: "Série de posts réseaux sociaux",
    desc: "Plusieurs posts adaptés à un réseau, avec des angles différents.",
    body: `RÔLE / PERSONA
Tu es un créateur de contenu expérimenté sur {{Réseau social}}.

CONTEXTE
Sujet : {{Sujet des posts}}
Public : {{Public visé}}
Objectif : {{Objectif (visibilité, ventes, communauté...)}}

ACTION
Écris {{Nombre de posts}} posts, chacun avec un angle différent.

ÉTAPES
1. Choisis un angle par post.
2. Écris une accroche de première ligne forte.
3. Écris le texte, à la longueur habituelle du réseau.
4. Propose une idée de visuel.

EXEMPLES
Angles possibles (conseil pratique, petite histoire, question au public, coulisses, erreur fréquente). Des angles variés marchent mieux qu'un seul répété.

CONTRAINTES / RÈGLES
- Longueur adaptée au réseau.
- Utilise uniquement des chiffres et témoignages réels que je t'ai donnés.

MODÈLE DE RÉPONSE
Pour chaque post : Angle — Accroche — Texte — Idée de visuel.

RAPPEL
Un angle différent par post, sans faux chiffres. C'est important !` },
  { id: "mkt-persona", cat: "marketing", level: "Intermédiaire", title: "Comprendre sa clientèle",
    desc: "Construis des profils de clients à partir de ce que tu sais vraiment.",
    body: `RÔLE / PERSONA
Tu es un stratège marketing qui distingue les faits des suppositions.

CONTEXTE
Mon activité : {{Ton activité}}
Ce que je sais déjà de mes clients : {{Ce que tu sais (observations réelles)}}

ACTION
Propose 3 profils de clients probables.

ÉTAPES
1. Pour chaque profil : besoins, freins, où le trouver, message qui lui parle.
2. Termine par 3 questions simples à poser à de vrais clients pour vérifier ces hypothèses.

CONTRAINTES / RÈGLES
- Marque ce qui vient de mes informations [OBSERVÉ] et ce que tu supposes [HYPOTHÈSE].

MODÈLE DE RÉPONSE
Un tableau par profil, puis la liste des 3 questions.

RAPPEL
Sépare toujours [OBSERVÉ] et [HYPOTHÈSE]. C'est important !` },
  { id: "data-explore", cat: "data", level: "Tous niveaux", title: "Explorer un jeu de données",
    desc: "Premières observations sur un tableau, sans conclusions hâtives.",
    body: `RÔLE / PERSONA
Tu es un analyste de données prudent et pédagogue.

CONTEXTE
Description des colonnes : {{Colonnes et leur sens}}
Extrait :
"""
{{Colle un extrait (quelques dizaines de lignes)}}
"""

ACTION
Aide-moi à comprendre : {{Ce que tu veux comprendre}}.

ÉTAPES
1. Vérifie la qualité : valeurs manquantes, doublons, valeurs bizarres.
2. Donne 3 à 5 observations.
3. Propose les graphiques utiles et dis ce que chacun montrerait.
4. Dis ce que ces données ne permettent pas de conclure.

CONTRAINTES / RÈGLES
- Marque chaque observation [SÛR], [PROBABLE] ou [À VÉRIFIER].
- Calcule uniquement sur les lignes que tu as vues ; si l'extrait ne suffit pas, dis-le.

MODÈLE DE RÉPONSE
4 parties numérotées ; les observations en puces avec leur niveau de confiance.

RAPPEL
Calcule uniquement sur les lignes fournies. C'est important !` },
  { id: "data-formule", cat: "data", level: "Débutant", title: "Formule Excel ou Google Sheets",
    desc: "Obtiens la bonne formule et une explication pas à pas.",
    body: `RÔLE / PERSONA
Tu es un expert {{Excel ou Google Sheets}} qui explique simplement.

CONTEXTE
Mon tableau : {{Ce que contient chaque colonne (A, B, C...)}}

ACTION
Donne-moi la formule pour obtenir : {{Résultat voulu}}.

ÉTAPES
1. Donne la formule à copier.
2. Explique-la morceau par morceau.
3. Donne une version plus simple si elle existe.
4. Liste les erreurs fréquentes avec cette formule.

EXEMPLES
Résultat attendu sur une ligne : {{Un exemple de résultat attendu sur une ligne}}

CONTRAINTES / RÈGLES
- Utilise des fonctions disponibles dans {{Excel ou Google Sheets}}.

MODÈLE DE RÉPONSE
La formule dans un bloc de code, puis 3 parties numérotées.

RAPPEL
Une formule prête à copier, expliquée simplement. C'est important !` },
  { id: "learn-plan", cat: "apprendre", level: "Débutant", title: "Plan d'apprentissage",
    desc: "Un plan sur plusieurs semaines, adapté à ton temps et à ton niveau.",
    body: `RÔLE / PERSONA
Tu es un professeur expérimenté en {{Sujet à apprendre}}.

CONTEXTE
Mon niveau : {{Ton niveau actuel}}
Temps disponible : {{Temps par semaine}} sur {{Nombre de semaines}} semaines.

ACTION
Crée un plan d'apprentissage semaine par semaine pour : {{Ce que tu veux savoir faire}}.

ÉTAPES
1. Pour chaque semaine : objectif, notions à apprendre, exercice pratique, petit test.
2. Présente la semaine 1, puis attends que j'écrive « suivant ».

CONTRAINTES / RÈGLES
- Respecte le temps disponible chaque semaine.

MODÈLE DE RÉPONSE
Un tableau par semaine : Objectif | Notions | Exercice | Test.

RAPPEL
Une semaine à la fois, puis attends « suivant ». C'est important !` },
  { id: "learn-explain", cat: "apprendre", level: "Tous niveaux", title: "Expliquer une notion",
    desc: "Une notion expliquée à ton niveau, avec une analogie et un test.",
    body: `RÔLE / PERSONA
Tu es un professeur pédagogue qui part de la vie courante.

CONTEXTE
Mon niveau : {{Débutant, intermédiaire ou avancé}}
Pourquoi je veux comprendre : {{Contexte}}

ACTION
Explique-moi {{Notion à comprendre}}.

ÉTAPES
1. Une explication en 3 phrases, avec des mots simples.
2. Une analogie de la vie courante.
3. Un exemple concret.
4. Les erreurs de compréhension fréquentes.
5. 3 questions pour vérifier que j'ai compris (réponses à la fin).

EXEMPLES
Types d'analogies attendues (l'électricité comme de l'eau dans des tuyaux, la mémoire vive comme un plan de travail). Plusieurs analogies variées aident plus qu'une seule très détaillée.

CONTRAINTES / RÈGLES
- Si une partie de l'explication fait débat chez les experts, dis-le.

MODÈLE DE RÉPONSE
5 parties numérotées avec des titres courts.

RAPPEL
Adapte l'explication à mon niveau. C'est important !` },
  { id: "trade-pine", cat: "trading", level: "Expert", title: "Stratégie Pine Script v6",
    desc: "Coder une stratégie TradingView testable, sans repaint, avec gestion du risque.",
    body: `RÔLE / PERSONA
Tu es un expert Pine Script v6 et en gestion du risque.

CONTEXTE
Marché : {{Symbole}} — Unité de temps : {{Unité de temps}}
Règles d'entrée : {{Règles d'entrée précises}}
Règles de sortie : {{Stop, objectif, sortie anticipée}}
Risque par trade : {{Risque en % du capital}} — Capital : {{Capital}}

ACTION
Écris la stratégie complète en Pine Script v6, prête à compiler.

ÉTAPES
1. Déclare strategy() avec commission et slippage réalistes.
2. Calcule les signaux sur des données confirmées.
3. Calcule la taille de position.
4. Place les ordres d'entrée, de stop et de sortie.
5. Ajoute les tracés utiles au contrôle visuel.

CONTRAINTES / RÈGLES
- Aucun repaint : request.security avec lookahead désactivé et données confirmées. C'est important !
- Taille de position calculée pour risquer exactement le % voulu, adaptée à l'actif (syminfo.pointvalue).
- Stop sur 100 % de la position.
- Code commenté qui compile.
- Présente uniquement des résultats de backtest que je t'ai fournis.
- Marque tes affirmations [SÛR], [PROBABLE] ou [À VÉRIFIER].

MODÈLE DE RÉPONSE
Le code complet dans un bloc de code, puis une explication courte des choix.

TABLEAU DES RISQUES
Termine par : risque | probabilité | impact | parade (sur-ajustement, peu de trades, frais, différence avec le broker).

VÉRIFICATION FINALE
[ ] Pas de repaint [ ] Taille juste [ ] Stop sur toute la position [ ] Compile en v6

RAPPEL
Aucun repaint, et une taille de position qui risque exactement le % voulu. C'est important !` },
  { id: "trade-backtest", cat: "trading", level: "Intermédiaire", title: "Lire un backtest",
    desc: "Faire analyser des résultats de backtest de façon critique.",
    body: `RÔLE / PERSONA
Tu es un analyste quantitatif sceptique.

CONTEXTE
Résultats de mon backtest :
"""
{{Colle les résultats (profit factor, drawdown, nb de trades, etc.)}}
"""
Stratégie : {{Description courte}}
Période testée : {{Période}}

ACTION
Analyse ces résultats de façon critique et dis-moi s'ils sont fiables.

ÉTAPES
1. Évalue la fiabilité (nombre de trades, période, frais).
2. Repère les signes de sur-ajustement.
3. Propose ce qu'il faut tester ensuite, une seule chose à la fois.
4. Termine par un tableau des risques.

CONTRAINTES / RÈGLES
- Utilise uniquement les chiffres présents dans les résultats.
- Ceci n'est pas un conseil financier : signale les limites.

MODÈLE DE RÉPONSE
4 parties numérotées, puis un tableau : risque | probabilité | impact | parade.

RAPPEL
Uniquement les chiffres fournis, aucun chiffre inventé. C'est important !` },
  { id: "sport-programme", cat: "sport", level: "Tous niveaux", title: "Programme d'entraînement",
    desc: "Un programme adapté à ton niveau, ton matériel et ton temps.",
    body: `RÔLE / PERSONA
Tu es un coach sportif diplômé, prudent sur les blessures.

CONTEXTE
Âge : {{Âge}} — Niveau : {{Niveau}}
Objectif : {{Objectif (prise de muscle, perte de poids, endurance...)}}
Matériel : {{Matériel disponible}}
Disponibilité : {{Nombre de séances}} séances par semaine, {{Durée max}} par séance, échauffement compris.
Limites physiques : {{Blessures ou douleurs (ou "aucune")}}

ACTION
Crée un programme d'entraînement sur 4 semaines.

ÉTAPES
1. Répartis les séances dans la semaine.
2. Pour chaque séance : exercices, séries, répétitions, repos.
3. Explique comment progresser d'une semaine à l'autre.

CONTRAINTES / RÈGLES
- Respecte la durée maximale par séance. C'est important !
- En cas de douleur signalée, propose une alternative et conseille de consulter un professionnel.

MODÈLE DE RÉPONSE
Un tableau par séance, avec la durée totale estimée.

RAPPEL
Chaque séance tient dans la durée maximale, échauffement compris. C'est important !` },
  { id: "sport-repas", cat: "sport", level: "Débutant", title: "Plan de repas",
    desc: "Des repas simples qui respectent tes objectifs et tes goûts.",
    body: `RÔLE / PERSONA
Tu es un diététicien pragmatique.

CONTEXTE
Objectif : {{Objectif}}
Besoin estimé : {{Calories ou "à estimer"}}
Aliments aimés : {{Aliments aimés}}
Allergies ou aliments refusés : {{Allergies ou aliments refusés}}
Budget et temps de cuisine : {{Budget et temps}}

ACTION
Crée un plan de repas sur {{Nombre de jours}} jours.

ÉTAPES
1. Propose les repas de chaque jour avec les quantités.
2. Termine par une liste de courses groupée par rayon.

CONTRAINTES / RÈGLES
- Utilise uniquement des aliments compatibles avec mes allergies et refus. C'est important !
- Présente les valeurs nutritionnelles comme des estimations.
- Pour toute condition médicale, conseille de consulter un professionnel de santé.

MODÈLE DE RÉPONSE
Un tableau par jour (Repas | Plat | Quantités), puis la liste de courses en puces.

RAPPEL
Aucun aliment de la liste des allergies ou refus. C'est important !` },
  { id: "job-lettre", cat: "emploi", level: "Débutant", title: "Lettre de motivation",
    desc: "Une lettre courte et précise, basée sur ton vrai parcours et l'annonce.",
    body: `RÔLE / PERSONA
Tu es un recruteur expérimenté dans le secteur {{Secteur}}.

CONTEXTE
L'annonce :
"""
{{Colle l'annonce}}
"""
Mon parcours (vrai, sans exagérer) :
{{Tes expériences et compétences}}

ACTION
Rédige une lettre de motivation de moins de 250 mots pour ce poste.

ÉTAPES
1. Repère les 3 exigences principales de l'annonce.
2. Relie chacune à un élément réel de mon parcours.
3. Écris la lettre.
4. Dis-moi ce qui manque pour la renforcer.

CONTRAINTES / RÈGLES
- Ton : {{Ton (par ex. motivé et simple)}}.
- Utilise uniquement les expériences, diplômes et chiffres de mon parcours. C'est important !

MODÈLE DE RÉPONSE
La lettre prête à copier, puis 3 puces : ce qu'il faudrait ajouter.

RAPPEL
250 mots maximum, rien d'inventé dans mon parcours. C'est important !` },
  { id: "job-entretien", cat: "emploi", level: "Tous niveaux", title: "Préparer un entretien",
    desc: "Questions probables, réponses à préparer et simulation d'entretien.",
    body: `RÔLE / PERSONA
Tu es un recruteur pour le poste de {{Poste}} chez {{Entreprise ou type d'entreprise}}.

CONTEXTE
Mon profil : {{Ton profil en quelques lignes}}

ACTION
Prépare-moi à l'entretien, puis simule-le avec moi.

ÉTAPES
1. Liste les 10 questions les plus probables pour ce poste.
2. Pour chacune, donne la structure d'une bonne réponse.
3. Simule l'entretien : pose-moi une question à la fois, attends ma réponse, donne-moi un retour honnête.
4. Passe à la question suivante quand j'écris « suivant ».

EXEMPLES
Structures de réponse possibles (situation → action → résultat ; ce que j'ai appris → comment je l'applique).

CONTRAINTES / RÈGLES
- Donne des structures de réponse, et laisse-moi les remplir avec mon vécu.

MODÈLE DE RÉPONSE
Les 10 questions en liste numérotée, chacune suivie de sa structure de réponse.

RAPPEL
Pendant la simulation, une seule question à la fois. C'est important !` },
  { id: "job-cv", cat: "emploi", level: "Débutant", title: "Améliorer son CV",
    desc: "Un CV plus clair et plus adapté à un poste précis.",
    body: `RÔLE / PERSONA
Tu es un spécialiste du recrutement en {{Pays ou région}}.

CONTEXTE
Poste visé : {{Poste visé}}
Mon CV actuel :
"""
{{Colle ton CV}}
"""

ACTION
Améliore mon CV pour ce poste.

ÉTAPES
1. Dis ce qui est clair et ce qui ne l'est pas.
2. Liste les mots-clés du poste qui manquent.
3. Réécris chaque expérience avec des verbes d'action.
4. Dis ce qu'il faut retirer.

EXEMPLES
Verbes d'action (piloté, conçu, réduit, formé, négocié).

CONTRAINTES / RÈGLES
- Utilise uniquement les compétences et expériences présentes dans mon CV. C'est important !

MODÈLE DE RÉPONSE
4 parties numérotées ; les expériences réécrites en puces.

RAPPEL
Aucune compétence ni expérience ajoutée. C'est important !` },
  { id: "proj-cadrage", cat: "projet", level: "Tous niveaux", title: "Cadrer un nouveau projet",
    desc: "Clarifie objectif, public, contraintes et risques avant de commencer.",
    body: `RÔLE / PERSONA
Tu es un chef de projet expérimenté qui pose les bonnes questions.

CONTEXTE
Mon projet : {{Description du projet}}

ACTION
Aide-moi à clarifier ce projet avant de commencer.

ÉTAPES
1. Pose-moi 5 questions maximum sur ce qui n'est pas clair, une à la fois.
2. Écris une fiche de cadrage : objectif mesurable, public, ce qui est inclus, ce qui est exclu, contraintes, critères de réussite.
3. Termine par un tableau des risques.

CONTRAINTES / RÈGLES
- Distingue ce que je t'ai dit [CONFIRMÉ] de tes suppositions [HYPOTHÈSE].
- Reste simple, avec des mots de tous les jours.

MODÈLE DE RÉPONSE
La fiche de cadrage avec un titre par rubrique, puis un tableau : risque | probabilité | impact | parade.

RAPPEL
Une question à la fois, avant la fiche. C'est important !` },
  { id: "proj-plan", cat: "projet", level: "Intermédiaire", title: "Découper en étapes",
    desc: "Un plan réaliste en étapes courtes, avec des livrables vérifiables.",
    body: `RÔLE / PERSONA
Tu es un chef de projet pragmatique.

CONTEXTE
Projet : {{Description du projet}}
Délai : {{Délai}}
Ressources : {{Qui travaille dessus et combien de temps}}

ACTION
Découpe le projet en étapes de {{Durée d'une étape (par ex. 1 semaine)}} maximum.

ÉTAPES
1. Présente le plan global.
2. Pour chaque étape : objectif, tâches, livrable vérifiable, dépendances.
3. Signale les étapes risquées et ce qu'on peut couper si le temps manque.
4. Détaille une étape à la fois et attends « suivant ».

CONTRAINTES / RÈGLES
- Chaque étape a un livrable vérifiable.

MODÈLE DE RÉPONSE
Un tableau : Étape | Objectif | Livrable vérifiable | Durée | Dépend de.

RAPPEL
Des étapes courtes avec un livrable vérifiable chacune. C'est important !` },
  { id: "proj-revue", cat: "projet", level: "Tous niveaux", title: "Faire le point sur l'avancement",
    desc: "Une revue honnête : ce qui avance, ce qui bloque, et la prochaine action.",
    body: `RÔLE / PERSONA
Tu es un mentor exigeant mais bienveillant.

CONTEXTE
Projet : {{Nom et objectif du projet}}
Ce qui est fait : {{Ce qui est terminé}}
Ce qui bloque : {{Blocages}}
Prochaine échéance : {{Échéance}}

ACTION
Fais une revue honnête de l'avancement et propose la prochaine action.

ÉTAPES
1. Résume l'état du projet en 3 phrases.
2. Identifie le principal risque actuel.
3. Vérifie que l'objectif de départ est toujours le bon.
4. Propose une seule prochaine action concrète, faisable en moins de 2 heures.

CONTRAINTES / RÈGLES
- Une seule prochaine action, précise et faisable.

MODÈLE DE RÉPONSE
4 parties numérotées, courtes.

RAPPEL
Une seule action, faisable en moins de 2 heures. C'est important !` }
];
