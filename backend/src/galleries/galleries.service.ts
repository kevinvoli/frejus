import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ClientGallery } from './entities/client-gallery.entity';
import { MediaItem, MediaType } from './entities/media-item.entity';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { isGalleryExpired } from './gallery-expiry.util';
import { StorageService } from '../storage/storage.service';

// Jeton d'accès aux téléchargements : émis après déverrouillage d'une galerie (ou
// immédiatement si elle n'a pas de mot de passe), scope court (6h) plutôt qu'un vrai
// compte client — voir docs/ANALYSE-PLAN-BACKEND.md, section médiathèque.
const GALLERY_ACCESS_SCOPE = 'gallery-access';
const GALLERY_ACCESS_EXPIRES_IN = '6h';

// Code d'accès galerie : le photographe le communique oralement ou par écrit à son
// client (voir décision produit du 26/08 — accès non plus par lien distribué, mais
// par un code court tapé sur le site vitrine). Alphabet volontairement restreint aux
// caractères non ambigus à l'oral/à l'écrit (pas de 0/O, 1/I/L). 8 caractères sur cet
// alphabet de 32 symboles ≈ 1 000 milliards de combinaisons, largement suffisant pour
// le volume d'un photographe indépendant.
const GALLERY_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const GALLERY_CODE_LENGTH = 8;

// Jeton "utilisation" : preuve, mémorisée côté navigateur (localStorage), qu'un
// déverrouillage a déjà été compté pour ce couple navigateur/galerie — évite de
// consommer une nouvelle utilisation à chaque rechargement de page du même client
// dans les 30 jours (voir décision produit du 26/08, limite d'utilisations du code).
const GALLERY_USAGE_SCOPE = 'gallery-usage';
const GALLERY_USAGE_EXPIRES_IN = '30d';

// Limites de taille par fichier — demande client du 29/08 (voir
// docs/ANALYSE-PLAN-BACKEND.md) : une vidéo est naturellement bien plus volumineuse
// qu'une photo, d'où deux plafonds distincts plutôt qu'un seul commun. Multer
// n'appliquant qu'une seule limite de taille par interceptor (voir
// `limits.fileSize` dans galleries.controller.ts, réglée sur le plafond vidéo pour ne
// jamais couper un upload légitime en cours de flux), on revérifie ici chaque fichier
// selon son propre type une fois écrit sur le disque.
export const MAX_PHOTO_SIZE_BYTES = 50 * 1024 * 1024; // 50 Mo
export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 Go

export interface GalleryAccessPayload {
  scope: string;
  galleryId: number;
  token: string;
}

export interface GalleryUsagePayload {
  scope: string;
  galleryId: number;
  token: string;
}

