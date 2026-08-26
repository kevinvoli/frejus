#!/usr/bin/env bash
# Vérifie que le VPS remplit les prérequis du pipeline CI/CD.
# Ne modifie rien : lit l'état et affiche un rapport.
#
#   bash vps-check.sh                          # en tant qu'utilisateur de déploiement
#   APP_DIR=/opt/apps/frejus bash vps-check.sh # si le chemin diffère du défaut
#
# APP_DIR doit reprendre la valeur de la variable GitHub VPS_APP_PATH.
#
# MANQUE    = bloquant, le déploiement échouera.
# ATTENTION = à traiter, mais hors du périmètre du pipeline : MySQL, Nginx et le
#             pare-feu sont administrés à la main.
#
# Sortie : 0 si le déploiement peut aboutir, 1 s'il manque un prérequis bloquant.

set -uo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/apps/frejus}"

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
FAIL=0
WARN=0

ok()   { printf '  %sOK%s    %s\n'     "$GREEN"  "$RESET" "$1"; }
bad()  { printf '  %sMANQUE%s %s\n'    "$RED"    "$RESET" "$1"; FAIL=1; }
warn() { printf '  %sATTENTION%s %s\n' "$YELLOW" "$RESET" "$1"; WARN=1; }
title(){ printf '\n=== %s ===\n' "$1"; }

# Lit une clé du .env applicatif. Les valeurs ne servent qu'aux tests ci-dessous.
env_value() {
  [ -f "$APP_DIR/.env" ] || return 1
  tr -d '\r' < "$APP_DIR/.env" | sed -n "s/^$1=//p" | head -1
}

title "Outils"
if command -v docker >/dev/null 2>&1; then
  ok "docker : $(docker --version | cut -d, -f1)"
  docker compose version >/dev/null 2>&1 \
    && ok "docker compose : $(docker compose version --short 2>/dev/null)" \
    || bad "plugin docker compose absent (docker-compose-plugin)"
  docker info >/dev/null 2>&1 \
    || bad "le démon Docker ne répond pas pour $(id -un) — groupe docker ?"
else
  bad "docker absent"
fi

# Nginx est hors du périmètre du déploiement : son absence n'empêche pas la stack de
# tourner, seulement d'y accéder depuis l'extérieur.
if command -v nginx >/dev/null 2>&1; then
  ok "nginx : $(nginx -v 2>&1 | sed -E 's|.*/([0-9.]+).*|\1|')"
  systemctl is-active --quiet nginx && ok "nginx est démarré" \
    || warn "nginx n'est pas démarré (systemctl start nginx)"
else
  warn "nginx absent de l'hôte — rien ne servira le site en 80/443"
fi

title "Utilisateur de déploiement"
if id "$DEPLOY_USER" >/dev/null 2>&1; then
  ok "utilisateur ${DEPLOY_USER} existe"
  id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker \
    && ok "${DEPLOY_USER} est dans le groupe docker" \
    || bad "${DEPLOY_USER} n'est PAS dans le groupe docker (usermod -aG docker ${DEPLOY_USER})"
  AUTH="/home/${DEPLOY_USER}/.ssh/authorized_keys"
  if [ -s "$AUTH" ] 2>/dev/null; then
    ok "authorized_keys : $(grep -c . "$AUTH" 2>/dev/null) clé(s)"
  else
    warn "${AUTH} vide ou illisible ici (normal sous un autre compte)"
  fi
else
  bad "utilisateur ${DEPLOY_USER} absent — doit correspondre à VPS_USER"
fi

title "Arborescence"
# Le pipeline n'a pas sudo : il crée data/ et logs/, mais pas APP_DIR lui-même.
if [ -d "$APP_DIR" ]; then
  ok "$APP_DIR"
  [ -w "$APP_DIR" ] && ok "$APP_DIR accessible en écriture par $(id -un)" \
    || bad "$APP_DIR non accessible en écriture par $(id -un) — le déploiement échouera"
else
  bad "$APP_DIR absent — le créer et en donner la propriété à ${DEPLOY_USER}"
fi
for d in "$APP_DIR/data/uploads" "$APP_DIR/logs"; do
  [ -d "$d" ] && ok "$d" || warn "$d absent — créé par le pipeline au premier déploiement"
done
[ -d "$APP_DIR/logs" ] && printf '        droits sur logs/ : %s\n' \
  "$(stat -c '%a %U:%G' "$APP_DIR/logs" 2>/dev/null)"

title "Fichiers déployés"
for f in "$APP_DIR/docker-compose.yml" "$APP_DIR/deploy.sh"; do
  [ -f "$f" ] && ok "$f" || warn "$f absent — copié par le pipeline"
