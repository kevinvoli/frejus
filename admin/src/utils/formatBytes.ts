// Formatage compact d'une taille en octets pour l'affichage dans le panneau admin
// (tableau de bord Stockage, colonne "Taille" de la Médiathèque, cartes de médias de
// la Médiathèque cliente). Monte jusqu'au Go — une vidéo de la médiathèque cliente
// peut désormais peser jusqu'à 2 Go (voir backend/src/galleries/galleries.service.ts).
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
