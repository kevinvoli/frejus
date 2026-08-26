import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DeepPartial,
  FindOptionsWhere,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { HeroSettings } from './entities/hero-settings.entity';
import { AboutSettings } from './entities/about-settings.entity';
import { ContactSettings } from './entities/contact-settings.entity';
import { SocialSettings } from './entities/social-settings.entity';
import { UpdateHeroSettingsDto } from './dto/update-hero-settings.dto';
import { UpdateAboutSettingsDto } from './dto/update-about-settings.dto';
import { UpdateContactSettingsDto } from './dto/update-contact-settings.dto';
import { UpdateSocialSettingsDto } from './dto/update-social-settings.dto';

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
    @InjectRepository(AboutSettings)
    private readonly aboutRepo: Repository<AboutSettings>,
    @InjectRepository(ContactSettings)
    private readonly contactRepo: Repository<ContactSettings>,
    @InjectRepository(SocialSettings)
    private readonly socialRepo: Repository<SocialSettings>,
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
    return this.getOrCreateSingleton(this.contactRepo, {});
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

  // --- Agrégat public (site vitrine) ---

  // Fusionne les 4 sections dans la même forme plate qu'avant la refonte du panneau
  // admin : le site vitrine (Hero, About, Contact, Footer) n'a pas besoin de savoir
  // que ce contenu vient maintenant de 4 tables séparées, et continue de faire un
  // seul GET /settings comme avant.
  async get(): Promise<{
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    studioName: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    openingHours: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    pinterestUrl: string | null;
  }> {
    const [hero, about, contact, social] = await Promise.all([
      this.getHero(),
      this.getAbout(),
      this.getContact(),
      this.getSocial(),
    ]);
    return {
      heroTitle: hero.heroTitle,
      heroSubtitle: hero.heroSubtitle,
      heroImageUrl: hero.heroImageUrl,
      aboutText: about.aboutText,
      aboutImageUrl: about.aboutImageUrl,
      studioName: contact.studioName,
      address: contact.address,
      city: contact.city,
      phone: contact.phone,
      email: contact.email,
      openingHours: contact.openingHours,
      instagramUrl: social.instagramUrl,
      facebookUrl: social.facebookUrl,
      pinterestUrl: social.pinterestUrl,
    };
  }
}
