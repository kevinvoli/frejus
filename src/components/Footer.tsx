import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer>
      <div className="container">
        <div className="footer-content">
          <div className="footer-about">
            <div className="footer-logo">Pixellia</div>
            <p>Photographe professionnel capturant l'essence de vos moments précieux depuis 2012.</p>
          </div>
          <div className="footer-links">
            <h4>Liens rapides</h4>
            <ul>
              <li><a href="#accueil">Accueil</a></li>
              <li><a href="#apropos">À propos</a></li>
              <li><a href="#portfolio">Portfolio</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Services</h4>
            <ul>
              <li><a href="#">Portrait</a></li>
              <li><a href="#">Mariage</a></li>
              <li><a href="#">Paysage</a></li>
              <li><a href="#">Événements</a></li>
              <li><a href="#">Studio</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Mentions légales</a></li>
              <li><a href="#">Politique de confidentialité</a></li>
              <li><a href="#">Conditions générales</a></li>
            </ul>
          </div>
        </div>
        <div className="copyright">
          <p>&copy; {new Date().getFullYear()} Pixellia Photographie. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
