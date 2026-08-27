import { Textarea } from '@mantine/core';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = ['mentionsLegales', 'politiqueConfidentialite', 'conditionsGenerales'] as const;
type LegalFormValues = Record<(typeof FIELDS)[number], string>;

// Section "Pages légales" : contenu des 3 pages du site vitrine jusqu'ici de simples
// liens "#" en pied de page (voir Footer.tsx / LegalPage.tsx côté site vitrine, et
// backend/src/settings/entities/legal-settings.entity.ts).
export function LegalSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<LegalFormValues>(
    '/settings/legal',
    FIELDS,
    'Les pages légales ont été mises à jour.',
  );

  return (
    <SettingsSectionPanel
      description="Texte affiché sur chacune des 3 pages légales du site (liens en pied de page). Laisser vide tant que le contenu n'est pas prêt : la page affichera un message d'attente plutôt qu'une erreur."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Textarea
        label="Mentions légales"
        autosize
        minRows={5}
        {...form.getInputProps('mentionsLegales')}
      />
      <Textarea
        label="Politique de confidentialité"
        autosize
        minRows={5}
        {...form.getInputProps('politiqueConfidentialite')}
      />
      <Textarea
        label="Conditions générales"
        autosize
        minRows={5}
        {...form.getInputProps('conditionsGenerales')}
      />
    </SettingsSectionPanel>
  );
}
