import React, { useEffect, useState } from 'react';
import Header from './Header';
import { apiGet, apiPost, apiUrl, assetUrl } from '../api/client';
import { MediaType, type GalleryAccessResponse, type GalleryUnlocked } from '../api/types';

interface GalleryViewProps {
  token: string;
  // Pour afficher la barre de navigation complète (voir Header.tsx) même sur cette
  // page — elle ne doit jamais disparaître en changeant de page.
  onOpenGallery: (code: string) => void;
}

// Page cliente de la médiathèque : accessible via /?galerie=<token>, sans compte ni
// routeur (voir docs/ANALYSE-PLAN-BACKEND.md, section médiathèque — décision produit
// de ne pas ajouter react-router pour ce seul écran). Gère les trois états possibles
// de GET /galleries/access/:token : verrouillée (mot de passe requis), déverrouillée
// (affichage direct), ou introuvable/expirée.
type ViewState = 'loading' | 'password' | 'gallery' | 'not-found';

// Jeton "gallery-usage" mémorisé côté navigateur (30 jours, voir
// galleries.service.ts) : évite de consommer une nouvelle utilisation du code à
// chaque visite du même client dans cette fenêtre — le nombre d'utilisations
// maximal est fixé par l'admin (voir GalleriesPage.tsx côté panneau admin).
function usageStorageKey(token: string): string {
  const normalized = token.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `pixellia-gallery-usage:${normalized}`;
}

function getStoredUsageToken(token: string): string | null {
  try {
    return window.localStorage.getItem(usageStorageKey(token));
  } catch {
    // localStorage indisponible (navigation privée, quota...) : on continue sans,
    // quitte à ce que la visite recompte une utilisation.
    return null;
  }
}

function storeUsageToken(token: string, usageToken: string): void {
  try {
    window.localStorage.setItem(usageStorageKey(token), usageToken);
  } catch {
    // Idem : pas bloquant si l'écriture échoue.
  }
}

const MAX_USES_ERROR_PATTERN = /nombre maximal d'utilisations/i;

const GalleryView: React.FC<GalleryViewProps> = ({ token, onOpenGallery }) => {
  const [state, setState] = useState<ViewState>('loading');
  const [gallery, setGallery] = useState<GalleryUnlocked | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const usageToken = getStoredUsageToken(token);
    const query = usageToken ? `?usage=${encodeURIComponent(usageToken)}` : '';
    apiGet<GalleryAccessResponse>(`/galleries/access/${token}${query}`)
      .then((data) => {
        if (cancelled) return;
        if (data.requiresPassword) {
          setState('password');
        } else {
          storeUsageToken(token, data.usageToken);
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
        usage: getStoredUsageToken(token) ?? undefined,
      });
      storeUsageToken(token, data.usageToken);
      setGallery(data);
      setState('gallery');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mot de passe incorrect.';
      if (MAX_USES_ERROR_PATTERN.test(message)) {
        // Cas terminal (limite d'utilisations atteinte) : comme "introuvable", il n'y a
        // rien que le client puisse retenter depuis le formulaire de mot de passe.
        setNotFoundMessage(message);
        setState('not-found');
      } else {
        setPasswordError(message);
      }
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="gallery-view">
      <Header onOpenGallery={onOpenGallery} />

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
