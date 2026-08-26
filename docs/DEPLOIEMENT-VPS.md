# Déploiement sur le VPS

## Architecture

```
                        INTERNET
                            |
                      80 / 443 HTTPS
                            |
                          NGINX                   (sur l'hôte, seul point d'entrée)
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
      127.0.0.1:3000  127.0.0.1:4000  127.0.0.1:3001
              |             |             |
        +-----v-----+ +-----v-----+ +-----v-----+
        |    web    | |    api    | |   admin   |   réseau Docker « frejus »
        |  (nginx)  | | (NestJS)  | |  (nginx)  |
        +-----------+ +-----+-----+ +-----------+
                            |
                            |                      réseau Docker « infrastructure »
                      +-----v-----+
                      |   mysql   |                /opt/infrastructure/mysql
                      +-----------+                (mutualisé entre les projets)
```

Les ports 3000 / 3001 / 4000 sont publiés **sur `127.0.0.1` uniquement** : ils ne sont
joignables ni depuis Internet ni depuis le réseau local du VPS. Le pare-feu n'ouvre
que 22, 80 et 443.

## Arborescence du VPS

```
/opt/
├── apps/
│   └── frejus/
│       ├── docker-compose.yml
│       ├── .env                    <- secrets, jamais versionné, chmod 600
│       ├── deploy.sh
│       ├── data/
│       │   ├── api/uploads/        <- images uploadées (portfolio, galeries)
│       │   ├── frontend/           <- vide (build statique sans état)
│       │   └── admin/              <- vide (build statique sans état)
│       └── logs/                   <- logs Nginx du projet, rotation quotidienne
│
├── infrastructure/
│   ├── nginx/
│   │   ├── frejus.conf.template
│   │   ├── frejus-acme.conf.template
│   │   ├── frejus-proxy.conf
│   │   ├── nginx-apply.sh
│   │   └── tls-setup.sh
│   └── mysql/
│       ├── docker-compose.yml
│       ├── .env                    <- mot de passe root, chmod 600
│       ├── create-app-db.sh
│       └── data/                   <- données MySQL de tous les projets
│
└── backups/
```

Tout ce qui est versionné vit dans `deploy/` du dépôt et se synchronise sur `/opt` via
le pipeline CI/CD lorsque `deploy/**` change. Seuls les deux `.env` et `data/` sont
propres au VPS.


---

## Deux modes de mise en ligne

La stack peut être exposée de deux façons. Le mode est choisi par la variable
`NGINX_TEMPLATE` du `.env` applicatif ; passer de l'un à l'autre ne demande aucune
modification du code applicatif.

| | **Domaine + HTTPS** | **IP nue** |
|---|---|---|
| `NGINX_TEMPLATE` | `frejus.conf.template` | `frejus-ip.conf.template` |
| Site vitrine | `https://SITE_DOMAIN` | `http://IP/` |
| API | `https://API_DOMAIN/api` | `http://IP/api/` |
| Admin | `https://ADMIN_DOMAIN` | `http://IP:8080/` |
| Prérequis | 3 enregistrements DNS + Certbot | aucun |
| Ports ouverts | 22, 80, 443 | 22, 80, 443, `ADMIN_PORT` |

Le mode IP nue sert à valider la stack de bout en bout avant d'avoir un domaine. Le
panneau admin y est publié sur son propre port plutôt que sous `/admin/` : c'est une
SPA `react-router-dom` servie à la racine (pas de `base` Vite ni de `basename`), un
sous-chemin casserait le routage et les assets.

> **Le trafic est en clair.** Le JWT de l'admin et le mot de passe de connexion
> transitent sans chiffrement : à réserver à une validation technique, pas à une
> ouverture au public ni à des données réelles.

