# frejus

Site vitrine + backend d'administration + panneau admin pour Pixellia Photographie.

Ce dépôt regroupe trois projets **indépendants**, chacun avec ses propres dépendances,
sa propre configuration et son propre pipeline de déploiement :

- **`frontend/`** — Site vitrine React + Vite + TypeScript, statique, branché sur l'API
  du `backend/` (accroche, à propos, coordonnées, spécialités, portfolio, témoignages,
  formulaire de contact — plus aucune donnée codée en dur). Se déploie en Docker (nginx)
  sur le VPS via `.github/workflows/frontend-ci-cd.yml`. Voir `frontend/index.html` /
  `frontend/package.json` pour démarrer (`npm install && npm run dev`, puis
  `cp .env.example .env.local`).

- **`backend/`** — API NestJS + TypeORM + MySQL (authentification admin, contenu du
  site, portfolio, spécialités, témoignages, formulaire de contact, upload d'images).
  Se déploie en Docker sur le VPS via `.github/workflows/backend-ci-cd.yml`. Voir
  `backend/README.md` pour démarrer en local.

- **`admin/`** — Panneau d'administration React + Vite + TypeScript + Mantine :
  édition du contenu du site (textes, coordonnées), portfolio, spécialités,
  témoignages, boîte de réception du formulaire de contact. Parle à l'API du
  `backend/` en JWT. Se déploie en Docker **sur le même VPS que le backend** via
  `.github/workflows/admin-ci-cd.yml`. Voir `admin/README.md` pour démarrer en local.

- **`docs/`** — Documentation de cadrage du projet : `docs/DEPLOIEMENT-VPS.md`
  (procédure de déploiement complète, pas à pas) et `docs/ANALYSE-PLAN-BACKEND.md`
  (analyse de l'existant, choix d'architecture, feuille de route).

Les trois projets cohabitent sur le même VPS, orchestrés par `docker-compose.prod.yml`
(à la racine) et exposés en HTTPS par un reverse proxy Caddy (voir `Caddyfile`), mais
restent trois images Docker et trois pipelines CI/CD indépendants : modifier l'un ne
redéploie jamais les autres.

## Déploiement

**Procédure complète pas à pas : [`docs/DEPLOIEMENT-VPS.md`](docs/DEPLOIEMENT-VPS.md).**

Tout tourne sur un seul VPS. Nginx, installé sur l'hôte, est le seul point d'entrée
public (80/443) ; les trois conteneurs ne sont publiés que sur `127.0.0.1`.

| Chemin modifié | Service | Port interne | Domaine | Workflow |
|---|---|---|---|---|
| `frontend/**` | `web` (nginx) | `127.0.0.1:3000` | `SITE_DOMAIN` | `frontend-ci-cd.yml` |
| `backend/**` | `api` (NestJS) | `127.0.0.1:4000` | `API_DOMAIN` | `backend-ci-cd.yml` |
| `admin/**` | `admin` (nginx) | `127.0.0.1:3001` | `ADMIN_DOMAIN` | `admin-ci-cd.yml` |
| `deploy/**` | infrastructure | — | — | `infra-ci-cd.yml` |

Chaque pipeline construit son image, la publie sur le GitHub Container Registry, puis
appelle `deploy.sh` en SSH sur le VPS pour ne redémarrer que son service. Les
certificats HTTPS sont gérés par Certbot (`certonly --webroot`), renouvelés
automatiquement.

MySQL est mutualisé entre les projets du VPS (`/opt/infrastructure/mysql`), avec une
base et un utilisateur dédiés par projet.

### `deploy/` — infrastructure versionnée

Ce dossier reproduit l'arborescence `/opt` du VPS et y est synchronisé par le pipeline
Infra CI/CD :

```
deploy/
├── apps/frejus/            -> /opt/apps/frejus/
│   ├── docker-compose.yml
│   ├── .env.example
│   └── deploy.sh
├── infrastructure/         -> /opt/infrastructure/
│   ├── nginx/              configuration Nginx (templates) + scripts TLS
│   └── mysql/              instance MySQL mutualisée
└── scripts/
    └── vps-bootstrap.sh    préparation d'un VPS Debian/Ubuntu vierge
```

Les fichiers `.env` de production ne sont jamais versionnés ni poussés par les
pipelines : ils sont créés à la main sur le VPS depuis les `.env.example`.
