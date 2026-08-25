# frejus-admin

Panneau d'administration React + Vite + TypeScript + Mantine pour le site vitrine
`frejus` (Pixellia Photographie) : édition du contenu (accroche, à propos,
coordonnées, réseaux sociaux), portfolio, spécialités, témoignages, et boîte de
réception du formulaire de contact — sans toucher au code ni redéployer le site.

Parle à l'API `backend/` (voir `../backend/README.md`) via JWT.

Contexte, choix d'architecture et feuille de route complète : voir
[`../docs/ANALYSE-PLAN-BACKEND.md`](../docs/ANALYSE-PLAN-BACKEND.md).

## Stack

- React 19 + Vite + TypeScript
- Mantine (`@mantine/core`, `@mantine/form`, `@mantine/dropzone`, `@mantine/notifications`)
- `react-router-dom` pour le routage (une route protégée par section)
- Client API "maison" en `fetch` (pas d'axios), gestion du token JWT en `localStorage`
- Docker (nginx) + CI/CD GitHub Actions pour le déploiement sur le VPS (même VPS que `backend/`)

## Démarrage en local

1. Démarrer l'API (`backend/`) — voir `../backend/README.md`.

2. Configurer l'URL de l'API :
   ```bash
   cp .env.example .env.local
   ```
   Par défaut : `VITE_API_URL=http://localhost:3000/api` (adapter si l'API tourne sur un
   autre port).

3. Lancer le panneau admin :
   ```bash
   npm install
   npm run dev
   ```
   Disponible sur `http://localhost:5174` (port dédié pour pouvoir lancer le site vitrine
   `frontend/` — port 5173 par défaut — et ce panneau en même temps en local).

4. Se connecter avec les identifiants `ADMIN_EMAIL` / `ADMIN_PASSWORD` définis dans
   `backend/.env`.

## Notes d'implémentation

- **Conversion chaîne vide → `null`** avant l'envoi à l'API (`nullifyEmptyStrings` dans
  `src/api/client.ts`) : les DTO backend utilisent `@IsOptional()` (class-validator), qui
  n'ignore la validation que pour `undefined`/`null`, jamais pour une chaîne vide. Sans
  cette conversion, impossible de vider un champ déjà renseigné.
- **Session expirée (401)** : `client.ts` expose un `unauthorizedHandler` global appelé par
  `AuthContext` pour déconnecter et rediriger vers `/login`, sans coupler le client API au
  contexte React.
- **URLs d'images** : les images uploadées sont servies par l'API hors du préfixe `/api`
  (ex. `http://localhost:3000/uploads/xxx.jpg`) ; `assetUrl()` dans `client.ts` retire le
  suffixe `/api` de `VITE_API_URL` pour reconstruire l'URL absolue correcte.
- Types dupliqués volontairement depuis les entités/DTO du backend (`src/api/types.ts`)
  plutôt que partagés via un package commun — choix pragmatique de MVP à revoir si les deux
  projets évoluent vite en parallèle.

## Déploiement

Voir `.github/workflows/admin-ci-cd.yml` (à la racine du dépôt) pour le pipeline complet,
et `../docker-compose.prod.yml` (racine du dépôt) pour la configuration attendue sur le
VPS — ce fichier orchestre à la fois ce service (`admin`) et l'API (`api`, `../backend/`),
qui partagent le même VPS.

**Important** : `VITE_API_URL` est gravée en dur dans les fichiers JS statiques au moment
du build (Vite ne lit pas les variables d'environnement au runtime). Le pipeline CI/CD la
passe en `build-arg` Docker à partir du secret GitHub `ADMIN_VITE_API_URL` — changer
l'URL publique de l'API nécessite donc une reconstruction de l'image (un nouveau push, ou
un déclenchement manuel du workflow), pas juste une modification du `.env` du VPS.
