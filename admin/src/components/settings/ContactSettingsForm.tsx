import { Grid, TextInput } from '@mantine/core';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = [
  'studioName',
  'address',
  'city',
  'phone',
  'email',
  'openingHours',
] as const;
type ContactFormValues = Record<(typeof FIELDS)[number], string>;

export function ContactSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<ContactFormValues>(
    '/settings/contact',
    FIELDS,
    'Les coordonnées du studio ont été mises à jour.',
  );

  return (
    <SettingsSectionPanel
      description="Nom du studio, adresse, horaires — affichés sur le site et dans le pied de page."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Grid>
        <Grid.Col span={6}>
          <TextInput label="Nom du studio" {...form.getInputProps('studioName')} />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput label="Ville" {...form.getInputProps('city')} />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput label="Adresse" {...form.getInputProps('address')} />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput label="Téléphone" {...form.getInputProps('phone')} />
        </Grid.Col>
        <Grid.Col span={6}>
          <TextInput label="Email de contact" {...form.getInputProps('email')} />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput label="Horaires" {...form.getInputProps('openingHours')} />
        </Grid.Col>
      </Grid>
    </SettingsSectionPanel>
  );
}
