import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertTriangle,
  IconDatabase,
  IconGauge,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { apiFetch, ApiError } from '../api/client';
import type { StorageOverview } from '../api/types';
import { formatBytes } from '../utils/formatBytes';

// Tableau de bord "Stockage" : vue d'ensemble de l'espace disque occupé par les
// médias (voir docs/ANALYSE-PLAN-BACKEND.md, stratégie de gestion des médias). Ne
// supprime jamais rien automatiquement — sert à repérer manuellement ce qui prend
// le plus de place (galeries volumineuses, galeries expirées) pour agir en
// connaissance de cause. Le seul filet de sécurité automatique est côté serveur :
// au-delà d'un seuil critique, les nouveaux envois sont bloqués (voir
// backend/src/common/disk-usage.ts).
export function StoragePage() {
  const [overview, setOverview] = useState<StorageOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      setOverview(await apiFetch<StorageOverview>('/storage'));
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

  async function handleDeleteExpiredGallery(id: number, title: string) {
    if (
      !window.confirm(
        `Supprimer la galerie expirée "${title}" ainsi que tous ses médias ? Cette action est irréversible.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await apiFetch(`/galleries/${id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimée', message: 'Galerie supprimée.' });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la suppression.',
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && !overview) {
    return (
      <Center mih={200}>
        <Loader />
      </Center>
    );
  }

  if (!overview) {
    return <Text c="dimmed">Impossible de charger les informations de stockage.</Text>;
  }

  const { disk, mediaQuota, breakdown, topGalleries, expiredGalleries } = overview;
  const progressColor = disk.alert ? 'red' : disk.usedPercent >= disk.alertThresholdPercent - 15 ? 'yellow' : 'green';
  const expiredTotalBytes = expiredGalleries.reduce((sum, g) => sum + g.totalBytes, 0);
  const quotaColor = mediaQuota?.alert ? 'red' : 'green';

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Title order={2}>Stockage</Title>
          <Text c="dimmed" size="sm">
            Espace disque occupé par les médias du site. Rien n'est supprimé
            automatiquement : les galeries expirées sont seulement signalées ci-dessous.
          </Text>
        </div>
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void load()}
          loading={loading}
        >
          Actualiser
        </Button>
      </Group>

      {disk.alert && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Espace disque presque plein">
          Le disque du serveur est utilisé à {disk.usedPercent.toFixed(1)} % (seuil d'alerte :{' '}
          {disk.alertThresholdPercent} %). Au-delà de {disk.hardLimitPercent} %, l'envoi de
          nouveaux médias sera automatiquement bloqué. Pensez à libérer de l'espace, par exemple
          en supprimant les galeries expirées ci-dessous.
        </Alert>
      )}

      {mediaQuota?.alert && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title="Quota du projet presque atteint">
          Les médias de ce site occupent {formatBytes(mediaQuota.usedBytes)} sur{' '}
          {formatBytes(mediaQuota.quotaBytes)} autorisés ({mediaQuota.usedPercent.toFixed(1)} %).
          Supprimez des médias existants ci-dessous, ou augmentez la variable d'environnement
          MEDIA_STORAGE_QUOTA_GB côté serveur.
        </Alert>
      )}

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="xs">
          <Group gap={8}>
            <IconDatabase size={18} />
            <Text fw={600}>Espace disque du serveur</Text>
          </Group>
          <Badge color={progressColor} variant="light" size="lg">
            {disk.usedPercent.toFixed(1)} % utilisé
          </Badge>
        </Group>
        <Progress value={disk.usedPercent} color={progressColor} size="lg" radius="xl" mb="md" />
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase">
              Total
            </Text>
            <Text fw={600}>{formatBytes(disk.totalBytes)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase">
              Utilisé
            </Text>
            <Text fw={600}>{formatBytes(disk.usedBytes)}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase">
              Disponible
            </Text>
            <Text fw={600}>{formatBytes(disk.availableBytes)}</Text>
          </div>
        </SimpleGrid>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="xs">
          <Group gap={8}>
            <IconGauge size={18} />
            <Text fw={600}>Quota de stockage du projet</Text>
          </Group>
          {mediaQuota && (
            <Badge color={quotaColor} variant="light" size="lg">
              {mediaQuota.usedPercent.toFixed(1)} % utilisé
            </Badge>
          )}
        </Group>
        {mediaQuota === null ? (
          <Text c="dimmed" size="sm">
            Quota illimité : la variable d'environnement MEDIA_STORAGE_QUOTA_GB est désactivée
            côté serveur. Seul le seuil critique de l'espace disque du serveur ci-dessus
            s'applique.
          </Text>
        ) : (
          <>
            <Progress value={mediaQuota.usedPercent} color={quotaColor} size="lg" radius="xl" mb="md" />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Utilisé
                </Text>
                <Text fw={600}>{formatBytes(mediaQuota.usedBytes)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed" tt="uppercase">
                  Quota
                </Text>
                <Text fw={600}>{formatBytes(mediaQuota.quotaBytes)}</Text>
              </div>
            </SimpleGrid>
            <Text c="dimmed" size="xs" mt="sm">
              Espace dédié aux médias de ce projet (médiathèque, catalogues de spécialités,
              autres images), indépendant de l'espace disque global du serveur ci-dessus.
              Configurable via MEDIA_STORAGE_QUOTA_GB côté serveur.
            </Text>
          </>
        )}
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Text fw={600} mb="sm">
          Répartition par type de média
        </Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Catégorie</Table.Th>
              <Table.Th>Éléments</Table.Th>
              <Table.Th>Taille</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Médiathèque (galeries clients)</Table.Td>
              <Table.Td>{breakdown.galleries.mediaCount}</Table.Td>
              <Table.Td>{formatBytes(breakdown.galleries.totalBytes)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>Catalogues de spécialités</Table.Td>
              <Table.Td>{breakdown.specialtyPhotos.photoCount}</Table.Td>
              <Table.Td>{formatBytes(breakdown.specialtyPhotos.totalBytes)}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td>
                Autres médias (accroche, à propos, portfolio, images de premier plan...)
              </Table.Td>
              <Table.Td>—</Table.Td>
              <Table.Td>{formatBytes(breakdown.misc.totalBytes)}</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Text fw={600} mb="sm">
          Galeries les plus volumineuses
        </Text>
        {topGalleries.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aucun média dans la médiathèque pour l'instant.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Galerie</Table.Th>
                <Table.Th>Médias</Table.Th>
                <Table.Th>Taille</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topGalleries.map((gallery) => (
                <Table.Tr key={gallery.id}>
                  <Table.Td>{gallery.title}</Table.Td>
                  <Table.Td>{gallery.mediaCount}</Table.Td>
                  <Table.Td>{formatBytes(gallery.totalBytes)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Galeries expirées non supprimées</Text>
          {expiredGalleries.length > 0 && (
            <Badge color="orange" variant="light">
              {formatBytes(expiredTotalBytes)} libérables
            </Badge>
          )}
        </Group>
        {expiredGalleries.length === 0 ? (
          <Text c="dimmed" size="sm">
            Aucune galerie expirée pour l'instant.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Galerie</Table.Th>
                <Table.Th>Client</Table.Th>
                <Table.Th>Raison</Table.Th>
                <Table.Th>Taille</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {expiredGalleries.map((gallery) => (
                <Table.Tr key={gallery.id}>
                  <Table.Td>{gallery.title}</Table.Td>
                  <Table.Td>{gallery.clientName}</Table.Td>
                  <Table.Td>
                    {gallery.maxUses !== null && gallery.useCount >= gallery.maxUses
                      ? `Limite atteinte (${gallery.useCount}/${gallery.maxUses})`
                      : 'Lien expiré'}
                  </Table.Td>
                  <Table.Td>{formatBytes(gallery.totalBytes)}</Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      loading={deletingId === gallery.id}
                      onClick={() => handleDeleteExpiredGallery(gallery.id, gallery.title)}
                    >
                      Supprimer
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </Stack>
  );
}
