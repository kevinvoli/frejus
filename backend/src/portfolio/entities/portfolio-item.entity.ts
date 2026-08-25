import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('portfolio_items')
export class PortfolioItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  // Catégorie libre pour rester simple en MVP (Portrait, Mariage, Paysage, Événements, ...)
  // plutôt qu'une relation vers une table dédiée.
  @Column({ length: 100 })
  category: string;

  @Column({ name: 'image_url', length: 500 })
  imageUrl: string;

  @Column({
    type: 'varchar',
    name: 'thumbnail_url',
    length: 500,
    nullable: true,
  })
  thumbnailUrl: string | null;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true })
  published: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
