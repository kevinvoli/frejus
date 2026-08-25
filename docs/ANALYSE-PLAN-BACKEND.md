# Frejus — Analyse du site vitrine et plan d'implémentation d'un backend

Document de cadrage — 25 août 2026 (mis à jour le 25 août 2026 après décisions du client)

## Mise à jour du 25 août 2026 — décisions retenues et état d'avancement

Suite à ce document, les décisions suivantes ont été prises et déjà mises en œuvre :

- **Tout le contenu du site (textes, photos, coordonnées, localisation du studio) doit être
  gérable depuis un panneau d'administration**, sans jamais toucher au code. Ce n'est donc pas
  seulement le portfolio/spécialités/témoignages qui sont dynamiques, mais aussi l'accroche
  d'accueil, le texte "à propos" et les coordonnées de contact.
- **Aucun BaaS / service tiers managé de type Supabase** : le backend est un développement
  custom, entièrement auto-hébergé (base de données comprise). L'Option A décrite plus bas
  (BaaS) est donc écartée ; le projet suit une version MVP de l'Option B.
- **Stack retenue** : NestJS (Node.js/TypeScript) + TypeORM + MySQL, plutôt que
  Express/Prisma/PostgreSQL évoqués initialement en section 6 — choix du client, sans impact
  significatif sur l'architecture globale.
- **Développement en local pour l'instant** (base MySQL locale), avec une mise en production
  visée sur **VPS**, via **Docker + pipeline CI/CD GitHub Actions** (build, tests, image Docker
  poussée sur GitHub Container Registry, déploiement SSH sur le VPS).
- **Stockage des images en local** (disque du conteneur / volume Docker), et non sur un service
  externe (Cloudinary/S3), cohérent avec le choix de tout auto-héberger.

**Ce qui a été livré** dans le dossier `backend/` du projet (voir `backend/README.md` pour le
détail des commandes et des routes) :

- Projet NestJS + TypeORM + MySQL fonctionnel, avec entités `SiteSettings` (accroche, à propos,
  coordonnées, réseaux sociaux — la ligne unique de contenu éditable), `Specialty`,
  `PortfolioItem`, `Testimonial`, `ContactMessage`, `AdminUser`.
- Authentification admin par JWT (un compte admin auto-créé au premier démarrage depuis les
  variables d'environnement), toutes les routes de modification protégées.
- Formulaire de contact fonctionnel côté API (persistance en base + protection anti-spam
  "honeypot"), remplaçant le `alert()` de simulation du frontend actuel.
- Upload d'images (JPEG/PNG/WEBP/GIF, 8 Mo max) servies en statique par l'API.
- `Dockerfile`, `docker-compose.yml` (développement local) et `docker-compose.prod.yml`
  (racine du dépôt, VPS — orchestre `backend/` et `admin/` ensemble, voir plus bas).
- Pipeline `.github/workflows/backend-ci-cd.yml` : tests + build → image Docker sur GHCR →
  déploiement SSH sur le VPS (nécessite de renseigner les secrets GitHub décrits en tête de ce
  fichier de workflow avant que le déploiement automatique fonctionne).
- Vérification effectuée : build TypeScript, lint et tests unitaires passent ; un test
  d'intégration complet a été exécuté avec un vrai serveur MySQL (démarrage de l'API, connexion
  à la base, création automatique des tables, authentification, CRUD protégé, formulaire de
  contact avec accents et honeypot, upload et service statique d'une image) — tous les scénarios
  testés fonctionnent comme attendu.

**Ce qui a été livré** dans le dossier `admin/` du projet (voir `admin/README.md`) — la Phase 3
(back-office) est désormais faite :

- Panneau d'administration React + Vite + TypeScript + Mantine, servant de client complet à
  l'API `backend/` : connexion JWT (avec redirection automatique vers `/login` en cas de session
  expirée), édition du contenu du site (`site_settings`), CRUD spécialités/portfolio/témoignages
  avec upload d'images, boîte de réception du formulaire de contact (lecture/statut/suppression).
