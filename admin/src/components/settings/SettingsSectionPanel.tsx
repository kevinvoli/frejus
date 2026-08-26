import type { FormEvent, ReactNode } from 'react';
import { Button, Center, Loader, Stack, Text } from '@mantine/core';

interface SettingsSectionPanelProps {
  description?: string;
  loading: boolean;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

// Contenu commun aux 4 onglets des réglages du site : indicateur de chargement et
// bouton d'enregistrement propres à la section — chaque onglet s'enregistre
// indépendamment des autres (voir SettingsPage.tsx). Pas de titre ici : le libellé de
// l'onglet actif joue déjà ce rôle.
export function SettingsSectionPanel({
  description,
  loading,
  saving,
  onSubmit,
  children,
}: SettingsSectionPanelProps) {
  if (loading) {
    return (
      <Center mih={160}>
        <Loader size="sm" />
      </Center>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack>
        {description && (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        )}
        {children}
        <Button type="submit" loading={saving} w={200} mt="xs">
          Enregistrer
        </Button>
      </Stack>
    </form>
  );
}
