import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) regroupant tout le contenu éditable du site vitrine
// qui n'a pas sa propre table : accroche, texte "à propos", coordonnées du studio,
// réseaux sociaux. Permet au photographe de tout modifier depuis le panneau admin
// sans jamais toucher au code (cf. besoin exprimé par le client).
@Entity('site_settings')
export class SiteSettings {
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

  @Column({ name: 'about_text', type: 'text', nullable: true })
  aboutText: string | null;

  @Column({
    type: 'varchar',
    name: 'about_image_url',
    length: 500,
    nullable: true,
  })
  aboutImageUrl: string | null;

  @Column({ type: 'varchar', name: 'studio_name', length: 255, nullable: true })
  studioName: string | null;

  @Column({ type: 'varchar', name: 'address', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', name: 'city', length: 255, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', name: 'phone', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', name: 'email', length: 255, nullable: true })
  email: string | null;

  @Column({
    type: 'varchar',
    name: 'opening_hours',
    length: 500,
    nullable: true,
  })
  openingHours: string | null;

  @Column({
    type: 'varchar',
    name: 'instagram_url',
    length: 500,
    nullable: true,
  })
  instagramUrl: string | null;

  @Column({
    type: 'varchar',
    name: 'facebook_url',
    length: 500,
    nullable: true,
  })
  facebookUrl: string | null;

  @Column({
    type: 'varchar',
    name: 'pinterest_url',
    length: 500,
    nullable: true,
  })
  pinterestUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
