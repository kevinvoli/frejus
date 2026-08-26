# --- Étape 1 : build ---
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Étape 2 : image de production (allégée, sans devDependencies) ---
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

# Volume monté par docker-compose pour la persistance des images uploadées.
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]
