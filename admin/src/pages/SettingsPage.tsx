import { Stack, Tabs, Title } from '@mantine/core';
import {
  IconAddressBook,
  IconHome,
  IconShare2,
  IconUser,
} from '@tabler/icons-react';
import { HeroSettingsForm } from '../components/settings/HeroSettingsForm';
import { AboutSettingsForm } from '../components/settings/AboutSettingsForm';
import { ContactSettingsForm } from '../components/settings/ContactSettingsForm';
import { SocialSettingsForm } from '../components/settings/SocialSettingsForm';

// Un onglet par section : chaque section a sa table dédiée côté backend (voir
// backend/src/settings) et son propre bouton "Enregistrer" — passer d'un onglet à
// l'autre n'affecte jamais les autres sections, y compris en cas d'erreur de
// validation (voir docs/ANALYSE-PLAN-BACKEND.md, refonte du panneau admin du 26/08).
// `keepMounted={false}` : chaque formulaire ne charge ses données qu'à la première
// ouverture de son onglet, plutôt que les 4 en même temps au chargement de la page.
export function SettingsPage() {
  return (
    <Stack maw={900}>
      <Title order={2}>Réglages du site</Title>
      <Tabs defaultValue="hero" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="hero" leftSection={<IconHome size={16} />}>
            Accueil
          </Tabs.Tab>
          <Tabs.Tab value="about" leftSection={<IconUser size={16} />}>
            À propos
          </Tabs.Tab>
          <Tabs.Tab value="contact" leftSection={<IconAddressBook size={16} />}>
            Studio et contact
          </Tabs.Tab>
          <Tabs.Tab value="social" leftSection={<IconShare2 size={16} />}>
            Réseaux sociaux
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="hero" pt="lg">
          <HeroSettingsForm />
        </Tabs.Panel>
        <Tabs.Panel value="about" pt="lg">
          <AboutSettingsForm />
        </Tabs.Panel>
        <Tabs.Panel value="contact" pt="lg">
          <ContactSettingsForm />
        </Tabs.Panel>
        <Tabs.Panel value="social" pt="lg">
          <SocialSettingsForm />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
