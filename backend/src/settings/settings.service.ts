import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettings } from './entities/site-settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const SETTINGS_ID = 1;

// Texte de départ, utilisé une seule fois si personne n'a encore rien saisi dans le
// panneau admin. Modifiable ensuite via PUT /settings — jamais recodé en dur ailleurs.
const DEFAULT_HERO_TITLE = "Capturer l'instant, créer l'éternel";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSettings)
    private readonly repo: Repository<SiteSettings>,
  ) {}

  // Crée la ligne unique de réglages avec des valeurs par défaut si elle n'existe pas encore.
  async get(): Promise<SiteSettings> {
    let settings = await this.repo.findOne({ where: { id: SETTINGS_ID } });
    if (!settings) {
      settings = await this.repo.save(
        this.repo.create({ id: SETTINGS_ID, heroTitle: DEFAULT_HERO_TITLE }),
      );
    }
    return settings;
  }

  async update(dto: UpdateSettingsDto): Promise<SiteSettings> {
    const current = await this.get();
    const updated = this.repo.merge(current, dto);
    return this.repo.save(updated);
  }
}
