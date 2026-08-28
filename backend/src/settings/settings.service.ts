import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsWhere,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { HeroSettings } from './entities/hero-settings.entity';
import { HeroSlide } from './entities/hero-slide.entity';
import { AboutSettings } from './entities/about-settings.entity';
import { ContactSettings } from './entities/contact-settings.entity';
import { SocialSettings } from './entities/social-settings.entity';
import { GeneralSettings } from './entities/general-settings.entity';
import { LegalSettings } from './entities/legal-settings.entity';
import { UpdateHeroSettingsDto } from './dto/update-hero-settings.dto';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';
import { UpdateAboutSettingsDto } from './dto/update-about-settings.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';
import { UpdateGeneralSettingsDto } from './dto/update-general-settings.dto';
import { UpdateLegalSettingsDto } from './dto/update-legal-settings.dto';

const SETTINGS_ID = 1;

// Texte de départ, utilisé une seule fois si personne n'a encore rien saisi dans le
// panneau admin. Modifiable ensuite via PUT /settings/hero — jamais recodé en dur
// ailleurs.
const DEFAULT_HERO_TITLE = "Capturer l'instant, créer l'éternel";

// Le contenu éditable du site vitrine (accroche, à propos, coordonnées, réseaux) est
// réparti en 4 tables — une par section du panneau admin — plutôt qu'une seule table
// `site_settings` fourre-tout (voir docs/ANALYSE-PLAN-BACKEND.md, mise à jour du
// 26/08 sur la refonte du panneau admin : un formulaire indépendant par section,
// jusque dans la base de données). Le site vitrine, lui, continue de tout récupérer
// en un seul appel (`GET /settings`, voir get() ci-dessous) pour ne pas multiplier
// les requêtes publiques ni toucher aux composants du site vitrine.
@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(HeroSettings)
    private readonly heroRepo: Repository<HeroSettings>,
    @InjectRepository(HeroSlide)
    private readonly heroSlideRepo: Repository<HeroSlide>,
    @InjectRepository(AboutSettings)
    private readonly aboutRepo: Repository<AboutSettings>,
    @InjectRepository(ContactSettings)
    private readonly contactRepo: Repository<ContactSettings>,
    @InjectRepository(SocialSettings)
    private readonly socialRepo: Repository<SocialSettings>,
    @InjectRepository(GeneralSettings)
    private readonly generalRepo: Repository<GeneralSettings>,
    @InjectRepository(LegalSettings)
    private readonly legalRepo: Repository<LegalSettings>,
  ) {}

  // Crée la ligne unique (id fixe) d'une section si elle n'existe pas encore, sans
  // planter si deux requêtes arrivent en même temps sur ce tout premier chargement —
  // ce qui arrive facilement en pratique : le panneau admin charge désormais les 4
  // sections en parallèle (voir useSectionSettingsForm.ts côté admin), et React
  // StrictMode double chaque appel d'effet en développement. Sans cette protection,
  // la deuxième requête à écrire échoue sur la contrainte de clé primaire (vu en
  // conditions réelles : "Duplicate entry '1' for key 'PRIMARY'") au lieu de
  // simplement relire la ligne que la première vient de créer.
  private async getOrCreateSingleton<T extends { id: number }>(
    repo: Repository<T>,
    defaults: DeepPartial<T>,
  ): Promise<T> {
    const where = { id: SETTINGS_ID } as FindOptionsWhere<T>;
    const existing = await repo.findOne({ where });
    if (existing) return existing;
    try {
      return await repo.save(
        repo.create({ id: SETTINGS_ID, ...defaults } as DeepPartial<T>),
      );
    } catch (err) {
      const isDuplicateKey =
        err instanceof QueryFailedError &&
        (err as unknown as { code?: string }).code === 'ER_DUP_ENTRY';
      if (isDuplicateKey) {
        const winner = await repo.findOne({ where });
        if (winner) return winner;
      }
      throw err;
    }
  }

  // --- Section "Accueil" ---

  async getHero(): Promise<HeroSettings> {
    return this.getOrCreateSingleton(this.heroRepo, {
      heroTitle: DEFAULT_HERO_TITLE,
    });
  }

  async updateHero(dto: UpdateHeroSettingsDto): Promise<HeroSettings> {
    const current = await this.getHero();
    return this.heroRepo.save(this.heroRepo.merge(current, dto));
  }

  // --- Carousel d'accueil (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08) : liste
  // de `HeroSlide`, pas de fichier à nettoyer à la suppression (même logique que pour
  // les images uniques des autres sections — heroImageUrl d'origine, aboutImageUrl,
  // favicon, logo — jamais nettoyées automatiquement, voir upload.controller.ts).

  // Toutes les images (actives ou non) : utilisé par le panneau admin pour la gestion
  // complète du carousel.
  async listHeroSlides(): Promise<HeroSlide[]> {
    return this.sortHeroSlides(await this.heroSlideRepo.find());
  }

  async addHeroSlide(dto: CreateHeroSlideDto): Promise<HeroSlide[]> {
    await this.heroSlideRepo.save(this.heroSlideRepo.create(dto));
    return this.listHeroSlides();
  }

  async updateHeroSlide(
    id: number,
    dto: UpdateHeroSlideDto,
  ): Promise<HeroSlide[]> {
    const slide = await this.findOneHeroSlide(id);
    await this.heroSlideRepo.save(this.heroSlideRepo.merge(slide, dto));
    return this.listHeroSlides();
  }

  async removeHeroSlide(id: number): Promise<void> {
    const slide = await this.findOneHeroSlide(id);
    await this.heroSlideRepo.remove(slide);
  }

  private async findOneHeroSlide(id: number): Promise<HeroSlide> {
    const slide = await this.heroSlideRepo.findOne({ where: { id } });
    if (!slide) {
      throw new NotFoundException(`Image d'accueil ${id} introuvable`);
    }
    return slide;
  }

  private sortHeroSlides(slides: HeroSlide[]): HeroSlide[] {
    return slides
      .slice()
      .sort(
        (a, b) =>
          a.order - b.order || a.createdAt.getTime() - b.createdAt.getTime(),
      );
  }

  // --- Section "À propos" ---

  async getAbout(): Promise<AboutSettings> {
    return this.getOrCreateSingleton(this.aboutRepo, {});
  }

  async updateAbout(dto: UpdateAboutSettingsDto): Promise<AboutSettings> {
    const current = await this.getAbout();
    return this.aboutRepo.save(this.aboutRepo.merge(current, dto));
  }

  // --- Section "Studio et contact" ---

  async getContact(): Promise<ContactSettings> {
    return this.getOrCreateSingleton(this.contactRepo, {
      phones: [],
      emails: [],
    });
  }

  async updateContact(dto: UpdateContactSettingsDto): Promise<ContactSettings> {
    const current = await this.getContact();
    return this.contactRepo.save(this.contactRepo.merge(current, dto));
  }

  // --- Section "Réseaux sociaux" ---

  async getSocial(): Promise<SocialSettings> {
    return this.getOrCreateSingleton(this.socialRepo, {});
  }

  async updateSocial(dto: UpdateSocialSettingsDto): Promise<SocialSettings> {
    const current = await this.getSocial();
    return this.socialRepo.save(this.socialRepo.merge(current, dto));
  }

  // --- Section "Général" (favicon, logo) ---

  async getGeneral(): Promise<GeneralSettings> {
    return this.getOrCreateSingleton(this.generalRepo, {});
  }

  async updateGeneral(dto: UpdateGeneralSettingsDto): Promise<GeneralSettings> {
    const current = await this.getGeneral();
    return this.generalRepo.save(this.generalRepo.merge(current, dto));
  }

  // --- Section "Pages légales" ---

  // Publique (voir settings.controller.ts) : consommée à la fois par le formulaire
  // admin et par les 3 pages légales du site vitrine (voir LegalPage.tsx) — seule la
  // modification (PUT) est protégée.
  async getLegal(): Promise<LegalSettings> {
    return this.getOrCreateSingleton(this.legalRepo, {});
  }

  async updateLegal(dto: UpdateLegalSettingsDto): Promise<LegalSettings> {
    const current = await this.getLegal();
    return this.legalRepo.save(this.legalRepo.merge(current, dto));
  }

  // --- Agrégat public (site vitrine) ---

  // Fusionne les 4 sections dans la même forme plate qu'avant la refonte du panneau
  // admin : le site vitrine (Hero, About, Contact, Footer) n'a pas besoin de savoir
  // que ce contenu vient maintenant de 4 tables séparées, et continue de faire un
  // seul GET /settings comme avant.
  async get(): Promise<{
    heroTitle: string | null;
    heroSlides: { id: number; imageUrl: string; subtitle: string | null }[];
    aboutText: string | null;
    aboutImageUrl: string | null;
    studioName: string | null;
    address: string | null;
    city: string | null;
    phones: string[];
    emails: string[];
    openingHours: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    pinterestUrl: string | null;
    faviconUrl: string | null;
    logoUrl: string | null;
  }> {
    const [hero, heroSlides, about, contact, social, general] =
      await Promise.all([
        this.getHero(),
        this.listHeroSlides(),
        this.getAbout(),
        this.getContact(),
        this.getSocial(),
        this.getGeneral(),
      ]);
    return {
      heroTitle: hero.heroTitle,
      // Seules les images activées dans le panneau admin apparaissent dans le
      // carousel du site vitrine ; forme publique allégée (ni `active` ni `order`,
      // déjà appliqué par le tri de listHeroSlides()).
      heroSlides: heroSlides
        .filter((slide) => slide.active)
        .map((slide) => ({
          id: slide.id,
          imageUrl: slide.imageUrl,
          subtitle: slide.subtitle,
        })),
      aboutText: about.aboutText,
      aboutImageUrl: about.aboutImageUrl,
      studioName: contact.studioName,
      address: contact.address,
      city: contact.city,
      phones: contact.phones ?? [],
      emails: contact.emails ?? [],
      openingHours: contact.openingHours,
      instagramUrl: social.instagramUrl,
      facebookUrl: social.facebookUrl,
      pinterestUrl: social.pinterestUrl,
      faviconUrl: general.faviconUrl,
      logoUrl: general.logoUrl,
    };
  }
}
