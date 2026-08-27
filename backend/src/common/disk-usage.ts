import { ServiceUnavailableException } from '@nestjs/common';
import { statfsSync } from 'fs';
import { join } from 'path';

// Utilitaire partagé (pas un service Nest injectable) : utilisé à la fois par
// storage.service.ts (tableau de bord admin) et par les fileFilter des différents
// contrôleurs d'upload (galleries, specialties, upload), qui n'ont pas facilement
// accès à l'injection de dépendances dans les options statiques de multer. Reste
// volontairement sans état pour être appelable des deux côtés sans duplication.
//
// fs.statfsSync (Node 19+, stable sur Node 22 utilisé ici) donne directement la
// place disque du volume qui héberge le dossier "uploads", sans dépendre d'un
// outil externe comme `df`.
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

// Seuil d'alerte affiché dans le tableau de bord admin (voir StoragePage.tsx) :
// dépassé, un bandeau d'avertissement s'affiche mais rien n'est bloqué. Réutilisé
// tel quel pour le quota du projet ci-dessous (un seul seuil d'alerte à retenir).
export const ALERT_THRESHOLD_PERCENT =
  Number(process.env.DISK_ALERT_THRESHOLD_PERCENT) || 85;

// Seuil critique : au-delà, les nouveaux envois de médias (galeries, catalogues de
// spécialités, images génériques) sont bloqués avec un message clair, plutôt que de
// laisser le disque du serveur se remplir à 100 % (ce qui peut planter la base de
// données MySQL et le reste du serveur). Aucune suppression automatique n'est faite
// ici — c'est un filet de sécurité en dernier recours, pas une stratégie de nettoyage
// (voir docs/ANALYSE-PLAN-BACKEND.md pour la stratégie complète).
const HARD_LIMIT_PERCENT = Number(process.env.DISK_HARD_LIMIT_PERCENT) || 95;

// Quota total (en Go) que les médias de CE projet (médiathèque + catalogues de
// spécialités + autres images) ont le droit d'occuper — indépendant du % d'espace
// disque déjà utilisé par le reste du VPS (voir getDiskUsage() ci-dessus). Sert à
// protéger les autres usages du serveur d'un projet qui grossirait sans limite,
// même si le disque entier a par ailleurs beaucoup de marge. `0` ou une valeur
// négative désactive le quota (aucune limite propre au projet, seul le seuil
// critique du disque entier ci-dessus s'applique encore).
//
// Ne PAS écrire `Number(process.env.MEDIA_STORAGE_QUOTA_GB) || 100` : `0` est une
// valeur falsy en JS, donc `0 || 100` retomberait sur 100 et empêcherait justement
// de désactiver le quota avec `MEDIA_STORAGE_QUOTA_GB=0` comme documenté ci-dessus.
const rawMediaQuotaGb = process.env.MEDIA_STORAGE_QUOTA_GB;
const parsedMediaQuotaGb =
  rawMediaQuotaGb === undefined || rawMediaQuotaGb === ''
    ? 100
    : Number(rawMediaQuotaGb);
// Valeur non numérique (variable mal renseignée) : on retombe sur le défaut plutôt
// que de désactiver silencieusement le quota (NaN > 0 vaut false).
const MEDIA_QUOTA_GB = Number.isNaN(parsedMediaQuotaGb) ? 100 : parsedMediaQuotaGb;

export function getMediaQuotaBytes(): number | null {
  return MEDIA_QUOTA_GB > 0 ? MEDIA_QUOTA_GB * 1024 * 1024 * 1024 : null;
}

export interface DiskUsage {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
  alertThresholdPercent: number;
  hardLimitPercent: number;
  alert: boolean;
}

export function getDiskUsage(): DiskUsage {
  const stats = statfsSync(UPLOADS_DIR);
  const totalBytes = stats.blocks * stats.bsize;
  // bavail (plutôt que bfree) : place disponible pour un utilisateur non privilégié,
  // cohérent avec ce que verrait un `df -h` classique.
  const availableBytes = stats.bavail * stats.bsize;
  const usedBytes = totalBytes - availableBytes;
  const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;
  return {
    totalBytes,
    usedBytes,
    availableBytes,
    usedPercent,
    alertThresholdPercent: ALERT_THRESHOLD_PERCENT,
    hardLimitPercent: HARD_LIMIT_PERCENT,
    alert: usedPercent >= ALERT_THRESHOLD_PERCENT,
  };
}

// Appelé depuis le fileFilter de chaque contrôleur d'upload, avant l'écriture du
// fichier sur le disque (voir galleries.controller.ts, specialties.controller.ts,
// upload.controller.ts).
export function assertUploadAllowed(): void {
  const usage = getDiskUsage();
  if (usage.usedPercent >= HARD_LIMIT_PERCENT) {
    throw new ServiceUnavailableException(
      "Espace disque du serveur presque plein : l'envoi de nouveaux médias est " +
        'temporairement bloqué. Consultez le tableau de bord "Stockage" du panneau ' +
        "admin pour libérer de l'espace avant de réessayer.",
    );
  }
}
