import React from 'react';

const Header: React.FC = () => {
  return (
    <header>
      <div className="container">
        <div className="header-content">
          <a href="#" className="logo">Pixellia</a>
          <nav>
            <ul>
              <li><a href="#accueil">Accueil</a></li>
              <li><a href="#apropos">À propos</a></li>
              <li><a href="#portfolio">Portfolio</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
