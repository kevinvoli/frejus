import React, { useEffect, useState } from 'react';
import SpecialtyCard from './SpecialtyCard';
import { apiGet, assetUrl } from '../api/client';
import type { Specialty } from '../api/types';
import { DEFAULT_SPECIALTIES, PLACEHOLDER_COLORS } from '../defaultContent';

interface SpecialtiesProps {
  // Envoie vers la page dédiée de la spécialité (galerie façon Pinterest + tarifs,
  // voir SpecialtyDetail.tsx) — gérée par App.tsx, sur le même principe que
  // `onOpenGallery` pour la médiathèque (pas de routeur dédié pour ce site vitrine).
  onOpenSpecialty: (id: number) => void;
}

const Specialties: React.FC<SpecialtiesProps> = ({ onOpenSpecialty }) => {
  // Initialisé avec le contenu de repli : le visiteur voit toujours quelque chose,
  // même pendant le chargement ou si l'API est injoignable.
  const [items, setItems] = useState<Specialty[]>(DEFAULT_SPECIALTIES);

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

  return (
    <section className="specialties" id="services">
      <div className="container">
        <h2 className="section-title">Mes spécialités</h2>
        <div className="specialties-grid">
          {items.map((item, index) => {
            // Cliquable dès qu'il y a quelque chose à montrer sur la page dédiée
            // (photos de catalogue et/ou tarifs) — sinon rien à afficher de plus que
            // la carte elle-même.
            const hasDetail = item.photos.length > 0 || item.tariffs.length > 0;
            return (
              <SpecialtyCard
                key={item.id}
                title={item.title}
                description={item.description ?? ''}
                imageUrl={assetUrl(item.imageUrl)}
                fallbackColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
                onOpen={hasDetail ? () => onOpenSpecialty(item.id) : undefined}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Specialties;
