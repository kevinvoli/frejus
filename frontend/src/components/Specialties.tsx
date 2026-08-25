import React, { useEffect, useState } from 'react';
import SpecialtyCard from './SpecialtyCard';
import { apiGet, assetUrl } from '../api/client';
import type { Specialty } from '../api/types';
import { DEFAULT_SPECIALTIES, PLACEHOLDER_COLORS } from '../defaultContent';

const Specialties: React.FC = () => {
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
          {items.map((item, index) => (
            <SpecialtyCard
              key={item.id}
              title={item.title}
              description={item.description ?? ''}
              imageUrl={assetUrl(item.imageUrl)}
              fallbackColor={PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Specialties;
