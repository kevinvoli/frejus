import type { FormEvent, ReactNode } from 'react';
import { Button, Card, Center, Loader, Stack, Text, Title } from '@mantine/core';

interface SettingsSectionCardProps {
  title: string;
  description?: string;
  loading: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

// Habillage commun aux 4 sections des réglages du site : un encart avec son propre
// titre, son propre indicateur de chargement, et son propre bouton d'enregistrement
// — chaque section s'enregistre indépendamment des autres (voir SettingsPage.tsx).
export function SettingsSectionCard({
  title,
  description,
  loading,
  saving,
  onSubmit,
  children,
}: SettingsSectionCardProps) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap={2} mb="md">
        <Title order={4}>{title}</Title>
        {description && (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        )}
      </Stack>
      {loading ? (
        <Center mih={120}>
          <Loader size="sm" />
        </Center>
      ) : (
        <form onSubmit={onSubmit}>
          <Stack>
            {children}
            <Button type="submit" loading={saving} w={200} mt="xs">
              Enregistrer
            </Button>
          </Stack>
        </form>
      )}
    </Card>
  );
}
