import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { SpecialtiesModule } from './specialties/specialties.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { ContactModule } from './contact/contact.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'frejus'),
        password: config.get<string>('DB_PASSWORD', 'frejus'),
        database: config.get<string>('DB_DATABASE', 'frejus'),
        autoLoadEntities: true,
        // MVP : synchronize crée/adapte les tables automatiquement depuis les entités.
        // A désactiver au profit de vraies migrations TypeORM avant une mise en production sérieuse
        // (voir docs/ANALYSE-PLAN-BACKEND.md, section "Points d'attention").
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    SettingsModule,
    SpecialtiesModule,
    PortfolioModule,
    TestimonialsModule,
    ContactModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
