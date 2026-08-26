# SPORTIX

Application de suivi de musculation — séances, chronomètre de repos, progression et périodisation — conçue comme une Progressive Web App installable, sans backend ni compte utilisateur.

Le projet est né d'un usage personnel très concret : suivre un programme de spécialisation pectoraux/avant-bras sur 8 à 12 semaines, avec supersets, rest-pause, repos variables par exercice et semaine de deload automatique.

## Sommaire

- [SPORTIX](#sportix)
  - [Sommaire](#sommaire)
  - [Fonctionnalités](#fonctionnalités)
    - [Séances](#séances)
    - [Progression](#progression)
    - [Calendrier \& périodisation](#calendrier--périodisation)
    - [Bibliothèque d'exercices](#bibliothèque-dexercices)
    - [Accueil](#accueil)
    - [Données](#données)
    - [PWA](#pwa)
  - [Technologies](#technologies)
  - [Structure du projet](#structure-du-projet)
  - [Installation et utilisation](#installation-et-utilisation)
    - [En local](#en-local)
    - [En production](#en-production)
    - [Installation en PWA](#installation-en-pwa)
  - [Modèle de données](#modèle-de-données)
  - [Roadmap](#roadmap)
  - [Problèmes connus](#problèmes-connus)
  - [Version](#version)

## Fonctionnalités

### Séances
- Création de séances avec un builder d'exercices : séries, répétitions, charge, **repos personnalisable par exercice** (sinon repos par défaut de la séance)
- **Supersets** : couplage de deux exercices enchaînés sans repos entre eux
- Assignation d'une séance à un ou plusieurs jours de la semaine
- Pendant une séance active :
  - Minuteur de repos circulaire (anneau SVG animé) avec repos court configurable pour les protocoles rest-pause
  - Poids et répétitions **éditables en direct**, pré-remplis avec la dernière charge utilisée pour l'exercice
  - Changer d'exercice à la volée (si une machine est prise), passer un exercice, ou en ajouter un non prévu — sans modifier la séance enregistrée
  - Arrêt anticipé avec sauvegarde de la progression déjà réalisée

### Progression
- Historique complet des séances (volume, détail par exercice et par série)
- Records personnels (PR) par exercice, avec date
- Graphiques (canvas natif, sans librairie) : poids du corps, volume total par séance, évolution de charge par exercice

### Calendrier & périodisation
- Blocs d'entraînement (spécialisation, volume, force, **deload**, autre) positionnés sur un calendrier mensuel
- **Lien automatique deload → séance** : si un bloc "Deload" est actif à la date du jour, la séance démarrée réduit automatiquement de moitié les séries et les charges suggérées
- Bandeau "Semaine X/Y" affiché sur l'accueil quand un bloc est actif

### Bibliothèque d'exercices
- CRUD complet, groupé par catégorie musculaire
- Fiche détail par exercice : record, nombre de séances réalisées, dernière utilisation, graphique de charge dédié

### Accueil
- Séance du jour déterminée automatiquement selon le jour de la semaine, avec possibilité de choisir une autre séance manuellement (sélecteur intégré directement à la carte de séance)
- Statistiques de la semaine (séances, volume, poids), records récents
- Mise en page adaptative par paliers de hauteur d'écran (media queries) garantissant qu'aucun défilement n'est nécessaire, y compris sur les très petits écrans (le bloc "Records récents" s'efface automatiquement en dessous d'une certaine hauteur pour laisser la priorité à la séance du jour)

### Données
- Export/import complet en JSON (sauvegarde et transfert entre appareils), accessible depuis le menu **Plus**
- Toutes les données stockées en local (`localStorage`) — aucun compte, aucun serveur

### PWA
- Installable sur écran d'accueil (iOS/Android)
- Fonctionnement hors-ligne via service worker (stratégie *network-first* pour le HTML afin que les mises à jour soient prises en compte immédiatement, *cache-first* pour les assets statiques)
- **Mise à jour automatique** : lorsqu'une nouvelle version du service worker remplace une version précédemment installée, l'app se recharge automatiquement pour utiliser les nouveaux fichiers. Ce rechargement ne se déclenche jamais lors de la toute première installation (seulement lors d'un vrai changement de version), pour éviter d'interrompre le premier affichage. Un bouton **"Vérifier la mise à jour"** (menu Plus) permet aussi de forcer la vérification manuellement à tout moment.

## Technologies

- **HTML / CSS / JavaScript vanilla** — aucun framework, aucune dépendance externe, aucun outil de build
- **JavaScript en modules ES natifs** (`import`/`export`), chargés directement par le navigateur
- **Canvas API** pour les graphiques (implémentation maison, sans librairie de charting)
- **localStorage** comme unique persistance
- **Service Worker + Web App Manifest** pour le support PWA
- Polices **Inter** et **JetBrains Mono** (Google Fonts)
- Design system en **OKLCH** (dégradés, glassmorphism, halos ambiants animés)

## Structure du projet

```
sportix-app/
├── index.html              # Markup — aucune logique inline
├── manifest.json            # Manifeste PWA
├── sw.js                    # Service worker (cache app shell)
├── icon-*.png                # Icônes PWA
├── assets/
│   └── logo.png
├── css/
│   └── styles.css
└── js/
    ├── main.js               # Point d'entrée : init + enregistrement du service worker
    ├── version.js            # Source unique du numéro de version
    ├── state.js              # `db` (persistance localStorage) + état partagé minimal
    ├── utils.js              # Modales génériques (confirm/info), formatage de dates
    ├── calculs.js            # Logique métier pure : PR, volume, deload, streak — sans accès DOM
    ├── nav.js                # Navigation entre vues + registre d'actions + délégation d'événements
    ├── accueil.js             # Écran d'accueil
    ├── seances.js             # CRUD séances + builder d'exercices
    ├── exercices.js           # Bibliothèque d'exercices
    ├── historique.js          # Historique des séances
    ├── poids.js                # Suivi du poids du corps
    ├── progression.js         # Graphiques canvas
    ├── calendrier.js           # Blocs d'entraînement et calendrier mensuel
    ├── timer.js                # Moteur de séance active (le module le plus dense)
    └── data-io.js              # Export / import JSON
```

Chaque élément interactif du HTML déclare son comportement via des attributs `data-action` / `data-onchange` / `data-oninput` plutôt que des gestionnaires `onclick` inline ; `nav.js` centralise la résolution de ces actions vers les fonctions exportées par chaque module.

## Installation et utilisation

Aucune étape de build n'est nécessaire — c'est du JavaScript natif servi tel quel. En revanche, **le navigateur bloque les imports de modules ES en ouverture directe (`file://`)**, donc l'app doit être servie par un serveur HTTP, même en local.

### En local

```bash
# depuis la racine du projet
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

N'importe quel serveur statique fonctionne (`npx serve`, l'extension Live Server de VS Code, etc.).

### En production

Le projet est un site statique pur : il se déploie tel quel sur **GitHub Pages**, **Netlify** ou **Vercel**, sans configuration particulière. Il suffit de pousser le contenu du dossier à la racine du repo (ou du site) et d'activer l'hébergement statique.

### Installation en PWA

Une fois hébergé sur une URL HTTPS, ouvrir le site sur mobile :
- **iOS (Safari)** : bouton Partager → *Sur l'écran d'accueil*
- **Android (Chrome)** : menu ⋮ → *Ajouter à l'écran d'accueil*

## Modèle de données

Toutes les données vivent dans une seule clé `localStorage` (`suiviSportData_v1`), sous forme d'un objet unique :

```
db = {
  exercices:  [...],  // bibliothèque d'exercices
  seances:    [...],  // séances définies par l'utilisateur
  historique: [...],  // séances réalisées
  poids:      [...],  // pesées enregistrées
  blocs:      [...],  // blocs de périodisation (calendrier)
}
```

Cinq exercices de base sont créés automatiquement au premier lancement si la bibliothèque est vide. Les migrations de schéma (ex. ajout du champ `blocs` après coup) sont gérées par des vérifications défensives au chargement plutôt que par un système de versions dédié.

## Roadmap

- Uniformisation de la charte visuelle sur l'écran d'accueil et le menu bas (logo, animations, icônes)
- Fusion/nettoyage de la redondance entre l'onglet "Plus" et l'onglet "Progression" pour l'accès à l'historique
- Adaptation de l'écran d'accueil aux différentes hauteurs d'écran (éviter le scroll)
- Accordéon replié par défaut dans l'éditeur de séance pour les séances à nombreux exercices

## Problèmes connus

- Aucune synchronisation entre appareils : les données sont locales à chaque navigateur/téléphone (l'export/import JSON permet une sauvegarde ou un transfert manuel)
- Aucun test automatisé à ce jour
- La liste des fichiers mis en cache par le service worker (`APP_SHELL` dans `sw.js`) doit être maintenue manuellement à chaque ajout de fichier — seul le nom du cache (version) est automatique
- Point de vigilance pour toute future modification du mécanisme de mise à jour auto : `sw.js` ne doit notifier `APP_UPDATED` que si un ancien cache existait réellement (vraie mise à jour), et `main.js` ne doit recharger sur `controllerchange` que s'il existait déjà un contrôleur avant l'enregistrement — sans ces deux garde-fous, la toute première installation déclenche elle-même un rechargement, interrompant le premier rendu (symptôme observé : le contenu apparaît puis disparaît juste après le chargement)

## Version

**Version actuelle : 0.3.0** (26/08/2026)

La version est centralisée dans `js/version.js` (`APP_VERSION`, `APP_RELEASE_DATE`) :

- Affichée dans l'app, en bas du menu **Plus**
- Le service worker (`sw.js`) est enregistré comme *module* et importe cette constante directement pour nommer son cache (`sportix-v{APP_VERSION}`) — changer la version invalide automatiquement l'ancien cache au chargement suivant, sans avoir à synchroniser un numéro à la main à deux endroits

**Convention** (appliquée manuellement, pas d'outil de versionnage automatisé) :
- `MAJOR` — changement de modèle de données nécessitant une migration
- `MINOR` — nouvelle fonctionnalité
- `PATCH` — correctif ou ajustement visuel

Pour publier une nouvelle version : modifier `APP_VERSION`/`APP_RELEASE_DATE` dans `js/version.js`, c'est le seul endroit à toucher.
