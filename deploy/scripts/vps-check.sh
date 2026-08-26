#!/usr/bin/env bash
# Vérifie que le VPS remplit tous les prérequis du pipeline CI/CD.
# Ne modifie rien : lit l'état et affiche un rapport.
#
#   bash vps-check.sh              # en tant qu'utilisateur de déploiement
#   sudo bash vps-check.sh         # pour vérifier aussi sudoers et logrotate
#
# Sortie : 0 si tout est prêt, 1 s'il manque quelque chose de bloquant.

set -uo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/apps/frejus}"
INFRA_DIR="${INFRA_DIR:-/opt/infrastructure}"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
FAIL=0
WARN=0

ok()   { printf '  %sOK%s    %s\n'   "$GREEN"  "$RESET" "$1"; }
bad()  { printf '  %sMANQUE%s %s\n'  "$RED"    "$RESET" "$1"; FAIL=1; }
warn() { printf '  %sATTENTION%s %s\n' "$YELLOW" "$RESET" "$1"; WARN=1; }
title(){ printf '\n=== %s ===\n' "$1"; }

title "Outils"
if command -v docker >/dev/null 2>&1; then
  ok "docker : $(docker --version | cut -d, -f1)"
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose : $(docker compose version --short 2>/dev/null)"
  else
    bad "plugin 'docker compose' absent (docker-compose-plugin)"
  fi
  docker info >/dev/null 2>&1 || bad "le démon Docker ne répond pas pour cet utilisateur (groupe docker ?)"
else
  bad "docker absent"
fi

if command -v nginx >/dev/null 2>&1; then
  NGINX_VERSION="$(nginx -v 2>&1 | sed -E 's|.*/([0-9.]+).*|\1|')"
  ok "nginx : ${NGINX_VERSION}"
  if printf '%s\n1.25.1\n' "$NGINX_VERSION" | sort -V -C; then
    printf '        -> < 1.25.1 : nginx-apply.sh utilisera "listen ... http2"\n'
  else
    printf '        -> >= 1.25.1 : nginx-apply.sh utilisera "http2 on;"\n'
  fi
  systemctl is-active --quiet nginx && ok "nginx est démarré" || bad "nginx n'est pas démarré"
else
  bad "nginx absent"
fi

command -v certbot  >/dev/null 2>&1 && ok "certbot présent"  || bad "certbot absent"
command -v envsubst >/dev/null 2>&1 && ok "envsubst présent" || bad "envsubst absent (paquet gettext-base) — nginx-apply.sh en dépend"

title "Utilisateur de déploiement"
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  ok "utilisateur '${DEPLOY_USER}' existe"
  id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker \
    && ok "'${DEPLOY_USER}' est dans le groupe docker" \
    || bad "'${DEPLOY_USER}' n'est PAS dans le groupe docker (usermod -aG docker ${DEPLOY_USER})"
  AUTH="/home/${DEPLOY_USER}/.ssh/authorized_keys"
  if [ -s "$AUTH" ] 2>/dev/null; then
    ok "authorized_keys : $(grep -c . "$AUTH" 2>/dev/null) clé(s)"
  else
    warn "${AUTH} vide ou illisible ici (normal si le script tourne sous un autre compte)"
  fi
else
  bad "utilisateur '${DEPLOY_USER}' absent — doit correspondre au secret VPS_USER"
fi

title "Réseaux Docker"
for net in frejus infrastructure; do
  docker network inspect "$net" >/dev/null 2>&1 \
    && ok "réseau '${net}'" \
    || bad "réseau '${net}' absent (docker network create ${net})"
done

title "Arborescence"
for d in "$APP_DIR" "$APP_DIR/data" "$APP_DIR/data/api" "$APP_DIR/data/api/uploads" \
         "$APP_DIR/data/frontend" "$APP_DIR/data/admin" "$APP_DIR/logs" \
         "$INFRA_DIR" "$INFRA_DIR/nginx" "$INFRA_DIR/mysql" /opt/backups /var/www/certbot; do
  [ -d "$d" ] && ok "$d" || bad "$d absent"
done

if [ -d "$APP_DIR/logs" ]; then
  # Nginx tourne en www-data et doit pouvoir écrire ses logs ici.
  PERMS="$(stat -c '%a %U:%G' "$APP_DIR/logs" 2>/dev/null)"
  printf '        droits sur logs/ : %s\n' "$PERMS"
fi

title "Fichiers déployés"
for f in "$APP_DIR/docker-compose.yml" "$APP_DIR/deploy.sh" \
         "$INFRA_DIR/nginx/frejus.conf.template" "$INFRA_DIR/nginx/nginx-apply.sh" \
         "$INFRA_DIR/mysql/docker-compose.yml"; do
  if [ -f "$f" ]; then
    ok "$f"
  else
    warn "$f absent — sera copié par le pipeline Infra CI/CD (ou par scp)"
  fi
