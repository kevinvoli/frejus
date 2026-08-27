import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Dirent, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ClientGallery } from '../galleries/entities/client-gallery.entity';
import { MediaItem } from '../galleries/entities/media-item.entity';
import { isGalleryExpired } from '../galleries/gallery-expiry.util';
import { SpecialtyPhoto } from '../specialties/entities/specialty-photo.entity';
import {
  ALERT_THRESHOLD_PERCENT,
  DiskUsage,
  getDiskUsage,
  getMediaQuotaBytes,
  UPLOADS_DIR,
} from '../common/disk-usage';

const TOP_GALLERIES_LIMIT = 10;

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
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
  totalBytes: number;
  mediaCount: number;
}

export interface MediaQuotaStatus {
  quotaBytes: number;
  usedBytes: number;
  usedPercent: number;
  alert: boolean;
}

export interface StorageOverview {
  disk: DiskUsage;
  // null si le quota est désactivé (MEDIA_STORAGE_QUOTA_GB <= 0).
  mediaQuota: MediaQuotaStatus | null;
  breakdown: StorageBreakdown;
  topGalleries: TopGallery[];
  expiredGalleries: ExpiredGallery[];
}

// Tableau de bord "Stockage" du panneau admin (voir docs/ANALYSE-PLAN-BACKEND.md) :
// donne une vue d'ensemble de l'espace occupé par les médias, pour repérer et
// nettoyer manuellement ce qui prend le plus de place, plutôt que de découvrir un
// disque plein après coup. Ne supprime jamais rien lui-même — voir
// common/disk-usage.ts pour le seul filet de sécurité automatique (blocage des
// nouveaux envois au-delà d'un seuil critique, sans suppression).
@Injectable()
export class StorageService {
  constructor(
    @InjectRepository(ClientGallery)
    private readonly galleryRepo: Repository<ClientGallery>,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    @InjectRepository(SpecialtyPhoto)
    private readonly specialtyPhotoRepo: Repository<SpecialtyPhoto>,
  ) {}

  async getOverview(): Promise<StorageOverview> {
    const [galleryAgg, specialtyAgg, topGalleries, expiredGalleries] =
      await Promise.all([
        this.getGalleryAggregate(),
        this.getSpecialtyPhotoAggregate(),
        this.getTopGalleries(),
        this.getExpiredGalleriesWithSize(),
      ]);
    const miscBytes = this.computeMiscUploadsBytes();
    const totalMediaBytes =
      galleryAgg.totalBytes + specialtyAgg.totalBytes + miscBytes;

    return {
      disk: getDiskUsage(),
      mediaQuota: this.buildMediaQuotaStatus(totalMediaBytes),
      breakdown: {
        galleries: galleryAgg,
        specialtyPhotos: specialtyAgg,
        misc: { totalBytes: miscBytes },
      },
      topGalleries,
      expiredGalleries,
    };
  }

  // Espace actuellement occupé par tous les médias de ce projet (médiathèque +
  // catalogues de spécialités + autres images), tous confondus — utilisé pour
  // comparer au quota du projet (voir assertWithinMediaQuota ci-dessous), séparément
  // du % d'espace disque déjà utilisé par le reste du serveur (getDiskUsage()).
  async getTotalMediaUsageBytes(): Promise<number> {
    const [galleryAgg, specialtyAgg] = await Promise.all([
      this.getGalleryAggregate(),
      this.getSpecialtyPhotoAggregate(),
    ]);
    return (
      galleryAgg.totalBytes +
      specialtyAgg.totalBytes +
      this.computeMiscUploadsBytes()
    );
  }

  // Appelé depuis les services d'upload (galleries, specialties, upload) après que
  // multer a déjà écrit le ou les fichiers sur le disque, mais avant d'enregistrer
  // quoi que ce soit en base : si l'ajout ferait dépasser le quota du projet, les
  // appelants doivent supprimer les fichiers fraîchement écrits puis laisser
  // l'exception remonter, sans jamais créer la ligne correspondante en base.
  async assertWithinMediaQuota(additionalBytes: number): Promise<void> {
    const quotaBytes = getMediaQuotaBytes();
    if (quotaBytes === null) return;
    const currentBytes = await this.getTotalMediaUsageBytes();
    if (currentBytes + additionalBytes > quotaBytes) {
      throw new PayloadTooLargeException(
        `Quota de stockage de ce projet atteint (${this.formatGoForMessage(currentBytes)} Go / ` +
          `${this.formatGoForMessage(quotaBytes)} Go). Supprimez des médias existants (voir le ` +
          'tableau de bord Stockage) ou augmentez MEDIA_STORAGE_QUOTA_GB avant de réessayer.',
      );
    }
  }

  private buildMediaQuotaStatus(usedBytes: number): MediaQuotaStatus | null {
    const quotaBytes = getMediaQuotaBytes();
    if (quotaBytes === null) return null;
    const usedPercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;
    return {
      quotaBytes,
      usedBytes,
      usedPercent,
      alert: usedPercent >= ALERT_THRESHOLD_PERCENT,
    };
  }

