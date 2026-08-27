import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { Dropzone, IMAGE_MIME_TYPE, type FileRejection } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconEdit,
  IconPhoto,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, ApiError, assetUrl, uploadSpecialtyPhotos } from '../api/client';
import type { Specialty, SpecialtyTariff } from '../api/types';

// Doit rester cohérent avec ALLOWED_MIME_TYPES dans
// backend/src/specialties/specialties.controller.ts — le serveur reste la seule
// source de vérité (ce filtrage côté client n'est qu'un confort immédiat).
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

interface TariffFormValues {
  name: string;
  price: number;
  detail: string;
  order: number;
}

const EMPTY_TARIFF_VALUES: TariffFormValues = { name: '', price: 0, detail: '', order: 0 };

// Prix en francs CFA, sans décimales — voir specialty-tariff.entity.ts.
function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} F CFA`;
}

export function SpecialtyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingTariff, setEditingTariff] = useState<SpecialtyTariff | null>(null);
  const [tariffModalOpened, { open: openTariffModal, close: closeTariffModal }] =
    useDisclosure(false);
  const [savingTariff, setSavingTariff] = useState(false);

  const tariffForm = useForm<TariffFormValues>({
    initialValues: EMPTY_TARIFF_VALUES,
    validate: {
      name: (v) => (v.trim() ? null : 'Nom requis'),
      price: (v) => (v >= 0 ? null : 'Prix invalide'),
    },
  });

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setSpecialty(await apiFetch<Specialty>(`/specialties/${id}`));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDrop(files: File[]) {
    if (!id || files.length === 0) return;
    setUploading(true);
    try {
      await uploadSpecialtyPhotos(Number(id), files);
      notifications.show({
        color: 'green',
        title: 'Envoyé',
        message: `${files.length} photo(s) ajoutée(s) au catalogue.`,
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: "Échec de l'envoi",
        message: err instanceof ApiError ? err.message : 'Erreur inconnue',
      });
    } finally {
      setUploading(false);
    }
  }

  function handleReject(fileRejections: FileRejection[]) {
    const reason = fileRejections[0]?.errors[0]?.message ?? 'Fichier refusé';
    notifications.show({ color: 'red', title: 'Fichier refusé', message: reason });
  }

  async function handleDeletePhoto(photoId: number) {
    if (!id) return;
    if (!window.confirm('Supprimer cette photo du catalogue ?')) return;
    try {
      await apiFetch(`/specialties/${id}/photos/${photoId}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimée', message: 'Photo supprimée.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    }
  }

  // --- Grille tarifaire : sous-services facturés de cette spécialité (voir
  // docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08), affichés sur la page dédiée de la
  // spécialité sur le site vitrine.

  function openCreateTariff() {
    setEditingTariff(null);
    tariffForm.setValues(EMPTY_TARIFF_VALUES);
    openTariffModal();
  }

  function openEditTariff(tariff: SpecialtyTariff) {
    setEditingTariff(tariff);
    tariffForm.setValues({
      name: tariff.name,
      price: tariff.price,
      detail: tariff.detail ?? '',
      order: tariff.order,
    });
    openTariffModal();
  }

  async function handleSubmitTariff(values: TariffFormValues) {
    if (!id) return;
    setSavingTariff(true);
    const payload = { ...values, detail: values.detail.trim() === '' ? null : values.detail };
    try {
      if (editingTariff) {
        await apiFetch(`/specialties/${id}/tariffs/${editingTariff.id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
        await apiFetch(`/specialties/${id}/tariffs`, { method: 'POST', body: payload });
      }
      notifications.show({ color: 'green', title: 'Enregistré', message: 'Tarif sauvegardé.' });
      closeTariffModal();
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      });
    } finally {
      setSavingTariff(false);
    }
  }

  async function handleDeleteTariff(tariff: SpecialtyTariff) {
    if (!id) return;
    if (!window.confirm(`Supprimer le tarif "${tariff.name}" ?`)) return;
    try {
      await apiFetch(`/specialties/${id}/tariffs/${tariff.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Tarif supprimé.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    }
  }

  if (loading) {
    return (
      <Center mih={200}>
        <Loader />
      </Center>
    );
  }

  if (!specialty) {
    return <Text c="dimmed">Spécialité introuvable.</Text>;
  }

  return (
    <Stack>
      <Group align="flex-start">
        <ActionIcon variant="light" onClick={() => navigate('/specialties')} aria-label="Retour" mt={4}>
          <IconArrowLeft size={16} />
        </ActionIcon>
        <div>
          <Title order={2}>{specialty.title}</Title>
          <Text c="dimmed" size="sm">
            Catalogue de photos et grille tarifaire affichés sur la page dédiée de cette
            spécialité sur le site vitrine, ouverte quand un visiteur clique dessus (l'image de
            premier plan se règle depuis la liste des spécialités).
          </Text>
        </div>
      </Group>

      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        loading={uploading}
        accept={IMAGE_MIME_TYPE}
        maxSize={MAX_SIZE_BYTES}
      >
        <Group justify="center" gap="md" mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload size={32} />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX size={32} />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size={32} />
          </Dropzone.Idle>
          <div>
            <Text size="sm" fw={500}>
              Glissez des photos ici, ou cliquez pour parcourir
            </Text>
            <Text size="xs" c="dimmed">
              JPEG, PNG, WEBP, GIF — 8 Mo max par fichier
            </Text>
          </div>
        </Group>
      </Dropzone>
      {uploading && <Progress value={100} animated size="sm" />}

      <Title order={4} mt="md">
        Catalogue ({specialty.photos.length})
      </Title>
      {specialty.photos.length === 0 ? (
        <Text c="dimmed">Aucune photo dans le catalogue pour l'instant.</Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {specialty.photos.map((photo) => (
            <Card key={photo.id} withBorder radius="md" padding="xs">
              <Card.Section>
                <img
                  src={assetUrl(photo.fileUrl)}
                  alt=""
                  style={{ width: '100%', height: 140, objectFit: 'cover' }}
                />
              </Card.Section>
              <Group justify="flex-end" mt="xs">
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => handleDeletePhoto(photo.id)}
                  aria-label="Supprimer cette photo"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Group justify="space-between" mt="md">
        <Title order={4}>Tarifs ({specialty.tariffs.length})</Title>
        <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openCreateTariff}>
          Ajouter un tarif
        </Button>
      </Group>
      <Text c="dimmed" size="sm" mt={-8}>
        Sous-services facturés séparément (ex. "Shooting individuel", "Mode"...), affichés dans
        la section tarifs de la page de cette spécialité sur le site vitrine.
      </Text>
      {specialty.tariffs.length === 0 ? (
        <Text c="dimmed">Aucun tarif pour l'instant.</Text>
      ) : (
        <Table striped withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Ordre</Table.Th>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Prix</Table.Th>
              <Table.Th>Détail</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {specialty.tariffs.map((tariff) => (
              <Table.Tr key={tariff.id}>
                <Table.Td>{tariff.order}</Table.Td>
                <Table.Td>{tariff.name}</Table.Td>
                <Table.Td>{formatPrice(tariff.price)}</Table.Td>
                <Table.Td>
                  <Text c="dimmed">{tariff.detail ?? '—'}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon
                      variant="light"
                      onClick={() => openEditTariff(tariff)}
                      aria-label="Modifier ce tarif"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => handleDeleteTariff(tariff)}
                      aria-label="Supprimer ce tarif"
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

      <Modal
        opened={tariffModalOpened}
        onClose={closeTariffModal}
        title={editingTariff ? 'Modifier le tarif' : 'Nouveau tarif'}
      >
        <form onSubmit={tariffForm.onSubmit(handleSubmitTariff)}>
          <Stack>
            <TextInput
              label="Nom du sous-service"
              placeholder="Shooting individuel"
              required
              {...tariffForm.getInputProps('name')}
            />
            <NumberInput
              label="Prix (F CFA)"
              min={0}
              step={500}
              required
              {...tariffForm.getInputProps('price')}
            />
            <Textarea
              label="Détail"
              placeholder="4 photos, 1 personne"
              autosize
              minRows={2}
              {...tariffForm.getInputProps('detail')}
            />
            <NumberInput label="Ordre d'affichage" {...tariffForm.getInputProps('order')} />
            <Button type="submit" loading={savingTariff} mt="sm">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