done
[ -x "$APP_DIR/deploy.sh" ] 2>/dev/null && ok "deploy.sh est exécutable" \
  || { [ -f "$APP_DIR/deploy.sh" ] && warn "deploy.sh non exécutable (chmod +x)"; }

title "Configuration (.env)"
if [ -f "$APP_DIR/.env" ]; then
  ok "$APP_DIR/.env présent"
  # Ne jamais afficher les valeurs : seulement les clés manquantes.
  for k in SITE_DOMAIN API_DOMAIN ADMIN_DOMAIN ACME_EMAIL CORS_ORIGIN \
           DB_USERNAME DB_PASSWORD DB_DATABASE JWT_SECRET ADMIN_EMAIL ADMIN_PASSWORD; do
    grep -qE "^${k}=.+" "$APP_DIR/.env" || bad "clé ${k} absente ou vide dans .env"
  done
  grep -qE '^[A-Z_]+=.*CHANGE-ME' "$APP_DIR/.env" && bad "des valeurs CHANGE-ME subsistent dans .env"
  grep -qE '^CORS_ORIGIN=\*' "$APP_DIR/.env" && bad "CORS_ORIGIN=* : interdit en production"
  grep -q $'\r' "$APP_DIR/.env" && bad ".env contient des CRLF (fichier édité sous Windows)"
  P="$(stat -c '%a' "$APP_DIR/.env" 2>/dev/null)"
  [ "$P" = "600" ] && ok ".env en 600" || warn ".env en ${P} (chmod 600 recommandé)"
else
  warn "$APP_DIR/.env absent — à créer depuis .env.example (étape 6 de la doc)"
fi

if [ -f "$INFRA_DIR/mysql/.env" ]; then
  ok "$INFRA_DIR/mysql/.env présent"
  grep -qE '^MYSQL_ROOT_PASSWORD=.*CHANGE-ME' "$INFRA_DIR/mysql/.env" \
    && bad "MYSQL_ROOT_PASSWORD vaut encore CHANGE-ME"
else
  warn "$INFRA_DIR/mysql/.env absent — à créer avant de démarrer MySQL"
fi

title "Services"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx mysql; then
  ok "conteneur mysql démarré"
else
  warn "conteneur mysql non démarré (cd ${INFRA_DIR}/mysql && docker compose up -d)"
fi
for c in frejus-web frejus-api frejus-admin; do
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$c" \
    && ok "conteneur ${c} démarré" \
    || warn "conteneur ${c} non démarré (normal avant le premier déploiement)"
done

title "Ports hôte"
# Les 3 ports doivent être libres, ou déjà pris par nos propres conteneurs.
for p in 3000 3001 4000; do
  LISTEN="$(ss -ltnp 2>/dev/null | grep -E ":${p}\b" || true)"
  if [ -z "$LISTEN" ]; then
    ok "port ${p} libre"
  elif printf '%s' "$LISTEN" | grep -q '127.0.0.1'; then
    ok "port ${p} écouté sur 127.0.0.1 (conteneur du projet)"
  else
    bad "port ${p} écouté sur une autre interface que 127.0.0.1 — il serait exposé"
  fi
done

title "Pare-feu"
if command -v ufw >/dev/null 2>&1 && ufw status >/dev/null 2>&1; then
  ufw status | grep -q "Status: active" && ok "ufw actif" || warn "ufw inactif"
  for r in 22 80 443; do
    ufw status | grep -qE "^${r}(/tcp)?\s+ALLOW|OpenSSH" && ok "port ${r} autorisé" \
      || warn "règle pour ${r} non détectée"
  done
  ufw status | grep -qE "^(3000|3001|4000)" \
    && bad "un des ports applicatifs est ouvert au pare-feu — il ne doit jamais l'être"
else
  warn "ufw non interrogeable ici (nécessite root)"
fi

title "Intégration Nginx / sudo"
[ -f /etc/logrotate.d/frejus ] && ok "logrotate configuré" || warn "logrotate /etc/logrotate.d/frejus absent"
if [ -f "/etc/sudoers.d/${DEPLOY_USER}-nginx" ]; then
  ok "règle sudoers pour nginx-apply.sh"
else
  warn "sudoers ${DEPLOY_USER}-nginx absent : le pipeline Infra ne pourra pas recharger Nginx tout seul"
fi
[ -d /etc/letsencrypt/live ] && ok "certificats Let's Encrypt présents" \
  || warn "aucun certificat — lancer tls-setup.sh (nécessite les DNS)"

printf '\n======================================================================\n'
if [ "$FAIL" -eq 1 ]; then
  printf '%sDes prérequis bloquants manquent (voir MANQUE ci-dessus).%s\n' "$RED" "$RESET"
elif [ "$WARN" -eq 1 ]; then
  printf '%sPrérequis satisfaits. Des étapes restent à faire (voir ATTENTION).%s\n' "$YELLOW" "$RESET"
else
  printf '%sVPS entièrement prêt.%s\n' "$GREEN" "$RESET"
fi
printf '======================================================================\n'

exit "$FAIL"
