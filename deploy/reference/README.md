# `deploy/reference/` — non déployé

**Rien de ce dossier n'est copié sur le VPS.** Le pipeline CI/CD ne synchronise que
`deploy/apps/frejus/` vers `VPS_APP_PATH`, et ne sort jamais de ce dossier.

Ce qui est ici décrit l'environnement *autour* de l'application — le reverse proxy et
la base de données — qui est administré à la main, avec les droits root, hors du
périmètre du déploiement. C'est ce qui permet à l'utilisateur de déploiement de n'avoir
aucun sudo : il lui suffit d'appartenir au groupe `docker` et de posséder son dossier
applicatif.

| Dossier | Contenu | Statut |
|---|---|---|
| `nginx/` | vhosts de référence pour le reverse proxy, et scripts optionnels pour les appliquer | à appliquer à la main |
| `mysql/` | un `docker-compose.yml` MySQL et un script de provisionnement base + utilisateur | point de départ, si la base n'existe pas déjà |

## Ce que l'application attend de l'extérieur

C'est le contrat réel entre le déploiement et l'administration de la machine. Tant
qu'il est respecté, la façon dont Nginx et MySQL sont installés n'a pas d'importance.

**Un reverse proxy** qui relaie vers les trois conteneurs, publiés sur `127.0.0.1`
uniquement :

| Depuis l'extérieur | Vers |
|---|---|
| `/` | `127.0.0.1:3000` — site vitrine |
| `/api/` et `/uploads/` | `127.0.0.1:4000` — API |
| panneau admin, **à la racine** de son point d'entrée | `127.0.0.1:3001` |

Deux pièges détaillés dans [`nginx/README.md`](nginx/README.md) : le `proxy_pass` de
`/api/` sans barre oblique finale, et l'admin qui ne peut pas être servi sous un
sous-chemin.

**Une base MySQL** joignable depuis le conteneur `api`, avec une base et un
utilisateur dédiés. Le `.env` applicatif porte les coordonnées :

- `DB_NETWORK` — réseau Docker auquel brancher l'API pour atteindre la base
- `DB_HOST` / `DB_PORT` — où la joindre depuis ce réseau
- `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE`

Les trois cas courants (base conteneurisée, base sur l'hôte, base distante) sont
documentés dans `deploy/apps/frejus/.env.example`.
