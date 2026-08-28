import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : section "Accueil" du panneau admin des réglages du
// site. Chaque section a désormais sa propre table (voir docs/ANALYSE-PLAN-BACKEND.md,
// mise à jour du 26/08 sur la refonte du panneau admin) plutôt qu'une seule table
// `site_settings` fourre-tout — un formulaire admin distinct par table.
//
// Ne contient plus que le titre d'accroche depuis la mise à jour du 27/08 : le
// sous-titre unique et l'image unique d'origine sont remplacés par plusieurs images
// de carousel, chacune avec son propre sous-titre optionnel (voir HeroSlide,
// hero-slide.entity.ts) — seul le titre reste fixe et commun à toutes les images.
@Entity('hero_settings')
export class HeroSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  // Pas de valeur par défaut au niveau SQL (les apostrophes du texte français posent
  // problème à l'échappement du DEFAULT MySQL) : le texte de départ est fourni par
  // l'application au premier accès, voir settings.service.ts.
  @Column({ type: 'varchar', name: 'hero_title', length: 255, nullable: true })
  heroTitle: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
