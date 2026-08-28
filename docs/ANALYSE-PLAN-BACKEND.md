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
- `Dockerfile`, `docker-compose.yml` (développement local) et `deploy/apps/frejus/docker-compose.yml`
  (VPS — orchestre `frontend/`, `backend/` et `admin/` ensemble, voir plus bas).
- Pipeline `.github/workflows/ci-cd.yml`, composant `backend` : tests + build → image Docker sur GHCR →
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
- Pipeline `.github/workflows/ci-cd.yml`, composant `admin` : lint + build → image Docker sur GHCR →
  déploiement SSH sur le VPS, service `admin` du même `docker-compose.yml` que l'API
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

## Mise à jour du 25 août 2026 (suite) — médiathèque cliente (galeries privées)

Le site vitrine est un site de photographe : le client a demandé un espace où les photos et
vidéos issues d'une séance puissent être stockées et mises à disposition de ses propres clients,
qui doivent pouvoir venir télécharger uniquement les fichiers qui leur appartiennent — sans compte
à créer côté client, et sans jamais accepter un autre type de fichier qu'une photo ou une vidéo.

**Décisions retenues** (validées par le client, choix "Recommandé" à chaque fois) :

- **Accès par lien privé, par galerie** (pas de compte client) : chaque galerie possède un jeton
  d'accès opaque intégré dans une URL partagée par le photographe (`/?galerie=<token>`), avec
  protection par mot de passe optionnelle — inspiré du fonctionnement de Pixieset.
- **Organisation en galeries par séance** : un même client peut recevoir plusieurs galeries dans
  le temps (une par mariage, séance portrait, événement...), chacune avec son propre lien.
- **Limite de taille par fichier : 200 Mo** (photos et vidéos), adaptée à un VPS modeste — bien
  au-delà des 8 Mo déjà en place pour les images du site vitrine, car les livrables clients sont
  souvent des fichiers pleine résolution.
- **Téléchargement fichier par fichier, et "tout télécharger" en ZIP** généré à la volée
  (`archiver`), sans stocker d'archive intermédiaire sur le disque.
- Comme pour le reste du projet : **aucun stockage externe** (pas de S3/Cloudinary) — les fichiers
  restent sur le disque du VPS, dans `backend/uploads/galleries/`.

**Ce qui a été livré** dans `backend/src/galleries/` :

- Entités `ClientGallery` (titre, client, description, jeton d'accès, hash de mot de passe
  optionnel, date d'expiration optionnelle) et `MediaItem` (type photo/vidéo, fichier, taille,
  ordre) — une contrainte `ON DELETE CASCADE` supprime les médias avec leur galerie.
- Upload multi-fichiers (`POST /galleries/:id/media`, jusqu'à 100 fichiers par appel) avec une
  liste blanche stricte de types MIME (JPEG/PNG/WEBP/GIF pour les photos, MP4/MOV/WEBM pour les
  vidéos) : **tout autre type de fichier est rejeté avec une erreur 400**, conformément à la
  demande. Le type stocké en base (`photo`/`vidéo`) est dérivé du MIME réel du fichier, jamais
  choisi librement par l'appelant.
- Accès public sans authentification : `GET /galleries/access/:token` (déverrouille directement
  si pas de mot de passe, sinon indique `requiresPassword: true`), `POST
  /galleries/access/:token/verify` (vérifie le mot de passe par bcrypt, délivre un jeton d'accès
  JWT de courte durée — 6h — utilisé ensuite pour les téléchargements). Les liens expirés
  (`expiresAt` dépassée) sont refusés.
- Téléchargements : fichier unique (`GET
  .../media/:mediaId/download?access=<jwt>`) et archive ZIP complète générée à la volée (`GET
  .../download-all?access=<jwt>`), tous deux protégés par le jeton d'accès de la galerie.
- Routes d'administration (protégées par le même JWT admin que le reste du panneau) : création,
  modification (y compris changer ou retirer le mot de passe), suppression d'une galerie (avec
  nettoyage des fichiers sur disque), ajout/suppression de médias. Les réponses admin exposent un
  booléen `hasPassword` plutôt que le hash bcrypt du mot de passe, cohérent avec le traitement déjà
  appliqué au mot de passe du compte admin.

**Ce qui a été livré** dans `admin/src/pages/GalleriesPage.tsx` et `GalleryDetailPage.tsx`
(nouvelle rubrique "Médiathèque" du panneau) :

- Liste des galeries (client, nombre de médias, badge "Protégée"/"Libre"), création/édition avec
  bascule dédiée pour changer ou retirer un mot de passe, suppression avec confirmation.
- Page de détail d'une galerie : lien à copier en un clic, zone de dépôt multi-fichiers
  (glisser-déposer, `@mantine/dropzone`) avec la même liste blanche de types côté client pour un
  retour immédiat, grille des médias avec vignette (photo) ou pictogramme (vidéo), suppression
  individuelle d'un média.

**Ce qui a été livré** dans `frontend/src/components/GalleryView.tsx` (nouvelle page cliente) :

- Accessible via `/?galerie=<token>` sur le site vitrine existant, sans routeur supplémentaire
  (lecture du paramètre d'URL au chargement). Gère les trois états possibles : galerie verrouillée
  (formulaire de mot de passe), déverrouillée (grille de photos/vidéos avec téléchargement
  individuel et bouton "Télécharger tout (.zip)"), ou introuvable/expirée (message d'erreur clair).

**Vérification effectuée** : build TypeScript et lint (backend + admin + frontend) sans erreur.
Vérification bout-en-bout réelle contre un vrai backend démarré pour l'occasion : upload
photo/vidéo réussi, upload d'un fichier `.txt` rejeté avec 400, accès public direct et par mot de
passe (bon et mauvais mot de passe), émission et vérification du jeton d'accès temporaire,
téléchargement d'un fichier unique (contenu vérifié identique à l'original) et téléchargement ZIP
(archive valide contenant les bons fichiers), suppression d'un média (fichier supprimé du disque),
suppression d'une galerie protégée après retrait du mot de passe. Contrairement à la vérification
du panneau admin lors de la Phase 3 initiale, celle-ci a inclus un **rendu et des interactions
réelles dans un navigateur** (Playwright) pour les trois surfaces (panneau admin, page cliente),
captures à l'appui : création d'une galerie, dépôt d'un fichier par glisser-déposer avec
apparition immédiate dans la grille, retrait d'un mot de passe existant, et les trois états de la
page cliente (verrouillée, déverrouillée, introuvable) avec un téléchargement réellement abouti.

**Ce qu'il reste à faire** : ajouter `VITE_FRONTEND_URL` aux secrets GitHub du pipeline
`ci-cd.yml` (nécessaire pour que le bouton "Copier le lien" du panneau construise la bonne
URL en production) ; envisager, si le volume de galeries grandit, un job de nettoyage automatique
des galeries expirées (actuellement le lien cesse simplement de répondre, les fichiers restent sur
le disque).

## Mise à jour du 26 août 2026 — parcours client par code court (au lieu d'un lien par galerie)

Précision apportée par le client sur l'usage réel : il ne partage pas un lien différent par
galerie. Il partage le lien normal de son site à tout le monde lors d'un événement ; les visiteurs
parcourent alors le site normalement (spécialités, portfolio...). Pour récupérer ses photos, un
client clique sur un bouton dédié qui fait apparaître un champ, y tape un **code unique** que le
photographe lui a donné (oralement, par SMS, sur un papier...), et accède alors uniquement à son
propre catalogue de photos pour le télécharger.

Ce parcours remplace le lien par galerie comme point d'entrée principal (décision validée : garder
le mot de passe optionnel comme avant, plutôt que de le rendre obligatoire pour compenser un code
plus court — voir ci-dessous) :

