import React from 'react';

const Contact: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Message envoyé ! (Simulation)');
  };

  return (
    <section className="contact" id="contact">
      <div className="container">
        <h2 className="section-title">Me contacter</h2>
        <div className="contact-content">
          <div className="contact-info">
            <h3>Informations de contact</h3>
            <div className="contact-details">
              <p><strong>Téléphone:</strong> +33 1 23 45 67 89</p>
              <p><strong>Email:</strong> contact@lumiere-photo.com</p>
              <p><strong>Studio:</strong> 123 Avenue des Champs-Élysées, 75008 Paris</p>
              <p><strong>Horaires:</strong> Du lundi au vendredi, 9h-18h</p>
            </div>
            <div className="social-links">
              <a href="#">Instagram</a>
              <a href="#">Facebook</a>
              <a href="#">Pinterest</a>
            </div>
          </div>
          <div className="contact-form">
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Votre nom" required />
              <input type="email" placeholder="Votre email" required />
              <input type="text" placeholder="Sujet" />
              <textarea placeholder="Votre message" required></textarea>
              <button type="submit" className="btn">Envoyer le message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