- Gestion de la conversion chaîne vide → `null` avant envoi à l'API (nécessaire pour pouvoir
  vider un champ déjà renseigné, l'API distinguant `undefined`/`null` d'une chaîne vide).
- `Dockerfile` (multi-étapes : build Vite → image nginx statique avec repli SPA
  `try_files ... /index.html`) et `nginx.conf`.
- Pipeline `.github/workflows/admin-ci-cd.yml` : lint + build → image Docker sur GHCR →
  déploiement SSH sur le VPS, service `admin` du même `docker-compose.prod.yml` que l'API
  (secrets GitHub à renseigner, dont `ADMIN_VITE_API_URL` car l'URL de l'API est gravée dans le
  build Vite).
- Vérification effectuée : build TypeScript et lint passent ; le contrat d'API attendu par le
  code du panneau (formes exactes des requêtes envoyées pour chaque formulaire) a été vérifié par
  une batterie de requêtes reproduisant fidèlement celles du panneau contre un vrai backend
  démarré pour l'occasion — tous les scénarios testés (mise à jour des réglages avec champs nuls,
  création portfolio/spécialités, listes admin complètes) correspondent exactement à ce que le
  code TypeScript du panneau suppose. **Non vérifié dans cet environnement** : rendu et
  interactions réelles de l'interface dans un navigateur (pas d'accès à un navigateur Chrome
  connecté depuis ce contexte de développement) — à tester une première fois sur votre machine
  (`npm run dev` dans `admin/`) avant mise en production.

**Ce qui a été livré** dans le dossier `frontend/` du projet — la Phase 2 (frontend dynamique)
est désormais faite :

- Le site vitrine consomme désormais l'API (`GET /settings`, `/specialties`, `/portfolio`,
  `/testimonials`, `POST /contact`) au lieu des données codées en dur : `Hero`/`About`/`Contact`/
  `Footer` affichent le contenu de `site_settings` (accroche, à propos, coordonnées, réseaux
  sociaux), `Specialties`/`Portfolio`/`Testimonials` listent les éléments réels créés dans le
  panneau admin, et les catégories du filtre portfolio sont désormais dérivées des éléments reçus
  plutôt qu'une liste figée.
- Le formulaire de contact envoie réellement `POST /contact` (avec le champ honeypot `website`,
  masqué en CSS) au lieu du `alert()` de simulation, et affiche un message de succès/erreur.
- **Dégradation résiliente** : chaque section est initialisée avec le contenu de repli d'origine
  (`src/defaultContent.ts`) et ne l'écrase que si l'API répond — le site reste présentable même
  pendant le chargement ou si le backend est injoignable, plutôt que d'afficher une page vide ou
  cassée.
- `VITE_API_URL` (voir `frontend/.env.example`) configure l'URL de l'API, avec le même
  avertissement que pour l'admin : Vite grave cette valeur en dur au moment du build, donc changer
  l'URL en production nécessite un nouveau déploiement (secret GitHub `FRONTEND_VITE_API_URL`
  ajouté à `.github/workflows/deploy.yml`).
- Vérification effectuée : build TypeScript OK ; **vérification bout-en-bout réelle** cette fois
  (contrairement au panneau admin) — un vrai backend a été démarré, du contenu réel injecté
  (réglages, spécialité, élément de portfolio, témoignage), le site lancé en local pointant dessus
  et capturé par navigateur (Playwright, faute d'accès à Chrome de l'utilisateur depuis cet
  environnement) : l'accroche, le texte à propos, les coordonnées, les spécialités, le portfolio
  (avec filtres dynamiques) et les témoignages réels s'affichent correctement, et une soumission
  réelle du formulaire de contact a été retrouvée dans la base de données (`contact_messages`).

**Ce qu'il reste à faire** (prochaines étapes concrètes, cf. section 9 mise à jour) : tester le
panneau admin en conditions réelles dans un navigateur, ajouter de vraies photos (actuellement les
sections sans image affichent un aplat de couleur de repli), provisionner le VPS et renseigner les
secrets des trois pipelines CI/CD, puis mettre en place de vraies migrations TypeORM avant d'y
stocker des données réelles (voir avertissement en section 8).