@Injectable()
export class GalleriesService {
  constructor(
    @InjectRepository(ClientGallery)
    private readonly galleryRepo: Repository<ClientGallery>,
    @InjectRepository(MediaItem)
    private readonly mediaRepo: Repository<MediaItem>,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  // --- Administration (routes protégées JWT admin) ---

  async create(
    dto: CreateGalleryDto,
  ): Promise<Omit<ClientGallery, 'passwordHash'> & { hasPassword: boolean }> {
    const gallery = this.galleryRepo.create({
      title: dto.title,
      clientName: dto.clientName,
      clientEmail: dto.clientEmail ?? null,
      description: dto.description ?? null,
      accessToken: await this.generateUniqueAccessCode(),
      passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      maxUses: dto.maxUses ?? null,
    });
    const saved = await this.galleryRepo.save(gallery);
    return this.toAdminShape(saved);
  }

  async findAllForAdmin(): Promise<
    Array<
      Omit<ClientGallery, 'media' | 'passwordHash'> & {
        mediaCount: number;
        totalSizeBytes: number;
        expired: boolean;
        hasPassword: boolean;
      }
    >
  > {
    // Charge la relation puis calcule le compte en mémoire plutôt que
    // loadRelationCountAndMap (indisponible sur ce driver) : volume attendu (galeries
    // d'un photographe) largement compatible avec ce coût.
    const galleries = await this.galleryRepo.find({
      relations: { media: true },
      order: { createdAt: 'DESC' },
    });
    const now = new Date();
    return galleries.map(({ media, passwordHash, ...rest }) => ({
      ...rest,
      mediaCount: media.length,
      totalSizeBytes: media.reduce((sum, item) => sum + item.sizeBytes, 0),
      // Signalé dans le panneau admin (voir GalleriesPage.tsx et le tableau de bord
      // Stockage) pour aider à repérer manuellement les galeries à supprimer —
      // aucune suppression automatique n'est faite ici (voir docs/ANALYSE-PLAN-BACKEND.md).
      expired: isGalleryExpired(rest, now),
      hasPassword: passwordHash !== null,
    }));
  }

  async findOneForAdmin(
    id: number,
  ): Promise<Omit<ClientGallery, 'passwordHash'> & { hasPassword: boolean }> {
    const gallery = await this.findOneEntity(id);
    return this.toAdminShape(gallery);
  }

  async update(
    id: number,
    dto: UpdateGalleryDto,
  ): Promise<Omit<ClientGallery, 'passwordHash'> & { hasPassword: boolean }> {
    const gallery = await this.findOneEntity(id);
    const { password, expiresAt, maxUses, ...rest } = dto;

    this.galleryRepo.merge(gallery, rest);

    // password: undefined => on ne touche pas au mot de passe existant.
    // password: null      => on retire la protection.
    // password: "..."     => on (re)hash un nouveau mot de passe.
    if (password === null) {
      gallery.passwordHash = null;
    } else if (typeof password === 'string' && password.length > 0) {
      gallery.passwordHash = await bcrypt.hash(password, 10);
    }

    if (expiresAt !== undefined) {
      gallery.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    // maxUses: undefined => inchangé. null ou absent du formulaire => illimité.
    // nombre => nouvelle limite (n'affecte pas useCount, déjà consommé reste compté).
    if (maxUses !== undefined) {
      gallery.maxUses = maxUses;
    }

    const saved = await this.galleryRepo.save(gallery);
    return this.toAdminShape(saved);
  }

  async remove(id: number): Promise<void> {
    const gallery = await this.findOneEntity(id);
    await Promise.all(
      gallery.media.map((item) => this.deleteFileQuietly(item.fileUrl)),
    );
    // La suppression en base entraîne celle des media_items via ON DELETE CASCADE.
    await this.galleryRepo.remove(gallery);
  }

  async addMedia(
    galleryId: number,
    files: Express.Multer.File[],
  ): Promise<MediaItem[]> {
    await this.findOneEntity(galleryId); // 404 si la galerie n'existe pas

    // multer a déjà écrit les fichiers sur le disque à ce stade (l'interceptor
    // s'exécute avant le handler) : toute validation qui échoue ici doit donc d'abord
    // nettoyer ces fichiers fraîchement écrits avant de laisser l'exception remonter,
    // pour ne jamais laisser de fichier orphelin (sans ligne en base) sur le disque.

    // La limite de taille appliquée par multer (`limits.fileSize`, voir
    // galleries.controller.ts) est réglée sur le plafond vidéo (2 Go) pour laisser
    // passer les vidéos : on revérifie donc ici qu'une photo ne dépasse pas son propre
    // plafond, plus bas (50 Mo).
    const oversized = files.find(
      (file) =>
        !file.mimetype.startsWith('video/') && file.size > MAX_PHOTO_SIZE_BYTES,
    );
    if (oversized) {
      await this.cleanupUploadedFiles(files);
      throw new BadRequestException(
        `Fichier "${oversized.originalname}" trop volumineux : 50 Mo maximum pour une photo`,
      );
    }

    const additionalBytes = files.reduce((sum, file) => sum + file.size, 0);
    try {
      await this.storageService.assertWithinMediaQuota(additionalBytes);
    } catch (err) {
      await this.cleanupUploadedFiles(files);
      throw err;
    }

    const items = files.map((file) =>
      this.mediaRepo.create({
        galleryId,
        type: file.mimetype.startsWith('video/')
          ? MediaType.VIDEO
          : MediaType.PHOTO,
        fileUrl: `/uploads/galleries/${file.filename}`,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      }),
    );
    return this.mediaRepo.save(items);
  }

  async removeMedia(galleryId: number, mediaId: number): Promise<void> {
    const item = await this.mediaRepo.findOne({
      where: { id: mediaId, galleryId },
    });
    if (!item) {
      throw new NotFoundException(
        `Média ${mediaId} introuvable dans cette galerie`,
      );
    }
    await this.deleteFileQuietly(item.fileUrl);
    await this.mediaRepo.remove(item);
  }

  // --- Accès public (lien partagé au client, sans compte) ---

  async getPublicAccess(token: string, usageReceipt?: string) {
    const gallery = await this.findByAccessToken(token);
    if (!gallery.passwordHash) {
      return this.unlockWithUsageTracking(gallery, usageReceipt);
    }
    return { id: gallery.id, title: gallery.title, requiresPassword: true };
  }

  async verifyPassword(token: string, password: string, usageReceipt?: string) {
    const gallery = await this.findByAccessToken(token);
    if (gallery.passwordHash) {
      const matches = await bcrypt.compare(password, gallery.passwordHash);
      if (!matches) {
        throw new UnauthorizedException('Mot de passe incorrect');
      }
    }
    return this.unlockWithUsageTracking(gallery, usageReceipt);
  }

  // Vérifie le jeton court-terme émis après déverrouillage, avant de servir un
  // téléchargement (fichier unique ou ZIP).
  async assertDownloadAccess(
    rawToken: string,
    accessJwt: string | undefined,
  ): Promise<ClientGallery> {
    const token = this.normalizeAccessCode(rawToken);
    const gallery = await this.findByAccessToken(token);
    if (!accessJwt) {
      throw new UnauthorizedException('Accès manquant');
    }
    let payload: GalleryAccessPayload;
    try {
      payload =
        await this.jwtService.verifyAsync<GalleryAccessPayload>(accessJwt);
    } catch {
      throw new UnauthorizedException('Accès invalide ou expiré');
    }
    if (
      payload.scope !== GALLERY_ACCESS_SCOPE ||
      payload.galleryId !== gallery.id ||
      payload.token !== token
    ) {
      throw new UnauthorizedException('Accès invalide');
    }
    return gallery;
  }

  async getMediaFileForDownload(gallery: ClientGallery, mediaId: number) {
    const item = await this.mediaRepo.findOne({
      where: { id: mediaId, galleryId: gallery.id },
    });
    if (!item) {
      throw new NotFoundException(
        `Média ${mediaId} introuvable dans cette galerie`,
      );
    }
    return { absolutePath: this.absolutePathFor(item.fileUrl), item };
  }

  // --- Aides internes ---

  private generateAccessCode(): string {
    let code = '';
    for (let i = 0; i < GALLERY_CODE_LENGTH; i++) {
      code += GALLERY_CODE_ALPHABET[randomInt(GALLERY_CODE_ALPHABET.length)];
    }
    return code;
  }

  private async generateUniqueAccessCode(): Promise<string> {
    // Espace de codes largement assez grand pour qu'une collision soit improbable,
    // mais on vérifie quand même (contrainte unique en base) plutôt que de la
    // découvrir via une erreur SQL au moment du save().
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = this.generateAccessCode();
      const existing = await this.galleryRepo.findOne({
        where: { accessToken: code },
      });
      if (!existing) return code;
    }
    throw new Error("Impossible de générer un code d'accès de galerie unique");
  }

  // Récupère l'entité complète (avec passwordHash) pour usage interne uniquement —
  // ne jamais renvoyer directement au client admin, voir toAdminShape().
  private async findOneEntity(id: number): Promise<ClientGallery> {
    const gallery = await this.galleryRepo.findOne({
      where: { id },
      relations: { media: true },
    });
    if (!gallery) {
      throw new NotFoundException(`Galerie ${id} introuvable`);
    }
    gallery.media = this.sortMedia(gallery.media);
    return gallery;
  }

  // Ne jamais exposer le hash bcrypt au panneau admin : seul un booléen indique si
  // la galerie est protégée (cohérent avec auth.service.ts qui ne renvoie jamais le
  // hash de mot de passe utilisateur non plus).
  private toAdminShape(
    gallery: ClientGallery,
  ): Omit<ClientGallery, 'passwordHash'> & { hasPassword: boolean } {
    const { passwordHash, ...rest } = gallery;
    return { ...rest, hasPassword: passwordHash !== null };
  }

  // Le code peut arriver depuis un lien direct (`?galerie=...`, casse/tirets déjà
  // nettoyés côté frontend) ou tapé à la main dans le champ dédié du site vitrine —
  // on normalise donc aussi ici, en défense en profondeur, plutôt que de dépendre
  // uniquement du nettoyage côté client.
  private normalizeAccessCode(token: string): string {
    return token.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private async findByAccessToken(rawToken: string): Promise<ClientGallery> {
    const token = this.normalizeAccessCode(rawToken);
    const gallery = await this.galleryRepo.findOne({
      where: { accessToken: token },
      relations: { media: true },
    });
    if (!gallery) {
      throw new NotFoundException('Galerie introuvable');
    }
    if (gallery.expiresAt && gallery.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Ce lien de galerie a expiré');
    }
    return gallery;
  }

  // Vérifie le nombre maximal d'utilisations avant de déverrouiller, en tenant
  // compte d'un éventuel jeton "gallery-usage" déjà obtenu par ce navigateur (dans ce
  // cas, ce déverrouillage ne consomme pas une utilisation supplémentaire).
  private async unlockWithUsageTracking(
    gallery: ClientGallery,
    usageReceipt: string | undefined,
  ) {
    const alreadyCounted = await this.hasValidUsageReceipt(
      gallery,
      usageReceipt,
    );
    if (!alreadyCounted) {
      if (gallery.maxUses !== null && gallery.useCount >= gallery.maxUses) {
        throw new ForbiddenException(
          "Ce code a atteint son nombre maximal d'utilisations",
        );
      }
      gallery.useCount += 1;
      await this.galleryRepo.update(gallery.id, { useCount: gallery.useCount });
    }
    const usageToken = await this.jwtService.signAsync(
      {
        scope: GALLERY_USAGE_SCOPE,
        galleryId: gallery.id,
        token: gallery.accessToken,
      },
      { expiresIn: GALLERY_USAGE_EXPIRES_IN },
    );
    return this.buildUnlockedPayload(gallery, usageToken);
  }

  private async hasValidUsageReceipt(
    gallery: ClientGallery,
    usageReceipt: string | undefined,
  ): Promise<boolean> {
    if (!usageReceipt) return false;
    try {
      const payload =
        await this.jwtService.verifyAsync<GalleryUsagePayload>(usageReceipt);
      return (
        payload.scope === GALLERY_USAGE_SCOPE &&
        payload.galleryId === gallery.id &&
        payload.token === gallery.accessToken
      );
    } catch {
      return false;
    }
  }

  private async buildUnlockedPayload(
    gallery: ClientGallery,
    usageToken: string,
  ) {
    const accessJwt = await this.jwtService.signAsync(
      {
        scope: GALLERY_ACCESS_SCOPE,
        galleryId: gallery.id,
        token: gallery.accessToken,
      },
      { expiresIn: GALLERY_ACCESS_EXPIRES_IN },
    );
    return {
      id: gallery.id,
      title: gallery.title,
      clientName: gallery.clientName,
      description: gallery.description,
      requiresPassword: false,
      accessJwt,
      usageToken,
      media: this.sortMedia(gallery.media).map((item) => ({
        id: item.id,
        type: item.type,
        fileUrl: item.fileUrl,
        originalFilename: item.originalFilename,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
      })),
    };
  }

  private sortMedia(media: MediaItem[] | undefined): MediaItem[] {
    return (media ?? [])
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime(),
      );
  }

  private absolutePathFor(fileUrl: string): string {
    // fileUrl est de la forme "/uploads/galleries/xxxx.jpg".
    if (!fileUrl.startsWith('/uploads/')) {
      throw new BadRequestException('Chemin de fichier invalide');
    }
    return join(process.cwd(), fileUrl);
  }

  private async cleanupUploadedFiles(
    files: Express.Multer.File[],
  ): Promise<void> {
    await Promise.all(
      files.map((file) =>
        this.deleteFileQuietly(`/uploads/galleries/${file.filename}`),
      ),
    );
  }

  private async deleteFileQuietly(fileUrl: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePathFor(fileUrl));
    } catch {
      // Fichier déjà absent du disque : pas bloquant, on ne fait que nettoyer au mieux.
    }
  }
}
