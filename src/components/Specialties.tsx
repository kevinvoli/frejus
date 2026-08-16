import React from 'react';
import SpecialtyCard from './SpecialtyCard';

const Specialties: React.FC = () => {
  const specialtiesData = [
    {
      title: "Portrait",
      description: "Séances photo personnalisées pour capturer votre personnalité et votre essence dans des cadres naturels ou en studio.",
      backgroundColor: "#c4b8a5"
    },
    {
      title: "Mariage",
      description: "Reportage discret et émouvant de votre journée spéciale, pour revivre chaque instant précieux.",
      backgroundColor: "#a5b8c4"
    },
    {
      title: "Paysage",
      description: "Exploration des plus beaux paysages à la recherche de lumières uniques et de perspectives originales.",
      backgroundColor: "#b8a5c4"
    }
  ];

  return (
    <section className="specialties" id="services">
      <div className="container">
        <h2 className="section-title">Mes spécialités</h2>
        <div className="specialties-grid">
          {specialtiesData.map((spec, index) => (
            <SpecialtyCard 
              key={index}
              title={spec.title}
              description={spec.description}
              backgroundColor={spec.backgroundColor}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Specialties;
