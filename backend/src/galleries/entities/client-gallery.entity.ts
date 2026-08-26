import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MediaItem } from './media-item.entity';

// Une "galerie" = une séance/livraison client (mariage, portrait, événement...).
// Accessible publiquement via son access_token (lien secret, pas de compte client à
// créer — voir docs/ANALYSE-PLAN-BACKEND.md, section médiathèque) et protégeable
// optionnellement par un mot de passe.
@Entity('client_galleries')
export class ClientGallery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'client_name', length: 255 })
  clientName: string;

  @Column({
    type: 'varchar',
    name: 'client_email',
    length: 255,
    nullable: true,
  })
  clientEmail: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Jeton opaque intégré dans l'URL partagée au client (ex: /?galerie=<token>).
  // Généré aléatoirement à la création, jamais deviné : c'est lui qui protège l'accès
  // en l'absence de mot de passe.
  @Column({ name: 'access_token', length: 64, unique: true })
  accessToken: string;

  // Hash bcrypt, null si la galerie n'est pas protégée par mot de passe.
  @Column({
    type: 'varchar',
    name: 'password_hash',
    length: 255,
    nullable: true,
  })
  passwordHash: string | null;

  // Date au-delà de laquelle le lien cesse de fonctionner ; null = jamais.
  @Column({ type: 'datetime', name: 'expires_at', nullable: true })
  expiresAt: Date | null;

  @OneToMany(() => MediaItem, (media) => media.gallery)
  media: MediaItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
