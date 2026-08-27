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
import GalleryView from './components/GalleryView';
import SpecialtyDetail from './components/SpecialtyDetail';

// Lit un entier positif depuis un paramètre de requête, ou null si absent/invalide —
// utilisé pour ?specialite=<id> ci-dessous (voir handleOpenSpecialty).
function readIdParam(name: string): number | null {
  const raw = new URLSearchParams(window.location.search).get(name);
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

const App: React.FC = () => {
  // Médiathèque cliente : affiche la galerie privée à la place du site vitrine, sans
  // routeur dédié (voir GalleryView.tsx). Deux façons d'y arriver : un lien direct
  // /?galerie=<code> (lu une seule fois au montage), ou le bouton "Récupérer mes
  // photos" du menu — le parcours principal désormais, puisque le photographe
  // partage le lien normal du site et communique juste un code à chaque client.
  const [galleryToken, setGalleryToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('galerie'),
  );

  // Page dédiée d'une spécialité (galerie façon Pinterest + tarifs, voir
  // SpecialtyDetail.tsx) : même principe que la médiathèque ci-dessus, un paramètre
  // d'URL /?specialite=<id> plutôt qu'un routeur dédié pour ce site vitrine.
  const [specialtyId, setSpecialtyId] = useState<number | null>(() => readIdParam('specialite'));

  function handleOpenGallery(code: string) {
    // Nettoyage : le client peut taper le code avec des espaces/tirets/minuscules
    // (voir la mise en forme "XXXX-XXXX" affichée dans l'admin) — le backend
    // normalise aussi de son côté, mais autant garder l'URL propre.
    const normalized = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!normalized) return;
    window.history.pushState(null, '', `?galerie=${normalized}`);
    setGalleryToken(normalized);
  }

  function handleOpenSpecialty(id: number) {
    window.history.pushState(null, '', `?specialite=${id}`);
    setSpecialtyId(id);
    window.scrollTo(0, 0);
  }

  function handleCloseSpecialty() {
    window.history.pushState(null, '', '/');
    setSpecialtyId(null);
  }

  // Réglages du site (accroche, à propos, coordonnées...) chargés une seule fois ici
  // et redistribués aux sections concernées, plutôt qu'un fetch par section — c'est
  // la même ressource singleton (GET /settings) partout. Initialisé avec le contenu
  // de repli pour ne jamais afficher une page vide pendant le chargement, ou si
  // l'API est injoignable.
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (galleryToken || specialtyId) return; // Pages dédiées : les réglages du site ne sont pas utilisés.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (galleryToken) {
    return <GalleryView token={galleryToken} />;
  }

  if (specialtyId) {
    return <SpecialtyDetail id={specialtyId} onBack={handleCloseSpecialty} />;
  }

  return (
    <div className="App">
      <Header onOpenGallery={handleOpenGallery} />
      <main>
        <Hero settings={settings} />
        <About settings={settings} />
        <Specialties onOpenSpecialty={handleOpenSpecialty} />
        <Portfolio />
        <Testimonials />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
    </div>
  );
};

export default App;
