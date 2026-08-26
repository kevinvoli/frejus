// Types miroir des entités publiques exposées par le backend (voir backend/src/**/entities).
// Dupliqués volontairement plutôt que partagés via un package commun — même choix
// pragmatique que dans admin/src/api/types.ts.

export interface SiteSettings {
  id: number;
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
  updatedAt: string;
}

export interface Specialty {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
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
  media: GalleryMedia[];
}

export type GalleryAccessResponse = GalleryLocked | GalleryUnlocked;