## 1. Résumé

Le projet `frejus` est actuellement un **site vitrine 100 % statique** (React 18 + Vite + TypeScript) pour un photographe fictif/à personnaliser ("Pixellia Photographie"), déployé sur GitHub Pages via GitHub Actions. Il n'existe **aucun backend, aucune base de données, aucun stockage d'images et aucun formulaire fonctionnel** : tout le contenu (portfolio, spécialités, témoignages, coordonnées) est codé en dur dans les composants React, et le formulaire de contact se contente d'un `alert()` de simulation.

Dynamiser ce site suppose donc deux chantiers distincts mais liés :

1. **Construire un backend** (API + base de données + stockage) permettant de gérer le contenu sans toucher au code.
2. **Faire évoluer le frontend** pour qu'il consomme ce backend au lieu de données statiques, et ajouter les fonctionnalités qui nécessitent un serveur (formulaire de contact réel, upload d'images, éventuellement prise de rendez-vous).

Ce document dresse l'état des lieux technique, identifie les manques, propose des options d'architecture chiffrées en effort, un modèle de données, et une feuille de route par phases.

## 2. État des lieux technique

### 2.1 Stack actuelle

| Élément | Détail |
|---|---|
| Framework | React 18.2 + Vite 4.3 + TypeScript 5 |
| Rendu | Single-page, une seule route, navigation par ancres (`#accueil`, `#portfolio`, …) |
| Style | CSS classique (`src/index.css`), pas de framework CSS (Tailwind, etc.) |
| État | Aucun state manager global ; un seul `useState` local (filtre du portfolio) |
| Build | `tsc && vite build` → dossier `dist/` |
| Déploiement | GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages, déclenché sur push vers `master` |
| Backend | **Aucun** |
| Base de données | **Aucune** |
| Gestion de contenu | **Aucune** — tout est en dur dans le JSX |

### 2.2 Composants existants

- `Header` — logo + navigation par ancres
- `Hero` — accroche + CTA
- `About` — texte de présentation + emplacement image (non rempli)
- `Specialties` / `SpecialtyCard` — 3 cartes de spécialités, données codées en dur dans `Specialties.tsx`
- `Portfolio` — 6 éléments avec filtre par catégorie ; les "images" sont des `div` de couleur unie (`backgroundColor`), **aucune vraie photo**
- `Testimonials` — **un seul** témoignage codé en dur, pas de carrousel fonctionnel malgré la classe `testimonials-slider`
- `Contact` — formulaire HTML dont le `onSubmit` fait `e.preventDefault()` puis `alert('Message envoyé ! (Simulation)')` : **aucun envoi réel, aucune persistance**
- `Footer` — liens, dont plusieurs pointent vers `#` (mentions légales, RGPD, réseaux sociaux)

### 2.3 Autre constat

Le fichier `deepseek_html_20251001_d7f991.html` à la racine est la maquette HTML/CSS/JS d'origine ("Maquette Site Photographe") qui a servi de base à la conversion en composants React. La conversion est fidèle à l'identique — aucun contenu réel n'a été ajouté lors du passage à React, ce qui confirme que le projet en est encore au stade de gabarit ("template") et non de site opérationnel.

On note aussi une incohérence de contenu à corriger indépendamment du backend : le nom du dossier projet ("frejus", ville du Var) ne correspond pas au contenu affiché, qui situe le studio à Paris ("123 Avenue des Champs-Élysées, 75008 Paris"). À clarifier avec le client réel avant toute mise en production.

### 2.4 Contrainte d'hébergement importante

GitHub Pages **ne sert que des fichiers statiques** : il est structurellement impossible d'y héberger une API ou une base de données. Toute solution backend devra donc être hébergée ailleurs (service séparé), le frontend continuant à interroger cette API via HTTP depuis GitHub Pages — ou bien le frontend devra lui-même être déplacé vers un hébergeur capable de servir à la fois le site et des fonctions serveur (Vercel, Netlify, etc.).

