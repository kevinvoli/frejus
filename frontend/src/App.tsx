import React, { useEffect, useState } from 'react';
import './index.css';
import { apiGet } from './api/client';
import type { SiteSettings } from './api/types';
import { DEFAULT_SETTINGS } from './defaultContent';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Specialties from './components/Specialties';
import Portfolio from './components/Portfolio';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';

const App: React.FC = () => {
  // Réglages du site (accroche, à propos, coordonnées...) chargés une seule fois ici
  // et redistribués aux sections concernées, plutôt qu'un fetch par section — c'est
  // la même ressource singleton (GET /settings) partout. Initialisé avec le contenu
  // de repli pour ne jamais afficher une page vide pendant le chargement, ou si
  // l'API est injoignable.
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    apiGet<SiteSettings>('/settings')
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch(() => {
        // API injoignable (backend arrêté, etc.) : on garde le contenu de repli plutôt
        // que de casser l'affichage du site vitrine.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="App">
      <Header />
      <main>
        <Hero settings={settings} />
        <About settings={settings} />
        <Specialties />
        <Portfolio />
        <Testimonials />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
    </div>
  );
};

export default App;
