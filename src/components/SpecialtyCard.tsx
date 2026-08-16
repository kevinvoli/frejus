import React from 'react';

interface SpecialtyCardProps {
  title: string;
  description: string;
  backgroundColor: string;
}

const SpecialtyCard: React.FC<SpecialtyCardProps> = ({ title, description, backgroundColor }) => {
  return (
    <div className="specialty-card">
      <div className="specialty-image" style={{ backgroundColor }}></div>
      <div className="specialty-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default SpecialtyCard;
