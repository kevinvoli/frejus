import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  // Pour vérifier le quota de stockage du projet avant d'accepter un nouvel upload
  // (voir upload.controller.ts).
  imports: [StorageModule],
  controllers: [UploadController],
})
export class UploadModule {}
