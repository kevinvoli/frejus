# frejus

Site vitrine + backend d'administration + panneau admin pour Pixellia Photographie.

Ce dépôt regroupe trois projets **indépendants**, chacun avec ses propres dépendances,
sa propre configuration et son propre pipeline de déploiement :

- **`frontend/`** — Site vitrine React + Vite + TypeScript, statique, branché sur l'API
  du `backend/` (accroche, à propos, coordonnées, spécialités, portfolio, témoignages,
  formulaire de contact — plus aucune donnée codée en dur). Se déploie en Docker (nginx)
  sur le VPS via le pipeline `.github/workflows/ci-cd.yml`. Voir `frontend/index.html` /
  `frontend/package.json` pour démarrer (`npm install && npm run dev`, puis
  `cp .env.example .env.local`).

- **`backend/`** — API NestJS + TypeORM + MySQL (authentification admin, contenu du
  site, portfolio, spécialités, témoignages, formulaire de contact, upload d'images).
  Se déploie en Docker sur le VPS via le pipeline `.github/workflows/ci-cd.yml`. Voir
  `backend/README.md` pour démarrer en local.

- **`admin/`** — Panneau d'administration React + Vite + TypeScript + Mantine :
  édition du contenu du site (textes, coordonnées), portfolio, spécialités,
  témoignages, boîte de réception du formulaire de contact. Parle à l'API du
  `backend/` en JWT. Se déploie en Docker **sur le même VPS que le backend** via
  le pipeline `.github/workflows/ci-cd.yml`. Voir `admin/README.md` pour démarrer en local.

- **`docs/`** — Documentation de cadrage du projet : `docs/DEPLOIEMENT-VPS.md`
  (procédure de déploiement complète, pas à pas) et `docs/ANALYSE-PLAN-BACKEND.md`
  (analyse de l'existant, choix d'architecture, feuille de route).

Les trois projets cohabitent sur le même VPS, derrière un Nginx installé sur l'hôte
et orchestrés par `deploy/apps/frejus/docker-compose.yml`, mais restent trois images
Docker construites et déployées indépendamment : modifier l'un ne redéploie jamais les
autres.

## Déploiement

**Procédure complète pas à pas : [`docs/DEPLOIEMENT-VPS.md`](docs/DEPLOIEMENT-VPS.md).**

Tout tourne sur un seul VPS. Nginx, installé sur l'hôte, est le seul point d'entrée
public (80/443) ; les trois conteneurs ne sont publiés que sur `127.0.0.1`.

Un pipeline unique, [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml), qui
ne construit et ne redéploie que les composants dont les fichiers ont changé :

| Chemin modifié | Image publiée | Service | Port interne | Domaine |
|---|---|---|---|---|
| `frontend/**` | `frejus-frontend` | `web` (nginx) | `127.0.0.1:3000` | `SITE_DOMAIN` |
| `backend/**` | `frejus-backend` | `api` (NestJS) | `127.0.0.1:4000` | `API_DOMAIN` |
| `admin/**` | `frejus-admin` | `admin` (nginx) | `127.0.0.1:3001` | `ADMIN_DOMAIN` |
| `deploy/**` | — | infrastructure | — | — |

Les images sont publiées sur le GitHub Container Registry, puis `deploy.sh` est appelé
en SSH sur le VPS pour ne redémarrer que les services concernés. Un changement dans
`deploy/**` synchronise `/opt` et recharge Nginx. Le menu *Run workflow* permet de
forcer un composant précis, ou tout reconstruire.

Deux modes d'exposition, choisis par `NGINX_TEMPLATE` dans le `.env` du VPS :

- **domaine + HTTPS** (`frejus.conf.template`) — un vhost par domaine, certificats
  Certbot (`certonly --webroot`) renouvelés automatiquement ;
- **IP nue** (`frejus-ip.conf.template`) — sans domaine ni HTTPS, pour valider la
  stack : site sur `http://IP/`, API sur `http://IP/api/`, admin sur `http://IP:8080/`.

MySQL est mutualisé entre les projets du VPS (`/opt/infrastructure/mysql`), avec une
base et un utilisateur dédiés par projet.

### `deploy/` — infrastructure versionnée

Ce dossier reproduit l'arborescence `/opt` du VPS et y est synchronisé par le pipeline
CI/CD lorsque `deploy/**` change :

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
