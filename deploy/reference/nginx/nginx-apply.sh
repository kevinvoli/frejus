#!/usr/bin/env bash
# Génère la configuration Nginx du projet depuis un template et le .env applicatif,
# la teste, puis recharge Nginx. A relancer après toute modification du template ou
# des domaines.
#
# OUTIL MANUEL, exigeant les droits root : le pipeline CI/CD ne l'appelle jamais.
# Nginx est administré à la main sur l'hôte, ce qui permet à l'utilisateur de
# déploiement de n'avoir aucun sudo. Voir le README.md de ce dossier pour la
# procédure entièrement manuelle, si tu préfères ne pas passer par ce script.
#
#   sudo ./nginx-apply.sh                       # template designe par le .env
#   sudo ./nginx-apply.sh <chemin/template>     # template impose
#
# Le template appliqué est choisi, par ordre de priorité :
#   1. l'argument $1
#   2. la variable NGINX_TEMPLATE du .env applicatif
#   3. frejus.conf.template (mode domaine + HTTPS)
#
# Le fichier /etc/nginx/sites-available/frejus.conf est ÉCRASÉ à chaque exécution :
# toute modification doit être faite dans le template, versionné dans le dépôt. Si la
# configuration produite est invalide, l'ancienne est restaurée et Nginx n'est pas
# rechargé : un template cassé ne peut donc pas mettre le VPS hors ligne.

set -euo pipefail

NGINX_DIR="${NGINX_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
# Dossier applicatif : doit correspondre à la variable GitHub VPS_APP_PATH.
APP_DIR="${APP_DIR:-/opt/apps/frejus}"
APP_ENV="${APP_ENV:-${APP_DIR}/.env}"
TARGET=/etc/nginx/sites-available/frejus.conf

[ -f "$APP_ENV" ] || { echo "ERREUR : ${APP_ENV} introuvable." >&2; exit 1; }

# shellcheck disable=SC1090
# Un .env édité depuis Windows contient des CRLF : sans ce nettoyage, SITE_DOMAIN
# vaudrait "exemple.fr" et produirait une conf Nginx invalide et difficile à
# diagnostiquer. Le fichier sur disque n'est pas modifié.
set -a; . <(tr -d '\r' < "$APP_ENV"); set +a
: "${SITE_DOMAIN:?SITE_DOMAIN absent de ${APP_ENV}}"
: "${API_DOMAIN:?API_DOMAIN absent de ${APP_ENV}}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN absent de ${APP_ENV}}"

# Port d'écoute du panneau admin, utilisé uniquement par le template "IP nue" (en mode
# domaine l'admin est un vhost HTTPS sur 443 et cette valeur est ignorée).
ADMIN_PORT="${ADMIN_PORT:-8080}"

TEMPLATE="${1:-${NGINX_DIR}/${NGINX_TEMPLATE:-frejus.conf.template}}"
[ -f "$TEMPLATE" ] || { echo "ERREUR : template ${TEMPLATE} introuvable." >&2; exit 1; }

# Nginx (www-data) doit pouvoir y écrire ses logs, sinon il refuse de démarrer.
[ -d "${APP_DIR}/logs" ] || { echo "ERREUR : ${APP_DIR}/logs introuvable." >&2; exit 1; }
export APP_DIR ADMIN_PORT

# La directive `http2 on;` n'existe qu'à partir de Nginx 1.25.1 (Debian 12 livre 1.22,
# Ubuntu 24.04 livre 1.24). Sur les versions antérieures on retombe sur la forme
# historique `listen ... http2`, ajoutée aux directives listen déjà présentes.
NGINX_VERSION="$(nginx -v 2>&1 | sed -E 's|.*/([0-9.]+).*|\1|')"
if printf '%s\n1.25.1\n' "$NGINX_VERSION" | sort -V -C; then
  HTTP2=''
  LEGACY_HTTP2=1
else
  HTTP2='http2 on;'
  LEGACY_HTTP2=0
fi
export HTTP2

install -d -m 0755 /etc/nginx/snippets
install -m 0644 "${NGINX_DIR}/frejus-proxy.conf" /etc/nginx/snippets/frejus-proxy.conf

GENERATED="$(mktemp)"
# Liste explicite des variables à substituer : sans elle, envsubst remplacerait aussi
# les variables de Nginx lui-même ($host, $uri, $remote_addr...) par du vide.
envsubst '${SITE_DOMAIN} ${API_DOMAIN} ${ADMIN_DOMAIN} ${ADMIN_PORT} ${HTTP2} ${APP_DIR}' \
  < "$TEMPLATE" > "$GENERATED"

if [ "$LEGACY_HTTP2" -eq 1 ]; then
  sed -i -E 's|^(\s*listen (\[::\]:)?443 ssl);|\1 http2;|' "$GENERATED"
fi

# Sauvegarde de l'état courant, pour pouvoir revenir en arrière si `nginx -t` échoue
# (typiquement : template HTTPS appliqué avant que Certbot ait produit les certificats).
BACKUP=''
[ -f "$TARGET" ] && { BACKUP="$(mktemp)"; cp "$TARGET" "$BACKUP"; }
# Cible du lien /etc/nginx/sites-enabled/default s'il a fallu le retirer, pour pouvoir
# le remettre en cas d'échec.
DEFAULT_LINK=''

restore() {
  if [ -n "$BACKUP" ]; then
    cp "$BACKUP" "$TARGET"
  else
    rm -f "$TARGET" /etc/nginx/sites-enabled/frejus.conf
  fi
  [ -n "$DEFAULT_LINK" ] && ln -sfn "$DEFAULT_LINK" /etc/nginx/sites-enabled/default
  rm -f "$GENERATED" "$BACKUP"
}

install -m 0644 "$GENERATED" "$TARGET"
ln -sfn "$TARGET" /etc/nginx/sites-enabled/frejus.conf

# Le mode IP nue déclare `default_server` : le vhost livré par le paquet Nginx
# revendique le même rôle sur le port 80 et ferait échouer `nginx -t`. On retire son
# lien de sites-enabled — le renommer ne suffirait pas, nginx.conf inclut
# /etc/nginx/sites-enabled/* sans filtrer l'extension. Le fichier reste dans
# sites-available et peut être réactivé à la main.
if grep -q 'default_server' "$TARGET" && [ -e /etc/nginx/sites-enabled/default ]; then
  DEFAULT_LINK="$(readlink /etc/nginx/sites-enabled/default || echo /etc/nginx/sites-available/default)"
  rm -f /etc/nginx/sites-enabled/default
fi

if ! nginx -t; then
  echo "ERREUR : configuration invalide, restauration de l'état précédent." >&2
  restore
  exit 1
fi

systemctl reload nginx
rm -f "$GENERATED" "$BACKUP"

echo "Configuration appliquée depuis $(basename "$TEMPLATE") (Nginx ${NGINX_VERSION}) :"
if grep -q '443 ssl' "$TARGET"; then
  echo "  https://${SITE_DOMAIN}   -> 127.0.0.1:3000"
  echo "  https://${API_DOMAIN}    -> 127.0.0.1:4000"
  echo "  https://${ADMIN_DOMAIN}  -> 127.0.0.1:3001"
else
  echo "  http://${SITE_DOMAIN}/          -> 127.0.0.1:3000"
  echo "  http://${SITE_DOMAIN}/api/      -> 127.0.0.1:4000"
  echo "  http://${SITE_DOMAIN}:${ADMIN_PORT}/  -> 127.0.0.1:3001"
fi
