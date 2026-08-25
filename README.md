# frejus

Site vitrine + backend d'administration + panneau admin pour Pixellia Photographie.

Ce dépôt regroupe trois projets **indépendants**, chacun avec ses propres dépendances,
sa propre configuration et son propre pipeline de déploiement :

- **`frontend/`** — Site vitrine React + Vite + TypeScript, statique, branché sur l'API
  du `backend/` (accroche, à propos, coordonnées, spécialités, portfolio, témoignages,
  formulaire de contact — plus aucune donnée codée en dur). Déployé sur GitHub Pages
  via `.github/workflows/deploy.yml`. Voir `frontend/index.html` / `frontend/package.json`
  pour démarrer (`npm install && npm run dev`, puis `cp .env.example .env.local`).

- **`backend/`** — API NestJS + TypeORM + MySQL (authentification admin, contenu du
  site, portfolio, spécialités, témoignages, formulaire de contact, upload d'images).
  Se déploie en Docker sur un VPS via `.github/workflows/backend-ci-cd.yml`. Voir
  `backend/README.md` pour démarrer en local.

- **`admin/`** — Panneau d'administration React + Vite + TypeScript + Mantine :
  édition du contenu du site (textes, coordonnées), portfolio, spécialités,
  témoignages, boîte de réception du formulaire de contact. Parle à l'API du
  `backend/` en JWT. Se déploie en Docker **sur le même VPS que le backend** via
  `.github/workflows/admin-ci-cd.yml`. Voir `admin/README.md` pour démarrer en local.

- **`docs/`** — Documentation de cadrage du projet, notamment
  `docs/ANALYSE-PLAN-BACKEND.md` (analyse de l'existant, choix d'architecture,
  feuille de route).

Le `frontend/` reste déployable sur un serveur totalement séparé (GitHub Pages) sans
aucune dépendance runtime envers les deux autres ; `backend/` et `admin/` sont conçus
pour cohabiter sur le même VPS et sont orchestrés ensemble par `docker-compose.prod.yml`
(à la racine du dépôt), mais restent deux images Docker et deux pipelines CI/CD
indépendants.

## Déploiement

Les trois pipelines CI/CD (`.github/workflows/`) ne se déclenchent que sur les
changements touchant leur propre dossier (`frontend/**`, `backend/**` ou `admin/**`),
donc modifier l'un ne redéploie jamais les autres par erreur.

| Projet | Où | Comment |
|---|---|---|
| `frontend/` | GitHub Pages | Automatique à chaque push sur `master` touchant `frontend/` ; nécessite le secret GitHub `FRONTEND_VITE_API_URL` pour pointer vers l'API en production (voir `.github/workflows/deploy.yml`) |
| `backend/` | VPS (Docker), service `api` | Automatique à chaque push sur `master` touchant `backend/`, une fois les secrets GitHub du VPS renseignés (voir `.github/workflows/backend-ci-cd.yml`) |
| `admin/` | VPS (Docker), service `admin` — même VPS que `backend/` | Automatique à chaque push sur `master` touchant `admin/`, une fois les secrets GitHub du VPS + `ADMIN_VITE_API_URL` renseignés (voir `.github/workflows/admin-ci-cd.yml`) |
