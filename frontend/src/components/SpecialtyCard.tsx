import React from 'react';

interface SpecialtyCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  fallbackColor: string;
  // Présent uniquement si la spécialité a du contenu à montrer (photos de catalogue
  // et/ou tarifs, voir Specialties.tsx) : la carte devient alors cliquable et envoie
  // vers la page dédiée de la spécialité (galerie façon Pinterest + tarifs).
  onOpen?: () => void;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({
  title,
  description,
  imageUrl,
  fallbackColor,
  onOpen,
}) => {
  const clickable = Boolean(onOpen);

  return (
    <div
      className={clickable ? 'specialty-card specialty-card-clickable' : 'specialty-card'}
      onClick={onOpen}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
    >
      <div className="specialty-image" style={imageUrl ? undefined : { backgroundColor: fallbackColor }}>
        {imageUrl && <img src={imageUrl} alt={title} />}
        {clickable && <span className="specialty-catalog-badge">Voir les tarifs & la galerie</span>}
      </div>
      <div className="specialty-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default SpecialtyCard;
