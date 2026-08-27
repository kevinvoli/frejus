import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Specialty } from './specialty.entity';

// Une ligne de tarification (un "sous-service") au sein d'une spécialité — par ex.
// pour la spécialité "Portrait" : "Shooting individuel" (15 000 F, 1 personne, 4
// photos), "Shooting familial" (30 000 F, 4 photos)... Demande client du 27/08 :
// chaque spécialité peut avoir plusieurs sous-services facturés séparément, affichés
// sur la page dédiée de la spécialité (voir docs/ANALYSE-PLAN-BACKEND.md). `price` en
// francs CFA (entier, pas de décimales pour cette devise) ; `detail` est un champ
// texte libre pour la quantité/les conditions ("4 photos", "1 personne, 4 photos"...)
// plutôt que des colonnes structurées, pour rester flexible sur ce que le
// photographe veut afficher sans schéma rigide.
@Entity('specialty_tariffs')
export class SpecialtyTariff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'specialty_id' })
  specialtyId: number;

  @ManyToOne(() => Specialty, (specialty) => specialty.tariffs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'specialty_id' })
  specialty: Specialty;

  // Nom du sous-service, ex. "Shooting individuel", "Mode", "Shooting familial".
  @Column({ length: 255 })
  name: string;

  // Prix en francs CFA (entier).
  @Column()
  price: number;

  // Détail libre affiché à côté du prix, ex. "4 photos", "1 personne, 4 photos".
  @Column({ type: 'varchar', length: 255, nullable: true })
  detail: string | null;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
