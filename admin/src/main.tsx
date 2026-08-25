import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './index.css';
import { Button, Card, createTheme, MantineProvider, Paper } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App.tsx';

// Palette "Pixellia" : vert forêt (identité studio photo) pour la sidebar et les
// actions principales, sur un fond très clair (quasi blanc, légèrement vert) pour le
// contenu — cf. la maquette fournie par le client (frejus.jpg).
const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  defaultRadius: 'md',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  colors: {
    brand: [
      '#EFF7F3', // 0 — fond de page (très clair)
      '#D9EDE3', // 1
      '#B3DBC8', // 2
      '#86C4A8', // 3
      '#59AC88', // 4
      '#3B9270', // 5
      '#28785A', // 6 — couleur des boutons/actions principales
      '#1D5C45', // 7
      '#153F30', // 8
      '#0E2A20', // 9 — vert profond de la sidebar
    ],
  },
  components: {
    Paper: Paper.extend({ defaultProps: { radius: 'lg' } }),
    Card: Card.extend({ defaultProps: { radius: 'lg', shadow: 'sm' } }),
    Button: Button.extend({ defaultProps: { radius: 'md' } }),
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <App />
    </MantineProvider>
  </StrictMode>,
);
