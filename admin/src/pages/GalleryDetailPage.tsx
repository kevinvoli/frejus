import { useEffect, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  CopyButton,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconLock,
  IconLockOpen,
  IconPhoto,
  IconPlayerPlay,
  IconTrash,
  IconUpload,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  apiFetch,
  ApiError,
  assetUrl,
  formatGalleryCode,
  galleryShareUrl,
  uploadGalleryMedia,
} from '../api/client';
import { MediaType, type ClientGallery } from '../api/types';

// Doit rester cohérent avec ALLOWED_MIME_TYPES dans
// backend/src/galleries/galleries.controller.ts — le serveur reste la seule source
// de vérité (ce filtrage côté client n'est qu'un confort immédiat).
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];
const MAX_SIZE_BYTES = 200 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<ClientGallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      setGallery(await apiFetch<ClientGallery>(`/galleries/${id}`));
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
      await uploadGalleryMedia(Number(id), files);
      notifications.show({
        color: 'green',
        title: 'Envoyé',
        message: `${files.length} fichier(s) ajouté(s) à la galerie.`,
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

  async function handleDeleteMedia(mediaId: number, filename: string) {
    if (!id) return;
    if (!window.confirm(`Supprimer "${filename}" de la galerie ?`)) return;
    try {
      await apiFetch(`/galleries/${id}/media/${mediaId}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Média supprimé.' });
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

  if (!gallery) {
    return <Text c="dimmed">Galerie introuvable.</Text>;
  }

  const shareUrl = galleryShareUrl(gallery.accessToken);
  const formattedCode = formatGalleryCode(gallery.accessToken);

  return (
    <Stack>
      <Group justify="space-between" align="flex-start">
        <Group align="flex-start">
          <ActionIcon variant="light" onClick={() => navigate('/galleries')} aria-label="Retour" mt={4}>
            <IconArrowLeft size={16} />
          </ActionIcon>
          <div>
            <Title order={2}>{gallery.title}</Title>
            <Text c="dimmed" size="sm">
              {gallery.clientName}
              {gallery.clientEmail ? ` · ${gallery.clientEmail}` : ''}
            </Text>
            {gallery.description && (
              <Text size="sm" mt={4}>
                {gallery.description}
              </Text>
            )}
          </div>
        </Group>
        <Badge
          size="lg"
          color={gallery.hasPassword ? 'brand' : 'gray'}
          leftSection={gallery.hasPassword ? <IconLock size={12} /> : <IconLockOpen size={12} />}
        >
          {gallery.hasPassword ? 'Protégée par mot de passe' : 'Accès libre par code'}
        </Badge>
      </Group>

      <Card withBorder radius="md" bg="brand.0">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">
              Code à communiquer au client (oralement, par SMS, sur un papier...)
            </Text>
            <Text size="xl" fw={700} ff="monospace">
              {formattedCode}
            </Text>
            <Text size="xs" c="dimmed">
              Il le saisit dans "Récupérer mes photos" sur le site vitrine — aucun lien à cliquer.
            </Text>
          </Stack>
          <CopyButton value={gallery.accessToken}>
            {({ copied, copy }) => (
              <Button
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                color={copied ? 'green' : 'brand'}
                onClick={copy}
              >
                {copied ? 'Copié' : 'Copier le code'}
              </Button>
            )}
          </CopyButton>
        </Group>
        <Group justify="space-between" wrap="nowrap" mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-brand-2)' }}>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed">
              Ou lien direct (optionnel, ouvre la galerie sans passer par le code)
            </Text>
            <Text size="xs" truncate>
              {shareUrl}
            </Text>
          </Stack>
          <CopyButton value={shareUrl}>
            {({ copied, copy }) => (
              <Button variant="subtle" size="xs" onClick={copy}>
                {copied ? 'Copié' : 'Copier le lien'}
              </Button>
            )}
          </CopyButton>
        </Group>
      </Card>

      <Dropzone
        onDrop={handleDrop}
        onReject={handleReject}
        loading={uploading}
        accept={ALLOWED_MIME_TYPES}
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
              Glissez des photos ou vidéos ici, ou cliquez pour parcourir
            </Text>
            <Text size="xs" c="dimmed">
              JPEG, PNG, WEBP, GIF, MP4, MOV, WEBM — 200 Mo max par fichier
            </Text>
          </div>
        </Group>
      </Dropzone>
      {uploading && <Progress value={100} animated size="sm" />}

      <Title order={4} mt="md">
        Médias ({gallery.media.length})
      </Title>
      {gallery.media.length === 0 ? (
        <Text c="dimmed">Aucun média envoyé pour l'instant.</Text>
      ) : (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {gallery.media.map((item) => (
            <Card key={item.id} withBorder radius="md" padding="xs">
              <Card.Section>
                {item.type === MediaType.PHOTO ? (
                  <img
                    src={assetUrl(item.fileUrl)}
                    alt={item.originalFilename}
                    style={{ width: '100%', height: 140, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 140,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--mantine-color-brand-9)',
                    }}
                  >
                    <IconPlayerPlay size={32} color="white" />
                  </div>
                )}
              </Card.Section>
              <Group justify="space-between" mt="xs" wrap="nowrap">
                <Stack gap={0} style={{ minWidth: 0 }}>
                  <Tooltip label={item.originalFilename}>
                    <Text size="xs" fw={500} truncate>
                      {item.originalFilename}
                    </Text>
                  </Tooltip>
                  <Group gap={4}>
                    {item.type === MediaType.VIDEO ? (
                      <IconVideo size={12} />
                    ) : (
                      <IconPhoto size={12} />
                    )}
                    <Text size="xs" c="dimmed">
                      {formatSize(item.sizeBytes)}
                    </Text>
                  </Group>
                </Stack>
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => handleDeleteMedia(item.id, item.originalFilename)}
                  aria-label="Supprimer ce média"
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
