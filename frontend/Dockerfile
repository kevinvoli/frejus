# --- Étape 1 : build ---
# VITE_API_URL est "gravée en dur" dans les fichiers JS statiques au moment du build
# (Vite ne lit pas les variables d'environnement au runtime). Elle doit donc être
# passée en build-arg par le pipeline CI/CD (voir .github/workflows/frontend-ci-cd.yml),
# et non dans le .env du VPS : changer l'URL de l'API nécessite de reconstruire l'image.
FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Étape 2 : image de production (nginx sert les fichiers statiques) ---
FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
