import React from 'react';
import { assetUrl } from '../api/client';
import type { SiteSettings } from '../api/types';

interface HeroProps {
  settings: SiteSettings;
}

const Hero: React.FC<HeroProps> = ({ settings }) => {
  const imageUrl = assetUrl(settings.heroImageUrl);

  return (
    <section
      className="hero"
      id="accueil"
      // Si une image d'accueil a été renseignée dans le panneau admin, elle remplace
      // celle de repli définie dans index.css (.hero) ; sinon on garde cette dernière.
      style={
        imageUrl
          ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${imageUrl}')` }
          : undefined
      }
    >
      <div className="hero-content">
        <h1>{settings.heroTitle}</h1>
        <p>{settings.heroSubtitle}</p>
        <a href="#portfolio" className="btn">Découvrir mon travail</a>
      </div>
    </section>
  );
};

export default Hero;
