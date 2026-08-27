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

  // Plusieurs numéros/emails possibles (ex. ligne fixe du studio + mobile) — voir
  // docs/ANALYSE-PLAN-BACKEND.md, mise à jour du 27/08. `simple-json` (portable entre
  // moteurs SQL, sérialisé/désérialisé automatiquement par TypeORM) plutôt qu'une
  // table séparée : une simple liste de chaînes, sans besoin d'id/ordre/CRUD propre à
  // chaque entrée.
  @Column({ type: 'simple-json', name: 'phones', nullable: true })
  phones: string[] | null;

  @Column({ type: 'simple-json', name: 'emails', nullable: true })
  emails: string[] | null;

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