## 3. Besoins identifiés pour la dynamisation

En comparant l'état actuel aux attentes normales d'un site vitrine professionnel pour un photographe, les manques suivants ressortent :

- **Gestion de contenu sans redéploiement** : pouvoir ajouter/modifier une photo de portfolio, une spécialité ou un témoignage sans passer par un commit Git et un build.
- **Formulaire de contact fonctionnel** : réception réelle des messages (email et/ou stockage en base), avec protection anti-spam basique.
- **Upload et gestion d'images** : stockage optimisé (redimensionnement, formats modernes) pour un vrai portfolio photo — un enjeu particulièrement sensible pour un site de photographe où le poids des images impacte directement la performance.
- **Espace d'administration protégé** pour que le photographe gère lui-même son contenu (authentification).
- **Prise de rendez-vous / demande de devis** (fonctionnalité métier courante chez les photographes, actuellement absente au-delà d'un simple formulaire).
- **SEO dynamique** : meta-données, sitemap, Open Graph par page/section, actuellement statiques et minimales (`index.html` n'a qu'une description générique).
- **Conformité RGPD** minimale sur la collecte des données du formulaire de contact.
- **Analytics** de fréquentation (actuellement absent).

## 4. Options d'architecture backend

Trois options sont envisageables, du plus rapide au plus complet.

### Option A — Backend-as-a-Service (BaaS) + services externes ciblés

**Principe** : pas de serveur à coder ni à maintenir. Utiliser Supabase (PostgreSQL + Auth + Storage managés, offre gratuite généreuse) pour stocker portfolio/spécialités/témoignages, un service de formulaire (Resend pour l'envoi d'email transactionnel, ou une fonction serverless légère) pour le contact, et l'admin bundlé de Supabase (ou une mini-interface React) pour la saisie.

- Effort : faible (quelques jours à 1-2 semaines)
- Coût : gratuit à très faible au démarrage
- Limite : moins de contrôle fin, dépendance à un fournisseur tiers

### Option B — API custom Node.js + base de données dédiée

**Principe** : une API REST (Express ou Fastify) avec PostgreSQL (via Prisma ORM), hébergée séparément (Render, Railway ou Fly.io), exposant des routes `/api/portfolio`, `/api/testimonials`, `/api/contact`, etc. Authentification admin par JWT. Le frontend React continue d'être servi statiquement et consomme cette API.

- Effort : moyen (4 à 6 semaines pour une V1 complète avec back-office)
- Coût : faible sur offres gratuites/hobby, mais attention au "cold start" des instances gratuites
- Avantage : contrôle total, pas de verrouillage fournisseur, bonne base pour évoluer (réservations, paiement en ligne, etc.)

### Option C — Migration vers un framework full-stack (Next.js ou Astro + API routes)

**Principe** : remplacer Vite pur par Next.js (ou Astro en mode hybride), avec des routes API intégrées et une base de données (Prisma + PostgreSQL). Permet le rendu serveur/statique hybride (SSR/SSG), meilleur pour le SEO et les images.

- Effort : élevé (implique une réécriture partielle de la structure du projet)
- Avantage : architecture la plus pérenne et la plus performante à long terme
- Inconvénient : coût de migration le plus élevé pour un site actuellement très simple

### Recommandation

Compte tenu de la taille actuelle du projet (site vitrine simple, un seul utilisateur admin, pas de trafic existant), **l'option B** offrait le meilleur compromis entre autonomie, coût maîtrisé et capacité d'évolution. **Décision du client (25 août 2026) : l'option B est retenue dans une version MVP, entièrement auto-hébergée et sans aucun service tiers managé (pas de Supabase, pas de BaaS)** — y compris pour le stockage des images, géré en local plutôt que via Cloudinary/S3. L'option C est à garder en tête si le site doit fortement grandir (multi-langue, blog, forte volumétrie d'images, SEO poussé).

## 5. Modèle de données (proposé initialement, implémenté depuis)

| Table / collection | Champs principaux | Usage |
|---|---|---|
| `site_settings` | id (ligne unique), titre et sous-titre d'accueil, image d'accueil, texte "à propos", image "à propos", nom du studio, adresse, ville, téléphone, email, horaires, réseaux sociaux | Tout le contenu éditable qui n'a pas sa propre table — ajouté suite à la demande du client que la localisation, les textes et les coordonnées soient pilotables depuis l'admin |
| `specialties` | id, titre, description, image_url, ordre | Section "Mes spécialités" |
| `portfolio_items` | id, titre, catégorie, image_url, image_thumb_url, ordre, publié | Section "Portfolio" avec filtre par catégorie |
| `testimonials` | id, nom_client, texte, note, publié, créé_le | Section "Témoignages" (permet enfin d'en avoir plusieurs) |
| `contact_messages` | id, nom, email, sujet, message, statut (nouveau/traité), créé_le | Réception réelle du formulaire de contact |
| `booking_requests` *(optionnel)* | id, nom, email, téléphone, type_prestation, date_souhaitée, message, statut | Demandes de séance/devis |
| `admin_users` | id, email, mot_de_passe_hash, rôle | Authentification de l'espace d'administration |

## 6. Stack technique (retenue et implémentée)

- **Frontend** : React + Vite + TypeScript, consommant l'API via un client `fetch` maison (pas de dépendance ajoutée — TanStack Query envisagé initialement s'est avéré superflu pour ce volume de requêtes). *(fait — voir `frontend/src/api/`)*
- **Backend** : NestJS (Node.js/TypeScript), TypeORM. *(fait — voir `backend/`)*
- **Base de données** : MySQL 8, en local pour l'instant, hébergée sur le VPS en production. *(fait)*
- **Stockage images** : disque local du conteneur/VPS via un volume Docker (`uploads_data`), pas de service externe. *(fait — à migrer vers un stockage objet type S3-compatible seulement si le volume de photos grossit beaucoup ou si l'API doit tourner sur plusieurs instances)*
- **Email** : non implémenté à ce stade — les messages de contact sont stockés en base et consultables via l'API/l'admin ; une notification email (Nodemailer/SMTP) pourra être ajoutée sans changer le contrat d'API.
- **Authentification admin** : JWT + bcrypt, compte admin auto-créé au premier démarrage depuis les variables d'environnement. *(fait)*
- **Hébergement backend** : VPS, via Docker + `docker-compose.prod.yml` (racine du dépôt), déployé par le pipeline CI/CD GitHub Actions. *(pipeline prêt — VPS à provisionner et secrets GitHub à renseigner)*
- **Panneau admin** : React + Vite + TypeScript + Mantine, servi statiquement par nginx dans un conteneur Docker (service `admin`), sur le **même VPS que le backend**, déployé par son propre pipeline CI/CD. *(fait — voir `admin/`)*
- **Hébergement frontend** : conserver GitHub Pages pour l'instant (le workflow existant `deploy.yml` n'est pas modifié).

## 7. Feuille de route par phases

| Phase | Contenu | Statut |
|---|---|---|
| 0 — Cadrage | Contenu réel du client (textes, vraies photos, coordonnées exactes), choix définitif d'hébergeur, maquette de l'espace admin | Décisions d'architecture prises (25/08) ; contenu réel et maquette admin encore à fournir/valider |
| 1 — Fondations backend | API NestJS + TypeORM/MySQL (CRUD `site_settings`/portfolio/spécialités/témoignages/contact), authentification admin JWT, upload d'images | **Fait** — voir `backend/`, vérifié par build + lint + tests + test d'intégration bout-en-bout |
| 2 — Frontend dynamique | Remplacement des données codées en dur par des appels API, gestion des états de chargement/erreur, formulaire de contact branché à l'API | **Fait** — voir `frontend/src/api/` et `defaultContent.ts`, vérifié bout-en-bout contre un vrai backend (contenu réel affiché, message de contact retrouvé en base) |
| 3 — Back-office | Interface d'administration (CRUD contenu, upload d'images) consommant l'API existante | **Fait** — voir `admin/`, build + lint OK, contrat d'API vérifié contre le backend réel ; test navigateur réel encore à faire sur votre machine |
| 4 — SEO & performance | Meta-données dynamiques, `sitemap.xml`, Open Graph, lazy-loading et optimisation des images, audit Lighthouse | À faire |
| 5 — Déploiement & CI/CD | Dockerfile, docker-compose (local et VPS), pipelines GitHub Actions (build/tests → image GHCR → déploiement SSH), pour `backend/` et `admin/` | Pipelines et fichiers Docker **prêts** pour les deux projets ; VPS à provisionner et secrets GitHub à renseigner (voir `.github/workflows/backend-ci-cd.yml` et `admin-ci-cd.yml`) ; migrations TypeORM encore à mettre en place avant données réelles |
| 6 — Recette & mise en production | Tests fonctionnels, correction de l'incohérence de contenu (localisation, coordonnées), formation du client à l'espace admin | À faire |

**Durée totale estimée** : environ 6 à 8 semaines à temps partiel pour une V1 complète (option B), ou 1 à 2 semaines pour un MVP minimal avec l'option A (Supabase + service de formulaire, sans back-office custom).

## 8. Points d'attention et risques

- **Cold start** des instances gratuites (Render notamment) : la première requête après une période d'inactivité peut prendre plusieurs secondes — acceptable en V1, à surveiller si le trafic augmente.
- **Coûts** : les offres gratuites suffisent au lancement mais ont des plafonds (stockage, bande passante, requêtes) à surveiller.
- **Sécurité du formulaire** : validation côté serveur, limitation de débit (rate limiting), protection anti-spam (honeypot ou reCAPTCHA) à prévoir dès la phase 2.
- **RGPD** : le formulaire de contact collecte des données personnelles (nom, email) — prévoir une mention d'information et une politique de confidentialité réelle (actuellement un lien mort dans le footer).
- **Contenu réel manquant** : aucune vraie photo, aucun vrai témoignage, coordonnées factices — ce chantier de contenu est indépendant du backend mais bloquant pour une mise en production sérieuse.
- **Nom de domaine** : aucun domaine personnalisé identifié à ce stade ; à prévoir si le site passe en production réelle.

## 9. Prochaines étapes (mises à jour au 25 août 2026)

1. Tester le panneau admin (`admin/`) une première fois dans un vrai navigateur (`npm run dev`, connexion, édition de chaque section) — le contrat d'API a été vérifié mais pas le rendu/interactions réels de l'interface (contrairement au frontend, désormais vérifié bout-en-bout).
2. Ajouter de vraies photos via le panneau admin (portfolio, spécialités, accueil, à propos) — le site affiche pour l'instant des aplats de couleur de repli tant qu'aucune image n'est renseignée.
3. Provisionner un VPS, y déployer `docker-compose.prod.yml` (racine du dépôt, orchestre `api` + `admin`), et renseigner les secrets GitHub requis par `.github/workflows/backend-ci-cd.yml`, `admin-ci-cd.yml` et `deploy.yml` (`VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_DEPLOY_PATH`, `ADMIN_VITE_API_URL` pour l'admin, `FRONTEND_VITE_API_URL` pour le frontend) pour activer le déploiement automatique des trois projets.
4. Avant d'y stocker des données réelles : mettre en place de vraies migrations TypeORM et passer `DB_SYNCHRONIZE=false` (actuellement à `true` pour la rapidité du MVP — voir avertissement en section 8 et dans `backend/README.md`).
5. Valider avec le client réel le contenu définitif (textes, photos, coordonnées) et clarifier la localisation du studio (Fréjus vs Paris) — ce contenu peut désormais être saisi directement dans le panneau admin et apparaît immédiatement sur le site vitrine.
