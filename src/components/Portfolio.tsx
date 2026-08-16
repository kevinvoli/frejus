import React, { useState } from 'react';

interface PortfolioItem {
  id: number;
  category: string;
  backgroundColor: string;
}

const Portfolio: React.FC = () => {
  const [filter, setFilter] = useState('Tous');

  const items: PortfolioItem[] = [
    { id: 1, category: 'Portrait', backgroundColor: '#d4c9b8' },
    { id: 2, category: 'Mariage', backgroundColor: '#b8d4c9' },
    { id: 3, category: 'Paysage', backgroundColor: '#c9b8d4' },
    { id: 4, category: 'Portrait', backgroundColor: '#d4b8c9' },
    { id: 5, category: 'Événements', backgroundColor: '#b8c9d4' },
    { id: 6, category: 'Mariage', backgroundColor: '#c9d4b8' },
  ];

  const categories = ['Tous', 'Portrait', 'Mariage', 'Paysage', 'Événements'];

  const filteredItems = filter === 'Tous' 
    ? items 
    : items.filter(item => item.category === filter);

  return (
    <section className="portfolio" id="portfolio">
      <div className="container">
        <h2 className="section-title">Mon portfolio</h2>
        <div className="portfolio-filters">
          {categories.map(cat => (
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
          {filteredItems.map(item => (
            <div 
              key={item.id} 
              className="portfolio-item" 
              style={{ backgroundColor: item.backgroundColor }}
            ></div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Portfolio;
