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
| `deploy/apps/**` | — | fichiers de la stack | — | — |

Les images sont publiées sur le GitHub Container Registry, puis `deploy.sh` est appelé
en SSH sur le VPS pour ne redémarrer que les services concernés. Le menu *Run workflow*
permet de forcer un composant précis, ou tout reconstruire.

Le déploiement ne sort jamais de `VPS_APP_PATH`. **Le reverse proxy et la base de
données sont administrés à la main**, hors du dépôt : le pipeline ne les installe pas,
ne les configure pas et ne les redémarre pas. Ce qu'ils doivent fournir est décrit dans
[`deploy/reference/`](deploy/reference/).

Deux modes d'exposition, selon le vhost Nginx choisi :

- **domaine + HTTPS** (`frejus.conf.template`) — un vhost par domaine, certificats
  Certbot (`certonly --webroot`) renouvelés automatiquement ;
- **IP nue** (`frejus-ip.conf.template`) — sans domaine ni HTTPS, pour valider la
  stack : site sur `http://IP/`, API sur `http://IP/api/`, admin sur `http://IP:8080/`.

L'API joint la base via `DB_NETWORK` (réseau Docker à rejoindre) et `DB_HOST` /
`DB_PORT` du `.env` : base conteneurisée, sur l'hôte ou distante, peu importe.

### `deploy/` — ce qui part sur le VPS, et ce qui n'en part pas

```text
deploy/
├── apps/frejus/            -> synchronisé vers VPS_APP_PATH
│   ├── docker-compose.yml
│   ├── .env.example
│   └── deploy.sh
├── reference/              NON déployé — administré à la main, avec les droits root
│   ├── nginx/              vhosts de référence pour le reverse proxy
│   └── mysql/              point de départ si la base n'existe pas déjà
└── scripts/                lancés à la main, une seule fois
    ├── vps-bootstrap.sh    VPS vierge : Docker, Nginx, utilisateur, dossier, pare-feu
    ├── vps-prepare.sh      VPS déjà administré : crée le dossier applicatif
    └── vps-check.sh        diagnostic des prérequis, ne modifie rien
```

Sur le VPS, `VPS_APP_PATH` finit par ressembler à ceci :

```text
/opt/apps/frejus/
├── docker-compose.yml      copiés par le pipeline
├── deploy.sh
├── .env                    créé à la main, jamais versionné ni poussé
├── data/uploads/           images uploadées
└── logs/                   logs Nginx du projet, si tu les y diriges
```

Le déploiement n'utilise **aucun `sudo`**. L'utilisateur SSH n'a besoin que
d'appartenir au groupe `docker` et de posséder `VPS_APP_PATH` : le pipeline y crée
lui-même `data/uploads`, `logs` et le réseau Docker `frejus` au premier déploiement.
Créer ce dossier et lui en donner la propriété est la seule opération qui demande root
— une fois, avec [`deploy/scripts/vps-prepare.sh`](deploy/scripts/vps-prepare.sh).

MySQL, Nginx, le pare-feu et SSH restent administrés à la main, hors du périmètre du
pipeline — voir [`deploy/reference/`](deploy/reference/).
