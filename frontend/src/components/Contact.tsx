import React, { useState } from 'react';
import { apiPost } from '../api/client';
import type { SiteSettings } from '../api/types';

interface ContactProps {
  settings: SiteSettings;
}

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
  // Champ honeypot anti-spam : invisible pour un humain (voir .honeypot-field dans
  // index.css), rempli automatiquement par la plupart des robots. Si renseigné, le
  // backend ignore silencieusement la soumission (voir backend/src/contact).
  website: string;
}

const EMPTY_FORM: ContactFormState = { name: '', email: '', subject: '', message: '', website: '' };

type SubmitStatus = 'idle' | 'sending' | 'success' | 'error';

const Contact: React.FC<ContactProps> = ({ settings }) => {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [status, setStatus] = useState<SubmitStatus>('idle');

  function handleChange(field: keyof ContactFormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      await apiPost('/contact', {
        name: form.name,
        email: form.email,
        subject: form.subject || undefined,
        message: form.message,
        website: form.website || undefined,
      });
      setStatus('success');
      setForm(EMPTY_FORM);
    } catch {
      setStatus('error');
    }
  }

  const address = [settings.address, settings.city].filter(Boolean).join(', ');

  return (
    <section className="contact" id="contact">
      <div className="container">
        <h2 className="section-title">Me contacter</h2>
        <div className="contact-content">
          <div className="contact-info">
            <h3>Informations de contact</h3>
            <div className="contact-details">
              {settings.phone && <p><strong>Téléphone:</strong> {settings.phone}</p>}
              {settings.email && <p><strong>Email:</strong> {settings.email}</p>}
              {address && <p><strong>Studio:</strong> {address}</p>}
              {settings.openingHours && <p><strong>Horaires:</strong> {settings.openingHours}</p>}
            </div>
            <div className="social-links">
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
              )}
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noreferrer">Facebook</a>
              )}
              {settings.pinterestUrl && (
                <a href={settings.pinterestUrl} target="_blank" rel="noreferrer">Pinterest</a>
              )}
            </div>
          </div>
          <div className="contact-form">
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Votre nom"
                required
                value={form.name}
                onChange={handleChange('name')}
              />
              <input
                type="email"
                placeholder="Votre email"
                required
                value={form.email}
                onChange={handleChange('email')}
              />
              <input
                type="text"
                placeholder="Sujet"
                value={form.subject}
                onChange={handleChange('subject')}
              />
              <textarea
                placeholder="Votre message"
                required
                value={form.message}
                onChange={handleChange('message')}
              />
              {/* Honeypot anti-spam : masqué visuellement, jamais rempli par un humain. */}
              <input
                type="text"
                name="website"
                className="honeypot-field"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={handleChange('website')}
              />
              <button type="submit" className="btn" disabled={status === 'sending'}>
                {status === 'sending' ? 'Envoi en cours...' : 'Envoyer le message'}
              </button>
              {status === 'success' && (
                <p className="form-status form-status-success">Votre message a bien été envoyé, merci !</p>
              )}
              {status === 'error' && (
                <p className="form-status form-status-error">
                  Une erreur est survenue, merci de réessayer dans un instant.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