- **Le jeton d'accès devient un code court et prononçable** : 8 caractères sur un alphabet de 32
  symboles non ambigus à l'oral/à l'écrit (ni 0/O, ni 1/I/L), généré aléatoirement de façon
  cryptographique (`crypto.randomInt`) et vérifié unique en base avant utilisation. Affiché dans
  l'admin en deux groupes de 4 (ex. `RN8S-ZWAF`) pour la lisibilité. L'ancien format (jeton
  hexadécimal de 48 caractères) reste accepté tel quel pour toute galerie déjà créée avant ce
  changement — aucune migration nécessaire, `access_token` reste une simple colonne texte.
- **Normalisation du code en défense en profondeur** : le backend met en majuscules et retire tout
  caractère non alphanumérique du code reçu, que ce soit via le champ du site vitrine ou une URL
  `?galerie=...` tapée à la main — un client qui tape le code en minuscules, avec des espaces ou
  le tiret de lisibilité, est donc toujours reconnu.
- **Nouveau bouton "Récupérer mes photos" dans le menu du site vitrine** (`frontend/src/components/Header.tsx`) : visible sur toutes les pages, fait apparaître un petit formulaire avec le champ de code. La soumission met à jour l'URL (`?galerie=<code>`) sans recharger la page et affiche la même page de galerie que précédemment (`GalleryView.tsx`, inchangée sur le fond) — un lien direct `?galerie=<code>` continue donc aussi de fonctionner, pour un photographe qui préférerait exceptionnellement envoyer un lien.
- **Panneau admin mis à jour** (`GalleriesPage.tsx`, `GalleryDetailPage.tsx`) : le code est
  désormais l'élément mis en avant (affiché en grand, bouton "Copier le code" en premier plan), le
  lien direct est relégué en option secondaire discrète. La liste des galeries affiche une colonne
  "Code" dédiée (avec troncature + infobulle pour les rares galeries encore sur l'ancien format
  long). Libellés mis à jour ("Accès libre par code" plutôt que "par lien").

**Vérification effectuée** : build + lint (backend + admin + frontend) sans erreur. Test réel
contre un vrai backend : génération d'un code de 8 caractères, résolution correcte d'un code tapé
en minuscules avec tiret via `curl`, et un parcours complet en navigateur (Playwright) — départ
sur la page d'accueil normale du site (celle que le photographe partage), clic sur "Récupérer mes
photos", saisie du code en minuscules avec tiret, affichage de la bonne galerie, retour à l'accueil
via le logo. Les anciennes galeries créées avec le format long continuent de s'afficher et de
fonctionner normalement dans l'admin (juste tronquées visuellement dans le tableau).

## Mise à jour du 26 août 2026 (suite) — limite du nombre d'utilisations du code

Complément demandé par le client sur le code d'accès : au-delà de la date d'expiration
(`expiresAt`, déjà existante), le code doit aussi pouvoir être limité à un **nombre
d'utilisations fixé par le photographe**. Question de sémantique posée et tranchée : une
« utilisation » compte-t-elle à chaque ouverture de la galerie, ou une fois par appareil ?
Décision retenue : **une fois par navigateur, mémorisé 30 jours** — un client qui revient
consulter ou re-télécharger ses photos depuis le même navigateur dans ce délai ne consomme pas
une utilisation supplémentaire ; seul un nouveau navigateur/appareil en consomme une.

- **Modèle de données** (`backend/src/galleries/entities/client-gallery.entity.ts`) : deux
  colonnes ajoutées à `client_galleries` — `max_uses` (entier, `null` = illimité, fixé par
  l'admin) et `use_count` (entier, compteur serveur, jamais modifiable directement). Créées
  automatiquement au démarrage du backend (`synchronize: true` en développement) — aucune
  migration manuelle nécessaire.
- **Mécanisme de comptage** (`galleries.service.ts`) : au déverrouillage d'une galerie (sans
  mot de passe : au chargement direct ; avec mot de passe : après vérification correcte), le
  backend émet — en plus du jeton de téléchargement existant (`gallery-access`, 6h) — un second
  jeton signé `gallery-usage` (30 jours), une sorte de « reçu d'utilisation ». Ce reçu est
  mémorisé côté client (`localStorage` du site vitrine, clé par code de galerie) et renvoyé au
  backend à chaque nouvelle visite (`GET .../access/:token?usage=...` ou champ `usage` du corps
  de `POST .../verify`). Si le reçu est valide pour cette galerie, le backend sait qu'il ne
  s'agit pas d'une nouvelle utilisation et ne réincrémente pas `use_count` ; sinon, il vérifie
  `use_count < max_uses` (sauf si `max_uses` est `null`, c'est-à-dire illimité), incrémente le
  compteur, et émet un nouveau reçu. Un mot de passe saisi incorrectement ne consomme jamais
  d'utilisation — seul un déverrouillage réussi compte.
- **Limite atteinte** : le backend répond `403 Forbidden` (« Ce code a atteint son nombre
  maximal d'utilisations »). Côté site vitrine (`GalleryView.tsx`), ce cas est traité comme un
  état terminal — même page « Galerie indisponible » que pour un code introuvable ou expiré,
  plutôt qu'une erreur incrustée dans le formulaire de mot de passe (qui inviterait à réessayer
  alors que retenter ne changerait rien).
- **Panneau admin** (`GalleriesPage.tsx`, `GalleryDetailPage.tsx`) : champ « Nombre
  d'utilisations max » dans le formulaire de création/modification de galerie (vide = illimité,
  cohérent avec le champ date d'expiration juste à côté) ; colonne « Utilisations » dans la
  liste et rappel dans la fiche détail, affichés sous la forme `useCount / maxUses` (ou juste
  `useCount` si illimité). Modifier la limite ensuite (l'augmenter, la réduire, ou la remettre à
  vide pour repasser en illimité) n'affecte jamais les utilisations déjà comptées.

**Vérification effectuée** : build + lint sans erreur (backend, admin, frontend). Test réel de
bout en bout en navigateur (Playwright, plusieurs contextes de navigation isolés simulant des
navigateurs distincts) contre le build de production du site vitrine (le mode développement de
React, avec son double rendu délibéré des effets, aurait faussé le comptage — vérifié
séparément et confirmé sans impact en production) : création d'une galerie avec une limite de 2
utilisations, un même navigateur revenant 3 fois sans consommer de nouvelle utilisation,
un deuxième navigateur consommant la 2ᵉ utilisation, un troisième bloqué avec le message
attendu ; augmentation de la limite à 5 depuis l'admin débloquant immédiatement l'accès pour de
nouveaux navigateurs ; même comportement vérifié avec une galerie protégée par mot de passe
(le formulaire de mot de passe ne consomme rien tant qu'il n'est pas rempli correctement) ;
remise à vide du champ confirmée comme repassant la galerie en illimité.

## Mise à jour du 26 août 2026 (suite) — refonte du panneau admin : Réglages du site

Début d'une refonte plus large du panneau admin ("designer plus proprement"), commencée par la
page "Réglages du site". Jusqu'ici, les 14 champs du contenu éditable (accroche, à propos,
coordonnées du studio, réseaux sociaux) formaient un seul gros formulaire, enregistré en bloc
dans une seule table `site_settings` — pratique à écrire mais peu lisible à l'usage, et un seul
échec de validation sur un champ bloquait l'enregistrement de tout le reste. Décision : chaque
section visuelle devient un formulaire indépendant, avec sa propre sauvegarde, **jusque dans la
base de données** — une table par section plutôt qu'une table fourre-tout.

