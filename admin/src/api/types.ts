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
  // Plusieurs numéros/emails possibles (voir backend/src/settings/entities/contact-settings.entity.ts).
  phones: string[] | null;
  emails: string[] | null;
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

// Identité visuelle globale : favicon (onglet du navigateur) et logo (pied de page du
// site vitrine, à la place du texte "Pixellia" tant qu'aucun logo n'est renseigné).
export interface GeneralSettings {
  id: number;
  faviconUrl: string | null;
  logoUrl: string | null;
  updatedAt: string;
}

// Contenu des 3 pages légales du site vitrine (voir Footer.tsx côté site vitrine).
// Lecture publique côté backend (contrairement aux autres sections) puisque ces pages
// sont aussi consommées directement par le site vitrine.
export interface LegalSettings {
  id: number;
  mentionsLegales: string | null;
  politiqueConfidentialite: string | null;
  conditionsGenerales: string | null;
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

// Grille tarifaire d'une spécialité (un "sous-service" facturé séparément, voir
// backend/src/specialties/entities/specialty-tariff.entity.ts) : prix en francs CFA,
// `detail` est un champ texte libre pour la quantité/les conditions ("4 photos",
// "1 personne, 4 photos"...).
export interface SpecialtyTariff {
  id: number;
  specialtyId: number;
  name: string;
  price: number;
  detail: string | null;
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
  tariffs: SpecialtyTariff[];
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
  totalSizeBytes: number;
  // Lien expiré ou nombre d'utilisations atteint (voir tableau de bord Stockage) —
  // informatif seulement, aucune suppression automatique n'est faite côté serveur.
  expired: boolean;
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

// Tableau de bord "Stockage" (voir backend/src/storage) : vue d'ensemble de
// l'espace disque occupé par les médias, pour repérer manuellement ce qui prend le
// plus de place. Aucune suppression automatique n'est faite côté serveur.
export interface DiskUsage {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  alertThresholdPercent: number;
  hardLimitPercent: number;
  alert: boolean;
}

export interface StorageBreakdown {
  galleries: { totalBytes: number; mediaCount: number };
  specialtyPhotos: { totalBytes: number; photoCount: number };
  misc: { totalBytes: number };
}

export interface TopGallery {
  id: number;
  title: string;
  totalBytes: number;
  mediaCount: number;
}

export interface ExpiredGallery {
  id: number;
  title: string;
  clientName: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  totalBytes: number;
  mediaCount: number;
}

// Quota d'espace propre à ce projet (indépendant du % d'espace disque déjà utilisé
// par le reste du VPS, voir DiskUsage ci-dessus) — configuré uniquement via la
// variable d'environnement MEDIA_STORAGE_QUOTA_GB côté backend, non modifiable
// depuis ce panneau admin. `null` si le quota est désactivé côté serveur.
export interface MediaQuotaStatus {
  quotaBytes: number;
  usedBytes: number;
  usedPercent: number;
  alert: boolean;
}

export interface StorageOverview {
  disk: DiskUsage;
  mediaQuota: MediaQuotaStatus | null;
  breakdown: StorageBreakdown;
  topGalleries: TopGallery[];
  expiredGalleries: ExpiredGallery[];
}
