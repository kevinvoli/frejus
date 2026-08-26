import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeroSettings } from './entities/hero-settings.entity';
import { AboutSettings } from './entities/about-settings.entity';
import { ContactSettings } from './entities/contact-settings.entity';
import { SocialSettings } from './entities/social-settings.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HeroSettings,
      AboutSettings,
      ContactSettings,
      SocialSettings,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