- **Backend** (`backend/src/settings`) : la table unique `site_settings` est remplacée par 4
  tables, une par section — `hero_settings` (accroche), `about_settings` (à propos),
  `contact_settings` (nom du studio, adresse, ville, téléphone, email, horaires) et
  `social_settings` (Instagram, Facebook, Pinterest) — chacune une ligne unique (id fixe = 1)
  comme l'était `site_settings`. Un DTO de validation dédié par section (`update-hero-settings.dto.ts`,
  etc.). Le panneau admin dispose désormais d'un GET et d'un PUT indépendants par section
  (`/settings/hero`, `/settings/about`, `/settings/contact`, `/settings/social`, tous protégés) :
  modifier une section n'affecte jamais les autres, y compris en cas d'erreur de validation.
  L'ancienne table `site_settings` n'est pas supprimée automatiquement (elle devient simplement
  orpheline, `synchronize` ne supprime jamais de table) — elle peut être supprimée manuellement
  en base sans risque dès que cette mise à jour est déployée.
- **Site vitrine inchangé** : le site public continue de récupérer tout le contenu en un seul
  appel, `GET /settings` (sans préfixe de section), qui agrège désormais les 4 tables en une
  même forme plate qu'avant — aucun changement nécessaire côté `frontend/` (Hero, About,
  Contact, Footer continuent de fonctionner sans modification).
- **Panneau admin** (`admin/src/pages/SettingsPage.tsx`) : remplacé par 4 cartes indépendantes
  (`admin/src/components/settings/{Hero,About,Contact,Social}SettingsForm.tsx`), chacune avec
  son propre chargement, son propre bouton "Enregistrer" et son propre message de confirmation
  ou d'erreur. Un hook commun (`useSectionSettingsForm.ts`) factorise le chargement/l'enregistrement
  générique pour éviter de dupliquer cette logique 4 fois.

**Vérification effectuée** : build + lint sans erreur (backend, admin, frontend). Test réel en
navigateur (Playwright) : les 4 tables sont bien créées automatiquement au démarrage du backend ;
remplissage et enregistrement du titre d'accroche (section Accueil) et du nom du studio (section
Contact) l'un après l'autre, confirmés en base dans leurs tables respectives (`hero_settings` et
`contact_settings`) tandis que les sections À propos et Réseaux sociaux restent inchangées ;
rechargement de la page confirmant la persistance ; site vitrine rechargé et affichant
correctement le nouveau titre d'accroche et le nouveau nom du studio (visible jusque dans le
pied de page), preuve que l'agrégat public fonctionne toujours après la refonte.

**Correctif appliqué le jour même** : chargement des 4 sections en parallèle au premier
affichage de la page (avant le passage aux onglets ci-dessous) + double appel d'effet de React
StrictMode en développement → deux requêtes simultanées pouvaient toutes les deux constater
qu'une section n'existait pas encore et tenter de créer sa ligne unique en même temps,
provoquant une erreur `Duplicate entry '1' for key 'PRIMARY'` en base (rencontrée en conditions
réelles sur `/settings/contact` et `/settings/social`). Corrigé dans `settings.service.ts` par un
`getOrCreateSingleton()` commun aux 4 sections : si l'écriture échoue sur ce conflit précis, le
service relit simplement la ligne que l'autre requête vient de créer au lieu de renvoyer une
erreur 500. Revérifié avec 10 requêtes strictement simultanées sur une table vidée : aucune
erreur, une seule ligne créée.

