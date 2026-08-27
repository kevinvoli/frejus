import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Specialty } from './entities/specialty.entity';
import { SpecialtyPhoto } from './entities/specialty-photo.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly repo: Repository<Specialty>,
    @InjectRepository(SpecialtyPhoto)
    private readonly photoRepo: Repository<SpecialtyPhoto>,
    private readonly storageService: StorageService,
  ) {}

  // Le catalogue de photos est renvoyé trié pour le site vitrine (lightbox au clic
  // sur la carte) comme pour le panneau admin — voir docs/ANALYSE-PLAN-BACKEND.md,
  // ajout du 26/08.
  async findAll(): Promise<Specialty[]> {
    const specialties = await this.repo.find({
      order: { order: 'ASC', id: 'ASC' },
      relations: { photos: true },
    });
    for (const specialty of specialties) {
      specialty.photos = this.sortPhotos(specialty.photos);
    }
    return specialties;
  }

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.repo.findOne({
      where: { id },
      relations: { photos: true },
    });
    if (!specialty) {
      throw new NotFoundException(`Spécialité ${id} introuvable`);
    }
    specialty.photos = this.sortPhotos(specialty.photos);
    return specialty;
  }

  create(dto: CreateSpecialtyDto): Promise<Specialty> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateSpecialtyDto): Promise<Specialty> {
    const specialty = await this.findOne(id);
    return this.repo.save(this.repo.merge(specialty, dto));
  }

  async remove(id: number): Promise<void> {
    const specialty = await this.findOne(id);
    // Supprime aussi les fichiers du catalogue sur le disque — l'image de premier
    // plan (imageUrl) n'est volontairement pas supprimée ici : comme pour le
    // portfolio et les réglages du site, un fichier d'image uploadé via /upload
    // n'est jamais nettoyé automatiquement (voir upload.controller.ts).
    await Promise.all(
      specialty.photos.map((photo) => this.deleteFileQuietly(photo.fileUrl)),
    );
    await this.repo.remove(specialty);
  }

  // --- Catalogue de photos ---

  async addPhotos(
    specialtyId: number,
    files: Express.Multer.File[],
  ): Promise<Specialty> {
    await this.findOne(specialtyId); // 404 si la spécialité n'existe pas

    // multer a déjà écrit les fichiers sur le disque à ce stade : si le quota du
    // projet est dépassé, on les supprime avant de laisser l'exception remonter,
    // pour ne jamais laisser de fichier orphelin sur le disque (voir galleries.service.ts,
    // addMedia(), pour le même motif).
    const additionalBytes = files.reduce((sum, file) => sum + file.size, 0);
    try {
      await this.storageService.assertWithinMediaQuota(additionalBytes);
    } catch (err) {
      await Promise.all(
        files.map((file) =>
          this.deleteFileQuietly(`/uploads/specialties/${file.filename}`),
        ),
      );
      throw err;
    }

    const items = files.map((file) =>
      this.photoRepo.create({
        specialtyId,
        fileUrl: `/uploads/specialties/${file.filename}`,
        sizeBytes: file.size,
      }),
    );
    await this.photoRepo.save(items);
    return this.findOne(specialtyId);
  }

  async removePhoto(specialtyId: number, photoId: number): Promise<void> {
    const photo = await this.photoRepo.findOne({
      where: { id: photoId, specialtyId },
    });
    if (!photo) {
      throw new NotFoundException(
        `Photo ${photoId} introuvable dans cette spécialité`,
      );
    }
    await this.deleteFileQuietly(photo.fileUrl);
    await this.photoRepo.remove(photo);
  }

  private sortPhotos(photos: SpecialtyPhoto[] | undefined): SpecialtyPhoto[] {
    return (photos ?? [])
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime(),
      );
  }

  private absolutePathFor(fileUrl: string): string {
    if (!fileUrl.startsWith('/uploads/')) {
      throw new BadRequestException('Chemin de fichier invalide');
    }
    return join(process.cwd(), fileUrl);
  }

  private async deleteFileQuietly(fileUrl: string): Promise<void> {
    try {
      await fs.unlink(this.absolutePathFor(fileUrl));
    } catch {
      // Fichier déjà absent du disque : pas bloquant, on ne fait que nettoyer au mieux.
    }
  }
}
