import React, { useEffect, useState } from 'react';
import Header from './Header';
import { apiGet } from '../api/client';

// Les 3 pages légales du site (voir Footer.tsx) : accessibles via /?page=<slug>, sans
// routeur dédié — même principe que GalleryView.tsx (?galerie=) et
// SpecialtyDetail.tsx (?specialite=).
export const LEGAL_SLUGS = [
  'mentions-legales',
  'politique-confidentialite',
  'conditions-generales',
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string | null): value is LegalSlug {
  return value !== null && (LEGAL_SLUGS as readonly string[]).includes(value);
}

interface LegalSettingsResponse {
  mentionsLegales: string | null;
  politiqueConfidentialite: string | null;
  conditionsGenerales: string | null;
}

interface LegalPageProps {
  slug: LegalSlug;
  // Pour afficher la barre de navigation complète (voir Header.tsx) même sur cette
  // page — elle ne doit jamais disparaître en changeant de page.
  onOpenGallery: (code: string) => void;
}

const TITLES: Record<LegalSlug, string> = {
  'mentions-legales': 'Mentions légales',
  'politique-confidentialite': 'Politique de confidentialité',
  'conditions-generales': 'Conditions générales',
};

const FIELD_BY_SLUG: Record<LegalSlug, keyof LegalSettingsResponse> = {
  'mentions-legales': 'mentionsLegales',
  'politique-confidentialite': 'politiqueConfidentialite',
  'conditions-generales': 'conditionsGenerales',
};

type ViewState = 'loading' | 'ready' | 'error';

// Page dédiée à une des 3 pages légales, gérées depuis le panneau admin (voir
// docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08 et
// backend/src/settings/entities/legal-settings.entity.ts). GET /settings/legal est
// public côté backend — pas besoin d'authentification pour afficher ce contenu.
const LegalPage: React.FC<LegalPageProps> = ({ slug, onOpenGallery }) => {
  const [state, setState] = useState<ViewState>('loading');
  const [content, setContent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiGet<LegalSettingsResponse>('/settings/legal')
      .then((data) => {
        if (cancelled) return;
        setContent(data[FIELD_BY_SLUG[slug]]);
        setState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="legal-page">
      <Header onOpenGallery={onOpenGallery} />

      <main className="gallery-main container legal-page-main">
        <h1>{TITLES[slug]}</h1>

        {state === 'loading' && <p className="gallery-status">Chargement...</p>}

        {state === 'error' && (
          <p className="gallery-status gallery-status-error">
            Impossible de charger cette page pour le moment. Merci de réessayer plus tard.
          </p>
        )}

        {state === 'ready' && !content && (
          <p className="gallery-status">Ce contenu n'a pas encore été renseigné.</p>
        )}

        {state === 'ready' && content && (
          <div className="legal-page-content">
            {content
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LegalPage;