**Onglets plutôt que cartes empilées** : sur demande du client, les 4 sections sont passées de
cartes empilées verticalement à 4 onglets (`Tabs` Mantine) dans `SettingsPage.tsx` — Accueil, À
propos, Studio et contact, Réseaux sociaux, chacun avec sa propre icône. Le composant partagé
`SettingsSectionCard.tsx` (bordure + titre dupliquant le libellé de l'onglet) est remplacé par
`SettingsSectionPanel.tsx`, plus léger (juste la description, le formulaire et le bouton
d'enregistrement), puisque l'onglet actif joue déjà le rôle du titre. Effet de bord positif :
chaque formulaire n'est monté (et ne charge ses données) qu'à la première ouverture de son
onglet (`keepMounted={false}`) plutôt que les 4 en même temps au chargement de la page — ce qui
réduit aussi, en pratique, les occasions de retomber sur la course ci-dessus.

## Mise à jour du 26 août 2026 (suite) — catalogue de photos pour les spécialités

Demande client : pour chaque spécialité, pouvoir ajouter plusieurs photos formant un catalogue,
en plus de l'image de premier plan déjà existante (`imageUrl`), affichée sur la carte de la
section Spécialités du site vitrine. Décision retenue pour l'affichage public (parmi les options
proposées) : **galerie au clic** — cliquer sur une carte de spécialité qui a un catalogue ouvre
une galerie plein écran (lightbox) montrant toutes ses photos, plutôt qu'un catalogue réservé au
panneau admin sans affichage public.

- **Backend** (`backend/src/specialties`) : nouvelle entité `SpecialtyPhoto` (table
  `specialty_photos`), en relation `ManyToOne`/`OneToMany` avec `Specialty`
  (`onDelete: 'CASCADE'` — supprimer une spécialité supprime aussi ses lignes de catalogue en
  base). L'image de premier plan (`imageUrl`) reste un champ indépendant de `Specialty`, non
  affecté par le catalogue. Nouvelles routes protégées : `POST /specialties/:id/photos` (upload
  multi-fichiers, jusqu'à 30 images par envoi, mêmes contraintes que l'upload générique — JPEG/
  PNG/WEBP/GIF, 8 Mo max par fichier, voir `upload.controller.ts`) et
  `DELETE /specialties/:id/photos/:photoId`. `GET /specialties` et `GET /specialties/:id`
  renvoient désormais chaque spécialité avec son tableau `photos` (trié). La suppression d'une
  spécialité nettoie aussi ses fichiers de catalogue sur le disque (contrairement à l'image de
  premier plan, jamais nettoyée automatiquement, comme pour le reste du site — cohérent avec le
  comportement existant du portfolio et de la médiathèque).
- **Panneau admin** : les lignes de la liste des spécialités (`SpecialtiesPage.tsx`) sont
  désormais cliquables et mènent vers une nouvelle fiche détail (`SpecialtyDetailPage.tsx`,
  route `/specialties/:id`), sur le même principe que la fiche détail d'une galerie de la
  médiathèque. Cette fiche permet de glisser-déposer plusieurs photos (composant Dropzone déjà
  utilisé ailleurs dans l'admin) et de supprimer une photo du catalogue individuellement. La
  liste affiche aussi le nombre de photos du catalogue de chaque spécialité. L'image de premier
  plan continue de se régler depuis le formulaire d'édition existant (modale de
  `SpecialtiesPage.tsx`), inchangé.
- **Site vitrine** : nouveau composant `Lightbox.tsx` (aucune dépendance ajoutée), une galerie
  plein écran avec navigation précédent/suivant, compteur de position, fermeture par clic en
  dehors, bouton dédié ou touche Échap, et navigation au clavier (flèches gauche/droite).
  `SpecialtyCard.tsx` devient cliquable uniquement si la spécialité a au moins une photo de
  catalogue (repère visuel discret au survol : "Voir la galerie" en surimpression sur l'image) ;
  une spécialité sans catalogue reste une simple carte statique comme avant. `Specialties.tsx`
  gère l'état d'ouverture de la galerie et la photo actuellement affichée.

**Vérification effectuée** : build + lint sans erreur (backend, admin, frontend). Test réel en
navigateur (Playwright) : création d'une spécialité de test, navigation vers sa fiche détail,
envoi de 2 photos (catalogue affichant bien "(2)"), suppression d'une photo (catalogue repassant
à "(1)"), compteur de photos correctement affiché dans la liste des spécialités ; côté site
vitrine, la carte de la spécialité de test devient cliquable et ouvre la lightbox avec la bonne
légende et le bon nombre de photos, la navigation "photo suivante" fonctionne, la fermeture au
clavier (Échap) fonctionne, et une spécialité sans catalogue reste non cliquable ; suppression de
la spécialité de test confirmant que ses fichiers de catalogue sont bien effacés du disque.

## Mise à jour du 26 août 2026 (suite) — catégories du portfolio gérables dans l'admin

Demande client : les catégories du portfolio (Portrait, Mariage, Paysage, Événements...) ne
doivent plus être une saisie libre, mais une liste renseignable depuis le panneau admin.

- **Backend** (`backend/src/portfolio`) : nouvelle entité `PortfolioCategory` (table
  `portfolio_categories`, champs `name` unique et `order`). Choix volontaire : le champ
  `PortfolioItem.category` reste un simple texte, **sans** relation de clé étrangère vers cette
  nouvelle table — cette table ne fait qu'alimenter la liste proposée à la création/modification
  d'un élément de portfolio. Ce choix évite toute migration des catégories déjà utilisées par des
  éléments existants, et signifie qu'une catégorie renommée ou supprimée dans la liste
  n'affecte jamais les éléments qui l'utilisaient déjà (ils gardent simplement leur texte de
  catégorie tel quel). Nouvelles routes, toutes protégées (usage interne au panneau admin
  uniquement, contrairement à `/portfolio` qui a un GET public) : `GET/POST /portfolio-categories`
  et `PUT/DELETE /portfolio-categories/:id`. Un nom en double est rejeté avec un message clair
  plutôt qu'une erreur 500.
- **Panneau admin** : nouvelle page "Catégories du portfolio" (`PortfolioCategoriesPage.tsx`,
  liste + modale, même squelette que les pages Spécialités/Portfolio), accessible depuis le menu
  et depuis un lien "Gérer les catégories" directement sous le champ catégorie du formulaire
  d'un élément de portfolio. Dans `PortfolioPage.tsx`, le champ "Catégorie" est passé d'un texte
  libre à une liste déroulante alimentée par cette nouvelle page ; si un élément existant a une
  catégorie qui ne figure plus dans la liste (renommée/supprimée depuis), elle est réinjectée
  automatiquement dans les options pour ne pas être effacée silencieusement à l'ouverture du
  formulaire d'édition.
- **Site vitrine inchangé** : les boutons de filtre par catégorie de `Portfolio.tsx` étaient déjà
  calculés dynamiquement à partir des catégories réellement présentes dans les éléments reçus de
  l'API (`Array.from(new Set(items.map(i => i.category)))`) — aucune modification nécessaire ici.
- **Correctif appliqué au passage** : le calcul du lien actif dans le menu de navigation de
  l'admin (`AppLayout.tsx`) comparait les chemins avec un simple `startsWith`, ce qui aurait fait
  apparaître "Portfolio" en surbrillance également sur la nouvelle page "Catégories du
  portfolio" (préfixe `/portfolio` partagé). Comparaison corrigée pour exiger une égalité exacte
  ou une frontière `/` après le préfixe.

**Vérification effectuée** : build + lint sans erreur (backend, admin). Test réel en navigateur
(Playwright) : création de 2 catégories, rejet correct d'un nom en double avec message, sélection
d'une catégorie dans le formulaire d'un élément de portfolio via la liste déroulante, présence du
lien "Gérer les catégories", suppression des catégories de test, et vérification que le menu
"Portfolio" ne s'allume plus par erreur sur la page "Catégories du portfolio". Vérifié séparément
qu'un élément de portfolio existant avec une catégorie qui n'est plus dans la liste gérée
(catégorie "fantôme", simulée via l'API) affiche bien cette catégorie dans le formulaire et
l'enregistre sans l'effacer.

## Mise à jour du 27 août 2026 — stratégie de gestion des médias (espace disque)

Demande client : ne pas laisser les médias (photos/vidéos de la médiathèque, catalogues de
spécialités) occuper tout l'espace disque du serveur de façon incontrôlée. Décisions retenues
après clarification avec le client : pas de compression automatique des photos (les fichiers
originaux doivent être conservés en pleine résolution), pas de suppression automatique des
galeries expirées (une alerte visuelle suffit, la suppression reste une action manuelle), et un
vrai tableau de bord de suivi de l'espace disque dans le panneau admin.

- **Backend** — nouvel utilitaire `backend/src/common/disk-usage.ts` (fonctions simples, pas un
  service injectable, pour rester utilisable à la fois par le nouveau tableau de bord et par les
  contrôleurs d'upload) : lit l'espace disque du volume qui héberge `uploads/` via
  `fs.statfsSync` (natif à Node, aucun outil externe comme `df` nécessaire). Deux seuils
  configurables par variable d'environnement :
  - `DISK_ALERT_THRESHOLD_PERCENT` (défaut 85 %) : au-delà, un bandeau d'alerte s'affiche dans le
    panneau admin, mais rien n'est bloqué.
  - `DISK_HARD_LIMIT_PERCENT` (défaut 95 %) : au-delà, **tout nouvel envoi de média est bloqué**
    (galeries, catalogues de spécialités, images génériques) avec un message clair renvoyé au
    panneau admin — un filet de sécurité de dernier recours pour ne jamais laisser le disque
    atteindre 100 % (ce qui peut planter la base de données et le reste du serveur), et non une
    stratégie de nettoyage. Vérifié en conditions réelles avec un seuil abaissé artificiellement :
    l'envoi est bien rejeté (503) avec le message attendu, et redevient possible sous le seuil.
  - Nouvelle route protégée `GET /storage` (`storage.service.ts`/`storage.controller.ts`) :
    agrège l'espace disque global, la répartition par catégorie de média (médiathèque — calculée
    depuis `SUM(size_bytes)` de `media_items`, déjà enregistré depuis la fonctionnalité de limite
    d'utilisation ; catalogues de spécialités — nouveau champ `size_bytes` ajouté à
    `SpecialtyPhoto`, alimenté à l'upload ; "autres médias" — scan superficiel du dossier racine
    `uploads/`, qui ne contient que les images génériques hors médiathèque/catalogues), le top 10
    des galeries les plus volumineuses, et la liste des galeries expirées avec leur taille.
  - `GalleriesService.findAllForAdmin()` renvoie désormais aussi `totalSizeBytes` et `expired`
    par galerie (logique d'expiration factorisée dans `gallery-expiry.util.ts`, partagée avec
    `storage.service.ts` pour n'avoir qu'une seule définition de "expirée").
- **Panneau admin** — nouvelle page "Stockage" (`StoragePage.tsx`), dans une section "Système"
  distincte du contenu éditable : jauge d'utilisation du disque avec bandeau d'alerte au-delà du
  seuil, répartition par catégorie de média, top des galeries les plus volumineuses, et liste des
  galeries expirées avec un bouton "Supprimer" direct (toujours une action manuelle et explicite,
  jamais automatique). La liste de la Médiathèque (`GalleriesPage.tsx`) affiche désormais aussi la
  taille de chaque galerie et un badge "Expirée" quand le lien a expiré ou que la limite
  d'utilisations est atteinte.
- **Correctif appliqué au passage** : le calcul de l'item de navigation actif dans
  `AppLayout.tsx` a été factorisé (même logique répétée trois fois) au moment d'ajouter la
  nouvelle section "Système".

**Espace disque du VPS au moment de la vérification** : d'après les indications du client (plus
de 250 Go disponibles), la marge est confortable — le tableau de bord et les seuils sont surtout
un filet de sécurité et un outil de suivi dans la durée, pas une urgence immédiate.

**Vérification effectuée** : build + lint sans erreur (backend, admin). Test réel en navigateur
(Playwright) : le tableau de bord "Stockage" affiche correctement l'espace disque réel du
serveur, la répartition par catégorie, le top des galeries et la liste des galeries expirées ;
suppression d'une galerie expirée directement depuis ce tableau de bord, confirmée disparue de la
liste et de la médiathèque ; upload multi-photos d'un catalogue de spécialité re-testé pour
confirmer l'absence de régression après l'ajout du filet de sécurité disque. Testé séparément en
conditions contrôlées (seuil critique abaissé artificiellement) : un envoi est bien rejeté avec
le message d'erreur attendu au-delà du seuil, et redevient possible en dessous.

**Pistes non retenues pour l'instant, sur demande explicite du client** : compression/redimensionnement
automatique des photos à l'envoi (le client veut conserver les fichiers originaux en pleine
résolution) et suppression automatique des galeries expirées après un délai (le client préfère
garder la main et supprimer manuellement). À reconsidérer si l'espace disque venait à devenir
plus contraint.