Les étapes 1 (DNS) et 7 (HTTPS) ne concernent que le mode domaine — voir
[la variante IP nue](#7bis-variante-ip-nue-sans-domaine-ni-https) à la place.
---

## 1. DNS

Trois enregistrements **A** vers l'IP du VPS, **avant** de lancer `tls-setup.sh` :

| Nom | Type | Valeur |
|---|---|---|
| `pixellia.fr` | A | `IP_DU_VPS` |
| `api.pixellia.fr` | A | `IP_DU_VPS` |
| `admin.pixellia.fr` | A | `IP_DU_VPS` |

Reporter ces valeurs à l'identique dans `/opt/apps/frejus/.env`
(`SITE_DOMAIN`, `API_DOMAIN`, `ADMIN_DOMAIN`) : la configuration Nginx en est générée.

## 2. Préparation du VPS

Sur le VPS, en root :

```bash
curl -fsSL https://raw.githubusercontent.com/kevinvoli/frejus/master/deploy/scripts/vps-bootstrap.sh -o vps-bootstrap.sh
less vps-bootstrap.sh          # relire avant d'exécuter
sudo bash vps-bootstrap.sh
```

Installe Docker, Nginx et Certbot ; crée l'utilisateur `deploy` (groupe `docker`),
l'arborescence `/opt`, les réseaux Docker `frejus` et `infrastructure`, la rotation
des logs, et n'ouvre que SSH / 80 / 443 au pare-feu.

## 3. Clé SSH de déploiement

Sur ta machine :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/frejus_deploy -N "" -C "github-actions-frejus"
```

- `~/.ssh/frejus_deploy.pub` -> à ajouter dans `/home/deploy/.ssh/authorized_keys` sur le VPS
- `~/.ssh/frejus_deploy` (clé **privée**) -> secret GitHub `VPS_SSH_KEY`

Vérifier : `ssh -i ~/.ssh/frejus_deploy deploy@IP_DU_VPS 'docker ps'`

## 4. Copie des fichiers d'infrastructure

Depuis le dépôt, sur ta machine :

```bash
scp -i ~/.ssh/frejus_deploy -r deploy/apps/frejus/. deploy@IP_DU_VPS:/opt/apps/frejus/
scp -i ~/.ssh/frejus_deploy -r deploy/infrastructure/. deploy@IP_DU_VPS:/opt/infrastructure/
```

Les fois suivantes, c'est le pipeline CI/CD qui s'en charge : tout push touchant
`deploy/**` resynchronise `/opt`.

## 5. MySQL mutualisé

Sur le VPS :

```bash
cd /opt/infrastructure/mysql
cp .env.example .env
openssl rand -base64 24          # -> MYSQL_ROOT_PASSWORD
nano .env && chmod 600 .env

docker compose up -d
docker compose ps                # attendre l'état "healthy"

# Base + utilisateur dédiés au projet (droits limités à cette seule base)
chmod +x create-app-db.sh
./create-app-db.sh frejus frejus '<mot-de-passe-choisi>'
```

Noter ce mot de passe : il devient `DB_PASSWORD` dans le `.env` applicatif.

## 6. Configuration de l'application

```bash
cd /opt/apps/frejus
cp .env.example .env

openssl rand -base64 48          # -> JWT_SECRET
openssl rand -base64 18          # -> ADMIN_PASSWORD

nano .env && chmod 600 .env
chmod +x deploy.sh
```

Points d'attention dans le `.env` :

- `DB_PASSWORD` = celui passé à `create-app-db.sh`
- `CORS_ORIGIN` = `https://<SITE_DOMAIN>,https://<ADMIN_DOMAIN>` — **jamais `*`**
- les trois domaines doivent correspondre exactement aux enregistrements DNS

## 7. HTTPS et Nginx

Une fois les DNS propagés :

```bash
sudo chmod +x /opt/infrastructure/nginx/*.sh
sudo /opt/infrastructure/nginx/tls-setup.sh
```

Le script vérifie que les trois domaines résolvent bien vers ce VPS, pose une
configuration HTTP temporaire, obtient un certificat par domaine
(`certbot certonly --webroot`), puis bascule sur la configuration HTTPS définitive et
recharge Nginx. Le renouvellement est ensuite automatique (timer systemd de certbot).

Certbot n'édite jamais la configuration : celle-ci est régénérée depuis
`frejus.conf.template` par `nginx-apply.sh`. Pour toute modification, éditer le
template **dans le dépôt** — le fichier `/etc/nginx/sites-available/frejus.conf` est
écrasé à chaque application.

## 7bis. Variante IP nue (sans domaine ni HTTPS)

À la place des étapes 1 et 7. Remplacer `<IP>` par l'IP publique du VPS.

Dans `/opt/apps/frejus/.env` :

```bash
SITE_DOMAIN=<IP>
API_DOMAIN=<IP>
ADMIN_DOMAIN=<IP>
NGINX_TEMPLATE=frejus-ip.conf.template
ADMIN_PORT=8080
CORS_ORIGIN=http://<IP>,http://<IP>:8080
```

Les trois variables `*_DOMAIN` reçoivent la même valeur : en mode IP nue elles ne
servent qu'à l'affichage, le template n'utilise que `server_name _`.

Ouvrir le port de l'admin et appliquer la configuration :

```bash
sudo ufw allow 8080/tcp
sudo /opt/infrastructure/nginx/nginx-apply.sh
```

`nginx-apply.sh` retire alors le lien `/etc/nginx/sites-enabled/default` (le fichier
reste dans `sites-available`), qui revendiquerait le même `default_server` sur le port
80. Si la configuration produite est invalide, l'état précédent est restauré et Nginx
n'est pas rechargé.

Côté GitHub, les trois variables de build valent :

| Variable | Valeur |
|---|---|
| `FRONTEND_VITE_API_URL` | `http://<IP>/api` |
| `ADMIN_VITE_API_URL` | `http://<IP>/api` |
| `ADMIN_VITE_FRONTEND_URL` | `http://<IP>` |

### Repasser en domaine + HTTPS

1. Créer les trois enregistrements DNS A (étape 1).
2. Dans le `.env` : remettre les vrais domaines, `NGINX_TEMPLATE=frejus.conf.template`,
   `CORS_ORIGIN=https://<SITE_DOMAIN>,https://<ADMIN_DOMAIN>`.
3. `sudo /opt/infrastructure/nginx/tls-setup.sh`
4. `sudo ufw delete allow 8080/tcp`
5. Mettre à jour les trois variables `VITE_*` en `https://…` et **relancer les
   pipeline CI/CD** pour `frontend` et `admin` : ces URL sont gravées dans les bundles.

## 8. Secrets et variables GitHub

GitHub distingue deux onglets dans `Settings > Secrets and variables > Actions` :
**Secrets** (chiffrés, masqués dans les logs) et **Variables** (en clair, lisibles).
Les workflows acceptent indifféremment l'un ou l'autre pour tout ce qui n'est pas
sensible — ils lisent `secrets.X`, puis `vars.X`, puis une valeur par défaut.

**Obligatoirement en Secret** (jamais en Variable) :

| Nom | Valeur |
|---|---|
| `VPS_SSH_KEY` | contenu de la clé privée `frejus_deploy` |
| `GHCR_TOKEN` | PAT `read:packages`, seulement si les packages GHCR restent privés |

**Requis, en Secret ou en Variable** — sans eux le job `deploy` s'arrête avec un
avertissement, les images restant construites et publiées sur GHCR :

| Nom | Valeur |
|---|---|
| `VPS_HOST` | IP ou hostname du VPS |
| `VPS_USER` | utilisateur SSH de déploiement (`deploy`) |

**Facultatifs**, chacun avec une valeur par défaut :

| Nom | Défaut | Rôle |
|---|---|---|
| `VPS_PORT` | `22` | port SSH |
| `VPS_APP_PATH` | `/opt/apps/frejus` | dossier applicatif sur le VPS |
| `FRONTEND_VITE_API_URL` | `http://localhost:3000/api` | URL de l'API pour le build du site vitrine |
| `ADMIN_VITE_API_URL` | `http://localhost:3000/api` | URL de l'API pour le build de l'admin |
| `ADMIN_VITE_FRONTEND_URL` | `http://localhost:5173` | URL du site, pour le lien de galerie partagé au client |
| `GHCR_USERNAME` | — | seulement si les packages GHCR restent privés |

> Les trois URL `VITE_*` sont **gravées en dur dans les bundles JavaScript** au moment
> du build. Tant qu'elles ne sont pas renseignées, les images se construisent et se
> déploient, mais le site et l'admin appelleront `localhost` et ne verront jamais
> l'API : le site n'affichera que son contenu de repli. Les renseigner impose de
> relancer le pipeline pour les composants concernés — éditer le `.env` du VPS ne suffit pas.

**Sur les images GHCR** : un package publié depuis un dépôt privé est privé par
défaut, et le VPS ne pourra pas le `pull` sans `GHCR_USERNAME` / `GHCR_TOKEN`. Le plus
simple est de rendre les trois packages publics une fois créés
(`github.com/users/kevinvoli/packages` -> chaque package -> *Package settings* ->
*Change visibility* -> Public) et de ne pas définir ces deux valeurs.

### Tester le pipeline avant que le VPS soit prêt

Le job `build` ne dépend d'aucun secret VPS : il se valide seul via *Actions* ->
*CI/CD* -> *Run workflow*. Sans `VPS_HOST`, le job `deploy` se contente d'un
avertissement et les images restent publiées sur GHCR ; avec `VPS_HOST` mais sans
`/opt/apps/frejus` sur le VPS, il échoue avec un message explicite.

## 9. Premier déploiement

1. *Actions* -> *CI/CD* -> *Run workflow*, composants = **tout**. Les trois images sont
   construites en parallèle, publiées sur GHCR, puis `deploy.sh` est appelé sur le VPS
   pour chacune (`api`, `web`, `admin`).
2. Vérifier sur le VPS :

```bash
cd /opt/apps/frejus
docker compose ps
docker compose logs -f api
```

3. Vérifier depuis l'extérieur.

   En mode domaine :
   - `https://pixellia.fr` -> site vitrine
   - `https://api.pixellia.fr/api/settings` -> JSON
   - `https://admin.pixellia.fr` -> login

   En mode IP nue :
   - `http://<IP>/` -> site vitrine
   - `http://<IP>/api/settings` -> JSON
   - `http://<IP>:8080/` -> login

   Identifiants = `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`. **Changer le mot de
   passe immédiatement après le premier login.**

## 10. Déploiements suivants

Automatiques : chaque push sur `master` déclenche le pipeline CI/CD, qui compare le
commit précédent au nouveau et ne traite que les composants concernés. Plusieurs
composants modifiés dans le même push sont construits en parallèle, puis déployés en
une seule session SSH.

| Chemin modifié | Effet sur le VPS |
|---|---|
| `frontend/**` | `deploy.sh web <image>` |
| `backend/**` | `deploy.sh api <image>` |
| `admin/**` | `deploy.sh admin <image>` |
| `deploy/**` | `scp` vers `/opt` + `nginx-apply.sh` + `deploy.sh` |
| `.github/workflows/ci-cd.yml` | tout : impossible de savoir quel composant est affecté |
| autre (docs, README...) | rien |

Pour forcer une reconstruction sans changement de code — nouvelle valeur de
`FRONTEND_VITE_API_URL`, par exemple — passer par *Actions* -> *CI/CD* ->
*Run workflow* et choisir le composant.

`deploy.sh` écrit le tag déployé (`<image>:<sha>`) dans le `.env` : un
`docker compose up -d` manuel lancé plus tard ne fait jamais revenir à une version
antérieure.

---

## Exploitation

```bash
cd /opt/apps/frejus

docker compose ps                       # état des services
docker compose logs -f api              # logs applicatifs
tail -f logs/api-access.log             # logs Nginx du projet
docker compose restart api

# Rollback sur un SHA précédent
./deploy.sh api ghcr.io/kevinvoli/frejus-backend:<sha>
```

### Sauvegardes

Rien n'est automatisé — à mettre en cron, avec envoi hors du VPS.

```bash
# Base de données
cd /opt/infrastructure/mysql
ROOT_PW="$(grep '^MYSQL_ROOT_PASSWORD=' .env | cut -d= -f2-)"
docker compose exec -T -e MYSQL_PWD="$ROOT_PW" mysql \
  mysqldump -u root --single-transaction frejus \
  > /opt/backups/frejus-db-$(date +%F).sql

# Images uploadées
tar czf /opt/backups/frejus-uploads-$(date +%F).tar.gz \
  -C /opt/apps/frejus/data/api uploads
```

### Ajouter un projet sur ce VPS

L'arborescence est prévue pour : créer `/opt/apps/<projet>/`, provisionner sa base avec
`/opt/infrastructure/mysql/create-app-db.sh <base> <user> <mdp>`, publier ses services
sur d'autres ports de `127.0.0.1`, et ajouter un `<projet>.conf` dans
`/opt/infrastructure/nginx/`. MySQL et Nginx sont partagés ; les réseaux Docker
restent cloisonnés par projet.

---

## Points d'attention avant mise en production réelle

- **`DB_SYNCHRONIZE=true`** : TypeORM adapte le schéma depuis les entités à chaque
  démarrage. Acceptable pour valider le déploiement, dangereux avec des données
  réelles — une entité renommée dans le code supprime la colonne en base. Passer à
  `false` et mettre en place de vraies migrations TypeORM avant d'accueillir des
  données client (voir `docs/ANALYSE-PLAN-BACKEND.md`).
- **MySQL mutualisé** : redémarrer l'instance impacte tous les projets du VPS. Les
  utilisateurs sont cloisonnés par base, mais la charge et la RAM sont partagées.
- **`CORS_ORIGIN`** : ne jamais laisser `*`, l'admin s'authentifie en JWT.
- **`ADMIN_PASSWORD`** : le compte n'est créé qu'au premier démarrage si la table
  `admin_users` est vide ; changer le mot de passe depuis le panneau ensuite.
- **Utilisateur `deploy`** : membre du groupe `docker`, ce qui équivaut à un accès root
  sur la machine. La clé SSH correspondante ne doit servir qu'au CI/CD.
