#!/usr/bin/env bash
# Génère la configuration Nginx du projet depuis le template et le .env applicatif,
# la teste, puis recharge Nginx. A relancer après toute modification du template ou
# des domaines.
#
#   sudo /opt/infrastructure/nginx/nginx-apply.sh
#
# Le fichier /etc/nginx/sites-available/frejus.conf est ÉCRASÉ à chaque exécution :
# toute modification doit être faite dans frejus.conf.template, versionné dans le dépôt.

set -euo pipefail

NGINX_DIR="${NGINX_DIR:-/opt/infrastructure/nginx}"
# Dossier applicatif : doit correspondre au secret GitHub VPS_APP_PATH. Le pipeline
# Infra CI/CD le transmet ; en usage manuel le défaut suffit.
APP_DIR="${APP_DIR:-/opt/apps/frejus}"
APP_ENV="${APP_ENV:-${APP_DIR}/.env}"
TEMPLATE="${1:-${NGINX_DIR}/frejus.conf.template}"

[ -f "$APP_ENV" ]  || { echo "ERREUR : ${APP_ENV} introuvable." >&2; exit 1; }
[ -f "$TEMPLATE" ] || { echo "ERREUR : ${TEMPLATE} introuvable." >&2; exit 1; }

# shellcheck disable=SC1090
# Un .env édité depuis Windows contient des CRLF : sans ce nettoyage, SITE_DOMAIN
# vaudrait "exemple.fr" et produirait une conf Nginx invalide et difficile à
# diagnostiquer. Le fichier sur disque n'est pas modifié.
set -a; . <(tr -d '\r' < "$APP_ENV"); set +a
: "${SITE_DOMAIN:?SITE_DOMAIN absent de ${APP_ENV}}"
: "${API_DOMAIN:?API_DOMAIN absent de ${APP_ENV}}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN absent de ${APP_ENV}}"

# Nginx (www-data) doit pouvoir y écrire ses logs, sinon il refuse de démarrer.
[ -d "${APP_DIR}/logs" ] || { echo "ERREUR : ${APP_DIR}/logs introuvable." >&2; exit 1; }
export APP_DIR

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

# Liste explicite des variables à substituer : sans elle, envsubst remplacerait aussi
# les variables de Nginx lui-même ($host, $uri, $remote_addr...) par du vide.
envsubst '${SITE_DOMAIN} ${API_DOMAIN} ${ADMIN_DOMAIN} ${HTTP2} ${APP_DIR}' \
  < "$TEMPLATE" > /etc/nginx/sites-available/frejus.conf

if [ "$LEGACY_HTTP2" -eq 1 ]; then
  sed -i -E 's|^(\s*listen (\[::\]:)?443 ssl);|\1 http2;|' /etc/nginx/sites-available/frejus.conf
fi

ln -sfn /etc/nginx/sites-available/frejus.conf /etc/nginx/sites-enabled/frejus.conf

nginx -t
systemctl reload nginx

echo "Configuration appliquée depuis $(basename "$TEMPLATE") (Nginx ${NGINX_VERSION}) :"
echo "  https://${SITE_DOMAIN}   -> 127.0.0.1:3000"
echo "  https://${API_DOMAIN}    -> 127.0.0.1:4000"
echo "  https://${ADMIN_DOMAIN}  -> 127.0.0.1:3001"
