import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : section "Réseaux sociaux" du panneau admin des
// réglages du site — voir hero-settings.entity.ts pour le contexte de la
// répartition en plusieurs tables.
@Entity('social_settings')
export class SocialSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

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
