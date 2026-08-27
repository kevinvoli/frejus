import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : contenu des 3 pages légales du site vitrine (Mentions
// légales, Politique de confidentialité, Conditions générales — jusqu'ici de simples
// liens "#" en pied de page, voir Footer.tsx). Une table dédiée plutôt que 3 entités
// séparées : ce sont 3 blocs de texte simples, sans structure propre (pas de liste, pas
// de tri, pas de statut publié/brouillon) — pas besoin d'une entité par page pour ça.
// Ajouté le 27/08 (voir docs/ANALYSE-PLAN-BACKEND.md).
@Entity('legal_settings')
export class LegalSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  @Column({ type: 'text', name: 'mentions_legales', nullable: true })
  mentionsLegales: string | null;

  @Column({ type: 'text', name: 'politique_confidentialite', nullable: true })
  politiqueConfidentialite: string | null;

  @Column({ type: 'text', name: 'conditions_generales', nullable: true })
  conditionsGenerales: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
