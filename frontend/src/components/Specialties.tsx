import React, { useEffect, useState } from 'react';
import SpecialtyCard from './SpecialtyCard';
import Lightbox from './Lightbox';
import { apiGet, assetUrl } from '../api/client';
import type { Specialty } from '../api/types';
import { DEFAULT_SPECIALTIES, PLACEHOLDER_COLORS } from '../defaultContent';

const Specialties: React.FC = () => {
  // Initialisé avec le contenu de repli : le visiteur voit toujours quelque chose,
  // même pendant le chargement ou si l'API est injoignable.
  const [items, setItems] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  // Index (dans `items`) de la spécialité dont la galerie est ouverte, ou null.
  const [openSpecialtyIndex, setOpenSpecialtyIndex] = useState<number | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiGet<Specialty[]>('/specialties')
      .then((data) => {
        if (!cancelled && data.length > 0) setItems(data);
      })
      .catch(() => {
        // Repli silencieux sur DEFAULT_SPECIALTIES.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openSpecialty = openSpecialtyIndex !== null ? items[openSpecialtyIndex] : undefined;
  const catalogUrls = (openSpecialty?.photos ?? [])
    .map((photo) => assetUrl(photo.fileUrl))
    .filter((url): url is string => Boolean(url));

  return (
    <section className="specialties" id="services">
      <div className="container">
        <h2 className="section-title">Mes spécialités</h2>
        <div className="specialties-grid">
          {items.map((item, index) => (
            <SpecialtyCard
              key={item.id}
              title={item.title}
              description={item.description ?? ''}
              imageUrl={assetUrl(item.imageUrl)}
              fallbackColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
              onOpenCatalog={
                item.photos.length > 0
                  ? () => {
                      setOpenSpecialtyIndex(index);
                      setActivePhotoIndex(0);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {openSpecialty && catalogUrls.length > 0 && (
        <Lightbox
          title={openSpecialty.title}
          images={catalogUrls}
          activeIndex={activePhotoIndex}
          onClose={() => setOpenSpecialtyIndex(null)}
          onNavigate={setActivePhotoIndex}
        />
      )}
    </section>
  );
};

export default Specialties;
