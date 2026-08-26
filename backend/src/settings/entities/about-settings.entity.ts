import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : section "À propos" du panneau admin des réglages du
// site — voir hero-settings.entity.ts pour le contexte de la répartition en
// plusieurs tables.
@Entity('about_settings')
export class AboutSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ name: 'about_text', type: 'text', nullable: true })
  aboutText: string | null;

  @Column({
    type: 'varchar',
    name: 'about_image_url',
    length: 500,
    nullable: true,
  })
  aboutImageUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
