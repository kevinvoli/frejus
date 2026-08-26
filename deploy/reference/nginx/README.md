# Point d'entrée web — configuration de référence

**Le pipeline CI/CD ne copie jamais ces fichiers sur le VPS et ne touche jamais à
Nginx.** C'est un administrateur qui les applique, à la main, avec les droits root.
C'est ce qui permet à l'utilisateur de déploiement de n'avoir aucun sudo.

Copier ce dossier où l'on veut sur le VPS — les scripts se localisent eux-mêmes et
fonctionnent depuis n'importe quel chemin.

| Fichier | Rôle |
|---|---|
| `frejus-ip.conf.template` | mode IP nue : HTTP seul, sans domaine |
| `frejus.conf.template` | mode domaine : un vhost HTTPS par sous-domaine |
| `frejus-acme.conf.template` | configuration temporaire pour le premier challenge Certbot |
| `frejus-proxy.conf` | en-têtes communs à tous les `proxy_pass` |
| `nginx-apply.sh` | rend un template et recharge Nginx (optionnel, exige root) |
| `tls-setup.sh` | obtient les certificats puis bascule en HTTPS (optionnel, exige root) |

## Ce que Nginx doit relayer

Les trois conteneurs ne sont publiés que sur `127.0.0.1` : ils ne sont joignables ni
depuis Internet, ni depuis le réseau local du VPS. Nginx est le seul à les voir.

| Depuis l'extérieur | Vers |
|---|---|
| `/` | `127.0.0.1:3000` — site vitrine |
| `/api/` | `127.0.0.1:4000` — API NestJS |
| `/uploads/` | `127.0.0.1:4000` — images uploadées |
| panneau admin | `127.0.0.1:3001` |

Deux contraintes à ne pas rater :

- Le préfixe `/api` fait partie des routes de l'application (`setGlobalPrefix`). Il ne
  doit **pas** être retiré par le `proxy_pass` — donc pas de barre oblique finale.
- L'admin doit être servi **à la racine** de son point d'entrée (port dédié ou
  sous-domaine), jamais sous un sous-chemin type `/admin/` : c'est une SPA
  `react-router-dom` sans `base` Vite ni `basename`, un sous-chemin casserait le
  routage et les assets.

## Appliquer un template à la main

Depuis le dossier où tu as copié ces fichiers, en mode IP nue :

```bash
sudo APP_DIR=/opt/apps/frejus ADMIN_PORT=8080 \
  envsubst '${APP_DIR} ${ADMIN_PORT}' \
  < frejus-ip.conf.template \
  > /etc/nginx/sites-available/frejus.conf

sudo install -m 0644 frejus-proxy.conf /etc/nginx/snippets/frejus-proxy.conf
sudo ln -sfn /etc/nginx/sites-available/frejus.conf /etc/nginx/sites-enabled/frejus.conf
sudo nginx -t && sudo systemctl reload nginx
```

`APP_DIR` ne sert qu'à placer les logs d'accès ; il doit correspondre à la variable
GitHub `VPS_APP_PATH`. `envsubst` vient du paquet `gettext-base`, et la liste de
variables passée en argument est obligatoire : sans elle, `envsubst` remplacerait
aussi les variables de Nginx lui-même (`$host`, `$uri`, `$remote_addr`…) par du vide.

Le template IP nue déclare `default_server` sur le port 80. Le vhost livré par le
paquet Nginx revendique le même rôle et ferait échouer `nginx -t` :

```bash
sudo rm -f /etc/nginx/sites-enabled/default    # le fichier reste dans sites-available
```

Renommer ce lien ne suffirait pas : `nginx.conf` inclut `/etc/nginx/sites-enabled/*`
sans filtrer l'extension.

Enfin, ouvrir les ports au pare-feu — 80, et le port de l'admin s'il est distinct :

```bash
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
```

## `nginx-apply.sh`, si tu préfères l'automatiser

Le script fait tout ce qui précède, en lisant `NGINX_TEMPLATE`, `ADMIN_PORT` et les
domaines depuis le `.env` applicatif, et en restaurant la configuration précédente si
`nginx -t` échoue :

```bash
sudo APP_DIR=/opt/apps/frejus ./nginx-apply.sh
```

Il écrase `/etc/nginx/sites-available/frejus.conf` à chaque exécution : si tu choisis
cette voie, toute modification doit se faire dans le template du dépôt, pas dans le
fichier généré.