done
[ -x "$APP_DIR/deploy.sh" ] 2>/dev/null && ok "deploy.sh est exécutable" \
  || { [ -f "$APP_DIR/deploy.sh" ] && warn "deploy.sh non exécutable (chmod +x)"; }

title "Configuration (.env)"
if [ -f "$APP_DIR/.env" ]; then
  ok "$APP_DIR/.env présent"
  # Ne jamais afficher les valeurs : seulement les clés manquantes.
  for k in SITE_DOMAIN API_DOMAIN ADMIN_DOMAIN CORS_ORIGIN \
           DB_NETWORK DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_DATABASE \
           JWT_SECRET ADMIN_EMAIL ADMIN_PASSWORD; do
    grep -qE "^${k}=.+" "$APP_DIR/.env" || bad "clé ${k} absente ou vide dans .env"
  done
  grep -qE '^[A-Z_]+=.*CHANGE-ME' "$APP_DIR/.env" && bad "des valeurs CHANGE-ME subsistent dans .env"
  grep -qE '^CORS_ORIGIN=\*' "$APP_DIR/.env" && bad "CORS_ORIGIN=* : interdit en production"
  grep -q $'\r' "$APP_DIR/.env" && bad ".env contient des CRLF (fichier édité sous Windows)"
  P="$(stat -c '%a' "$APP_DIR/.env" 2>/dev/null)"
  [ "$P" = "600" ] && ok ".env en 600" || warn ".env en ${P} (chmod 600 recommandé)"
else
  bad "$APP_DIR/.env absent — à créer depuis .env.example, la stack ne démarrera pas"
fi

title "Réseaux Docker"
docker network inspect frejus >/dev/null 2>&1 \
  && ok "réseau frejus" \
  || warn "réseau frejus absent — créé par le pipeline au premier déploiement"

# Le réseau de la base appartient à l'administrateur de MySQL : le pipeline ne le crée
# jamais. S'il n'existe pas, docker compose up échoue sur un réseau externe manquant.
DB_NETWORK="$(env_value DB_NETWORK)"
if [ -n "${DB_NETWORK:-}" ]; then
  docker network inspect "$DB_NETWORK" >/dev/null 2>&1 \
    && ok "réseau de la base : ${DB_NETWORK}" \
    || bad "réseau ${DB_NETWORK} (DB_NETWORK) introuvable — l'API ne pourra pas démarrer"
else
  warn "DB_NETWORK non lisible (.env absent) — réseau de la base non vérifié"
fi

title "Base de données"
DB_HOST="$(env_value DB_HOST)"
DB_PORT="$(env_value DB_PORT)"
if [ -n "${DB_NETWORK:-}" ] && [ -n "${DB_HOST:-}" ] && [ -n "${DB_PORT:-}" ]; then
  # Testé depuis le réseau que l'API utilisera : seul point de vue qui compte.
  if docker run --rm --network "$DB_NETWORK" busybox:1.36 \
       timeout 5 nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; then
    ok "${DB_HOST}:${DB_PORT} joignable depuis ${DB_NETWORK}"
  else
    warn "${DB_HOST}:${DB_PORT} injoignable depuis ${DB_NETWORK} (ou image busybox non tirée)"
  fi
else
  warn "coordonnées de la base incomplètes dans .env — connexion non testée"
fi

title "Services"
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

title "Point d'entrée web (administré à la main)"
if [ -n "$(ls -A /etc/nginx/sites-enabled 2>/dev/null)" ]; then
  ok "vhosts Nginx actifs : $(ls /etc/nginx/sites-enabled | tr '\n' ' ')"
else
  warn "aucun vhost dans /etc/nginx/sites-enabled — rien ne relaie vers les conteneurs"
fi
if command -v ufw >/dev/null 2>&1 && ufw status >/dev/null 2>&1; then
  ufw status | grep -q "Status: active" && ok "ufw actif" || warn "ufw inactif"
  ufw status | grep -qE "^(3000|3001|4000)" \
    && bad "un port applicatif est ouvert au pare-feu — il ne doit jamais l'être"
else
  warn "ufw non interrogeable ici (nécessite root)"
fi

printf '\n======================================================================\n'
if [ "$FAIL" -eq 1 ]; then
  printf '%sDes prérequis bloquants manquent (voir MANQUE ci-dessus).%s\n' "$RED" "$RESET"
elif [ "$WARN" -eq 1 ]; then
  printf '%sLe déploiement peut aboutir. Des étapes restent à faire (voir ATTENTION).%s\n' "$YELLOW" "$RESET"
else
  printf '%sVPS entièrement prêt.%s\n' "$GREEN" "$RESET"
fi
printf '======================================================================\n'

exit "$FAIL"
