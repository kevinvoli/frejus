import { useState } from 'react';
import { ActionIcon, Group, Image, Stack, Text } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileRejection } from '@mantine/dropzone';
import { IconPhoto, IconTrash, IconUpload, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { ApiError, assetUrl, uploadImage } from '../api/client';

interface ImageUploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
}

// Doit rester cohérent avec MAX_FILE_SIZE_BYTES dans backend/src/upload/upload.controller.ts
// — le serveur reste la seule source de vérité (ce filtrage côté client n'est qu'un
// confort immédiat).
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export function ImageUploadField({ label, value, onChange }: ImageUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  async function handleDrop(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      notifications.show({
        color: 'red',
        title: "Échec de l'upload",
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

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {value ? (
        <Group align="flex-start">
          <Image src={assetUrl(value)} alt={label} w={160} h={120} radius="sm" fit="cover" />
          <ActionIcon
            color="red"
            variant="light"
            onClick={() => onChange(null)}
            aria-label="Retirer l'image"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ) : (
        <Dropzone
          onDrop={handleDrop}
          onReject={handleReject}
          loading={uploading}
          accept={IMAGE_MIME_TYPE}
          maxSize={MAX_SIZE_BYTES}
          maxFiles={1}
        >
          <Group justify="center" gap="md" mih={100} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload size={28} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX size={28} />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconPhoto size={28} />
            </Dropzone.Idle>
            <Text size="sm" c="dimmed">
              Glissez une image ici, ou cliquez pour parcourir (50 Mo max)
            </Text>
          </Group>
        </Dropzone>
      )}
    </Stack>
  );
}
