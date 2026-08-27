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
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconCopy,
  IconEdit,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError, formatGalleryCode } from '../api/client';
import type { GalleryListItem } from '../api/types';
import { formatBytes } from '../utils/formatBytes';

interface GalleryFormValues {
  title: string;
  clientName: string;
  clientEmail: string;
  description: string;
  password: string;
  expiresAt: string;
  maxUses: number | '';
  clearPassword: boolean;
}

const EMPTY_VALUES: GalleryFormValues = {
  title: '',
  clientName: '',
  clientEmail: '',
  description: '',
  password: '',
  expiresAt: '',
  maxUses: '',
  clearPassword: false,
};

export function GalleriesPage() {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<GalleryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GalleryListItem | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<GalleryFormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      title: (v) => (v.trim() ? null : 'Titre requis'),
      clientName: (v) => (v.trim() ? null : 'Nom du client requis'),
      clientEmail: (v) => (v && !/^\S+@\S+\.\S+$/.test(v) ? 'Adresse e-mail invalide' : null),
      password: (v) => (v && v.length < 4 ? '4 caractères minimum' : null),
    },
  });

  async function load() {
    setLoading(true);
    try {
      setGalleries(await apiFetch<GalleryListItem[]>('/galleries'));
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

  function openEdit(gallery: GalleryListItem) {
    setEditing(gallery);
    form.setValues({
      title: gallery.title,
      clientName: gallery.clientName,
      clientEmail: gallery.clientEmail ?? '',
      description: gallery.description ?? '',
      password: '',
      expiresAt: gallery.expiresAt ? gallery.expiresAt.slice(0, 10) : '',
      maxUses: gallery.maxUses ?? '',
      clearPassword: false,
    });
    open();
  }

  async function handleSubmit(values: GalleryFormValues) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        clientName: values.clientName,
        clientEmail: values.clientEmail || null,
        description: values.description || null,
        expiresAt: values.expiresAt || null,
        maxUses: values.maxUses === '' ? null : values.maxUses,
      };
      if (values.clearPassword) {
        payload.password = null;
      } else if (values.password) {
        payload.password = values.password;
      }

      if (editing) {
        await apiFetch(`/galleries/${editing.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/galleries', { method: 'POST', body: payload });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Galerie sauvegardée.' });
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

  async function handleDelete(gallery: GalleryListItem) {
    if (
      !window.confirm(
        `Supprimer la galerie "${gallery.title}" ainsi que ses ${gallery.mediaCount} média(s) ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/galleries/${gallery.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimée', message: 'Galerie supprimée.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    }
  }

  async function handleCopyCode(gallery: GalleryListItem) {
    try {
      await navigator.clipboard.writeText(gallery.accessToken);
      notifications.show({
        color: 'green',
        title: 'Code copié',
        message: formatGalleryCode(gallery.accessToken),
      });
    } catch {
      notifications.show({
        color: 'red',
        title: 'Impossible de copier',
        message: formatGalleryCode(gallery.accessToken),
      });
    }
  }

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Médiathèque</Title>
          <Text c="dimmed" size="sm">
            Galeries privées livrées aux clients. Communiquez le code à votre client : il le
            saisit dans "Récupérer mes photos" sur le site vitrine, sans lien à cliquer.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nouvelle galerie
        </Button>
      </Group>

      {loading ? (
        <Center mih={200}>
          <Loader />
        </Center>
      ) : (
        <Table striped withTableBorder verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Galerie</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Code</Table.Th>
              <Table.Th>Médias</Table.Th>
              <Table.Th>Taille</Table.Th>
              <Table.Th>Utilisations</Table.Th>
              <Table.Th>Accès</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {galleries.map((gallery) => (
              <Table.Tr
                key={gallery.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/galleries/${gallery.id}`)}
              >
                <Table.Td>
                  <Text fw={600}>{gallery.title}</Text>
                  <Text size="xs" c="dimmed">
                    {new Date(gallery.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text>{gallery.clientName}</Text>
                  {gallery.clientEmail && (
                    <Text size="xs" c="dimmed">
                      {gallery.clientEmail}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Tooltip label={gallery.accessToken} disabled={gallery.accessToken.length <= 8}>
                    <Text ff="monospace" fw={600} truncate style={{ maxWidth: 140 }}>
                      {formatGalleryCode(gallery.accessToken)}
                    </Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>{gallery.mediaCount}</Table.Td>
                <Table.Td>{formatBytes(gallery.totalSizeBytes)}</Table.Td>
                <Table.Td>
                  <Tooltip
                    label={
                      gallery.maxUses
                        ? `Limite fixée par l'admin : ${gallery.maxUses} utilisation(s)`
                        : 'Aucune limite fixée'
                    }
                  >
                    <Text>
                      {gallery.useCount}
                      {gallery.maxUses ? ` / ${gallery.maxUses}` : ''}
                    </Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Tooltip label={gallery.hasPassword ? 'Protégée par mot de passe' : 'Accès libre par code'}>
                      <Badge
                        color={gallery.hasPassword ? 'brand' : 'gray'}
                        leftSection={
                          gallery.hasPassword ? <IconLock size={12} /> : <IconLockOpen size={12} />
                        }
                      >
                        {gallery.hasPassword ? 'Protégée' : 'Libre'}
                      </Badge>
                    </Tooltip>
                    {gallery.expired && (
                      <Tooltip label="Lien expiré ou nombre d'utilisations atteint — voir le tableau de bord Stockage">
                        <Badge color="orange" variant="light">
                          Expirée
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                </Table.Td>
                <Table.Td onClick={(e) => e.stopPropagation()}>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon
                      variant="light"
                      onClick={() => handleCopyCode(gallery)}
                      aria-label="Copier le code"
                    >
                      <IconCopy size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" onClick={() => openEdit(gallery)} aria-label="Modifier">
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleDelete(gallery)}
                      aria-label="Supprimer"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {galleries.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed" ta="center">
                    Aucune galerie pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? 'Modifier la galerie' : 'Nouvelle galerie'}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Titre de la galerie"
              placeholder="Mariage de Claire & Paul"
              required
              {...form.getInputProps('title')}
            />
            <Group grow>
              <TextInput label="Nom du client" required {...form.getInputProps('clientName')} />
              <TextInput
                label="E-mail du client"
                placeholder="optionnel"
                {...form.getInputProps('clientEmail')}
              />
            </Group>
            <Textarea
              label="Description"
              placeholder="optionnel"
              autosize
              minRows={2}
              {...form.getInputProps('description')}
            />
            <Group grow>
              <TextInput
                type="date"
                label="Expiration du code"
                description="Laisser vide pour un code sans expiration"
                {...form.getInputProps('expiresAt')}
              />
              <NumberInput
                label="Nombre d'utilisations max"
                description={
                  editing
                    ? `Laisser vide pour illimité — déjà utilisé ${editing.useCount} fois`
                    : 'Laisser vide pour illimité'
                }
                placeholder="illimité"
                min={1}
                step={1}
                allowDecimal={false}
                allowNegative={false}
                {...form.getInputProps('maxUses')}
              />
            </Group>

            {editing?.hasPassword && !form.values.clearPassword ? (
              <Group justify="space-between" align="flex-end">
                <TextInput
                  type="password"
                  label="Nouveau mot de passe"
                  description="Laisser vide pour ne pas changer le mot de passe actuel"
                  style={{ flexGrow: 1 }}
                  {...form.getInputProps('password')}
                />
                <Button
                  variant="subtle"
                  color="red"
                  onClick={() => form.setFieldValue('clearPassword', true)}
                >
                  Retirer la protection
                </Button>
              </Group>
            ) : (
              <TextInput
                type="password"
                label="Mot de passe"
                description={
                  editing
                    ? 'La protection sera retirée à l\'enregistrement'
                    : 'Laisser vide pour un accès sans mot de passe'
                }
                disabled={form.values.clearPassword}
                {...form.getInputProps('password')}
              />
            )}
            {editing?.hasPassword && form.values.clearPassword && (
              <Switch
                label="Annuler : conserver le mot de passe existant"
                checked={false}
                onChange={() => form.setFieldValue('clearPassword', false)}
              />
            )}

            <Button type="submit" loading={saving} mt="sm">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
