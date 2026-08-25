import React from 'react';
import { assetUrl } from '../api/client';
import type { SiteSettings } from '../api/types';

interface AboutProps {
  settings: SiteSettings;
}

const About: React.FC<AboutProps> = ({ settings }) => {
  const imageUrl = assetUrl(settings.aboutImageUrl);
  // Le texte "à propos" est saisi en un seul bloc dans le panneau admin ; on le
  // redécoupe en paragraphes sur les lignes vides pour garder une mise en page
  // proche du gabarit d'origine (plusieurs <p>).
  const paragraphs = (settings.aboutText ?? '').split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <section className="about" id="apropos">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2>À propos de moi</h2>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <a href="#contact" className="btn" style={{ marginTop: '20px' }}>Prendre rendez-vous</a>
          </div>
          <div className="about-image">
            {imageUrl && <img src={imageUrl} alt="Le photographe" />}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
