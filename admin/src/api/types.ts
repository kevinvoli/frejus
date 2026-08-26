// Types miroir des entités/DTO du backend (backend/src/**/entities, backend/src/**/dto).
// Dupliqués volontairement plutôt que partagés via un package commun : ça reste un
// choix pragmatique de MVP à deux petits projets ; à revoir si les deux évoluent vite
// en parallèle (package `shared-types` par exemple).

// Réglages du site : une table par section (voir backend/src/settings), chacune avec
// sa propre page de formulaire dans le panneau admin (voir
// src/components/settings/*Form.tsx et src/pages/SettingsPage.tsx).
export interface HeroSettings {
  id: number;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  updatedAt: string;
}

export interface AboutSettings {
  id: number;
  aboutText: string | null;
  aboutImageUrl: string | null;
  updatedAt: string;
}

export interface ContactSettings {
  id: number;
  studioName: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  openingHours: string | null;
  updatedAt: string;
}

export interface SocialSettings {
  id: number;
  instagramUrl: string | null;
  facebookUrl: string | null;
  pinterestUrl: string | null;
  updatedAt: string;
}

// Catalogue de photos d'une spécialité (voir backend/src/specialties) : distinct de
// `imageUrl` sur Specialty, qui reste l'image de premier plan affichée sur la carte.
export interface SpecialtyPhoto {
  id: number;
  specialtyId: number;
  fileUrl: string;
  order: number;
  createdAt: string;
}

export interface Specialty {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  photos: SpecialtyPhoto[];
  createdAt: string;
  updatedAt: string;
}

// Catégories de portfolio gérables depuis le panneau admin (voir
// backend/src/portfolio/entities/portfolio-category.entity.ts). `PortfolioItem.category`
// reste un simple champ texte : cette liste alimente seulement le sélecteur proposé à
// la création/modification d'un élément de portfolio.
export interface PortfolioCategory {
  id: number;
  name: string;
  order: number;
  createdAt: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: number;
  clientName: string;
  text: string;
  rating: number;
  published: boolean;
  createdAt: string;
}

// Pas de `enum` TS classique : interdit par l'option "erasableSyntaxOnly" de ce
// projet (elle exige un code 100% "effaçable" à la compilation). Ce couple
// objet-const + type union reproduit le même usage (ContactMessageStatus.NEW, etc.)
// tout en restant erasable.
export const ContactMessageStatus = {
  NEW: 'new',
  READ: 'read',
  TREATED: 'treated',
} as const;
export type ContactMessageStatus = (typeof ContactMessageStatus)[keyof typeof ContactMessageStatus];

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
}

// Médiathèque : galeries privées livrées aux clients (voir
// backend/src/galleries). `passwordHash` n'est jamais renvoyé par l'API — seul un
// booléen `hasPassword` indique si la galerie est protégée.
export const MediaType = {
  PHOTO: 'photo',
  VIDEO: 'video',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export interface GalleryMedia {
  id: number;
  galleryId: number;
  type: MediaType;
  fileUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  order: number;
  createdAt: string;
}

// Forme "liste" (GET /galleries) : pas de tableau `media`, juste un compte.
export interface GalleryListItem {
  id: number;
  title: string;
  clientName: string;
  clientEmail: string | null;
  description: string | null;
  accessToken: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  mediaCount: number;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}

// Forme "détail" (GET/POST/PUT /galleries/:id) : inclut les médias complets.
export interface ClientGallery {
  id: number;
  title: string;
  clientName: string;
  clientEmail: string | null;
  description: string | null;
  accessToken: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  media: GalleryMedia[];
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
}
