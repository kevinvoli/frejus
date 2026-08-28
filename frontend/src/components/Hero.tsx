import React, { useEffect, useState } from 'react';
import { assetUrl } from '../api/client';
import type { SiteSettings } from '../api/types';

interface HeroProps {
  settings: SiteSettings;
}

// Défilement automatique du carousel — voir docs/ANALYSE-PLAN-BACKEND.md, ajout du
// 27/08 : plusieurs images activables dans le panneau admin, chacune avec son propre
// sous-titre optionnel qui défile avec elle, alors que le titre d'accroche
// (settings.heroTitle) reste unique et fixe quelle que soit l'image affichée.
const SLIDE_INTERVAL_MS = 6000;

const Hero: React.FC<HeroProps> = ({ settings }) => {
  const slides = settings.heroSlides;
  const [activeIndex, setActiveIndex] = useState(0);

  // Si la liste change (rechargement des réglages, image supprimée dans l'admin...),
  // repart du début plutôt que de pointer sur un index qui n'existe plus.
  useEffect(() => {
    setActiveIndex(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] ?? null;

  return (
    <section className="hero" id="accueil">
      {/* Une couche par image, superposées et fondues en CSS (voir .hero-slide dans
          index.css) plutôt qu'un remplacement direct de background-image, pour une
          transition en douceur d'une image à l'autre. Sans aucune image activée dans
          le panneau admin, cette liste est vide et le fond de repli défini sur .hero
          (index.css) reste visible tel quel. */}
      {slides.map((slide, index) => {
        const url = assetUrl(slide.imageUrl);
        return (
          <div
            key={slide.id}
            className={`hero-slide${index === activeIndex ? ' hero-slide-active' : ''}`}
            style={
              url
                ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${url}')` }
                : undefined
            }
            aria-hidden={index !== activeIndex}
          />
        );
      })}

      <div className="hero-content">
        <h1>{settings.heroTitle}</h1>
        {activeSlide?.subtitle && <p key={activeSlide.id}>{activeSlide.subtitle}</p>}
        <a href="#portfolio" className="btn">Découvrir mon travail</a>
      </div>

      {slides.length > 1 && (
        <div className="hero-dots" role="tablist" aria-label="Choisir une image d'accueil">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              className={`hero-dot${index === activeIndex ? ' hero-dot-active' : ''}`}
              aria-selected={index === activeIndex}
              aria-label={`Image ${index + 1} sur ${slides.length}`}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default Hero;
