import { Stack, TextInput } from '@mantine/core';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';
import { HeroSlidesManager } from './HeroSlidesManager';

// Depuis le 27/08 (voir docs/ANALYSE-PLAN-BACKEND.md), seul le titre d'accroche reste
// un simple champ de cette section : le sous-titre et l'image uniques d'origine sont
// remplacés par plusieurs images de carousel gérées ci-dessous (voir
// HeroSlidesManager.tsx), chacune avec son propre sous-titre optionnel.
const FIELDS = ['heroTitle'] as const;
type HeroFormValues = Record<(typeof FIELDS)[number], string>;

export function HeroSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<HeroFormValues>(
    '/settings/hero',
    FIELDS,
    "Le titre d'accroche a été mis à jour.",
  );

  return (
    <Stack>
      <SettingsSectionPanel
        description="Titre d'accroche affiché en haut de la page d'accueil — unique et fixe, il ne change pas d'une image du carousel à l'autre (voir ci-dessous)."
        loading={loading}
        saving={saving}
        onSubmit={form.onSubmit(handleSubmit)}
      >
        <TextInput label="Titre d'accroche" {...form.getInputProps('heroTitle')} />
      </SettingsSectionPanel>

      <HeroSlidesManager />
    </Stack>
  );
}
