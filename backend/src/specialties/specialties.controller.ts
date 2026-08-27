import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertUploadAllowed } from '../common/disk-usage';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { CreateSpecialtyTariffDto } from './dto/create-specialty-tariff.dto';
import { UpdateSpecialtyTariffDto } from './dto/update-specialty-tariff.dto';

const PHOTOS_UPLOAD_DIR = './uploads/specialties';

// Mêmes contraintes que l'upload d'images générique (voir upload.controller.ts) :
// le catalogue d'une spécialité n'accueille que des photos, pas de vidéos.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 Mo
const MAX_FILES_PER_UPLOAD = 30;

@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly service: SpecialtiesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSpecialtyDto,
  ) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  // --- Catalogue de photos (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 26/08) ---

  @UseGuards(JwtAuthGuard)
  @Post(':id/photos')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          // Créé au premier upload si besoin (volume Docker monté vide en prod).
          mkdirSync(PHOTOS_UPLOAD_DIR, { recursive: true });
          callback(null, PHOTOS_UPLOAD_DIR);
        },
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        try {
          assertUploadAllowed();
        } catch (err) {
          callback(err as Error, false);
          return;
        }
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException("Format d'image non supporté"),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  addPhotos(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    return this.service.addPhotos(id, files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/photos/:photoId')
  removePhoto(
    @Param('id', ParseIntPipe) id: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    return this.service.removePhoto(id, photoId);
  }

  // --- Grille tarifaire (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08) : les
  // sous-services facturables d'une spécialité (ex. "Shooting individuel" à 15 000 F,
  // "1 personne, 4 photos"). Lecture publique via findOne ci-dessus (renvoyée dans
  // `tariffs`) ; écriture réservée au panneau admin, comme le reste de cette ressource.

  @UseGuards(JwtAuthGuard)
  @Post(':id/tariffs')
  addTariff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSpecialtyTariffDto,
  ) {
    return this.service.addTariff(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/tariffs/:tariffId')
  updateTariff(
    @Param('id', ParseIntPipe) id: number,
    @Param('tariffId', ParseIntPipe) tariffId: number,
    @Body() dto: UpdateSpecialtyTariffDto,
  ) {
    return this.service.updateTariff(id, tariffId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/tariffs/:tariffId')
  removeTariff(
    @Param('id', ParseIntPipe) id: number,
    @Param('tariffId', ParseIntPipe) tariffId: number,
  ) {
    return this.service.removeTariff(id, tariffId);
  }
}
