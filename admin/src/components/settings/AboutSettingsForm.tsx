import { Textarea } from '@mantine/core';
import { ImageUploadField } from '../ImageUploadField';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = ['aboutText', 'aboutImageUrl'] as const;
type AboutFormValues = Record<(typeof FIELDS)[number], string>;

export function AboutSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<AboutFormValues>(
    '/settings/about',
    FIELDS,
    'La section "À propos" a été mise à jour.',
  );

  return (
    <SettingsSectionPanel
      description="Le texte de présentation et la photo du photographe."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Textarea
        label="Texte de présentation"
        autosize
        minRows={4}
        {...form.getInputProps('aboutText')}
      />
      <ImageUploadField
        label="Photo du photographe"
        value={form.values.aboutImageUrl}
        onChange={(url) => form.setFieldValue('aboutImageUrl', url ?? '')}
      />
    </SettingsSectionPanel>
  );
}
