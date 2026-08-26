import { Grid, TextInput } from '@mantine/core';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = ['instagramUrl', 'facebookUrl', 'pinterestUrl'] as const;
type SocialFormValues = Record<(typeof FIELDS)[number], string>;

export function SocialSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<SocialFormValues>(
    '/settings/social',
    FIELDS,
    'Les réseaux sociaux ont été mis à jour.',
  );

  return (
    <SettingsSectionPanel
      description="Liens affichés dans le pied de page du site (laisser vide pour masquer une icône)."
      loading={loading}
      saving={saving}
      onSubmit={form.onSubmit(handleSubmit)}
    >
      <Grid>
        <Grid.Col span={4}>
          <TextInput
            label="Instagram"
            placeholder="https://instagram.com/..."
            {...form.getInputProps('instagramUrl')}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <TextInput
            label="Facebook"
            placeholder="https://facebook.com/..."
            {...form.getInputProps('facebookUrl')}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <TextInput
            label="Pinterest"
            placeholder="https://pinterest.com/..."
            {...form.getInputProps('pinterestUrl')}
          />
        </Grid.Col>
      </Grid>
    </SettingsSectionPanel>
  );
}
