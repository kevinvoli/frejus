import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { apiFetch, ApiError } from '../api/client';
import type { PortfolioCategory, PortfolioItem } from '../api/types';
import { ImageUploadField } from '../components/ImageUploadField';

interface PortfolioFormValues {
  title: string;
  category: string;
  imageUrl: string;
  order: number;
  published: boolean;
}

const EMPTY_VALUES: PortfolioFormValues = {
  title: '',
  category: '',
  imageUrl: '',
  order: 0,
  published: true,
};

export function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [categories, setCategories] = useState<PortfolioCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<PortfolioFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      title: (v) => (v.trim() ? null : 'Titre requis'),
      category: (v) => (v.trim() ? null : 'Catégorie requise'),
      imageUrl: (v) => (v ? null : 'Une image est requise'),
    },
  });

  async function load() {
    setLoading(true);
    try {
      // /admin/all : montre aussi les éléments non publiés (brouillons), utile pour l'admin.
      const [portfolioItems, portfolioCategories] = await Promise.all([
        apiFetch<PortfolioItem[]>('/portfolio/admin/all'),
        apiFetch<PortfolioCategory[]>('/portfolio-categories'),
      ]);
      setItems(portfolioItems);
      setCategories(portfolioCategories);
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

  // Catégories proposées dans le sélecteur : la liste gérée dans "Catégories du
  // portfolio", complétée par la catégorie actuelle de l'élément modifié si elle
  // n'y figure plus (catégorie renommée/supprimée depuis), pour ne pas l'effacer
  // silencieusement à l'ouverture du formulaire.
  const categoryOptions = (() => {
    const names = categories.map((c) => c.name);
    if (editing && editing.category && !names.includes(editing.category)) {
      return [editing.category, ...names];
    }
    return names;
  })();

  function openCreate() {
    setEditing(null);
    form.setValues(EMPTY_VALUES);
    open();
  }

  function openEdit(item: PortfolioItem) {
    setEditing(item);
    form.setValues({
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl,
      order: item.order,
      published: item.published,
    });
    open();
  }

  async function handleSubmit(values: PortfolioFormValues) {
    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/portfolio/${editing.id}`, { method: 'PUT', body: values });
      } else {
        await apiFetch('/portfolio', { method: 'POST', body: values });
      }
      notifications.show({
        color: 'green',
        title: 'Enregistré',
        message: 'Élément de portfolio sauvegardé.',
      });
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

  async function handleDelete(item: PortfolioItem) {
    if (!window.confirm(`Supprimer "${item.title}" du portfolio ?`)) return;
    try {
      await apiFetch(`/portfolio/${item.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Élément supprimé.' });
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
        <Title order={2}>Portfolio</Title>
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
              <Table.Th>Catégorie</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td>{item.order}</Table.Td>
                <Table.Td>{item.title}</Table.Td>
                <Table.Td>{item.category}</Table.Td>
                <Table.Td>
                  <Badge color={item.published ? 'green' : 'gray'}>
                    {item.published ? 'Publié' : 'Brouillon'}
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
                    Aucun élément de portfolio pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={editing ? "Modifier l'élément" : 'Nouvel élément'}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Titre" required {...form.getInputProps('title')} />
            <Select
              label="Catégorie"
              placeholder="Choisir une catégorie"
              data={categoryOptions}
              searchable
              required
              description={
                <Anchor component={Link} to="/portfolio-categories" size="xs">
                  Gérer les catégories
                </Anchor>
              }
              {...form.getInputProps('category')}
            />
            <ImageUploadField
              label="Photo"
              value={form.values.imageUrl}
              onChange={(url) => form.setFieldValue('imageUrl', url ?? '')}
            />
            <NumberInput label="Ordre d'affichage" {...form.getInputProps('order')} />
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
