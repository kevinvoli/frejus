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
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { apiFetch, ApiError } from '../api/client';
import type { PortfolioCategory } from '../api/types';

interface CategoryFormValues {
  name: string;
  order: number;
}

const EMPTY_VALUES: CategoryFormValues = { name: '', order: 0 };

// Liste des catégories proposées à la création/modification d'un élément de
// portfolio (voir PortfolioPage.tsx) — gérée ici pour ne plus être une saisie
// libre. Supprimer une catégorie n'affecte pas les éléments qui l'utilisent déjà,
// ils conservent simplement leur texte de catégorie tel quel (voir
// docs/ANALYSE-PLAN-BACKEND.md).
export function PortfolioCategoriesPage() {
  const [items, setItems] = useState<PortfolioCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PortfolioCategory | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<CategoryFormValues>({
    initialValues: EMPTY_VALUES,
    validate: { name: (v) => (v.trim() ? null : 'Nom requis') },
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await apiFetch<PortfolioCategory[]>('/portfolio-categories'));
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

  function openEdit(item: PortfolioCategory) {
    setEditing(item);
    form.setValues({ name: item.name, order: item.order });
    open();
  }

  async function handleSubmit(values: CategoryFormValues) {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/portfolio-categories/${editing.id}`, { method: 'PUT', body: values });
      } else {
        await apiFetch('/portfolio-categories', { method: 'POST', body: values });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Catégorie sauvegardée.' });
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

  async function handleDelete(item: PortfolioCategory) {
    if (
      !window.confirm(
        `Supprimer la catégorie "${item.name}" ? Les éléments de portfolio qui l'utilisent déjà ne seront pas modifiés.`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/portfolio-categories/${item.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimée', message: 'Catégorie supprimée.' });
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
        <div>
          <Title order={2}>Catégories du portfolio</Title>
          <Text c="dimmed" size="sm">
            Ces catégories sont proposées lors de l'ajout ou de la modification d'un élément du
            portfolio.
          </Text>
        </div>
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
              <Table.Th>Nom</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.order}</Table.Td>
                <Table.Td>{item.name}</Table.Td>
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
                <Table.Td colSpan={3}>
                  <Text c="dimmed" ta="center">
                    Aucune catégorie pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Nom"
              placeholder="Portrait, Mariage, Paysage, Événements..."
              required
              {...form.getInputProps('name')}
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
