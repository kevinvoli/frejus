# Déploiement sur le VPS

## Périmètre

Le pipeline CI/CD construit les images, les publie sur GHCR, et redémarre les
conteneurs. **Il ne sort jamais de `VPS_APP_PATH` et n'utilise aucun `sudo`.**

| | Qui |
|---|---|
| Images Docker, conteneurs, `docker-compose.yml`, `deploy.sh` | le pipeline |
| Dossier applicatif, `.env`, base MySQL, reverse proxy, pare-feu, SSH | toi, à la main |

L'utilisateur SSH de déploiement n'a besoin que de deux choses : appartenir au groupe
`docker`, et posséder son dossier applicatif. Aucune règle sudoers n'est nécessaire.

Ce que l'application attend de l'environnement — le contrat à respecter, quelle que
soit la façon dont Nginx et MySQL sont installés — est décrit dans
[`deploy/reference/`](../deploy/reference/).

## Architecture

```
                        INTERNET
                            |
                      80 / 443 (HTTPS si domaine)
                            |
                          NGINX                   (sur l'hôte, seul point d'entrée,
                            |                      installé et configuré à la main)
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
                            |                      réseau Docker « DB_NETWORK »
                      +-----v-----+
                      |   MySQL   |                administré à part
                      +-----------+                (conteneur, hôte ou distant)
```

Les ports 3000 / 3001 / 4000 sont publiés **sur `127.0.0.1` uniquement** : ils ne sont
joignables ni depuis Internet ni depuis le réseau local du VPS. Le pare-feu n'ouvre que
22, 80, et le port du panneau admin en mode IP nue.

## Arborescence du VPS

```
$APP/                       <- VPS_APP_PATH, possédé par l'utilisateur de déploiement
├── docker-compose.yml      <- copiés par le pipeline, ne pas éditer sur le VPS
├── deploy.sh
├── .env.example
├── .env                    <- secrets, jamais versionné, chmod 600
├── data/
│   └── uploads/            <- images uploadées (portfolio, galeries)
└── logs/                   <- logs Nginx du projet, si tu les y diriges
```

Seuls `.env` et `data/` sont propres au VPS ; tout le reste vient du dépôt et est
écrasé à chaque déploiement touchant `deploy/apps/**`.

## Deux modes de mise en ligne

Le choix ne tient qu'au vhost Nginx posé sur l'hôte, et aux URL avec lesquelles les
bundles sont construits.

| | **Domaine + HTTPS** | **IP nue** |
|---|---|---|
| Vhost | `frejus.conf.template` | `frejus-ip.conf.template` |
| Site vitrine | `https://SITE_DOMAIN` | `http://IP/` |
| API | `https://API_DOMAIN/api` | `http://IP/api/` |
| Admin | `https://ADMIN_DOMAIN` | `http://IP:8080/` |
| Prérequis | 3 enregistrements DNS + Certbot | aucun |
| Ports ouverts | 22, 80, 443 | 22, 80, 8080 |

Le mode IP nue sert à valider la stack de bout en bout avant d'avoir un domaine. Le
panneau admin y est publié sur son propre port plutôt que sous `/admin/` : c'est une
SPA `react-router-dom` servie à la racine (pas de `base` Vite ni de `basename`), un
sous-chemin casserait le routage et les assets.

> **Le trafic est en clair en mode IP nue.** Le JWT de l'admin et le mot de passe de
> connexion transitent sans chiffrement : à réserver à une validation technique, pas à
> une ouverture au public ni à des données réelles.

---

## 1. Dossier applicatif

C'est la seule opération du déploiement qui demande root, parce que `/opt` appartient
à root. À faire une fois.

```bash
curl -fsSL https://raw.githubusercontent.com/kevinvoli/frejus/master/deploy/scripts/vps-prepare.sh -o vps-prepare.sh
less vps-prepare.sh
sudo bash vps-prepare.sh
```

Le script crée `/opt/apps/frejus` et en donne la propriété à l'utilisateur `deploy`.
Il n'installe aucun paquet et ne touche ni au pare-feu, ni à sudo, ni à Nginx, ni à
MySQL, ni à SSH.

