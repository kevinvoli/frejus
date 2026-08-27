import { ImageUploadField } from '../ImageUploadField';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = ['faviconUrl', 'logoUrl'] as const;
type GeneralFormValues = Record<(typeof FIELDS)[number], string>;

// Section "Général" : identité visuelle globale du site (favicon + logo), distincte
// des 4 sections de contenu (Accueil/À propos/Studio et contact/Réseaux sociaux) —
// voir backend/src/settings/entities/general-settings.entity.ts.
export function GeneralSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<GeneralFormValues>(
    '/settings/general',
    FIELDS,
    "L'identité visuelle du site a été mise à jour.",
  );

  return (
    <SettingsSectionPanel
      description="L'icône affichée dans l'onglet du navigateur, et le logo affiché en pied de page du site (à défaut, le nom du studio s'affiche en texte)."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <ImageUploadField
        label="Icône du site (favicon)"
        value={form.values.faviconUrl}
        onChange={(url) => form.setFieldValue('faviconUrl', url ?? '')}
      />
      <ImageUploadField
        label="Logo (pied de page)"
        value={form.values.logoUrl}
        onChange={(url) => form.setFieldValue('logoUrl', url ?? '')}
      />
    </SettingsSectionPanel>
  );
}
