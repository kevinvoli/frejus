import React from 'react';

const Testimonials: React.FC = () => {
  return (
    <section className="testimonials">
      <div className="container">
        <h2 className="section-title">Ce que disent mes clients</h2>
        <div className="testimonials-slider">
          <div className="testimonial">
            <p className="testimonial-text">"Une expérience incroyable ! Les photos de notre mariage sont magnifiques et capturent parfaitement l'émotion de la journée. Merci pour votre professionnalisme et votre talent."</p>
            <p className="client-name">- Sophie et Thomas</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
