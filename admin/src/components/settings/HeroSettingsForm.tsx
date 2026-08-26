import { Textarea, TextInput } from '@mantine/core';
import { ImageUploadField } from '../ImageUploadField';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = ['heroTitle', 'heroSubtitle', 'heroImageUrl'] as const;
type HeroFormValues = Record<(typeof FIELDS)[number], string>;

export function HeroSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<HeroFormValues>(
    '/settings/hero',
    FIELDS,
    "La section d'accueil a été mise à jour.",
  );

  return (
    <SettingsSectionPanel
      description="Le titre d'accroche, le sous-titre et l'image affichés en haut de la page d'accueil."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <TextInput label="Titre d'accroche" {...form.getInputProps('heroTitle')} />
      <Textarea
        label="Sous-titre"
        autosize
        minRows={2}
        {...form.getInputProps('heroSubtitle')}
      />
      <ImageUploadField
        label="Image d'accueil"
        value={form.values.heroImageUrl}
        onChange={(url) => form.setFieldValue('heroImageUrl', url ?? '')}
      />
    </SettingsSectionPanel>
  );
}