## Mise à jour du 27 août 2026 (suite) — quota d'espace disque propre au projet

Demande client, en complément du filet de sécurité disque global ci-dessus : limiter
spécifiquement l'espace que les médias **de ce projet** ont le droit d'occuper sur le VPS,
indépendamment du taux de remplissage du disque entier — pour protéger d'éventuels autres usages
du même serveur d'une croissance non maîtrisée de ce site. Décisions retenues après
clarification avec le client : quota de **100 Go** par défaut, configuration **uniquement** par
variable d'environnement (pas de champ modifiable depuis le panneau admin), et ce nouveau quota
vient **s'ajouter** au seuil critique de l'espace disque global existant (les deux filets de
sécurité restent actifs simultanément, aucun des deux ne remplace l'autre).

- **Backend** — nouvelle variable d'environnement `MEDIA_STORAGE_QUOTA_GB` (défaut 100,
  `backend/src/common/disk-usage.ts`, fonction `getMediaQuotaBytes()`) : `0` ou une valeur
  négative désactive complètement ce quota (seul le seuil critique du disque global continue de
  s'appliquer). Point d'attention traité explicitement : `0` est une valeur "falsy" en
  JavaScript, un simple `Number(process.env.MEDIA_STORAGE_QUOTA_GB) || 100` aurait donc
  silencieusement ignoré `MEDIA_STORAGE_QUOTA_GB=0` et gardé la limite de 100 Go — le parsing
  distingue explicitement "variable absente" (→ défaut 100) de "variable valant 0" (→ désactivé).
  - `StorageService` (`storage.service.ts`) expose `getTotalMediaUsageBytes()` (somme de
    l'espace déjà utilisé par la médiathèque, les catalogues de spécialités et les médias
    génériques — même agrégation que le tableau de bord) et `assertWithinMediaQuota(bytes)`,
    appelée par les trois points d'entrée qui acceptent des envois de fichiers :
    `GalleriesService.addMedia()`, `SpecialtiesService.addPhotos()` et `UploadController.upload()`.
  - Point technique important : `multer` a déjà écrit le ou les fichiers sur le disque avant que
    le contrôleur/service ne s'exécute (l'interceptor tourne avant le handler), contrairement au
    filet de sécurité global qui, lui, bloque *avant* l'écriture (dans le `fileFilter`, sans accès
    à l'injection de dépendances donc sans pouvoir interroger la base de données). Ce quota-ci a
    besoin de connaître l'usage actuel en base, donc s'exécute forcément après l'écriture : en cas
    de dépassement, les fichiers fraîchement écrits sont supprimés du disque avant de renvoyer
    l'erreur (413 "Payload Too Large"), pour ne jamais laisser de fichier orphelin ni de ligne en
    base pour un envoi refusé.
  - `GET /storage` renvoie désormais aussi `mediaQuota` (quota configuré, espace utilisé,
    pourcentage, alerte) — `null` si le quota est désactivé.
- **Panneau admin** — nouvelle carte "Quota de stockage du projet" sur le tableau de bord
  Stockage (`StoragePage.tsx`), avec sa propre jauge et son propre bandeau d'alerte, distincte de
  la carte "Espace disque du serveur" existante ; affiche "Quota illimité" si le quota est
  désactivé côté serveur. Non éditable depuis l'admin, comme demandé par le client.

