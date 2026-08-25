import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiFetch, ApiError, nullifyEmptyStrings } from '../api/client';
import type { Specialty } from '../api/types';
import { ImageUploadField } from '../components/ImageUploadField';

interface SpecialtyFormValues {
  title: string;
  description: string;
  imageUrl: string;
  order: number;
}

const EMPTY_VALUES: SpecialtyFormValues = { title: '', description: '', imageUrl: '', order: 0 };

export function SpecialtiesPage() {
  const [items, setItems] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<SpecialtyFormValues>({
    initialValues: EMPTY_VALUES,
    validate: { title: (v) => (v.trim() ? null : 'Titre requis') },
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await apiFetch<Specialty[]>('/specialties'));
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
    form.setValues(EMPTY_VALUES);
    open();
  }

  function openEdit(item: Specialty) {
    setEditing(item);
    form.setValues({
      title: item.title,
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      order: item.order,
    });
    open();
  }

  async function handleSubmit(values: SpecialtyFormValues) {
    setSaving(true);
    const payload = nullifyEmptyStrings(values);
    try {
      if (editing) {
        await apiFetch(`/specialties/${editing.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/specialties', { method: 'POST', body: payload });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Spécialité sauvegardée.' });
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

  async function handleDelete(item: Specialty) {
    if (!window.confirm(`Supprimer la spécialité "${item.title}" ?`)) return;
    try {
      await apiFetch(`/specialties/${item.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Spécialité supprimée.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Spécialités</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Ajouter
        </Button>
      </Group>

      {loading ? (
        <Center mih={200}>
          <Loader />
        </Center>
      ) : (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ordre</Table.Th>
              <Table.Th>Titre</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.order}</Table.Td>
                <Table.Td>{item.title}</Table.Td>
                <Table.Td>
                  <Text lineClamp={1} maw={400}>
                    {item.description}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon variant="light" onClick={() => openEdit(item)} aria-label="Modifier">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleDelete(item)}
                      aria-label="Supprimer"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {items.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center">
                    Aucune spécialité pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editing ? 'Modifier la spécialité' : 'Nouvelle spécialité'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Titre" required {...form.getInputProps('title')} />
            <Textarea label="Description" autosize minRows={3} {...form.getInputProps('description')} />
            <ImageUploadField
              label="Image"
              value={form.values.imageUrl}
              onChange={(url) => form.setFieldValue('imageUrl', url ?? '')}
            />
            <NumberInput label="Ordre d'affichage" {...form.getInputProps('order')} />
            <Button type="submit" loading={saving} mt="sm">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
