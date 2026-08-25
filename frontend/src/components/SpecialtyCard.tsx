import React from 'react';

interface SpecialtyCardProps {
  title: string;
  description: string;
  imageUrl?: string;
  fallbackColor: string;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ title, description, imageUrl, fallbackColor }) => {
  return (
    <div className="specialty-card">
      <div className="specialty-image" style={imageUrl ? undefined : { backgroundColor: fallbackColor }}>
        {imageUrl && <img src={imageUrl} alt={title} />}
      </div>
      <div className="specialty-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default SpecialtyCard;
