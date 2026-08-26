import React, { useEffect, useState } from 'react';
import { apiGet, apiPost, apiUrl, assetUrl } from '../api/client';
import { MediaType, type GalleryAccessResponse, type GalleryUnlocked } from '../api/types';

interface GalleryViewProps {
  token: string;
}

// Page cliente de la médiathèque : accessible via /?galerie=<token>, sans compte ni
// routeur (voir docs/ANALYSE-PLAN-BACKEND.md, section médiathèque — décision produit
// de ne pas ajouter react-router pour ce seul écran). Gère les trois états possibles
// de GET /galleries/access/:token : verrouillée (mot de passe requis), déverrouillée
// (affichage direct), ou introuvable/expirée.
type ViewState = 'loading' | 'password' | 'gallery' | 'not-found';

const GalleryView: React.FC<GalleryViewProps> = ({ token }) => {
  const [state, setState] = useState<ViewState>('loading');
  const [gallery, setGallery] = useState<GalleryUnlocked | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiGet<GalleryAccessResponse>(`/galleries/access/${token}`)
      .then((data) => {
        if (cancelled) return;
        if (data.requiresPassword) {
          setState('password');
        } else {
          setGallery(data);
          setState('gallery');
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setNotFoundMessage(err.message || 'Cette galerie est introuvable.');
        setState('not-found');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setPasswordError(null);
    try {
      const data = await apiPost<GalleryUnlocked>(`/galleries/access/${token}/verify`, {
        password,
      });
      setGallery(data);
      setState('gallery');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Mot de passe incorrect.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="gallery-view">
      <header className="gallery-header">
        <div className="container gallery-header-content">
          <a href="/" className="logo">
            Pixellia Photographie
          </a>
        </div>
      </header>

      <main className="gallery-main container">
        {state === 'loading' && <p className="gallery-status">Chargement de la galerie...</p>}

        {state === 'not-found' && (
          <div className="gallery-status gallery-status-error">
            <h1>Galerie indisponible</h1>
            <p>{notFoundMessage}</p>
          </div>
        )}

        {state === 'password' && (
          <div className="gallery-password">
            <h1>Galerie protégée</h1>
            <p>Cette galerie est protégée par un mot de passe. Merci de le saisir pour y accéder.</p>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                placeholder="Mot de passe"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="btn" disabled={verifying}>
                {verifying ? 'Vérification...' : 'Accéder à la galerie'}
              </button>
              {passwordError && <p className="form-status form-status-error">{passwordError}</p>}
            </form>
          </div>
        )}

        {state === 'gallery' && gallery && (
          <>
            <div className="gallery-intro">
              <h1>{gallery.title}</h1>
              <p className="gallery-client">Pour {gallery.clientName}</p>
              {gallery.description && <p>{gallery.description}</p>}
              {gallery.media.length > 0 && (
                <a
                  className="btn"
                  href={apiUrl(`/galleries/access/${token}/download-all?access=${gallery.accessJwt}`)}
                >
                  Télécharger tout (.zip)
                </a>
              )}
            </div>

            {gallery.media.length === 0 ? (
              <p className="gallery-status">Aucun média n'a encore été déposé dans cette galerie.</p>
            ) : (
              <div className="gallery-grid">
                {gallery.media.map((item) => {
                  const downloadHref = apiUrl(
                    `/galleries/access/${token}/media/${item.id}/download?access=${gallery.accessJwt}`,
                  );
                  return (
                    <div className="gallery-item" key={item.id}>
                      {item.type === MediaType.PHOTO ? (
                        <img src={assetUrl(item.fileUrl)} alt={item.originalFilename} loading="lazy" />
                      ) : (
                        <video src={assetUrl(item.fileUrl)} controls preload="metadata" />
                      )}
                      <a className="gallery-item-download" href={downloadHref} title="Télécharger">
                        Télécharger
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default GalleryView;
