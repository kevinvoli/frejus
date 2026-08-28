import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Une image du carousel d'accueil — demande client du 27/08 (voir
// docs/ANALYSE-PLAN-BACKEND.md) : plusieurs images possibles pour la section
// d'accueil, chacune activable indépendamment (`active`), avec son propre sous-titre
// optionnel qui défile avec elle. Le titre d'accroche, lui, reste unique et fixe (voir
// `HeroSettings.heroTitle`) — il ne fait pas partie de cette table. Table indépendante
// plutôt que rattachée à `HeroSettings` par clé étrangère : `HeroSettings` reste une
// ligne singleton (id fixe = 1, voir hero-settings.entity.ts), alors que ceci est une
// vraie liste avec CRUD complet, comme `PortfolioItem`/`Testimonial`.
@Entity('hero_slides')
export class HeroSlide {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', name: 'image_url', length: 500 })
  imageUrl: string;

  // Optionnel : une image du carousel peut n'avoir aucun sous-titre.
  @Column({ type: 'text', name: 'subtitle', nullable: true })
  subtitle: string | null;

  // Seules les images actives apparaissent dans le carousel du site vitrine (voir
  // `SettingsService.get()`) — une image désactivée reste éditable dans le panneau
  // admin sans être publiée immédiatement.
  @Column({ default: true })
  active: boolean;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
