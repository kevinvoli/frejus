#!/usr/bin/env bash
# Prépare un VPS Debian/Ubuntu VIERGE pour accueillir la stack frejus.
# A exécuter UNE SEULE FOIS, en root, sur le VPS :
#
#   sudo bash vps-bootstrap.sh
#
# Installe Docker, Nginx et Certbot, crée l'utilisateur de déploiement, le dossier
# applicatif et le réseau Docker du projet. Ne démarre aucune application, et
# n'installe pas MySQL : la base est administrée à part (voir deploy/reference/).
#
# NE PAS LANCER sur un VPS déjà administré à la main : ce script réinstalle des
# paquets, réécrit les règles ufw et supprime le vhost Nginx par défaut. Dans ce cas,
# utiliser vps-prepare.sh, qui se limite à créer le dossier applicatif.
#
# Aucune règle sudo n'est posée : le pipeline n'en a pas besoin. Nginx et le pare-feu
# se configurent à la main, avec les droits root, hors du périmètre du déploiement.

set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
# Doit correspondre au secret GitHub VPS_APP_PATH utilisé par les pipelines.
APP_DIR="${APP_DIR:-/opt/apps/frejus}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Ce script doit être lancé en root (sudo)." >&2
  exit 1
fi

echo "==> Mise à jour du système"
apt-get update -y
apt-get upgrade -y
# gettext-base fournit envsubst, dont nginx-apply.sh dépend pour générer la conf.
apt-get install -y ca-certificates curl gnupg ufw gettext-base \
                   nginx certbot python3-certbot-nginx

echo "==> Installation de Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
else
  echo "Docker déjà présent : $(docker --version)"
fi

echo "==> Utilisateur de déploiement '${DEPLOY_USER}'"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 0700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
touch "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
echo "==> Arborescence /opt"
install -d -m 0755 -o root           -g root           /opt/apps
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data/uploads"
# Nginx (www-data) y écrit ses logs, l'utilisateur de déploiement doit pouvoir les lire.
install -d -m 0775 -o "$DEPLOY_USER" -g adm "${APP_DIR}/logs"
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/backups
# Racine du challenge ACME, servie en clair par Nginx pour le renouvellement des certificats.
install -d -m 0755 /var/www/certbot

echo "==> Réseau Docker du projet"
# Le réseau de la base n'est pas créé ici : MySQL est administré à part, et son
# réseau est désigné par DB_NETWORK dans le .env applicatif.
docker network inspect frejus >/dev/null 2>&1 || docker network create frejus

echo "==> Rotation des logs Nginx du projet"
# Le corps du bloc est en heredoc quoté pour que $(cat /run/nginx.pid) soit écrit
# littéralement et évalué par logrotate, pas maintenant ; seul le chemin est interpolé.
{
echo "${APP_DIR}/logs/*.log {"
cat <<'LOGROTATE'
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        [ -f /run/nginx.pid ] && kill -USR1 "$(cat /run/nginx.pid)"
    endscript
}
LOGROTATE
} > /etc/logrotate.d/frejus

echo "==> Pare-feu (SSH + HTTP + HTTPS uniquement)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# La conf par défaut de Nginx répondrait à la place de la nôtre sur les domaines
# non encore configurés.
rm -f /etc/nginx/sites-enabled/default
systemctl enable --now nginx

cat <<MSG

======================================================================
VPS prêt.

Arborescence créée :
  ${APP_DIR}/
  ├── data/uploads/
  └── logs/
  /opt/backups

Réseau Docker : frejus

Suite (voir docs/DEPLOIEMENT-VPS.md) :
 1. Ajouter la clé publique de déploiement dans
    /home/${DEPLOY_USER}/.ssh/authorized_keys
 2. Provisionner MySQL : base + utilisateur dédiés, joignables depuis un conteneur
 3. Remplir ${APP_DIR}/.env (le pipeline y dépose .env.example au 1er passage)
 4. Configurer le reverse proxy -> deploy/reference/nginx/
 5. Ouvrir les ports web au pare-feu, puis lancer le pipeline
======================================================================
MSG
