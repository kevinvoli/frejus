import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="hero" id="accueil">
      <div className="hero-content">
        <h1>Capturer l'instant, créer l'éternel</h1>
        <p>Photographe professionnel spécialisé en portrait, mariage et paysages. Basé à Paris, disponible en France et à l'international.</p>
        <a href="#portfolio" className="btn">Découvrir mon travail</a>
      </div>
    </section>
  );
};

export default Hero;
