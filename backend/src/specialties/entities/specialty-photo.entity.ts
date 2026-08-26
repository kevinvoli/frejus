import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Specialty } from './specialty.entity';

// Une photo du catalogue d'une spécialité (voir docs/ANALYSE-PLAN-BACKEND.md, ajout
// du 26/08 : le photographe peut illustrer chaque spécialité avec plusieurs photos,
// consultables par le visiteur en cliquant sur la carte — indépendant de `imageUrl`
// sur Specialty, qui reste l'image de premier plan affichée sur la carte elle-même.
@Entity('specialty_photos')
export class SpecialtyPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'specialty_id' })
  specialtyId: number;

  @ManyToOne(() => Specialty, (specialty) => specialty.photos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty;

  @Column({ type: 'varchar', name: 'file_url', length: 500 })
  fileUrl: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
