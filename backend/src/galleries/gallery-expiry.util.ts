// Logique d'expiration d'une galerie, partagée entre galleries.service.ts (badge
// "Expirée" du panneau admin) et storage.service.ts (liste des galeries expirées du
// tableau de bord Stockage), pour n'avoir qu'une seule définition de "expirée".
export interface GalleryExpiryFields {
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}

export function isGalleryExpired(
  gallery: GalleryExpiryFields,
  now: Date,
): boolean {
  const pastExpiry = gallery.expiresAt !== null && gallery.expiresAt < now;
  const usesExhausted =
    gallery.maxUses !== null && gallery.useCount >= gallery.maxUses;
  return pastExpiry || usesExhausted;
}
