import React, { useState } from 'react';

interface HeaderProps {
  onOpenGallery: (code: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenGallery }) => {
  // Bouton "Récupérer mes photos" : le photographe partage le lien normal du site
  // (pas un lien de galerie), et chaque client tape lui-même le code reçu dans ce
  // champ pour retrouver uniquement ses propres photos (voir GalleryView.tsx).
  const [showCodeField, setShowCodeField] = useState(false);
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    onOpenGallery(trimmed);
  }

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
              <li className="gallery-code-nav-item">
                <button
                  type="button"
                  className="gallery-code-toggle"
                  onClick={() => setShowCodeField((v) => !v)}
                  aria-expanded={showCodeField}
                >
                  Récupérer mes photos
                </button>
                {showCodeField && (
                  <form className="gallery-code-form" onSubmit={handleSubmit}>
                    <label htmlFor="gallery-code-input">
                      Code reçu de votre photographe
                    </label>
                    <input
                      id="gallery-code-input"
                      type="text"
                      placeholder="Ex : K7F2-QX9M"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="btn">
                      Voir mes photos
                    </button>
                  </form>
                )}
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
