import React from 'react';

const About: React.FC = () => {
  return (
    <section className="about" id="apropos">
      <div className="container">
        <div className="about-content">
          <div className="about-text">
            <h2>À propos de moi</h2>
            <p>Passionné par la photographie depuis plus de 10 ans, je me spécialise dans la capture d'émotions authentiques et de moments uniques. Mon approche allie technique et sensibilité artistique pour créer des images qui racontent une histoire.</p>
            <p>Diplômé de l'École de Photographie de Paris, j'ai eu l'honneur de travailler avec des clients prestigieux et de voir mon travail publié dans plusieurs magazines nationaux.</p>
            <p>Mon objectif : immortaliser vos moments les plus précieux avec authenticité et créativité.</p>
            <a href="#contact" className="btn" style={{ marginTop: '20px' }}>Prendre rendez-vous</a>
          </div>
          <div className="about-image">
            {/* Photo du photographe */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
