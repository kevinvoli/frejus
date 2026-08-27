import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Specialty } from './entities/specialty.entity';
import { SpecialtyPhoto } from './entities/specialty-photo.entity';
import { SpecialtiesController } from './specialties.controller';
import { SpecialtiesService } from './specialties.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Specialty, SpecialtyPhoto]),
    // Pour vérifier le quota de stockage du projet avant d'accepter un nouvel
    // upload (voir specialties.service.ts, addPhotos()).
    StorageModule,
  ],
  controllers: [SpecialtiesController],
  providers: [SpecialtiesService],
})
export class SpecialtiesModule {}
