import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Card,
  Center,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileRejection } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, ApiError, assetUrl, uploadSpecialtyPhotos } from '../api/client';
import type { Specialty } from '../api/types';

// Doit rester cohérent avec ALLOWED_MIME_TYPES dans
// backend/src/specialties/specialties.controller.ts — le serveur reste la seule
// source de vérité (ce filtrage côté client n'est qu'un confort immédiat).
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

export function SpecialtyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
            Catalogue de photos consultable par les visiteurs en cliquant sur cette spécialité sur
            le site vitrine (l'image de premier plan se règle depuis la liste des spécialités).
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
    </Stack>
  );
}
