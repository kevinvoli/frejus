import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HeroSettings } from './entities/hero-settings.entity';
import { AboutSettings } from './entities/about-settings.entity';
import { ContactSettings } from './entities/contact-settings.entity';
import { SocialSettings } from './entities/social-settings.entity';
import { GeneralSettings } from './entities/general-settings.entity';
import { LegalSettings } from './entities/legal-settings.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HeroSettings,
      AboutSettings,
      ContactSettings,
      SocialSettings,
      GeneralSettings,
      LegalSettings,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
