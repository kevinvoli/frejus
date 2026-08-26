#!/usr/bin/env bash
# Obtient les certificats Let's Encrypt des trois domaines, puis bascule Nginx sur la
# configuration HTTPS définitive. A lancer UNE FOIS, en root, après vps-bootstrap.sh
# et une fois les DNS propagés :
#
#   sudo bash ./tls-setup.sh
#
# Déroulé : conf HTTP temporaire -> certbot certonly --webroot -> conf HTTPS finale.
# certbot n'édite jamais la configuration (mode certonly), qui reste pilotée par le
# template versionné dans le dépôt. Le renouvellement est assuré par le timer systemd
# installé avec certbot ; le bloc /.well-known/acme-challenge/ de la conf finale le
# laisse aboutir sans interruption de service.

set -euo pipefail

NGINX_DIR="${NGINX_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
# Dossier applicatif : doit correspondre au secret GitHub VPS_APP_PATH.
APP_DIR="${APP_DIR:-/opt/apps/frejus}"
APP_ENV="${APP_ENV:-${APP_DIR}/.env}"
export APP_DIR APP_ENV NGINX_DIR

if [ "$(id -u)" -ne 0 ]; then
  echo "Ce script doit être lancé en root (sudo)." >&2
  exit 1
fi

[ -f "$APP_ENV" ] || { echo "ERREUR : ${APP_ENV} introuvable." >&2; exit 1; }
# shellcheck disable=SC1090
# Un .env édité depuis Windows contient des CRLF : sans ce nettoyage, SITE_DOMAIN
# vaudrait "exemple.fr" et produirait une conf Nginx invalide et difficile à
# diagnostiquer. Le fichier sur disque n'est pas modifié.
set -a; . <(tr -d '\r' < "$APP_ENV"); set +a
: "${SITE_DOMAIN:?SITE_DOMAIN absent de ${APP_ENV}}"
: "${API_DOMAIN:?API_DOMAIN absent de ${APP_ENV}}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN absent de ${APP_ENV}}"
: "${ACME_EMAIL:?ACME_EMAIL absent de ${APP_ENV}}"

echo "==> Vérification DNS"
VPS_IP="$(curl -fsS --max-time 10 https://api.ipify.org || echo '')"
for domain in "$SITE_DOMAIN" "$API_DOMAIN" "$ADMIN_DOMAIN"; do
  resolved="$(getent hosts "$domain" | awk '{print $1}' | head -1 || true)"
  if [ -z "$resolved" ]; then
    echo "ERREUR : ${domain} ne résout vers aucune IP. Créer l'enregistrement A." >&2
    exit 1
  fi
  if [ -n "$VPS_IP" ] && [ "$resolved" != "$VPS_IP" ]; then
    echo "ATTENTION : ${domain} résout vers ${resolved}, pas vers ${VPS_IP} (IP du VPS)." >&2
    echo "            Si le DNS vient d'être modifié, attendre la propagation." >&2
    exit 1
  fi
  echo "  ${domain} -> ${resolved}"
done

echo "==> Configuration Nginx temporaire (HTTP, pour le challenge ACME)"
install -d -m 0755 /var/www/certbot
bash "${NGINX_DIR}/nginx-apply.sh" "${NGINX_DIR}/frejus-acme.conf.template"

echo "==> Obtention des certificats"
# Un certificat par domaine (et non un multi-SAN) : les trois blocs server restent
# indépendants, et retirer un domaine plus tard n'impose pas de réémettre les autres.
for domain in "$SITE_DOMAIN" "$API_DOMAIN" "$ADMIN_DOMAIN"; do
  certbot certonly --webroot -w /var/www/certbot \
    --non-interactive --agree-tos --email "$ACME_EMAIL" \
    -d "$domain" --cert-name "$domain"
done

# Fichiers référencés par la conf finale ; absents si certbot n'a jamais tourné en
# mode --nginx sur cette machine.
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || \
  curl -fsS -o /etc/letsencrypt/options-ssl-nginx.conf \
    https://raw.githubusercontent.com/certbot/certbot/main/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || \
  openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

echo "==> Bascule sur la configuration HTTPS définitive"
bash "${NGINX_DIR}/nginx-apply.sh" "${NGINX_DIR}/frejus.conf.template"

echo "==> Renouvellement automatique"
systemctl list-timers --all | grep -q certbot \
  && echo "  timer certbot actif" \
  || echo "  ATTENTION : aucun timer certbot trouvé, vérifier 'systemctl status certbot.timer'"

echo
echo "HTTPS actif sur :"
echo "  https://${SITE_DOMAIN}"
echo "  https://${API_DOMAIN}"
echo "  https://${ADMIN_DOMAIN}"
