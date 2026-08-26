import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : section "Accueil" du panneau admin des réglages du
// site. Chaque section a désormais sa propre table (voir docs/ANALYSE-PLAN-BACKEND.md,
// mise à jour du 26/08 sur la refonte du panneau admin) plutôt qu'une seule table
// `site_settings` fourre-tout — un formulaire admin distinct par table.
@Entity('hero_settings')
export class HeroSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  // Pas de valeur par défaut au niveau SQL (les apostrophes du texte français posent
  // problème à l'échappement du DEFAULT MySQL) : le texte de départ est fourni par
  // l'application au premier accès, voir settings.service.ts.
  @Column({ type: 'varchar', name: 'hero_title', length: 255, nullable: true })
  heroTitle: string | null;

  @Column({ name: 'hero_subtitle', type: 'text', nullable: true })
  heroSubtitle: string | null;

  @Column({
    type: 'varchar',
    name: 'hero_image_url',
    length: 500,
    nullable: true,
  })
  heroImageUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
