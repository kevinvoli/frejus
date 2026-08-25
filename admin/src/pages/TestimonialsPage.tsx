import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Switch,
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
import { apiFetch, ApiError } from '../api/client';
import type { Testimonial } from '../api/types';

interface TestimonialFormValues {
  clientName: string;
  text: string;
  rating: number;
  published: boolean;
}

const EMPTY_VALUES: TestimonialFormValues = { clientName: '', text: '', rating: 5, published: true };

export function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<TestimonialFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      clientName: (v) => (v.trim() ? null : 'Nom requis'),
      text: (v) => (v.trim() ? null : 'Témoignage requis'),
      rating: (v) => (v >= 1 && v <= 5 ? null : 'Entre 1 et 5'),
    },
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await apiFetch<Testimonial[]>('/testimonials/admin/all'));
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

  function openEdit(item: Testimonial) {
    setEditing(item);
    form.setValues({
      clientName: item.clientName,
      text: item.text,
      rating: item.rating,
      published: item.published,
    });
    open();
  }

  async function handleSubmit(values: TestimonialFormValues) {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/testimonials/${editing.id}`, { method: 'PUT', body: values });
      } else {
        await apiFetch('/testimonials', { method: 'POST', body: values });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Témoignage sauvegardé.' });
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

  async function handleDelete(item: Testimonial) {
    if (!window.confirm(`Supprimer le témoignage de "${item.clientName}" ?`)) return;
    try {
      await apiFetch(`/testimonials/${item.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Témoignage supprimé.' });
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
        <Title order={2}>Témoignages</Title>
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
              <Table.Th>Client</Table.Th>
              <Table.Th>Témoignage</Table.Th>
              <Table.Th>Note</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.clientName}</Table.Td>
                <Table.Td>
                  <Text lineClamp={1} maw={350}>
                    {item.text}
                  </Text>
                </Table.Td>
                <Table.Td>{item.rating} / 5</Table.Td>
                <Table.Td>
                  <Badge color={item.published ? 'green' : 'gray'}>
                    {item.published ? 'Publié' : 'Masqué'}
                  </Badge>
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
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center">
                    Aucun témoignage pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editing ? 'Modifier le témoignage' : 'Nouveau témoignage'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Nom du client" required {...form.getInputProps('clientName')} />
            <Textarea label="Témoignage" autosize minRows={3} required {...form.getInputProps('text')} />
            <NumberInput label="Note" min={1} max={5} {...form.getInputProps('rating')} />
            <Switch
              label="Publié sur le site"
              {...form.getInputProps('published', { type: 'checkbox' })}
            />
            <Button type="submit" loading={saving} mt="sm">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
