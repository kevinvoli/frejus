#!/usr/bin/env bash
# Crée le dossier applicatif du projet et en donne la propriété à l'utilisateur de
# déploiement. C'est la seule opération du déploiement qui exige root, parce que /opt
# appartient à root ; tout le reste, le pipeline le fait lui-même.
#
#   sudo bash vps-prepare.sh
#   sudo DEPLOY_USER=deploy APP_DIR=/opt/apps/frejus bash vps-prepare.sh
#
# Inutile si APP_DIR existe déjà et appartient à l'utilisateur de déploiement, ou s'il
# est sous son home — dans ce cas le pipeline crée tout seul l'arborescence interne.
#
# N'installe aucun paquet et ne touche ni au pare-feu, ni à sudo, ni à Nginx, ni à
# MySQL, ni à SSH : ces éléments sont administrés à la main, hors de ce dépôt.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
# Doit correspondre à la variable GitHub VPS_APP_PATH utilisée par le pipeline.
APP_DIR="${APP_DIR:-/opt/apps/frejus}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Ce script doit être lancé en root (sudo) : /opt appartient à root." >&2
  exit 1
fi

id "$DEPLOY_USER" >/dev/null 2>&1 || {
  echo "ERREUR : l'utilisateur '${DEPLOY_USER}' n'existe pas." >&2
  exit 1
}

id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -qx docker || {
  echo "ERREUR : '${DEPLOY_USER}' n'est pas dans le groupe docker." >&2
  echo "         usermod -aG docker ${DEPLOY_USER}" >&2
  exit 1
}

echo "==> ${APP_DIR}, propriété de '${DEPLOY_USER}'"
install -d -m 0755 -o root           -g root           "$(dirname "$APP_DIR")"
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
# Le pipeline crée data/uploads et logs au premier déploiement ; les poser ici évite
# que Nginx trouve logs/ absent s'il est configuré avant la première mise en ligne.
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/data"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR/data/uploads"
# Si Nginx (www-data) y écrit ses logs d'accès, il doit pouvoir le faire, et
# l'utilisateur de déploiement doit pouvoir les lire.
install -d -m 0775 -o "$DEPLOY_USER" -g adm            "$APP_DIR/logs"

cat <<MSG

======================================================================
Prêt.

  ${APP_DIR}/
  ├── data/uploads/
  └── logs/

Le pipeline y déposera docker-compose.yml, deploy.sh et .env.example, et créera le
réseau Docker « frejus » au premier déploiement.

Reste à faire, hors de ce script :
 1. Clé publique de déploiement dans /home/${DEPLOY_USER}/.ssh/authorized_keys
 2. ${APP_DIR}/.env — dont les coordonnées de la base (voir .env.example)
 3. Base MySQL : base + utilisateur dédiés, joignables depuis le conteneur api
 4. Reverse proxy sur l'hôte -> voir deploy/reference/nginx/
 5. Ouvrir les ports web au pare-feu

Vérifier l'ensemble : APP_DIR=${APP_DIR} bash vps-check.sh
======================================================================
MSG
