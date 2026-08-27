import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assertUploadAllowed, UPLOADS_DIR } from '../common/disk-usage';
import { StorageService } from '../storage/storage.service';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 Mo

// Upload d'images depuis le panneau admin (photo du portfolio, image "à propos", etc.).
// MVP : stockage sur le disque local du conteneur/VPS (volume Docker persistant).
// A remplacer par un stockage objet (S3-compatible) si le volume de photos grossit
// beaucoup ou si l'app doit tourner sur plusieurs instances (voir docs/ANALYSE-PLAN-BACKEND.md).
@Controller('upload')
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, uniqueName);
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
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    // multer a déjà écrit le fichier sur le disque à ce stade : si le quota du projet
    // est dépassé, on le supprime avant de laisser l'exception remonter (voir
    // galleries.service.ts, addMedia(), pour le même motif).
    try {
      await this.storageService.assertWithinMediaQuota(file.size);
    } catch (err) {
      try {
        await fs.unlink(join(UPLOADS_DIR, file.filename));
      } catch {
        // Fichier déjà absent du disque : pas bloquant, on ne fait que nettoyer au mieux.
      }
      throw err;
    }
    return { url: `/uploads/${file.filename}` };
  }
}
