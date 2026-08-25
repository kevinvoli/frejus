import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_name', length: 255 })
  clientName: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'tinyint', default: 5 })
  rating: number;

  @Column({ default: true })
  published: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
