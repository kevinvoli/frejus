import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpecialtyPhoto } from './specialty-photo.entity';
import { SpecialtyTariff } from './specialty-tariff.entity';

@Entity('specialties')
export class Specialty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Image de premier plan affichée sur la carte de la spécialité, sur le site
  // vitrine — indépendante du catalogue de photos ci-dessous (voir
  // specialty-photo.entity.ts) : le visiteur qui clique sur la carte est envoyé vers
  // la page dédiée de la spécialité (galerie façon Pinterest + tarifs, voir
  // docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08).
  @Column({ type: 'varchar', name: 'image_url', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ default: 0 })
  order: number;

  @OneToMany(() => SpecialtyPhoto, (photo) => photo.specialty)
  photos: SpecialtyPhoto[];

  // Grille tarifaire de la spécialité (un "sous-service" par ligne), affichée sur sa
  // page dédiée du site vitrine, gérée depuis le panneau admin (voir
  // specialty-tariff.entity.ts).
  @OneToMany(() => SpecialtyTariff, (tariff) => tariff.specialty)
  tariffs: SpecialtyTariff[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
