import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClientGallery } from './client-gallery.entity';

// Type dérivé du mime-type au moment de l'upload (voir galleries.service.ts) — jamais
// choisi librement par le client de l'API, pour garantir qu'il reflète le vrai fichier.
export enum MediaType {
  PHOTO = 'photo',
  VIDEO = 'video',
}

@Entity('media_items')
export class MediaItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ClientGallery, (gallery) => gallery.media, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'gallery_id' })
  gallery: ClientGallery;

  @Column({ name: 'gallery_id' })
  galleryId: number;

  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column({ name: 'file_url', length: 500 })
  fileUrl: string;

  @Column({ name: 'original_filename', length: 255 })
  originalFilename: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'size_bytes' })
  sizeBytes: number;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
