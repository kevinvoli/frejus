import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Ligne unique (id fixe = 1) : identité visuelle globale du site — favicon (onglet du
// navigateur) et logo (image affichée en pied de page à la place du texte "Pixellia"
// tant qu'aucun logo n'est renseigné, voir Footer.tsx côté site vitrine). Ajouté le
// 27/08 suite à la demande "donner la possibilité à l'admin d'ajouter l'icône du site
// et autre" (voir docs/ANALYSE-PLAN-BACKEND.md). Même principe de table dédiée par
// section que hero/about/contact/social (voir settings.service.ts).
@Entity('general_settings')
export class GeneralSettings {
  @PrimaryColumn({ default: 1 })
  id: number;

  // Icône affichée dans l'onglet du navigateur — injectée dynamiquement côté site
  // vitrine (voir App.tsx, effet sur settings.faviconUrl) puisque index.html est un
  // fichier statique. Idéalement une image carrée (PNG/ICO), mais aucune contrainte
  // n'est imposée ici : l'upload passe par le même endpoint générique /upload que les
  // autres images du site.
  @Column({
    type: 'varchar',
    name: 'favicon_url',
    length: 500,
    nullable: true,
  })
  faviconUrl: string | null;

  // Logo affiché en pied de page (voir Footer.tsx) à la place du texte "Pixellia" par
  // défaut.
  @Column({ type: 'varchar', name: 'logo_url', length: 500, nullable: true })
  logoUrl: string | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
