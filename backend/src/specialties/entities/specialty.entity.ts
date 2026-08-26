import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SpecialtyPhoto } from './specialty-photo.entity';

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
  // specialty-photo.entity.ts), que le visiteur consulte en cliquant sur la carte.
  @Column({ type: 'varchar', name: 'image_url', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ default: 0 })
  order: number;

  @OneToMany(() => SpecialtyPhoto, (photo) => photo.specialty)
  photos: SpecialtyPhoto[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
