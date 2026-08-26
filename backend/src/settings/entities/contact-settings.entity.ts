import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : section "Studio et contact" du panneau admin des
// réglages du site — voir hero-settings.entity.ts pour le contexte de la
// répartition en plusieurs tables.
@Entity('contact_settings')
export class ContactSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
