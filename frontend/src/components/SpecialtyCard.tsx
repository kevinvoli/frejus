import React from 'react';

interface SpecialtyCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  fallbackColor: string;
  // Présent uniquement si la spécialité a un catalogue de photos (voir
  // Specialties.tsx) : la carte devient alors cliquable et ouvre la galerie.
  onOpenCatalog?: () => void;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({
  title,
  description,
  imageUrl,
  fallbackColor,
  onOpenCatalog,
}) => {
  const clickable = Boolean(onOpenCatalog);

  return (
    <div
      className={clickable ? 'specialty-card specialty-card-clickable' : 'specialty-card'}
      onClick={onOpenCatalog}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpenCatalog?.();
              }
            }
          : undefined
      }
    >
      <div className="specialty-image" style={imageUrl ? undefined : { backgroundColor: fallbackColor }}>
        {imageUrl && <img src={imageUrl} alt={title} />}
        {clickable && <span className="specialty-catalog-badge">Voir la galerie</span>}
      </div>
      <div className="specialty-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default SpecialtyCard;