  private formatGoForMessage(bytes: number): string {
    return (bytes / (1024 * 1024 * 1024)).toFixed(1);
  }

  private async getGalleryAggregate(): Promise<{
    totalBytes: number;
    mediaCount: number;
  }> {
    const raw = await this.mediaRepo
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.sizeBytes), 0)', 'totalBytes')
      .addSelect('COUNT(m.id)', 'mediaCount')
      .getRawOne<{ totalBytes: string; mediaCount: string }>();
    return {
      totalBytes: Number(raw?.totalBytes ?? 0),
      mediaCount: Number(raw?.mediaCount ?? 0),
    };
  }

  private async getSpecialtyPhotoAggregate(): Promise<{
    totalBytes: number;
    photoCount: number;
  }> {
    const raw = await this.specialtyPhotoRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.sizeBytes), 0)', 'totalBytes')
      .addSelect('COUNT(p.id)', 'photoCount')
      .getRawOne<{ totalBytes: string; photoCount: string }>();
    return {
      totalBytes: Number(raw?.totalBytes ?? 0),
      photoCount: Number(raw?.photoCount ?? 0),
    };
  }

  private async getTopGalleries(): Promise<TopGallery[]> {
    const rows = await this.mediaRepo
      .createQueryBuilder('m')
      .select('m.galleryId', 'galleryId')
      .addSelect('COALESCE(SUM(m.sizeBytes), 0)', 'totalBytes')
      .addSelect('COUNT(m.id)', 'mediaCount')
      .groupBy('m.galleryId')
      .orderBy('totalBytes', 'DESC')
      .limit(TOP_GALLERIES_LIMIT)
      .getRawMany<{
        galleryId: string;
        totalBytes: string;
        mediaCount: string;
      }>();

    if (rows.length === 0) return [];

    const ids = rows.map((row) => Number(row.galleryId));
    const galleries = await this.galleryRepo.find({ where: { id: In(ids) } });
    const titleById = new Map(galleries.map((g) => [g.id, g.title]));

    return rows.map((row) => {
      const id = Number(row.galleryId);
      return {
        id,
        title: titleById.get(id) ?? `Galerie ${id}`,
        totalBytes: Number(row.totalBytes),
        mediaCount: Number(row.mediaCount),
      };
    });
  }

  private async getExpiredGalleriesWithSize(): Promise<ExpiredGallery[]> {
    const galleries = await this.galleryRepo.find();
    const now = new Date();
    const expired = galleries.filter((g) => isGalleryExpired(g, now));
    if (expired.length === 0) return [];

    const ids = expired.map((g) => g.id);
    const sizeRows = await this.mediaRepo
      .createQueryBuilder('m')
      .select('m.galleryId', 'galleryId')
      .addSelect('COALESCE(SUM(m.sizeBytes), 0)', 'totalBytes')
      .addSelect('COUNT(m.id)', 'mediaCount')
      .where('m.galleryId IN (:...ids)', { ids })
      .groupBy('m.galleryId')
      .getRawMany<{
        galleryId: string;
        totalBytes: string;
        mediaCount: string;
      }>();
    const sizeByGalleryId = new Map(
      sizeRows.map((row) => [
        Number(row.galleryId),
        {
          totalBytes: Number(row.totalBytes),
          mediaCount: Number(row.mediaCount),
        },
      ]),
    );

    return expired
      .map((gallery) => ({
        id: gallery.id,
        title: gallery.title,
        clientName: gallery.clientName,
        expiresAt: gallery.expiresAt,
        maxUses: gallery.maxUses,
        useCount: gallery.useCount,
        totalBytes: sizeByGalleryId.get(gallery.id)?.totalBytes ?? 0,
        mediaCount: sizeByGalleryId.get(gallery.id)?.mediaCount ?? 0,
      }))
      .sort((a, b) => b.totalBytes - a.totalBytes);
  }

  // Estime l'espace occupé par tout ce qui n'est ni un média de galerie, ni une
  // photo de catalogue de spécialité — c'est-à-dire les images génériques envoyées
  // via /upload (accroche, "à propos", image de premier plan d'une spécialité,
  // photo du portfolio...). Ces fichiers vivent directement à la racine de
  // "uploads/" (voir upload.controller.ts) : un scan superficiel (non récursif,
  // sans descendre dans galleries/ ni specialties/) suffit, leur nombre reste faible
  // par nature (une poignée d'images de contenu, pas des livrables client en volume).
  private computeMiscUploadsBytes(): number {
    let entries: Dirent[];
    try {
      entries = readdirSync(UPLOADS_DIR, { withFileTypes: true });
    } catch {
      return 0;
    }
    let total = 0;
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        total += statSync(join(UPLOADS_DIR, entry.name)).size;
      } catch {
        // Fichier disparu entre la liste et la lecture : ignoré, pas bloquant.
      }
    }
    return total;
  }
}
