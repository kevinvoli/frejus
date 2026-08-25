// Client API minimal (fetch) pour parler au backend NestJS (voir ../../../backend).
// Aucune authentification ici : le site vitrine ne consomme que les routes publiques
// (GET settings/specialties/portfolio/testimonials, POST contact).

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
// Origine de l'API (sans le suffixe /api) : sert à construire les URLs absolues des
// images, servies par le backend hors du préfixe /api (voir backend/src/main.ts).
const API_ORIGIN = API_URL.replace(/\/api$/, '');

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Erreur ${res.status} sur ${path}`);
  }
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? Array.isArray(payload.message)
          ? payload.message.join(', ')
          : String(payload.message)
        : `Erreur ${res.status}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// Construit l'URL absolue d'une image à partir du chemin relatif renvoyé par l'API
// (ex: "/uploads/xxx.jpg"). Retourne undefined si aucune image n'est définie, pour
// pouvoir garder simplement le placeholder existant tant que rien n'est configuré
// dans le panneau admin.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}