**Rien à faire** si le dossier existe déjà et appartient à cet utilisateur, ou si
`VPS_APP_PATH` pointe sous son home : le pipeline crée alors seul `data/uploads`,
`logs` et le réseau Docker `frejus`.

Pour un VPS entièrement vierge, `vps-bootstrap.sh` fait en plus l'installation de
Docker, Nginx, Certbot et la création de l'utilisateur. **Ne pas le lancer** sur une
machine déjà administrée : il réinstalle des paquets, réécrit les règles `ufw` et
supprime le vhost Nginx par défaut.

## 2. Clé SSH de déploiement

Sur ta machine :

```bash
ssh-keygen -t ed25519 -f ~/.ssh/frejus_deploy -N "" -C "github-actions-frejus"
```

- `~/.ssh/frejus_deploy.pub` -> à ajouter dans `/home/deploy/.ssh/authorized_keys`
- `~/.ssh/frejus_deploy` (clé **privée**) -> secret GitHub `VPS_SSH_KEY`

Vérifier : `ssh -i ~/.ssh/frejus_deploy deploy@IP_DU_VPS 'docker ps'`

Si l'accès root en SSH est désactivé — ce qui est recommandé — la clé publique doit
être posée depuis un compte disposant déjà d'un accès, ou depuis la console de
l'hébergeur.

## 3. Base de données

MySQL est administré à la main : le déploiement ne l'installe pas, ne le démarre pas
et ne le reconfigure pas. Il faut simplement qu'à la fin de cette étape existent :

- une base et un utilisateur **dédiés au projet**, l'utilisateur n'ayant de droits que
  sur cette base ;
- un chemin réseau permettant au conteneur `api` de les joindre.

Le second point est le seul piège. Le conteneur `api` ne voit pas `127.0.0.1` de
l'hôte : il faut lui indiquer un réseau Docker à rejoindre (`DB_NETWORK`) et une
adresse joignable depuis ce réseau (`DB_HOST`).

| Base hébergée | `DB_NETWORK` | `DB_HOST` |
|---|---|---|
| dans un conteneur Docker | le réseau de ce conteneur | nom ou alias du conteneur |
| sur l'hôte, hors Docker | `bridge` | `172.17.0.1` (vérifier : `ip -4 addr show docker0`) |
| sur un autre serveur | `bridge` | son IP ou son hostname |

Pour une base sur l'hôte, MySQL doit écouter sur l'interface `docker0` et pas seulement
sur `127.0.0.1`, et le pare-feu laisser passer le 3306 depuis le sous-réseau Docker.

Trouver le réseau d'un conteneur existant :

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' <conteneur-mysql>
```

Si la base n'existe pas encore, [`deploy/reference/mysql/`](../deploy/reference/mysql/)
donne un `docker-compose.yml` et un script `create-app-db.sh` comme point de départ.
Ces fichiers ne sont pas déployés : ils se copient et se lancent à la main.

## 4. Configuration de l'application

Le `.env` n'est jamais versionné ni poussé par le pipeline. Le premier déploiement
dépose `.env.example` à côté ; il suffit ensuite de le copier et de le remplir.

```bash
APP=/opt/apps/frejus
cd "$APP"
cp .env.example .env

openssl rand -base64 48          # -> JWT_SECRET
openssl rand -base64 18          # -> ADMIN_PASSWORD

