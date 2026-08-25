import { useEffect, useState } from 'react';
import {
  Button,
  Center,
  Divider,
  Grid,
  Loader,
  Stack,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { apiFetch, ApiError, nullifyEmptyStrings } from '../api/client';
import type { SiteSettings } from '../api/types';
import { ImageUploadField } from '../components/ImageUploadField';

const SETTINGS_FIELDS = [
  'heroTitle',
  'heroSubtitle',
  'heroImageUrl',
  'aboutText',
  'aboutImageUrl',
  'studioName',
  'address',
  'city',
  'phone',
  'email',
  'openingHours',
  'instagramUrl',
  'facebookUrl',
  'pinterestUrl',
] as const;

type SettingsFormValues = Record<(typeof SETTINGS_FIELDS)[number], string>;

const EMPTY_VALUES = SETTINGS_FIELDS.reduce((acc, key) => {
  acc[key] = '';
  return acc;
}, {} as SettingsFormValues);

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const form = useForm<SettingsFormValues>({ initialValues: EMPTY_VALUES });

  useEffect(() => {
    let cancelled = false;
    apiFetch<SiteSettings>('/settings')
      .then((data) => {
        if (cancelled) return;
        const values = { ...EMPTY_VALUES };
        for (const key of SETTINGS_FIELDS) {
          values[key] = data[key] ?? '';
        }
        form.setValues(values);
      })
      .catch((err: unknown) => {
        notifications.show({
          color: 'red',
          title: 'Erreur',
          message: err instanceof ApiError ? err.message : 'Chargement impossible.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(values: SettingsFormValues) {
    setSaving(true);
    try {
      await apiFetch<SiteSettings>('/settings', {
        method: 'PUT',
        body: nullifyEmptyStrings(values),
      });
      notifications.show({
        color: 'green',
        title: 'Enregistré',
        message: 'Le contenu du site a été mis à jour.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Center mih={300}>
        <Loader />
      </Center>
    );
  }

  return (
    <Stack maw={900}>
      <Title order={2}>Réglages du site</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Divider label="Accueil" />
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

          <Divider label="À propos" mt="md" />
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

          <Divider label="Studio et contact" mt="md" />
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

          <Divider label="Réseaux sociaux" mt="md" />
          <Grid>
            <Grid.Col span={4}>
              <TextInput label="Instagram" placeholder="https://instagram.com/..." {...form.getInputProps('instagramUrl')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Facebook" placeholder="https://facebook.com/..." {...form.getInputProps('facebookUrl')} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Pinterest" placeholder="https://pinterest.com/..." {...form.getInputProps('pinterestUrl')} />
            </Grid.Col>
          </Grid>

          <Button type="submit" loading={saving} mt="lg" w={200}>
            Enregistrer
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
