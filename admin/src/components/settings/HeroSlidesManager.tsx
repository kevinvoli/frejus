import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiFetch, ApiError, assetUrl } from '../../api/client';
import { ImageUploadField } from '../ImageUploadField';
import type { HeroSlide } from '../../api/types';

interface SlideFormValues {
  imageUrl: string;
  subtitle: string;
  active: boolean;
  order: number;
}

const EMPTY_VALUES: SlideFormValues = { imageUrl: '', subtitle: '', active: true, order: 0 };

// Gestion du carousel d'accueil (voir docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08) :
// contrairement aux autres sections de "Réglages du site", ceci n'est pas un simple
// formulaire à enregistrer d'un coup (voir useSectionSettingsForm.ts) mais une vraie
// liste avec CRUD complet — même principe que la grille tarifaire d'une spécialité
// (voir SpecialtyDetailPage.tsx) : chaque action (ajout, modification, suppression,
// activation) est un appel API immédiat, indépendant du titre d'accroche ci-dessus.
export function HeroSlidesManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm<SlideFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      imageUrl: (value) => (value ? null : 'Image requise'),
    },
  });

  async function load() {
    setLoading(true);
    try {
      setSlides(await apiFetch<HeroSlide[]>('/settings/hero/slides'));
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Chargement impossible.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    form.setValues({ ...EMPTY_VALUES, order: slides.length });
    open();
  }

  function openEdit(slide: HeroSlide) {
    setEditing(slide);
    form.setValues({
      imageUrl: slide.imageUrl,
      subtitle: slide.subtitle ?? '',
      active: slide.active,
      order: slide.order,
    });
    open();
  }

  async function handleSubmit(values: SlideFormValues) {
    setSaving(true);
    const payload = {
      imageUrl: values.imageUrl,
      subtitle: values.subtitle.trim() === '' ? null : values.subtitle,
      active: values.active,
      order: values.order,
    };
    try {
      if (editing) {
        await apiFetch(`/settings/hero/slides/${editing.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/settings/hero/slides', { method: 'POST', body: payload });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Image du carousel sauvegardée.' });
      close();
      await load();
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

  async function handleDelete(slide: HeroSlide) {
    if (!window.confirm('Supprimer cette image du carousel ?')) return;
    try {
      await apiFetch(`/settings/hero/slides/${slide.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimée', message: 'Image supprimée.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    }
  }

  async function handleToggleActive(slide: HeroSlide) {
    try {
      await apiFetch(`/settings/hero/slides/${slide.id}`, {
        method: 'PUT',
        body: { active: !slide.active },
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la mise à jour.',
      });
    }
  }

  return (
    <Stack mt="xl">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={4}>Carousel d'accueil ({slides.length})</Title>
          <Text c="dimmed" size="sm">
            Chaque image activée ci-dessous défile en carousel sur la page d'accueil, avec son
            propre sous-titre optionnel. Le titre d'accroche ci-dessus reste unique et fixe,
            quelle que soit l'image affichée.
          </Text>
        </div>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Ajouter une image
        </Button>
      </Group>

      {!loading && slides.length === 0 && (
        <Text c="dimmed">Aucune image pour l'instant — l'accueil affiche l'image de repli par défaut.</Text>
      )}

      {slides.length > 0 && (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Image</Table.Th>
              <Table.Th>Sous-titre</Table.Th>
              <Table.Th>Ordre</Table.Th>
              <Table.Th>Actif</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {slides.map((slide) => (
              <Table.Tr key={slide.id}>
                <Table.Td>
                  <img
                    src={assetUrl(slide.imageUrl)}
                    alt=""
                    style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                  />
                </Table.Td>
                <Table.Td>
                  <Text c="dimmed">{slide.subtitle ?? '—'}</Text>
                </Table.Td>
                <Table.Td>{slide.order}</Table.Td>
                <Table.Td>
                  <Switch
                    checked={slide.active}
                    onChange={() => handleToggleActive(slide)}
                    aria-label={slide.active ? 'Désactiver cette image' : 'Activer cette image'}
                  />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="light" onClick={() => openEdit(slide)} aria-label="Modifier cette image">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleDelete(slide)}
                      aria-label="Supprimer cette image"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editing ? "Modifier l'image" : 'Nouvelle image du carousel'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <ImageUploadField
              label="Image"
              value={form.values.imageUrl}
              onChange={(url) => form.setFieldValue('imageUrl', url ?? '')}
            />
            {form.errors.imageUrl && (
              <Text c="red" size="sm">
                {form.errors.imageUrl}
              </Text>
            )}
            <Textarea
              label="Sous-titre (optionnel)"
              placeholder="Affiché sous le titre d'accroche pendant que cette image est visible"
              autosize
              minRows={2}
              {...form.getInputProps('subtitle')}
            />
            <Switch
              label="Actif (visible dans le carousel du site)"
              checked={form.values.active}
              onChange={(e) => form.setFieldValue('active', e.currentTarget.checked)}
            />
            <NumberInput label="Ordre d'affichage" min={0} {...form.getInputProps('order')} />
            <Button type="submit" loading={saving} mt="sm">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
