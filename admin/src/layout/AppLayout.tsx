import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Button,
  Divider,
  Group,
  NavLink as MantineNavLink,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { ComponentType } from 'react';
import {
  IconCamera,
  IconDatabase,
  IconLibraryPhoto,
  IconLogout,
  IconMessage,
  IconMessageCircle,
  IconPhoto,
  IconSettings,
  IconStar,
  IconTags,
} from '@tabler/icons-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

// Palette et disposition inspirées de la maquette fournie par le client (frejus.jpg,
// dashboard "Vizora") : sidebar vert foncé avec item actif en pastille blanche, fond
// de contenu très clair, et le contenu de chaque page posé sur une carte blanche
// arrondie — cf. src/main.tsx pour la palette "brand" du thème Mantine.
const NAV_ITEMS: NavItem[] = [
  { to: '/settings', label: 'Réglages du site', icon: IconSettings },
  { to: '/specialties', label: 'Spécialités', icon: IconStar },
  { to: '/portfolio', label: 'Portfolio', icon: IconPhoto },
  { to: '/portfolio-categories', label: 'Catégories du portfolio', icon: IconTags },
  { to: '/galleries', label: 'Médiathèque', icon: IconLibraryPhoto },
  { to: '/testimonials', label: 'Témoignages', icon: IconMessage },
  { to: '/contact-messages', label: 'Messages de contact', icon: IconMessageCircle },
];

// Section distincte du contenu éditable : suivi de l'espace disque occupé par les
// médias (voir docs/ANALYSE-PLAN-BACKEND.md, stratégie de gestion des médias).
const NAV_ITEMS_SYSTEM: NavItem[] = [
  { to: '/storage', label: 'Stockage', icon: IconDatabase },
];

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? '?';

  // Comparaison avec bornage sur "/" : évite qu'un préfixe partagé entre deux routes
  // (ex. /portfolio et /portfolio-categories) ne mette en surbrillance les deux
  // items de navigation à la fois.
  function isActive(to: string): boolean {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function renderNavItem(item: NavItem) {
    const active = isActive(item.to);
    return (
      <MantineNavLink
        key={item.to}
        component={NavLink}
        to={item.to}
        label={item.label}
        leftSection={<item.icon size={18} />}
        active={active}
        variant="subtle"
        styles={{
          root: {
            borderRadius: 8,
            backgroundColor: active ? 'white' : 'transparent',
          },
          label: {
            color: active ? 'var(--mantine-color-brand-9)' : 'var(--mantine-color-brand-1)',
            fontWeight: active ? 600 : 500,
            fontSize: 14,
          },
          section: {
            color: active ? 'var(--mantine-color-brand-7)' : 'var(--mantine-color-brand-2)',
          },
        }}
      />
    );
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 264, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" gap="sm">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Text size="sm" c="dimmed" visibleFrom="sm">
            Pixellia Photographie — Administration
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" bg="brand.9" style={{ border: 'none' }}>
        <Stack gap={4} h="100%">
          <Group gap={10} px="xs" pb="lg" pt={4} wrap="nowrap">
            <ThemeIcon size={36} radius="md" color="brand.5">
              <IconCamera size={20} />
            </ThemeIcon>
            <div>
              <Text c="white" fw={700} size="sm" lh={1.2}>
                Pixellia
              </Text>
              <Text c="brand.2" size="xs" lh={1.2}>
                Administration
              </Text>
            </div>
          </Group>

          <Text c="brand.3" size="xs" fw={600} tt="uppercase" px="xs" pb={6} style={{ letterSpacing: 0.5 }}>
            Contenu du site
          </Text>

          <Stack gap={2}>{NAV_ITEMS.map(renderNavItem)}</Stack>

          <Text
            c="brand.3"
            size="xs"
            fw={600}
            tt="uppercase"
            px="xs"
            pt="lg"
            pb={6}
            style={{ letterSpacing: 0.5 }}
          >
            Système
          </Text>
          <Stack gap={2}>{NAV_ITEMS_SYSTEM.map(renderNavItem)}</Stack>

          <Box style={{ flexGrow: 1 }} />

          <Divider color="brand.7" mb="sm" />
          <Group gap={10} px="xs" pb={4} justify="space-between" wrap="nowrap">
            <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
              <Avatar radius="xl" size={32} color="brand.4">
                {initial}
              </Avatar>
              <Box style={{ minWidth: 0 }}>
                <Text c="white" size="xs" fw={600} truncate>
                  {user?.email ?? 'Admin'}
                </Text>
                <Text c="brand.3" size="xs">
                  Compte admin
                </Text>
              </Box>
            </Group>
            <Button
              variant="subtle"
              color="brand.2"
              size="xs"
              px={6}
              onClick={handleLogout}
              aria-label="Déconnexion"
            >
              <IconLogout size={16} />
            </Button>
          </Group>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main bg="brand.0">
        <Box
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 'var(--mantine-spacing-xl)',
            boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
          }}
        >
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
