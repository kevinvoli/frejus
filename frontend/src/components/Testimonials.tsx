import React, { useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import type { Testimonial } from '../api/types';
import { DEFAULT_TESTIMONIALS } from '../defaultContent';

const Testimonials: React.FC = () => {
  // Initialisé avec le contenu de repli : le visiteur voit toujours quelque chose,
  // même pendant le chargement ou si l'API est injoignable. GET /testimonials ne
  // renvoie de toute façon que les témoignages publiés (filtrage côté backend).
  const [items, setItems] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);

  useEffect(() => {
    let cancelled = false;
    apiGet<Testimonial[]>('/testimonials')
      .then((data) => {
        if (!cancelled && data.length > 0) setItems(data);
      })
      .catch(() => {
        // Repli silencieux sur DEFAULT_TESTIMONIALS.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="testimonials">
      <div className="container">
        <h2 className="section-title">Ce que disent mes clients</h2>
        <div className="testimonials-slider">
          {items.map((item) => (
            <div className="testimonial" key={item.id}>
              <p className="testimonial-text">"{item.text}"</p>
              <p className="client-name">- {item.clientName}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
