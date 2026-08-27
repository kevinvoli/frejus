import React, { useEffect, useState } from 'react';
import Lightbox from './Lightbox';
import { apiGet, assetUrl } from '../api/client';
import type { Specialty } from '../api/types';

interface SpecialtyDetailProps {
  id: number;
  // Retour au site vitrine (gère l'URL et l'état, voir App.tsx) — pas de routeur
  // dédié pour ce site, même principe que GalleryView.tsx pour la médiathèque.
  onBack: () => void;
}

type ViewState = 'loading' | 'found' | 'not-found';

// Prix en francs CFA, sans décimales — voir specialty-tariff.entity.ts côté backend.
function formatPrice(price: number): string {
  return `${price.toLocaleString('fr-FR')} F CFA`;
}

// Page dédiée d'une spécialité, ouverte quand le visiteur clique sur sa carte
// (voir Specialties.tsx / App.tsx) : galerie de photos façon Pinterest (grille en
// colonnes CSS, chaque photo cliquable pour l'agrandir) et grille tarifaire des
// sous-services de cette spécialité, gérée depuis le panneau admin (voir
// docs/ANALYSE-PLAN-BACKEND.md, ajout du 27/08). Sans routeur dédié, comme
// GalleryView.tsx : accessible via /?specialite=<id>.
const SpecialtyDetail: React.FC<SpecialtyDetailProps> = ({ id, onBack }) => {
  const [state, setState] = useState<ViewState>('loading');
  const [specialty, setSpecialty] = useState<Specialty | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    apiGet<Specialty>(`/specialties/${id}`)
      .then((data) => {
        if (cancelled) return;
        setSpecialty(data);
        setState('found');
      })
      .catch(() => {
        if (cancelled) return;
        setState('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const photoUrls = (specialty?.photos ?? [])
    .map((photo) => assetUrl(photo.fileUrl))
    .filter((url): url is string => Boolean(url));

  return (
    <div className="specialty-detail">
      <header className="gallery-header">
        <div className="container gallery-header-content">
          <a
            href="/"
            className="logo"
            onClick={(event) => {
              event.preventDefault();
              onBack();
            }}
          >
            Pixellia Photographie
          </a>
        </div>
      </header>

      <main className="gallery-main container">
        {state === 'loading' && <p className="gallery-status">Chargement...</p>}

        {state === 'not-found' && (
          <div className="gallery-status gallery-status-error">
            <h1>Spécialité introuvable</h1>
            <p>Cette spécialité n'existe pas ou plus.</p>
          </div>
        )}

        {state === 'found' && specialty && (
          <>
            <div className="specialty-detail-intro">
              <h1>{specialty.title}</h1>
              {specialty.description && <p>{specialty.description}</p>}
            </div>

            {specialty.tariffs.length > 0 && (
              <section className="specialty-tariffs">
                <h2>Tarifs</h2>
                <div className="specialty-tariffs-grid">
                  {specialty.tariffs.map((tariff) => (
                    <div className="tariff-card" key={tariff.id}>
                      <h3>{tariff.name}</h3>
                      <p className="tariff-price">{formatPrice(tariff.price)}</p>
                      {tariff.detail && <p className="tariff-detail">{tariff.detail}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {photoUrls.length > 0 && (
              <section>
                <h2 className="specialty-masonry-title">Galerie</h2>
                <div className="specialty-masonry">
                  {photoUrls.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      className="specialty-masonry-item"
                      onClick={() => setActivePhotoIndex(index)}
                      aria-label={`Agrandir la photo ${index + 1}`}
                    >
                      <img src={url} alt={`${specialty.title} — photo ${index + 1}`} loading="lazy" />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {activePhotoIndex !== null && photoUrls.length > 0 && (
        <Lightbox
          title={specialty?.title ?? ''}
          images={photoUrls}
          activeIndex={activePhotoIndex}
          onClose={() => setActivePhotoIndex(null)}
          onNavigate={setActivePhotoIndex}
        />
      )}
    </div>
  );
};

export default SpecialtyDetail;
