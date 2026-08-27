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
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import archiver from 'archiver';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GalleriesService } from './galleries.service';
import { CreateGalleryDto } from './dto/create-gallery.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { VerifyGalleryPasswordDto } from './dto/verify-gallery-password.dto';


const GALLERIES_UPLOAD_DIR = './uploads/galleries';

// Médiathèque : seuls des photos et vidéos peuvent être livrées à un client, jamais
// un autre type de fichier (voir décision produit, docs/ANALYSE-PLAN-BACKEND.md).
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
// Limite unique (et non 8 Mo comme pour les images du site vitrine) : les livrables
// client sont souvent des photos pleine résolution, et une vidéo peut légitimement
// dépasser quelques Mo — voir la décision du client (200 Mo max par fichier).
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 100;

@Controller('galleries')
export class GalleriesController {
  constructor(private readonly service: GalleriesService) {}

  // --- Accès public (lien partagé au client) : routes littérales déclarées AVANT
  // les routes admin paramétrées (:id) pour éviter tout conflit de matching. ---

  @Get('access/:token')
  getPublicAccess(
    @Param('token') token: string,
    @Query('usage') usageReceipt?: string,
  ) {
    return this.service.getPublicAccess(token, usageReceipt);
  }

  @Post('access/:token/verify')
  verifyPassword(
    @Param('token') token: string,
    @Body() dto: VerifyGalleryPasswordDto,
  ) {
    return this.service.verifyPassword(token, dto.password, dto.usage);
  }

  @Get('access/:token/media/:mediaId/download')
  async downloadMedia(
    @Param('token') token: string,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Query('access') accessJwt: string | undefined,
    @Res() res: Response,
  ) {
    const gallery = await this.service.assertDownloadAccess(token, accessJwt);
    const { absolutePath, item } = await this.service.getMediaFileForDownload(
      gallery,
      mediaId,
    );
    res.download(absolutePath, item.originalFilename);
  }

  @Get('access/:token/download-all')
  async downloadAll(
    @Param('token') token: string,
    @Query('access') accessJwt: string | undefined,
    @Res() res: Response,
  ) {
    const gallery = await this.service.assertDownloadAccess(token, accessJwt);
    if (gallery.media.length === 0) {
      throw new BadRequestException('Cette galerie ne contient aucun média');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${gallery.title.replace(/[^a-z0-9-_]+/gi, '_')}.zip"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });
    archive.pipe(res);
    for (const item of gallery.media) {
      const { absolutePath } = await this.service.getMediaFileForDownload(
        gallery,
        item.id,
      );
      archive.file(absolutePath, { name: item.originalFilename });
    }
    await archive.finalize();
  }

  // --- Administration (protégée par l'authentification admin JWT) ---

  @UseGuards(JwtAuthGuard)
  @Get()
  findAllForAdmin() {
    return this.service.findAllForAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOneForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOneForAdmin(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateGalleryDto) {
    return this.service.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGalleryDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/media')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_PER_UPLOAD, {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          // Créé au premier upload si besoin (volume Docker monté vide en prod).
          mkdirSync(GALLERIES_UPLOAD_DIR, { recursive: true });
          callback(null, GALLERIES_UPLOAD_DIR);
        },
        filename: (_req, file, callback) => {
          callback(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Type de fichier non autorisé (${file.mimetype}) : seuls les photos et vidéos sont acceptées`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  addMedia(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    return this.service.addMedia(id, files);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
  ) {
    return this.service.removeMedia(id, mediaId);
  }
}
