import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateHeroSettingsDto } from './dto/update-hero-settings.dto';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';
import { UpdateAboutSettingsDto } from './dto/update-about-settings.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { UpdateLegalSettingsDto } from './dto/update-legal-settings.dto';

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

  // Carousel d'accueil (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08) : plusieurs
  // images activables indépendamment, chacune avec son propre sous-titre optionnel.
  // Imbriquées sous /settings/hero comme les tarifs sous /specialties/:id (voir
  // specialties.controller.ts) — même principe de sous-ressource avec CRUD complet.
  // Lecture réservée au panneau admin (liste complète, actives ou non) ; le site
  // vitrine récupère les images actives via l'agrégat public GET /settings.

  @UseGuards(JwtAuthGuard)
  @Get('hero/slides')
  listHeroSlides() {
    return this.settingsService.listHeroSlides();
  }

  @UseGuards(JwtAuthGuard)
  @Post('hero/slides')
  addHeroSlide(@Body() dto: CreateHeroSlideDto) {
    return this.settingsService.addHeroSlide(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('hero/slides/:id')
  updateHeroSlide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateHeroSlideDto,
  ) {
    return this.settingsService.updateHeroSlide(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('hero/slides/:id')
  removeHeroSlide(@Param('id', ParseIntPipe) id: number) {
    return this.settingsService.removeHeroSlide(id);
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

  @UseGuards(JwtAuthGuard)
  @Get('general')
  getGeneral() {
    return this.settingsService.getGeneral();
  }

  @UseGuards(JwtAuthGuard)
  @Put('general')
  updateGeneral(@Body() dto: UpdateGeneralSettingsDto) {
    return this.settingsService.updateGeneral(dto);
  }

  // Section "Pages légales" : la lecture (GET) est publique — contrairement aux
  // autres sections — puisqu'elle est aussi utilisée directement par les 3 pages
  // légales du site vitrine (voir LegalPage.tsx), pas seulement par le formulaire du
  // panneau admin. La modification (PUT) reste protégée comme les autres sections.
  @Get('legal')
  getLegal() {
    return this.settingsService.getLegal();
  }

  @UseGuards(JwtAuthGuard)
  @Put('legal')
  updateLegal(@Body() dto: UpdateLegalSettingsDto) {
    return this.settingsService.updateLegal(dto);
  }
}
