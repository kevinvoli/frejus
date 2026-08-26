# frejus-backend

API NestJS + TypeORM + MySQL pour dynamiser le site vitrine `frejus` (Pixellia
Photographie) : gestion du contenu (textes, coordonnées, portfolio, spécialités,
témoignages) depuis un panneau admin, sans redéploiement du frontend.

Contexte, choix d'architecture et feuille de route complète : voir
[`../docs/ANALYSE-PLAN-BACKEND.md`](../docs/ANALYSE-PLAN-BACKEND.md).

## Stack

- NestJS 11 + TypeScript
- TypeORM + MySQL 8
- Auth admin par JWT (un seul compte admin pour ce MVP)
- Upload d'images en local (disque du conteneur / volume Docker)
- Docker + Docker Compose (dev local et prod VPS)
- CI/CD : GitHub Actions → GHCR → déploiement SSH sur VPS

## Démarrage en local (avec Docker)

1. Copier le fichier d'environnement :
   ```bash
   cp .env.example .env
   ```
   Adapter au minimum `JWT_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`.

2. Lancer MySQL + l'API :
   ```bash
   docker compose up --build
   ```
   L'API est disponible sur `http://localhost:3000/api`, les images uploadées sur
   `http://localhost:3000/uploads/...`.

3. Au premier démarrage, si aucun compte admin n'existe encore en base, il est créé
   automatiquement à partir de `ADMIN_EMAIL` / `ADMIN_PASSWORD` (voir `users.service.ts`).

## Démarrage en local (sans Docker pour l'API, rechargement à chaud)

```bash
docker compose up db          # MySQL seul, en arrière-plan
npm install
cp .env.example .env          # DB_HOST=localhost fonctionne dans ce cas
npm run start:dev
```

## Endpoints principaux

Tous préfixés par `/api`. Les routes marquées 🔒 nécessitent un header
`Authorization: Bearer <token>` obtenu via `POST /api/auth/login`.

| Méthode | Route | Description |
|---|---|---|
| POST | `/auth/login` | Connexion admin, retourne un JWT |
| GET | `/settings` | Contenu éditable du site (hero, à propos, coordonnées, réseaux) |
| PUT 🔒 | `/settings` | Mise à jour de ce contenu |
| GET | `/specialties` | Liste des spécialités |
| POST/PUT/DELETE 🔒 | `/specialties[/:id]` | CRUD spécialités |
| GET | `/portfolio?category=Portrait` | Portfolio publié, filtrable par catégorie |
| GET 🔒 | `/portfolio/admin/all` | Portfolio complet (y compris non publié) |
| POST/PUT/DELETE 🔒 | `/portfolio[/:id]` | CRUD portfolio |
| GET | `/testimonials` | Témoignages publiés |
| GET 🔒 | `/testimonials/admin/all` | Tous les témoignages |
| POST/PUT/DELETE 🔒 | `/testimonials[/:id]` | CRUD témoignages |
| POST | `/contact` | Envoi du formulaire de contact (public) |
| GET/PATCH/DELETE 🔒 | `/contact[/:id]` | Boîte de réception des messages (admin) |
| POST 🔒 | `/upload` | Upload d'image (`multipart/form-data`, champ `file`), retourne `{ url }` |
| GET 🔒 | `/galleries` | Liste des galeries clientes (médiathèque) |
| GET 🔒 | `/galleries/:id` | Détail d'une galerie (avec médias) |
| POST/PUT/DELETE 🔒 | `/galleries[/:id]` | CRUD galeries |
| POST 🔒 | `/galleries/:id/media` | Upload multi-fichiers (photos/vidéos, 200 Mo max) |
| DELETE 🔒 | `/galleries/:id/media/:mediaId` | Suppression d'un média |
| GET | `/galleries/access/:token` | Accès public à une galerie (public) |
| POST | `/galleries/access/:token/verify` | Vérification du mot de passe (public) |
| GET | `/galleries/access/:token/media/:mediaId/download?access=<jwt>` | Téléchargement d'un fichier (public) |
| GET | `/galleries/access/:token/download-all?access=<jwt>` | Téléchargement de la galerie en ZIP (public) |
| GET | `/health` | Healthcheck |

## Déploiement

Voir `.github/workflows/backend-ci-cd.yml` (à la racine du dépôt) pour le pipeline
complet, et `../docker-compose.prod.yml` (racine du dépôt) pour la configuration
attendue sur le VPS — ce fichier orchestre à la fois le service `api` (ce projet)
et le service `admin` (`../admin/`), qui partagent le même VPS. Les secrets GitHub
requis pour le job de déploiement sont documentés en tête de ce fichier de workflow.

## Point d'attention important

`DB_SYNCHRONIZE=true` (par défaut) fait créer/adapter les tables automatiquement
par TypeORM depuis les entités : pratique pour ce MVP, mais risqué dès que la base
contient des données réelles importantes. Avant une mise e