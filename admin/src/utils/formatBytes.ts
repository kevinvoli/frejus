// Formatage compact d'une taille en octets pour l'affichage dans le panneau admin
// (tableau de bord Stockage, colonne "Taille" de la Médiathèque). Contrairement à
// formatSize() dans GalleryDetailPage.tsx (qui ne gère que Ko/Mo — un média client
// dépasse rarement 200 Mo), celui-ci monte jusqu'au Go pour des totaux bien plus gros.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
