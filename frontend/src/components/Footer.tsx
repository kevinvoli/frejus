import React from 'react';
import { assetUrl } from '../api/client';
import type { LegalSlug } from './LegalPage';
import type { SiteSettings } from '../api/types';

interface FooterProps {
  settings: SiteSettings;
  // Pour ouvrir une des 3 pages légales sans rechargement complet (voir LegalPage.tsx
  // / App.tsx) — même principe que onOpenSpecialty côté Specialties.tsx.
  onOpenLegal: (slug: LegalSlug) => void;
}

function handleLegalClick(e: React.MouseEvent, onOpenLegal: (slug: LegalSlug) => void, slug: LegalSlug) {
  // Clic simple sans modificateur : navigation interne sans rechargement. Un clic
  // molette/ctrl/cmd (nouvel onglet) suit le href normalement grâce au lien
  // "/?page=..." ci-dessous, qui reste un lien partageable/valide en soi.
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  onOpenLegal(slug);
}

const Footer: React.FC<FooterProps> = ({ settings, onOpenLegal }) => {
  const logoUrl = assetUrl(settings.logoUrl);
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-about">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={settings.studioName ?? 'Pixellia Photographie'}
                className="footer-logo-image"
              />
            ) : (
              <div className="footer-logo">Pixellia</div>
            )}
            <p>{settings.studioName ?? 'Pixellia Photographie'} — capturer l'essence de vos moments précieux.</p>
          </div>
          <div className="footer-links">
            <h4>Liens rapides</h4>
            <ul>
              <li><a href="#accueil">Accueil</a></li>
              <li><a href="#apropos">À propos</a></li>
              <li><a href="#portfolio">Portfolio</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Services</h4>
            <ul>
              <li><a href="#">Portrait</a></li>
              <li><a href="#">Mariage</a></li>
              <li><a href="#">Paysage</a></li>
              <li><a href="#">Événements</a></li>
              <li><a href="#">Studio</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <ul>
              <li>
                <a
                  href="/?page=mentions-legales"
                  onClick={(e) => handleLegalClick(e, onOpenLegal, 'mentions-legales')}
                >
                  Mentions légales
                </a>
              </li>
              <li>
                <a
                  href="/?page=politique-confidentialite"
                  onClick={(e) => handleLegalClick(e, onOpenLegal, 'politique-confidentialite')}
                >
                  Politique de confidentialité
                </a>
              </li>
              <li>
                <a
                  href="/?page=conditions-generales"
                  onClick={(e) => handleLegalClick(e, onOpenLegal, 'conditions-generales')}
                >
                  Conditions générales
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="copyright">
          <p>&copy; {new Date().getFullYear()} {settings.studioName ?? 'Pixellia Photographie'}. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
