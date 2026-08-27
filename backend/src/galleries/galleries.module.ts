import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientGallery } from './entities/client-gallery.entity';
import { MediaItem } from './entities/media-item.entity';
import { GalleriesController } from './galleries.controller';
import { GalleriesService } from './galleries.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClientGallery, MediaItem]),
    // Pour vérifier le quota de stockage du projet avant d'accepter un nouvel
    // upload (voir galleries.service.ts, addMedia()).
    StorageModule,
    // Instance JwtModule dédiée (plutôt que de dépendre d'AuthModule) pour garder ce
    // module indépendant, comme le reste du projet : elle signe/vérifie les jetons de
    // téléchargement à courte durée (voir galleries.service.ts), pas les sessions admin.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-.env'),
      }),
    }),
  ],
  controllers: [GalleriesController],
  providers: [GalleriesService],
})
export class GalleriesModule {}
