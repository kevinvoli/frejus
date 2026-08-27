import { Grid, TagsInput, TextInput } from '@mantine/core';
import { SettingsSectionPanel } from './SettingsSectionPanel';
import { useSectionSettingsForm } from './useSectionSettingsForm';

const FIELDS = [
  'studioName',
  'address',
  'city',
  'phones',
  'emails',
  'openingHours',
] as const;

// `phones`/`emails` : plusieurs numéros/adresses possibles (ex. ligne fixe du studio
// + mobile), voir docs/ANALYSE-PLAN-BACKEND.md, mise à jour du 27/08 — remplace les
// champs uniques `phone`/`email` d'origine.
interface ContactFormValues {
  studioName: string;
  address: string;
  city: string;
  phones: string[];
  emails: string[];
  openingHours: string;
  // Redondant avec les champs ci-dessus, mais nécessaire : sans signature d'index
  // explicite, TypeScript n'accepte pas une interface à clés fixes comme argument de
  // useSectionSettingsForm<T extends Record<string, string | string[]>> (contrairement
  // à un simple alias `Record<...>`, qui bénéficie d'un traitement particulier).
  [key: string]: string | string[];
}

const EMPTY_VALUES: ContactFormValues = {
  studioName: '',
  address: '',
  city: '',
  phones: [],
  emails: [],
  openingHours: '',
};

export function ContactSettingsForm() {
  const { form, loading, saving, handleSubmit } = useSectionSettingsForm<ContactFormValues>(
    '/settings/contact',
    FIELDS,
    'Les coordonnées du studio ont été mises à jour.',
    EMPTY_VALUES,
  );

  return (
    <SettingsSectionPanel
      description="Nom du studio, adresse, horaires — affichés sur le site et dans le pied de page. Plusieurs numéros et emails possibles : saisissez une valeur puis appuyez sur Entrée pour l'ajouter."
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
          <TagsInput
            label="Téléphones"
            placeholder="Ajouter un numéro..."
            {...form.getInputProps('phones')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TagsInput
            label="Emails de contact"
            placeholder="Ajouter un email..."
            {...form.getInputProps('emails')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput label="Horaires" {...form.getInputProps('openingHours')} />
        </Grid.Col>
      </Grid>
    </SettingsSectionPanel>
  );
}
