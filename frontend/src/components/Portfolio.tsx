import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, assetUrl } from '../api/client';
import type { PortfolioItem } from '../api/types';
import { DEFAULT_PORTFOLIO, PLACEHOLDER_COLORS } from '../defaultContent';

const Portfolio: React.FC = () => {
  const [filter, setFilter] = useState('Tous');
  // Initialisé avec le contenu de repli : le visiteur voit toujours quelque chose,
  // même pendant le chargement ou si l'API est injoignable. GET /portfolio ne renvoie
  // de toute façon que les éléments publiés (filtrage fait côté backend).
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO);

  useEffect(() => {
    let cancelled = false;
    apiGet<PortfolioItem[]>('/portfolio')
      .then((data) => {
        if (!cancelled && data.length > 0) setItems(data);
      })
      .catch(() => {
        // Repli silencieux sur DEFAULT_PORTFOLIO.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Catégories dérivées des éléments reçus (plutôt qu'une liste figée), pour que les
  // filtres suivent automatiquement ce qui est saisi dans le panneau admin.
  const categories = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.category)));
    return ['Tous', ...unique];
  }, [items]);

  const filteredItems = filter === 'Tous' ? items : items.filter((item) => item.category === filter);

  return (
    <section className="portfolio" id="portfolio">
      <div className="container">
        <h2 className="section-title">Mon portfolio</h2>
        <div className="portfolio-filters">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="portfolio-grid">
          {filteredItems.map((item, index) => {
            const imageUrl = assetUrl(item.imageUrl);
            return (
              <div
                key={item.id}
                className="portfolio-item"
                style={imageUrl ? undefined : { backgroundColor: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length] }}
              >
                {imageUrl && <img src={imageUrl} alt={item.title} />}
              </div>
            );
          })}
          {filteredItems.length === 0 && <p>Aucune photo dans cette catégorie pour l'instant.</p>}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
