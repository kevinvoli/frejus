import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateHeroSettingsDto } from './dto/update-hero-settings.dto';
import { UpdateAboutSettingsDto } from './dto/update-about-settings.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Public : consommé par le site vitrine (Hero, About, Footer, Contact) en un seul
  // appel — agrège les 4 sections, voir settings.service.ts.
  @Get()
  get() {
    return this.settingsService.get();
  }

  // Panneau admin : un GET + un PUT par section, chacun protégé indépendamment et ne
  // touchant qu'à sa propre table (voir docs/ANALYSE-PLAN-BACKEND.md, refonte du
  // panneau admin du 26/08 — un formulaire par section, jusque dans la base).

  @UseGuards(JwtAuthGuard)
  @Get('hero')
  getHero() {
    return this.settingsService.getHero();
  }

  @UseGuards(JwtAuthGuard)
  @Put('hero')
  updateHero(@Body() dto: UpdateHeroSettingsDto) {
    return this.settingsService.updateHero(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('about')
  getAbout() {
    return this.settingsService.getAbout();
  }

  @UseGuards(JwtAuthGuard)
  @Put('about')
  updateAbout(@Body() dto: UpdateAboutSettingsDto) {
    return this.settingsService.updateAbout(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('contact')
  getContact() {
    return this.settingsService.getContact();
  }

  @UseGuards(JwtAuthGuard)
  @Put('contact')
  updateContact(@Body() dto: UpdateContactSettingsDto) {
    return this.settingsService.updateContact(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('social')
  getSocial() {
    return this.settingsService.getSocial();
  }

  @UseGuards(JwtAuthGuard)
  @Put('social')
  updateSocial(@Body() dto: UpdateSocialSettingsDto) {
    return this.settingsService.updateSocial(dto);
  }
}
