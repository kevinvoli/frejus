import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Autorise le frontend (site vitrine React) à appeler l'API depuis une autre origine.
  const corsOrigin = config.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
  });

  // Validation automatique des DTO (class-validator) sur toutes les routes.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Sert les images uploadées (portfolio, spécialités, etc.) en statique sous /uploads.
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3000);
  const server = await app.listen(port);

  // Le délai par défaut de Node (5 minutes) peut être trop court pour l'upload d'une
  // vidéo jusqu'à 2 Go sur une connexion lente (voir galleries.controller.ts, demande
  // client du 29/08) : on l'augmente pour ne pas couper la requête en cours de route.
  server.requestTimeout = 30 * 60 * 1000; // 30 min

  console.log(`frejus-backend démarré sur http://localhost:${port}/api`);
}
void bootstrap();
