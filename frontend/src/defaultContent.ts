// Contenu de repli, utilisé tant que l'API n'a pas répondu (chargement) ou si elle
// est injoignable — pour que le site reste présentable même sans backend disponible.
// Dès que du contenu réel est saisi dans le panneau admin, il remplace ces valeurs.
import type { PortfolioItem, Specialty, SiteSettings, Testimonial } from './api/types';

export const DEFAULT_SETTINGS: SiteSettings = {
  heroTitle: "Capturer l'instant, créer l'éternel",
  // Aucune image de repli par défaut : sans image active, Hero.tsx retombe sur le
  // fond CSS par défaut (.hero dans index.css) sans afficher de sous-titre.
  heroSlides: [],
  aboutText:
    "Passionné par la photographie depuis plus de 10 ans, je me spécialise dans la capture d'émotions authentiques et de moments uniques. Mon approche allie technique et sensibilité artistique pour créer des images qui racontent une histoire.\n\nDiplômé de l'École de Photographie de Paris, j'ai eu l'honneur de travailler avec des clients prestigieux et de voir mon travail publié dans plusieurs magazines nationaux.\n\nMon objectif : immortaliser vos moments les plus précieux avec authenticité et créativité.",
  aboutImageUrl: null,
  studioName: 'Pixellia Photographie',
  address: '123 Avenue des Champs-Élysées',
  city: 'Paris',
  phones: ['+33 1 23 45 67 89'],
  emails: ['contact@lumiere-photo.com'],
  openingHours: 'Du lundi au vendredi, 9h-18h',
  instagramUrl: null,
  facebookUrl: null,
  pinterestUrl: null,
  faviconUrl: null,
  logoUrl: null,
};

export const DEFAULT_SPECIALTIES: Specialty[] = [
  {
    id: -1,
    title: 'Portrait',
    description:
      'Séances photo personnalisées pour capturer votre personnalité et votre essence dans des cadres naturels ou en studio.',
    imageUrl: null,
    order: 0,
    photos: [],
    tariffs: [],
  },
  {
    id: -2,
    title: 'Mariage',
    description: 'Reportage discret et émouvant de votre journée spéciale, pour revivre chaque instant précieux.',
    imageUrl: null,
    order: 1,
    photos: [],
    tariffs: [],
  },
  {
    id: -3,
    title: 'Paysage',
    description: 'Exploration des plus beaux paysages à la recherche de lumières uniques et de perspectives originales.',
    imageUrl: null,
    order: 2,
    photos: [],
    tariffs: [],
  },
];

export const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  { id: -1, title: 'Portrait', category: 'Portrait', imageUrl: '', thumbnailUrl: null, order: 0, published: true },
  { id: -2, title: 'Mariage', category: 'Mariage', imageUrl: '', thumbnailUrl: null, order: 1, published: true },
  { id: -3, title: 'Paysage', category: 'Paysage', imageUrl: '', thumbnailUrl: null, order: 2, published: true },
  { id: -4, title: 'Portrait', category: 'Portrait', imageUrl: '', thumbnailUrl: null, order: 3, published: true },
  { id: -5, title: 'Événements', category: 'Événements', imageUrl: '', thumbnailUrl: null, order: 4, published: true },
  { id: -6, title: 'Mariage', category: 'Mariage', imageUrl: '', thumbnailUrl: null, order: 5, published: true },
];

// Couleurs pastel de repli, cyclées par index, pour les vignettes sans photo réelle
// (spécialités et portfolio) — reprend les teintes du gabarit d'origine.
export const PLACEHOLDER_COLORS = ['#d4c9b8', '#b8d4c9', '#c9b8d4', '#d4b8c9', '#b8c9d4', '#c9d4b8'];

export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: -1,
    clientName: 'Sophie et Thomas',
    text: "Une expérience incroyable ! Les photos de notre mariage sont magnifiques et capturent parfaitement l'émotion de la journée. Merci pour votre professionnalisme et votre talent.",
    rating: 5,
    published: true,
    createdAt: new Date(0).toISOString(),
  },
];
