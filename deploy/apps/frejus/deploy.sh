#!/usr/bin/env bash
# Déploiement d'un service de la stack frejus. Vit dans /opt/apps/frejus sur le VPS
# et est appelé par les pipelines GitHub Actions via SSH :
#
#   ./deploy.sh api   ghcr.io/kevinvoli/frejus-backend:<sha>
#   ./deploy.sh web   ghcr.io/kevinvoli/frejus-frontend:<sha>
#   ./deploy.sh admin ghcr.io/kevinvoli/frejus-admin:<sha>
#   ./deploy.sh                      # redéploie toute la stack avec les tags du .env
#
# Le tag déployé est écrit dans le .env : un `docker compose up -d` manuel lancé
# plus tard ne fait donc jamais revenir à une version antérieure.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

SERVICE="${1:-}"
IMAGE="${2:-}"

if [ ! -f .env ]; then
  echo "ERREUR : .env absent dans ${APP_DIR} (voir .env.example)." >&2
  exit 1
fi

# GHCR privé uniquement : sans ces variables, les images doivent être publiques.
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USERNAME:?GHCR_USERNAME manquant}" --password-stdin
fi

if [ -n "$SERVICE" ] && [ -n "$IMAGE" ]; then
  case "$SERVICE" in
    web)   VAR=FRONTEND_IMAGE ;;
    api)   VAR=BACKEND_IMAGE ;;
    admin) VAR=ADMIN_IMAGE ;;
    *) echo "ERREUR : service inconnu '${SERVICE}' (attendu : web, api ou admin)." >&2; exit 1 ;;
  esac
  if grep -q "^${VAR}=" .env; then
    sed -i "s|^${VAR}=.*|${VAR}=${IMAGE}|" .env
  else
    echo "${VAR}=${IMAGE}" >> .env
  fi
  echo "==> ${VAR} = ${IMAGE}"
fi

echo "==> docker compose pull ${SERVICE}"
docker compose pull ${SERVICE}

echo "==> docker compose up -d ${SERVICE}"
docker compose up -d --remove-orphans ${SERVICE}

docker image prune -f >/dev/null

echo "==> État de la stack"
docker compose ps
