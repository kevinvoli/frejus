import React, { useEffect, useCallback } from 'react';

interface LightboxProps {
  title: string;
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

// Galerie plein écran pour le catalogue de photos d'une spécialité (voir
// Specialties.tsx / SpecialtyCard.tsx). Composant volontairement simple et sans
// dépendance externe, sur le même principe que le reste du site vitrine.
const Lightbox: React.FC<LightboxProps> = ({ title, images, activeIndex, onClose, onNavigate }) => {
  const goToPrevious = useCallback(() => {
    onNavigate((activeIndex - 1 + images.length) % images.length);
  }, [activeIndex, images.length, onNavigate]);

  const goToNext = useCallback(() => {
    onNavigate((activeIndex + 1) % images.length);
  }, [activeIndex, images.length, onNavigate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') goToPrevious();
      else if (event.key === 'ArrowRight') goToNext();
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goToPrevious, goToNext]);

  if (images.length === 0) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <button className="lightbox-close" onClick={onClose} aria-label="Fermer">
        &times;
      </button>

      <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
        {images.length > 1 && (
          <button
            className="lightbox-nav lightbox-prev"
            onClick={goToPrevious}
            aria-label="Photo précédente"
          >
            &#8249;
          </button>
        )}

        <figure className="lightbox-figure">
          <img src={images[activeIndex]} alt={`${title} — photo ${activeIndex + 1}`} />
          <figcaption>
            {title} — {activeIndex + 1} / {images.length}
          </figcaption>
        </figure>

        {images.length > 1 && (
          <button className="lightbox-nav lightbox-next" onClick={goToNext} aria-label="Photo suivante">
            &#8250;
          </button>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
