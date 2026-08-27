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
import { SpecialtyTariff } from './entities/specialty-tariff.entity';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { CreateSpecialtyTariffDto } from './dto/create-specialty-tariff.dto';
import { UpdateSpecialtyTariffDto } from './dto/update-specialty-tariff.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class SpecialtiesService {
  constructor(
    @InjectRepository(Specialty)
    private readonly repo: Repository<Specialty>,
    @InjectRepository(SpecialtyPhoto)
    private readonly photoRepo: Repository<SpecialtyPhoto>,
    @InjectRepository(SpecialtyTariff)
    private readonly tariffRepo: Repository<SpecialtyTariff>,
    private readonly storageService: StorageService,
  ) {}

  // Le catalogue de photos et la grille tarifaire sont renvoyés triés pour le site
  // vitrine (page dédiée de la spécialité) comme pour le panneau admin — voir
  // docs/ANALYSE-PLAN-BACKEND.md, ajouts du 26/08 et du 27/08.
  async findAll(): Promise<Specialty[]> {
    const specialties = await this.repo.find({
      order: { order: 'ASC', id: 'ASC' },
      relations: { photos: true, tariffs: true },
    });
    for (const specialty of specialties) {
      specialty.photos = this.sortPhotos(specialty.photos);
      specialty.tariffs = this.sortTariffs(specialty.tariffs);
    }
    return specialties;
  }

  async findOne(id: number): Promise<Specialty> {
    const specialty = await this.repo.findOne({
      where: { id },
      relations: { photos: true, tariffs: true },
    });
    if (!specialty) {
      throw new NotFoundException(`Spécialité ${id} introuvable`);
    }
    specialty.photos = this.sortPhotos(specialty.photos);
    specialty.tariffs = this.sortTariffs(specialty.tariffs);
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

  // --- Grille tarifaire (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08) ---
  // Pas de fichier associé à une ligne tarifaire : contrairement au catalogue de
  // photos, ni le quota de stockage ni la suppression de fichier ne sont concernés
  // ici — seulement des lignes en base, supprimées en cascade avec la spécialité
  // (ON DELETE CASCADE sur specialty_tariffs, voir specialty-tariff.entity.ts).

  async addTariff(
    specialtyId: number,
    dto: CreateSpecialtyTariffDto,
  ): Promise<Specialty> {
    await this.findOne(specialtyId); // 404 si la spécialité n'existe pas
    await this.tariffRepo.save(this.tariffRepo.create({ ...dto, specialtyId }));
    return this.findOne(specialtyId);
  }

  async updateTariff(
    specialtyId: number,
    tariffId: number,
    dto: UpdateSpecialtyTariffDto,
  ): Promise<Specialty> {
    const tariff = await this.findOneTariff(specialtyId, tariffId);
    await this.tariffRepo.save(this.tariffRepo.merge(tariff, dto));
    return this.findOne(specialtyId);
  }

  async removeTariff(specialtyId: number, tariffId: number): Promise<void> {
    const tariff = await this.findOneTariff(specialtyId, tariffId);
    await this.tariffRepo.remove(tariff);
  }

  private async findOneTariff(
    specialtyId: number,
    tariffId: number,
  ): Promise<SpecialtyTariff> {
    const tariff = await this.tariffRepo.findOne({
      where: { id: tariffId, specialtyId },
    });
    if (!tariff) {
      throw new NotFoundException(
        `Tarif ${tariffId} introuvable dans cette spécialité`,
      );
    }
    return tariff;
  }

  private sortTariffs(
    tariffs: SpecialtyTariff[] | undefined,
  ): SpecialtyTariff[] {
    return (tariffs ?? [])
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime(),
      );
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
