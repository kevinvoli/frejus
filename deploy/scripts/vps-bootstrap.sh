#!/usr/bin/env bash
# Prépare un VPS Debian/Ubuntu vierge pour accueillir la stack frejus.
# A exécuter UNE SEULE FOIS, en root, sur le VPS :
#
#   sudo bash vps-bootstrap.sh
#
# Installe Docker, Nginx et Certbot, crée l'utilisateur de déploiement, les réseaux
# Docker partagés et l'arborescence /opt. Ne démarre aucune application : voir
# docs/DEPLOIEMENT-VPS.md pour la suite.

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

# nginx-apply.sh écrit dans /etc/nginx et recharge le service : l'utilisateur deploy
# doit pouvoir le lancer sans mot de passe pour que le pipeline Infra CI/CD applique la
# conf après un scp. Ce n'est pas un affaiblissement : deploy est membre du groupe
# docker, ce qui équivaut déjà à un accès root sur cette machine.
cat > /etc/sudoers.d/${DEPLOY_USER}-nginx <<SUDO
${DEPLOY_USER} ALL=(root) NOPASSWD: /opt/infrastructure/nginx/nginx-apply.sh
${DEPLOY_USER} ALL=(root) NOPASSWD: /opt/infrastructure/nginx/nginx-apply.sh *
${DEPLOY_USER} ALL=(root) NOPASSWD: /opt/infrastructure/nginx/tls-setup.sh
Defaults!/opt/infrastructure/nginx/nginx-apply.sh env_keep += "APP_DIR APP_ENV NGINX_DIR"
Defaults!/opt/infrastructure/nginx/tls-setup.sh   env_keep += "APP_DIR APP_ENV NGINX_DIR"
SUDO
chmod 440 /etc/sudoers.d/${DEPLOY_USER}-nginx
visudo -cf /etc/sudoers.d/${DEPLOY_USER}-nginx

echo "==> Arborescence /opt"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/apps
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data/api"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data/api/uploads"
# Vides par convention : le site vitrine et l'admin sont des builds statiques sans état.
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data/frontend"
install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "${APP_DIR}/data/admin"
# Nginx (www-data) écrit ses logs ici, l'utilisateur deploy doit pouvoir les lire.
install -d -m 0775 -o "$DEPLOY_USER" -g adm "${APP_DIR}/logs"

install -d -m 0755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/infrastructure
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/infrastructure/nginx
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/infrastructure/mysql
install -d -m 0750 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/backups
# Racine du challenge ACME, servie en clair par Nginx pour le renouvellement des certificats.
install -d -m 0755 /var/www/certbot

echo "==> Réseaux Docker partagés"
docker network inspect frejus >/dev/null 2>&1 || docker network create frejus
docker network inspect infrastructure >/dev/null 2>&1 || docker network create infrastructure

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
  ${APP_DIR}/{data/{api/uploads,frontend,admin},logs}
  /opt/infrastructure/{nginx,mysql}
  /opt/backups

Réseaux Docker : frejus, infrastructure

Suite (voir docs/DEPLOIEMENT-VPS.md) :
 1. Ajouter la clé publique de déploiement dans
    /home/${DEPLOY_USER}/.ssh/authorized_keys
 2. Copier les fichiers du dépôt (deploy/) dans /opt, remplir les deux .env
 3. Démarrer MySQL puis créer la base du projet
 4. Lancer tls-setup.sh pour obtenir les certificats et activer la conf Nginx
 5. Déployer la stack applicative
======================================================================
MSG