nano .env && chmod 600 .env
```

Points d'attention :

- `DB_NETWORK` / `DB_HOST` / `DB_PORT` — voir le tableau de l'étape 3 ; c'est la cause
  numéro un d'un conteneur `api` qui redémarre en boucle ;
- `DB_PASSWORD` — celui de l'utilisateur dédié créé à l'étape 3 ;
- `CORS_ORIGIN` — **jamais `*`**, l'admin s'authentifie en JWT ;
- en mode IP nue, les trois `*_DOMAIN` reçoivent la même valeur : l'IP publique.

Exemple complet en mode IP nue :

```bash
SITE_DOMAIN=203.0.113.10
API_DOMAIN=203.0.113.10
ADMIN_DOMAIN=203.0.113.10
CORS_ORIGIN=http://203.0.113.10,http://203.0.113.10:8080
```

Le site est servi par la même origine que l'API, donc sans CORS ; l'admin est sur un
autre port et lui est cross-origin, d'où sa présence dans la liste.

## 5. Reverse proxy

Étape manuelle, avec les droits root. Nginx doit relayer vers les trois conteneurs :

| Depuis l'extérieur | Vers |
|---|---|
| `/` | `127.0.0.1:3000` — site vitrine |
| `/api/` et `/uploads/` | `127.0.0.1:4000` — API |
| panneau admin, **à la racine** de son point d'entrée | `127.0.0.1:3001` |

Le préfixe `/api` fait partie des routes de l'application (`setGlobalPrefix`) : le
`proxy_pass` ne doit pas le retirer, donc pas de barre oblique finale.

Les vhosts de référence et la procédure complète sont dans
[`deploy/reference/nginx/`](../deploy/reference/nginx/). En mode IP nue, une fois le
dossier copié sur le VPS :

```bash
sudo APP_DIR=/opt/apps/frejus ADMIN_PORT=8080 \
  envsubst '${APP_DIR} ${ADMIN_PORT}' \
  < frejus-ip.conf.template \
  > /etc/nginx/sites-available/frejus.conf

sudo install -m 0644 frejus-proxy.conf /etc/nginx/snippets/frejus-proxy.conf
sudo ln -sfn /etc/nginx/sites-available/frejus.conf /etc/nginx/sites-enabled/frejus.conf

# Le template déclare default_server sur le port 80 ; le vhost livré par le paquet
# Nginx revendique le même rôle et ferait échouer `nginx -t`.
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t && sudo systemctl reload nginx
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
```

Pour le mode domaine, créer d'abord les trois enregistrements DNS A vers l'IP du VPS,
puis utiliser `tls-setup.sh` du même dossier : il vérifie la résolution, obtient un
certificat par domaine (`certbot certonly --webroot`) et bascule sur la configuration
HTTPS.

## 6. Secrets et variables GitHub

GitHub distingue deux onglets dans `Settings > Secrets and variables > Actions` :
**Secrets** (chiffrés, masqués dans les logs) et **Variables** (en clair, lisibles).
Le workflow accepte indifféremment l'un ou l'autre : il lit `secrets.X`, puis `vars.X`,
puis une valeur par défaut.

**Obligatoirement en Secret** :

| Nom | Valeur |
|---|---|
| `VPS_SSH_KEY` | contenu de la clé privée `frejus_deploy` |
| `GHCR_TOKEN` | PAT `read:packages`, seulement si les packages GHCR restent privés |

**Requis** — sans eux le job `deploy` s'arrête avec un avertissement, les images
restant construites et publiées :

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
> déploient, mais le site et l'admin appellent `localhost` et ne voient jamais l'API :
> le site n'affiche que son contenu de repli. Les renseigner impose de relancer le
> pipeline pour les composants concernés — éditer le `.env` du VPS ne suffit pas.

En mode IP nue, elles valent `http://<IP>/api`, `http://<IP>/api` et `http://<IP>`.

`VPS_APP_PATH` gagne à être une **Variable** plutôt qu'un Secret : en Secret, GitHub
masque sa valeur partout dans les logs, et les messages d'erreur affichent `***` à la
place du chemin.

**Sur les images GHCR** : un package publié depuis un dépôt privé est privé par
défaut, et le VPS ne pourra pas le `pull` sans `GHCR_USERNAME` / `GHCR_TOKEN`. Le plus
simple est de rendre les trois packages publics une fois créés
(`github.com/users/kevinvoli/packages` -> chaque package -> *Package settings* ->
*Change visibility* -> Public) et de ne pas définir ces deux valeurs.

## 7. Premier déploiement

