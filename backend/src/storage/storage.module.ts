import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientGallery } from '../galleries/entities/client-gallery.entity';
import { MediaItem } from '../galleries/entities/media-item.entity';
import { SpecialtyPhoto } from '../specialties/entities/specialty-photo.entity';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientGallery, MediaItem, SpecialtyPhoto]),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  // Exporté pour être injecté dans GalleriesModule/SpecialtiesModule/UploadModule,
  // qui vérifient chacun le quota du projet avant d'accepter un nouvel envoi (voir
  // assertWithinMediaQuota ci-dessus).
  exports: [StorageService],
})
export class StorageModule {}
