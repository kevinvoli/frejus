import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Liste des catégories de portfolio gérable depuis le panneau admin (voir
// docs/ANALYSE-PLAN-BACKEND.md). `PortfolioItem.category` reste un simple champ
// texte (pas de relation/clé étrangère) : cette table alimente seulement la liste
// proposée à la création/modification d'un élément de portfolio, pour rester
// simple et ne rien casser sur les catégories déjà utilisées par des éléments
// existants si une catégorie est renommée ou supprimée ici.
@Entity('portfolio_categories')
export class PortfolioCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