1. *Actions* -> *CI/CD* -> *Run workflow*, composants = **tout**. Les trois images sont
   construites en parallèle et publiées sur GHCR ; le VPS reçoit `docker-compose.yml`
   et `deploy.sh`, et le job s'arrête sur un avertissement `.env absent`. C'est attendu
   au premier passage.
2. Remplir le `.env` (étape 4) si ce n'est pas déjà fait.
3. Relancer *Run workflow* -> **tout**. La stack démarre.
4. Vérifier sur le VPS :

```bash
cd /opt/apps/frejus
docker compose ps
docker compose logs -f api
```

5. Vérifier depuis l'extérieur, en mode IP nue :
   - `http://<IP>/` -> site vitrine
   - `http://<IP>/api/settings` -> JSON
   - `http://<IP>:8080/` -> login admin

   Identifiants = `ADMIN_EMAIL` / `ADMIN_PASSWORD` du `.env`. **Changer le mot de
   passe immédiatement après le premier login.**

Contrôler l'état des prérequis à tout moment, sans rien modifier :

```bash
curl -fsSL https://raw.githubusercontent.com/kevinvoli/frejus/master/deploy/scripts/vps-check.sh -o vps-check.sh
APP_DIR=/opt/apps/frejus bash vps-check.sh
```

Il teste notamment la joignabilité de la base **depuis le réseau Docker que l'API
utilisera**, ce qui est le seul point de vue qui compte.

## 8. Déploiements suivants

Chaque push sur `master` déclenche le pipeline, qui compare le commit précédent au
nouveau et ne traite que les composants concernés. Plusieurs composants modifiés dans
le même push sont construits en parallèle, puis déployés en une seule session SSH.

| Chemin modifié | Effet sur le VPS |
|---|---|
| `frontend/**` | `deploy.sh web <image>` |
| `backend/**` | `deploy.sh api <image>` |
| `admin/**` | `deploy.sh admin <image>` |
| `deploy/apps/**` | `scp` des fichiers de la stack + `docker compose up` |
| `.github/workflows/ci-cd.yml` | tout : impossible de savoir quel composant est affecté |
| autre (docs, `deploy/reference/**`…) | rien |

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
docker compose restart api

# Rollback sur un SHA précédent
./deploy.sh api ghcr.io/kevinvoli/frejus-backend:<sha>
```

### Sauvegardes

Rien n'est automatisé — à mettre en cron, avec envoi hors du VPS.

```bash
# Images uploadées
tar czf /opt/backups/frejus-uploads-$(date +%F).tar.gz \
  -C /opt/apps/frejus/data uploads
```

La sauvegarde de la base dépend de la façon dont MySQL est hébergé ; elle relève de son
administration, pas du déploiement.

---

## Points d'attention avant mise en production réelle

- **`DB_SYNCHRONIZE=true`** : TypeORM adapte le schéma depuis les entités à chaque
  démarrage. Acceptable pour valider le déploiement, dangereux avec des données
  réelles — une entité renommée dans le code supprime la colonne en base. Passer à
  `false` et mettre en place de vraies migrations TypeORM avant d'accueillir des
  données client (voir `docs/ANALYSE-PLAN-BACKEND.md`).
- **Mode IP nue** : tout le trafic est en clair, JWT compris. Passer à un domaine et
  HTTPS avant toute ouverture au public.
- **`CORS_ORIGIN`** : ne jamais laisser `*`, l'admin s'authentifie en JWT.
- **`ADMIN_PASSWORD`** : le compte n'est créé qu'au premier démarrage si la table
  `admin_users` est vide ; changer le mot de passe depuis le panneau ensuite.
- **Utilisateur de déploiement** : le pipeline ne lui demande aucun `sudo`, mais son
  appartenance au groupe `docker` équivaut malgré tout à un accès root sur la machine
  (un conteneur peut monter `/`). Lui refuser sudo réduit la surface, ça ne l'élimine
  pas. La clé SSH correspondante ne doit servir qu'au CI/CD.
- **Nginx et MySQL hors pipeline** : leur configuration est manuelle. Après un
  changement de port publié, de domaine ou de mode, recharger Nginx à la main — le
  déploiement d'une image ne le fera pas.
