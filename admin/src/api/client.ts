// Client API minimal (fetch) pour parler au backend NestJS : gestion du token JWT,
// des erreurs, et de l'upload d'images. Pas de dépendance externe (axios, etc.)
// volontairement, pour rester simple sur ce MVP.

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
// Origine de l'API (sans le suffixe /api) : sert à construire les URLs absolues des
// images, qui sont servies par le backend hors du préfixe /api (voir backend/src/main.ts).
const API_ORIGIN = API_URL.replace(/\/api$/, '');

const TOKEN_KEY = 'frejus_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  // Pas de "parameter property" (public readonly status dans le constructeur) :
  // interdit par l'option TS "erasableSyntaxOnly" de ce projet.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Permet à AuthContext de réagir globalement à une session expirée (401), sans que
// chaque appel API n'ait à connaître le contexte d'authentification.
let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  isFormData?: boolean;
}

async function parseBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (res.status === 401) {
    clearToken();
    unauthorizedHandler?.();
    throw new ApiError('Session expirée, merci de vous reconnecter.', 401);
  }

  if (!res.ok) {
    const payload = await parseBody<unknown>(res).catch(() => null);
    throw new ApiError(extractErrorMessage(payload, `Erreur ${res.status}`), res.status);
  }

  return parseBody<T>(res);
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiFetch<{ url: string }>('/upload', {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
  return result.url;
}

// Médiathèque : upload multi-fichiers (photos/vidéos) vers une galerie cliente. Le
// filtrage des types autorisés est fait côté backend (voir galleries.controller.ts) ;
// on restreint déjà côté Dropzone pour un retour immédiat, mais le serveur reste la
// seule source de vérité.
export async function uploadGalleryMedia<T>(galleryId: number, files: File[]): Promise<T> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  return apiFetch<T>(`/galleries/${galleryId}/media`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  });
}

// URL publique du site vitrine (pour construire le lien de galerie partageable au
// client, cf. .env.example). Distincte de VITE_API_URL : le site vitrine et l'API ne
// sont pas forcément sur le même sous-domaine.
const FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(
  /\/$/,
  '',
);

export function galleryShareUrl(accessToken: string): string {
  return `${FRONTEND_URL}/?galerie=${accessToken}`;
}

// Découpe le code d'accès (8 caractères, cf. backend/src/galleries/galleries.service.ts)
// en deux groupes de 4 pour la lisibilité — c'est ce code que le photographe
// communique oralement ou par écrit à son client, qui le saisit ensuite dans le champ
// "Récupérer mes photos" du site vitrine (pas de lien à cliquer nécessaire).
export function formatGalleryCode(accessToken: string): string {
  if (accessToken.length !== 8) return accessToken;
  return `${accessToken.slice(0, 4)}-${accessToken.slice(4)}`;
}

// Construit l'URL absolue d'une image à partir du chemin relatif renvoyé par l'API
// (ex: "/uploads/xxx.jpg"). Retourne undefined si aucune image n'est définie.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

// Convertit les chaînes vides en `null` avant l'envoi à l'API : les DTO backend
// utilisent `@IsOptional()` (class-validator), qui n'ignore la validation que pour
// `undefined`/`null` — jamais pour une chaîne vide. Envoyer `null` explicitement est
// aussi ce qui permet de vider un champ déjà renseigné (sinon impossible à effacer).
export function nullifyEmptyStrings<T extends object>(values: T): T {
  const result = { ...values } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === '') {
      result[key] = null;
    }
  }
  return result as T;
}
