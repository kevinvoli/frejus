// Types miroir des entités publiques exposées par le backend (voir backend/src/**/entities).
// Dupliqués volontairement plutôt que partagés via un package commun — même choix
// pragmatique que dans admin/src/api/types.ts.

// Agrégat public de GET /settings : le backend fusionne 4 tables (une par section du
// panneau admin — accueil, à propos, studio/contact, réseaux sociaux, voir
// backend/src/settings) en une seule forme plate, inchangée pour le site vitrine
// depuis la refonte du panneau admin du 26/08 (voir docs/ANALYSE-PLAN-BACKEND.md).
// Plus d'`id`/`updatedAt` uniques : ces notions n'ont plus de sens pour un agrégat de
// 4 lignes distinctes.
export interface SiteSettings {
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  aboutText: string | null;
  aboutImageUrl: string | null;
  studioName: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  pinterestUrl: string | null;
}

// Catalogue de photos d'une spécialité : distinct de `imageUrl`, qui reste l'image de
// premier plan affichée sur la carte. Le catalogue est affiché en grille façon
// Pinterest sur la page dédiée de la spécialité, ouverte au clic sur la carte (voir
// docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08).
export interface SpecialtyPhoto {
  id: number;
  fileUrl: string;
  order: number;
}

// Une ligne de la grille tarifaire d'une spécialité (un "sous-service" facturé
// séparément, ex. "Shooting individuel" à 15 000 F CFA). `detail` est un champ texte
// libre pour la quantité/les conditions ("4 photos", "1 personne, 4 photos"...).
export interface SpecialtyTariff {
  id: number;
  name: string;
  price: number;
  detail: string | null;
  order: number;
}

export interface Specialty {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  photos: SpecialtyPhoto[];
  tariffs: SpecialtyTariff[];
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  order: number;
  published: boolean;
}

export interface Testimonial {
  id: number;
  clientName: string;
  text: string;
  rating: number;
  published: boolean;
  createdAt: string;
}

// Médiathèque cliente (voir backend/src/galleries) : accès public par lien, sans
// compte. Formes miroir de GalleriesService.getPublicAccess/verifyPassword.
export const MediaType = {
  PHOTO: 'photo',
  VIDEO: 'video',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface GalleryMedia {
  id: number;
  type: MediaType;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface GalleryLocked {
  id: number;
  title: string;
  requiresPassword: true;
}

export interface GalleryUnlocked {
  id: number;
  title: string;
  clientName: string;
  description: string | null;
  requiresPassword: false;
  accessJwt: string;
  usageToken: string;
  media: GalleryMedia[];
}

export type GalleryAccessResponse = GalleryLocked | GalleryUnlocked;