**Vérification effectuée** : build + lint sans erreur (backend, admin). Testé en conditions
contrôlées avec un quota abaissé artificiellement (variable d'environnement, pas le fichier
`.env` — voir point technique ci-dessus sur le moment où cette variable doit être lue) sur les
trois points d'upload (médiathèque, catalogue de spécialités, upload générique) : envoi refusé
avec le message attendu (413) une fois le quota dépassé, fichier supprimé du disque et aucune
ligne créée en base (vérifié directement en base de données), envoi à nouveau accepté sous le
quota. Vérifié aussi que `MEDIA_STORAGE_QUOTA_GB=0` désactive bien le quota (plus aucun blocage,
`mediaQuota` renvoyé à `null`) et que le comportement par défaut (variable absente) applique bien
la limite de 100 Go. Testé en navigateur (Playwright) : la nouvelle carte s'affiche correctement
dans les deux cas (quota actif avec jauge, quota désactivé avec message dédié).

## Mise à jour du 27 août 2026 (suite) — page dédiée par spécialité (galerie façon Pinterest + tarifs)

Demande client : au clic sur une spécialité, envoyer le visiteur vers une page dédiée qui
affiche ses photos en grille façon Pinterest, avec une section donnant les tarifs des
sous-services de cette spécialité (ex. pour "Portrait" : "Shooting individuel" à 15 000 F CFA
pour 1 personne et 4 photos, "Shooting familial" à 30 000 F pour 4 photos, "Shooting enfants" à
20 000 F, "Mode" à 35 000 F...), modifiables depuis le panneau admin. Remplace le comportement
précédent (ouverture du catalogue en galerie plein écran par-dessus la page d'accueil).

- **Backend** — nouvelle entité `SpecialtyTariff` (`specialty_tariffs`, voir
  `backend/src/specialties/entities/specialty-tariff.entity.ts`) : une ligne = un sous-service
  facturé séparément, avec `name` (ex. "Shooting individuel"), `price` (entier, francs CFA),
  `detail` (texte libre pour la quantité/les conditions — "4 photos", "1 personne, 4 photos" —
  plutôt que des colonnes rigides, pour rester flexible sur ce que le photographe veut afficher)
  et `order`. Rattachée à `Specialty` par clé étrangère `ON DELETE CASCADE` (supprimée
  automatiquement avec sa spécialité, comme les photos du catalogue). Nouvelles routes imbriquées
  `POST/PUT/DELETE /specialties/:id/tariffs[/:tariffId]`, protégées JWT comme le reste de la
  gestion d'une spécialité ; la lecture reste publique, via le tableau `tariffs` déjà inclus dans
  `GET /specialties` et `GET /specialties/:id`.
- **Panneau admin** — la page de détail d'une spécialité (`SpecialtyDetailPage.tsx`, déjà utilisée
  pour le catalogue de photos) reçoit une nouvelle section "Tarifs" : tableau + formulaire modal
  (nom, prix, détail, ordre) avec les mêmes opérations CRUD que le reste du panneau.
- **Site vitrine** — nouvelle page dédiée par spécialité, accessible via `/?specialite=<id>` (même
  principe que la médiathèque cliente `/?galerie=<code>` : pas de routeur dédié pour ce site,
  décision produit constante depuis l'ajout de la médiathèque). Une carte de spécialité devient
  cliquable dès qu'elle a des photos de catalogue et/ou des tarifs, et envoie vers cette page au
  lieu d'ouvrir la galerie plein écran par-dessus la page d'accueil comme avant. La page affiche :
  la grille tarifaire (cartes prix), puis la galerie de photos en colonnes CSS (`column-count`,
  responsive : 2 colonnes en mobile, 3 puis 4 sur écran plus large) façon Pinterest — chaque photo
  garde son ratio d'origine au lieu d'être recadrée en carré, et reste cliquable pour s'agrandir en
  plein écran (composant `Lightbox.tsx` existant, réutilisé tel quel).

**Vérification effectuée** : build backend + admin + frontend sans erreur (lint backend/admin
également). CRUD des tarifs testé de bout en bout via l'API (création, modification, suppression,
y compris le cas `price: 0` et la suppression en cascade avec la spécialité) et via le panneau
admin en navigateur (Playwright) : ajout d'un tarif "Duo" à 25 000 F, modification de son prix,
puis suppression, chaque étape reflétée immédiatement dans le tableau. Page dédiée du site vitrine
testée avec 4 tarifs et 6 photos de tailles variées : grille tarifaire et galerie Pinterest
s'affichent correctement, le clic sur une photo l'agrandit en plein écran avec navigation
précédent/suivant, et le lien du logo ramène bien à la page d'accueil (URL nettoyée du paramètre
`?specialite=`).

## Mise à jour du 27 août 2026 (suite) — correctif : barre de navigation absente sur les pages dédiées

Signalé par le client : la barre de navigation complète (avec tous ses liens) disparaissait en
changeant de page — remplacée par un en-tête minimal (juste le logo) sur la médiathèque cliente
et sur la nouvelle page dédiée d'une spécialité.

- **Cause** : `GalleryView.tsx` et `SpecialtyDetail.tsx` affichaient chacun leur propre en-tête
  minimal plutôt que le composant `Header.tsx` du site, dont les liens de menu pointaient en plus
  vers de simples ancres (`#portfolio`...) qui n'existent que sur la page d'accueil.
- **Correctif** : les deux pages affichent maintenant le vrai `Header.tsx` (mêmes liens, même
  bouton "Récupérer mes photos"). Ses liens de menu pointent désormais vers des chemins absolus
  (`/#portfolio` au lieu de `#portfolio`) : cliqués depuis l'accueil, ils défilent en douceur comme
  avant ; cliqués depuis une autre page, ils ramènent d'abord à l'accueil puis défilent jusqu'à la
  bonne section (avec un filet de sécurité JS en complément du comportement natif du navigateur,
  pas toujours fiable seul pour ce cas de figure). Le bouton "retour" dédié de la page spécialité
  (état React, sans rechargement) a été retiré au passage : le logo du menu ramène maintenant à
  l'accueil de la même façon sur les trois pages du site, plus cohérent qu'avant.

**Vérification effectuée** : build frontend sans erreur. Testé en navigateur (Playwright) : les 5
liens du menu et le bouton "Récupérer mes photos" sont bien visibles sur la page d'une spécialité
et sur la médiathèque cliente ; cliquer sur "Portfolio" depuis la page d'une spécialité ramène bien
à l'accueil avec la section Portfolio correctement positionnée sous la barre de navigation (fixe).

## Mise à jour du 27 août 2026 (suite) — panneau admin : icône du site, logo et pages légales

Demande client : donner la possibilité à l'admin d'ajouter l'icône du site (favicon) "et
autre", et de rédiger le contenu des 3 pages légales (Mentions légales, Politique de
confidentialité, Conditions générales), jusqu'ici de simples liens `#` en pied de page.

