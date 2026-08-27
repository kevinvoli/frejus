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

  // Utilisé par le tableau de bord "Stockage" du panneau admin (voir
  // backend/src/storage) pour chiffrer l'espace occupé par les catalogues de
  // spécialités sans avoir à parcourir le disque. Les photos ajoutées avant
  // l'introduction de ce champ ont une valeur de 0 (imprécision cosmétique connue,
  // sans impact fonctionnel — voir docs/ANALYSE-PLAN-BACKEND.md).
  @Column({ name: 'size_bytes', default: 0 })
  sizeBytes: number;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
