// Types miroir des entités/DTO du backend (backend/src/**/entities, backend/src/**/dto).
// Dupliqués volontairement plutôt que partagés via un package commun : ça reste un
// choix pragmatique de MVP à deux petits projets ; à revoir si les deux évoluent vite
// en parallèle (package `shared-types` par exemple).

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
  createdAt: string;
  updatedAt: string;
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