- **Backend** — deux nouvelles sections de réglages, sur le même principe qu'une table dédiée par
  section (voir la refonte du panneau admin du 26/08) :
  - `GeneralSettings` (`general_settings`, voir
    `backend/src/settings/entities/general-settings.entity.ts`) : `faviconUrl` (icône affichée
    dans l'onglet du navigateur) et `logoUrl` (logo affiché en pied de page à la place du texte
    "Pixellia" tant qu'aucun logo n'est renseigné) — c'est l'interprétation retenue pour "l'icône
    du site et autre", faute de précision supplémentaire du client sur la portée exacte de "et
    autre". Routes `GET/PUT /settings/general`, protégées JWT comme les autres sections.
  - `LegalSettings` (`legal_settings`, voir
    `backend/src/settings/entities/legal-settings.entity.ts`) : un champ texte par page
    (`mentionsLegales`, `politiqueConfidentialite`, `conditionsGenerales`) — une seule table
    plutôt qu'une entité par page, ces 3 blocs de texte n'ayant besoin d'aucune structure propre
    (pas de liste, pas de tri, pas de statut publié/brouillon). Route `GET /settings/legal`
    exceptionnellement **publique** (contrairement aux autres sections) puisqu'elle est aussi
    consommée directement par les 3 pages légales du site vitrine, pas seulement par le
    formulaire du panneau admin ; `PUT /settings/legal` reste protégée JWT.
  - L'agrégat public `GET /settings` (consommé par le site vitrine) inclut désormais `faviconUrl`
    et `logoUrl`, pour que le favicon puisse être affiché dès le premier chargement de n'importe
    quelle page du site.
- **Panneau admin** — deux nouveaux onglets dans "Réglages du site" (`SettingsPage.tsx`) :
  "Général" (upload du favicon et du logo, via le composant `ImageUploadField` déjà utilisé
  ailleurs) et "Pages légales" (une zone de texte par page, même principe que le texte "à propos").
- **Site vitrine** :
  - Le favicon est injecté dynamiquement dans `<head>` (`App.tsx`, effet sur
    `settings.faviconUrl`) puisque `index.html` est un fichier statique généré au build — il
    s'affiche donc sur toutes les pages du site, y compris en arrivant directement sur la
    médiathèque, la page d'une spécialité ou une page légale par un lien partagé (le chargement de
    `GET /settings` n'est donc plus limité à la page d'accueil).
  - Le logo, quand il est renseigné, remplace le texte "Pixellia" en pied de page (`Footer.tsx`).
  - Nouvelle page dédiée par page légale, accessible via `/?page=<slug>` (mêmes principes que la
    médiathèque `/?galerie=` et la page de spécialité `/?specialite=` : pas de routeur dédié pour
    ce site, et la barre de navigation complète du site, `Header.tsx`, y est affichée comme sur les
    deux autres pages dédiées — voir le correctif du 27/08 sur la barre de navigation). Message
    d'attente affiché tant que le contenu n'a pas encore été saisi côté admin plutôt qu'une page
    d'erreur.
  - Les 3 liens "Legal" du pied de page (`Footer.tsx`) pointent maintenant vers ces pages au lieu
    de `href="#"` : navigation interne sans rechargement au clic simple, tout en restant des liens
    `/?page=...` valides individuellement (ouverture dans un nouvel onglet, partage direct).

**Ce qui n'a pas été traité** : la colonne "Services" du pied de page (Portrait, Mariage,
Paysage, Événements, Studio) contient elle aussi 5 liens `href="#"`, mais n'a pas été mentionnée
dans la demande — laissée telle quelle.

**Vérification effectuée** : build backend + admin + frontend sans erreur (lint backend/admin
également, sans nouvel avertissement). Testé en navigateur (Playwright) : upload d'un favicon et
d'un logo depuis le panneau admin, persistant après rechargement de la page ; favicon visible dans
l'onglet du navigateur sur le site vitrine, y compris en arrivant directement sur une page légale
par son URL ; logo affiché en pied de page à la place du texte "Pixellia" ; les 3 pages légales
remplies depuis l'admin puis vérifiées sur le site vitrine (contenu affiché correctement, barre de
navigation complète présente) ; clic sur chacun des 3 liens "Legal" du pied de page vérifié.

## Mise à jour du 27 août 2026 (suite) — plusieurs téléphones et emails de contact

Demande client : pouvoir renseigner plusieurs numéros de téléphone et/ou plusieurs adresses
email de contact, un studio pouvant en avoir plusieurs (ligne fixe et mobile, par exemple).
Remplace les champs uniques `phone`/`email` de la section "Studio et contact".

- **Backend** — `ContactSettings` (`contact_settings`, voir
  `backend/src/settings/entities/contact-settings.entity.ts`) : les colonnes `phone`/`email`
  (varchar) sont remplacées par `phones`/`emails`, deux colonnes `simple-json` (une simple liste
  de chaînes, sérialisée/désérialisée automatiquement par TypeORM) — pas de table séparée avec
  CRUD propre, ces listes n'ayant besoin ni d'id, ni d'ordre, ni d'aucune autre métadonnée par
  entrée. Toujours initialisées à `[]` plutôt que `null` (voir `getContact()`), pour que le site
  vitrine n'ait jamais à distinguer "vide" de "non renseigné" sur ces deux champs. Validation DTO :
  chaque entrée de `emails` doit être un email valide (`@IsEmail` avec `each: true`), `phones`
  reste en texte libre (formats internationaux variés).
- **Panneau admin** — le formulaire "Studio et contact" remplace les deux champs texte
  Téléphone/Email par deux `TagsInput` Mantine ("Téléphones"/"Emails de contact") : on saisit une
  valeur puis Entrée pour l'ajouter, chaque entrée devient une puce supprimable individuellement.
  Nécessite une petite généralisation de `useSectionSettingsForm` (partagée par tous les
  formulaires de réglages) pour accepter des champs de type liste de chaînes en plus des champs
  texte simples, via un paramètre optionnel de valeurs par défaut — sans impact sur les 5 autres
  formulaires de réglages, qui continuent de fonctionner sans ce paramètre.
- **Site vitrine** — la section "Me contacter" (`Contact.tsx`) affiche désormais la liste complète
  des numéros et des emails renseignés (séparés par des virgules, libellé au pluriel dès qu'il y en
  a plusieurs), chacun cliquable (`tel:`/`mailto:`) plutôt qu'une simple ligne de texte.

**Changement de schéma** : les colonnes `phone`/`email` d'origine sont supprimées au profit de
`phones`/`emails` (synchronisation TypeORM automatique) — toute valeur déjà saisie dans ces deux
champs avant cette mise à jour est perdue et doit être ressaisie dans le panneau admin. Sans
conséquence en pratique à ce stade du projet (pas encore de données réelles en production).

**Vérification effectuée** : build backend + admin + frontend sans erreur (lint backend/admin
également, sans nouvel avertissement). Testé en navigateur (Playwright) : ajout de 2 numéros et 2
emails depuis le panneau admin (saisie + Entrée), sauvegarde, persistance vérifiée après
rechargement de la page ; site vitrine vérifié affichant les 2 numéros et les 2 emails avec liens
`tel:`/`mailto:` corrects et libellés au pluriel.

## Mise à jour du 28 août 2026 — carousel de plusieurs images pour la section d'accueil

Demande client : pouvoir ajouter plusieurs images pour la section d'accueil depuis l'onglet
"Accueil" du panneau des réglages, les activer indépendamment pour que seules celles activées
apparaissent au visiteur sous forme de carousel/slider. Le titre d'accroche reste unique et fixe
quelle que soit l'image affichée, mais chaque image peut avoir (ou non) son propre sous-titre, qui
défile avec elle. Remplace le sous-titre et l'image uniques d'origine de la section "Accueil".

