#!/usr/bin/env bash
# Provisionne une base + un utilisateur dédiés à un projet sur l'instance MySQL
# mutualisée. A lancer depuis /opt/infrastructure/mysql :
#
#   ./create-app-db.sh frejus frejus '<mot-de-passe>'
#
# L'utilisateur créé n'a de droits QUE sur sa propre base : deux projets du VPS ne
# peuvent pas lire les données l'un de l'autre.
# Idempotent : relançable sans risque, met à jour le mot de passe si l'utilisateur
# existe déjà.

set -euo pipefail

DB_NAME="${1:?usage: create-app-db.sh <base> <utilisateur> <mot-de-passe>}"
DB_USER="${2:?usage: create-app-db.sh <base> <utilisateur> <mot-de-passe>}"
DB_PASS="${3:?usage: create-app-db.sh <base> <utilisateur> <mot-de-passe>}"

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
  echo "ERREUR : .env absent (voir .env.example)." >&2
  exit 1
fi
MYSQL_ROOT_PASSWORD="$(grep -E '^MYSQL_ROOT_PASSWORD=' .env | cut -d= -f2-)"

# Le nom de base et l'utilisateur sont contraints, le mot de passe est échappé :
# un mot de passe contenant une apostrophe ou un antislash ne doit pas casser le SQL.
case "$DB_NAME$DB_USER" in
  *[!a-zA-Z0-9_]*) echo "ERREUR : base et utilisateur limités à [a-zA-Z0-9_]." >&2; exit 1 ;;
esac
ESCAPED_PASS="$(printf '%s' "$DB_PASS" | sed "s/\\/\\\\/g; s/'/\\'/g")"

# MYSQL_PWD plutôt que -p<mdp> : le mot de passe root n'apparaît pas dans `ps`.
docker compose exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysql -u root <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${ESCAPED_PASS}';
ALTER USER '${DB_USER}'@'%' IDENTIFIED BY '${ESCAPED_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "Base '${DB_NAME}' et utilisateur '${DB_USER}' prêts."
