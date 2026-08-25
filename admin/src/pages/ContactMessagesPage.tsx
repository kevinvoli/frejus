import { useEffect, useState } from 'react';
import { ActionIcon, Badge, Center, Group, Loader, Modal, Select, Stack, Table, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconEye, IconTrash } from '@tabler/icons-react';
import { apiFetch, ApiError } from '../api/client';
import { ContactMessageStatus, type ContactMessage } from '../api/types';

const STATUS_LABELS: Record<ContactMessageStatus, string> = {
  [ContactMessageStatus.NEW]: 'Nouveau',
  [ContactMessageStatus.READ]: 'Lu',
  [ContactMessageStatus.TREATED]: 'Traité',
};

const STATUS_COLORS: Record<ContactMessageStatus, string> = {
  [ContactMessageStatus.NEW]: 'blue',
  [ContactMessageStatus.READ]: 'yellow',
  [ContactMessageStatus.TREATED]: 'green',
};

export function ContactMessagesPage() {
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  async function load() {
    setLoading(true);
    try {
      setItems(await apiFetch<ContactMessage[]>('/contact'));
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

  function openMessage(item: ContactMessage) {
    setSelected(item);
    open();
    if (item.status === ContactMessageStatus.NEW) {
      void updateStatus(item, ContactMessageStatus.READ);
    }
  }

  async function updateStatus(item: ContactMessage, status: ContactMessageStatus) {
    try {
      const updated = await apiFetch<ContactMessage>(`/contact/${item.id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : 'Échec de la mise à jour.',
      });
    }
  }

  async function handleDelete(item: ContactMessage) {
    if (!window.confirm(`Supprimer le message de "${item.name}" ?`)) return;
    try {
      await apiFetch(`/contact/${item.id}`, { method: 'DELETE' });
      notifications.show({ color: 'green', title: 'Supprimé', message: 'Message supprimé.' });
      close();
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
      <Title order={2}>Messages de contact</Title>

      {loading ? (
        <Center mih={200}>
          <Loader />
        </Center>
      ) : (
        <Table striped withTableBorder highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Sujet</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items.map((item) => (
              <Table.Tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => openMessage(item)}>
                <Table.Td>{new Date(item.createdAt).toLocaleString('fr-FR')}</Table.Td>
                <Table.Td>{item.name}</Table.Td>
                <Table.Td>{item.email}</Table.Td>
                <Table.Td>{item.subject ?? '—'}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <ActionIcon
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMessage(item);
                      }}
                      aria-label="Voir"
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(item);
                      }}
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
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center">
                    Aucun message reçu pour l'instant.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}

      <Modal opened={opened} onClose={close} title={selected ? `Message de ${selected.name}` : ''} size="lg">
        {selected && (
          <Stack>
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">
                  {selected.email}
                </Text>
                <Text size="sm" c="dimmed">
                  {new Date(selected.createdAt).toLocaleString('fr-FR')}
                </Text>
              </div>
              <Select
                w={160}
                data={Object.values(ContactMessageStatus).map((status) => ({
                  value: status,
                  label: STATUS_LABELS[status],
                }))}
                value={selected.status}
                onChange={(value) => value && void updateStatus(selected, value as ContactMessageStatus)}
              />
            </Group>
            {selected.subject && <Text fw={500}>{selected.subject}</Text>}
            <Text style={{ whiteSpace: 'pre-wrap' }}>{selected.message}</Text>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