- **Backend** — nouvelle entité `HeroSlide` (`hero_slides`, voir
  `backend/src/settings/entities/hero-slide.entity.ts`) : `imageUrl` (requis), `subtitle` (texte
  libre, optionnel), `active` (booléen, `true` par défaut) et `order`. Table indépendante plutôt
  que rattachée à `HeroSettings` par clé étrangère : `HeroSettings` reste une ligne singleton (id
  fixe = 1) qui ne contient désormais plus que `heroTitle` — le sous-titre et l'image uniques
  d'origine sont supprimés de cette table, remplacés par la liste `HeroSlide`. Nouvelles routes
  imbriquées `GET/POST/PUT/DELETE /settings/hero/slides[/:id]`, protégées JWT comme le reste du
  panneau admin (même principe que les tarifs imbriqués sous `/specialties/:id/tariffs`, voir mise
  à jour du 27/08 sur la page dédiée d'une spécialité) ; la lecture complète (actives ou non) est
  réservée à l'admin. L'agrégat public `GET /settings` expose `heroSlides` : uniquement les images
  actives, triées par ordre d'affichage, sous une forme allégée (`id`, `imageUrl`, `subtitle` —
  sans `active` ni `order`, informations de gestion interne).
- **Panneau admin** — la section "Accueil" du formulaire de réglages ne contient plus que le
  titre d'accroche ; un nouveau bloc "Carousel d'accueil" en dessous (nouveau composant
  `HeroSlidesManager.tsx`) liste toutes les images (tableau : miniature, sous-titre, ordre,
  interrupteur actif/inactif, modifier/supprimer) avec un bouton "Ajouter une image" ouvrant une
  fenêtre modale (upload d'image, sous-titre optionnel, actif, ordre). Contrairement aux autres
  sections de réglages, chaque action ici est un appel API immédiat (ajout, modification,
  activation, suppression), pas un formulaire à enregistrer d'un bloc — même principe que la
  grille tarifaire d'une spécialité.
- **Site vitrine** — `Hero.tsx` devient un carousel : une couche `.hero-slide` par image, fondues
  en CSS (`opacity`, transition 1,2 s) plutôt qu'un remplacement direct de `background-image`,
  défilement automatique toutes les 6 secondes lorsqu'il y a plusieurs images actives, plus des
  puces de navigation manuelle en bas de la section. Le titre d'accroche est rendu une seule fois,
  en dehors des couches d'images, et ne bouge donc jamais ; seul le sous-titre affiché change avec
  l'image active (masqué si l'image n'en a pas). Sans aucune image active, la section retombe sur
  le fond de repli CSS déjà présent par défaut (`.hero` dans `index.css`), sans sous-titre — un
  comportement inchangé par rapport à avant cette mise à jour.

**Changement de schéma** : les colonnes `hero_subtitle`/`hero_image_url` d'origine sont
supprimées (synchronisation TypeORM automatique) au profit de la nouvelle table `hero_slides` —
tout sous-titre/image déjà saisi avant cette mise à jour est perdu et doit être ressaisi comme
première image du carousel dans le panneau admin. Sans conséquence en pratique à ce stade du
projet (pas encore de données réelles en production).

**Vérification effectuée** : build backend + admin + frontend sans erreur (lint backend/admin
également, sans nouvel avertissement au-delà des avertissements préexistants déjà présents sur ce
même schéma ailleurs dans le panneau admin). Testé en navigateur (Playwright) : modification du
titre d'accroche, ajout de 3 images avec upload réel (2 avec sous-titre, 1 sans), désactivation
d'une image depuis l'interrupteur — vérifié que l'agrégat public `GET /settings` n'expose alors
que les 2 images actives restantes. Côté site vitrine : titre fixe affiché en permanence,
sous-titre changeant correctement d'une image à l'autre (y compris son absence sur l'image sans
sous-titre), navigation manuelle par les puces vérifiée, et défilement automatique confirmé après
l'intervalle de 6 secondes (retour à la première image après la seconde).

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
- **Hébergement backend** : VPS, via Docker + `deploy/apps/frejus/docker-compose.yml`, déployé par le pipeline CI/CD GitHub Actions. *(pipeline prêt — VPS à provisionner et secrets GitHub à renseigner)*
- **Panneau admin** : React + Vite + TypeScript + Mantine, servi statiquement par nginx dans un conteneur Docker (service `admin`), sur le **même VPS que le backend**, déployé par le composant `admin` du pipeline CI/CD. *(fait — voir `admin/`)*
- **Hébergement frontend** : conserver GitHub Pages pour l'instant (le workflow existant `deploy.yml` n'est pas modifié).

## 7. Feuille de route par phases

| Phase | Contenu | Statut |
|---|---|---|
| 0 — Cadrage | Contenu réel du client (textes, vraies photos, coordonnées exactes), choix définitif d'hébergeur, maquette de l'espace admin | Décisions d'architecture prises (25/08) ; contenu réel et maquette admin encore à fournir/valider |
| 1 — Fondations backend | API NestJS + TypeORM/MySQL (CRUD `site_settings`/portfolio/spécialités/témoignages/contact), authentification admin JWT, upload d'images | **Fait** — voir `backend/`, vérifié par build + lint + tests + test d'intégration bout-en-bout |
| 2 — Frontend dynamique | Remplacement des données codées en dur par des appels API, gestion des états de chargement/erreur, formulaire de contact branché à l'API | **Fait** — voir `frontend/src/api/` et `defaultContent.ts`, vérifié bout-en-bout contre un vrai backend (contenu réel affiché, message de contact retrouvé en base) |
| 3 — Back-office | Interface d'administration (CRUD contenu, upload d'images) consommant l'API existante | **Fait** — voir `admin/`, build + lint OK, contrat d'API vérifié contre le backend réel ; test navigateur réel encore à faire sur votre machine |
| 4 — SEO & performance | Meta-données dynamiques, `sitemap.xml`, Open Graph, lazy-loading et optimisation des images, audit Lighthouse | À faire |
| 5 — Déploiement & CI/CD | Dockerfile, docker-compose (local et VPS), pipelines GitHub Actions (build/tests → image GHCR → déploiement SSH), pour `backend/` et `admin/` | Pipelines et fichiers Docker **prêts** pour les deux projets ; VPS à provisionner et secrets GitHub à renseigner (voir `.github/workflows/ci-cd.yml`) ; migrations TypeORM encore à mettre en place avant données réelles |
| 6 — Recette & mise en production | Tests fonctionnels, correction de l'incohérence de contenu (localisation, coordonnées), formation du client à l'espace admin | À faire |

**Durée totale estimée** : environ 6 à 8 semaines à temps partiel pour une V1 complète (option B), ou 1 à 2 semaines pour un MVP minimal avec l'option A (Supabase + service de formulaire, sans back-office custom).

## 8. Points d'attention et risques

- **Cold start** des instances gratuites (Render notamment) : la première requête après une