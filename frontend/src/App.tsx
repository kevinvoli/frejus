import React, { useEffect, useState } from 'react';
import './index.css';
import { apiGet, assetUrl } from './api/client';
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
import LegalPage, { isLegalSlug, type LegalSlug } from './components/LegalPage';

// Lit un entier positif depuis un paramètre de requête, ou null si absent/invalide —
// utilisé pour ?specialite=<id> ci-dessous (voir handleOpenSpecialty).
function readIdParam(name: string): number | null {
  const raw = new URLSearchParams(window.location.search).get(name);
  const id = raw ? Number(raw) : NaN;
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Hauteur du header fixe (voir .hero { margin-top: 70px } dans index.css) : à
// déduire pour qu'une section ciblée par une ancre ne se retrouve pas cachée dessous.
const FIXED_HEADER_HEIGHT = 70;

// Défile jusqu'à la section ciblée par le hash de l'URL (ex. "#portfolio"), avec un
// léger différé pour laisser le temps au premier rendu de peindre les sections. Sert
// de filet de sécurité au comportement natif du navigateur : les liens du menu (voir
// Header.tsx) pointent vers "/#ancre" pour fonctionner aussi depuis les autres pages
// du site (médiathèque, page dédiée d'une spécialité) — depuis ces pages, changer de
// page ET défiler jusqu'à l'ancre en une seule navigation n'est pas toujours fiable
// selon le navigateur.
function scrollToHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const target = document.getElementById(hash);
  if (!target) return;
  const top = target.getBoundingClientRect().top + window.scrollY - FIXED_HEADER_HEIGHT;
  window.scrollTo({ top, behavior: 'smooth' });
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

  // Pages légales (Mentions légales, Politique de confidentialité, Conditions
  // générales — voir LegalPage.tsx et Footer.tsx) : même principe, un paramètre
  // /?page=<slug> plutôt qu'un routeur dédié.
  const [legalSlug, setLegalSlug] = useState<LegalSlug | null>(() => {
    const raw = new URLSearchParams(window.location.search).get('page');
    return isLegalSlug(raw) ? raw : null;
  });

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

  function handleOpenLegal(slug: LegalSlug) {
    window.history.pushState(null, '', `?page=${slug}`);
    setLegalSlug(slug);
    window.scrollTo(0, 0);
  }

  // Réglages du site (accroche, à propos, coordonnées...) chargés une seule fois ici
  // et redistribués aux sections concernées, plutôt qu'un fetch par section — c'est
  // la même ressource singleton (GET /settings) partout. Initialisé avec le contenu
  // de repli pour ne jamais afficher une page vide pendant le chargement, ou si
  // l'API est injoignable.
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Chargé sur toutes les pages, y compris les pages dédiées (médiathèque, page
    // d'une spécialité, pages légales) : ces pages n'utilisent pas `settings` pour
    // leur propre contenu, mais le favicon (voir l'effet ci-dessous) doit s'afficher
    // partout, y compris sur un lien direct vers l'une de ces pages.
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

  // Icône affichée dans l'onglet du navigateur (voir GeneralSettingsForm.tsx côté
  // panneau admin) : index.html est un fichier statique, donc injectée ici plutôt
  // qu'au moment du build. Ne fait rien tant qu'aucun favicon n'est renseigné (garde
  // l'icône par défaut du navigateur/Vite).
  useEffect(() => {
    const href = assetUrl(settings.faviconUrl);
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [settings.faviconUrl]);

  useEffect(() => {
    if (galleryToken || specialtyId || legalSlug) return;
    // Défilement différé à la frame suivante : laisse le premier rendu peindre les
    // sections avant de mesurer leur position (voir scrollToHash ci-dessus).
    const raf = requestAnimationFrame(scrollToHash);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (galleryToken) {
    return <GalleryView token={galleryToken} onOpenGallery={handleOpenGallery} />;
  }

  if (specialtyId) {
    return <SpecialtyDetail id={specialtyId} onOpenGallery={handleOpenGallery} />;
  }

  if (legalSlug) {
    return <LegalPage slug={legalSlug} onOpenGallery={handleOpenGallery} />;
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
      <Footer settings={settings} onOpenLegal={handleOpenLegal} />
    </div>
  );
};

export default App;
