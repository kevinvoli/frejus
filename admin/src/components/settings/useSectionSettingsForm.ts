import { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { apiFetch, ApiError, nullifyEmptyStrings } from '../../api/client';

// Chaque section des réglages du site (Accueil, À propos, Studio et contact,
// Réseaux sociaux) a sa propre table côté backend et son propre formulaire ici — ce
// hook factorise le chargement (GET) et l'enregistrement (PUT) communs aux 4, pour
// que chaque *SettingsForm.tsx ne décrive que ses propres champs (voir
// docs/ANALYSE-PLAN-BACKEND.md, refonte du panneau admin du 26/08).
export function useSectionSettingsForm<T extends Record<string, string>>(
  path: string,
  fields: readonly (keyof T & string)[],
  successMessage: string,
) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const emptyValues = fields.reduce((acc, key) => {
    acc[key] = '' as T[keyof T & string];
    return acc;
  }, {} as T);

  const form = useForm<T>({ initialValues: emptyValues });

  useEffect(() => {
    let cancelled = false;
    apiFetch<Record<string, unknown>>(path)
      .then((data) => {
        if (cancelled) return;
        const values = { ...emptyValues };
        for (const key of fields) {
          const raw = data[key];
          values[key] = (raw ?? '') as T[keyof T & string];
        }
        form.setValues(values);
      })
      .catch((err: unknown) => {
        notifications.show({
          color: 'red',
          title: 'Erreur',
          message: err instanceof ApiError ? err.message : 'Chargement impossible.',
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  async function handleSubmit(values: T) {
    setSaving(true);
    try {
      await apiFetch(path, { method: 'PUT', body: nullifyEmptyStrings(values) });
      notifications.show({ color: 'green', title: 'Enregistré', message: successMessage });
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Erreur',
        message: err instanceof ApiError ? err.message : "Échec de l'enregistrement.",
      });
    } finally {
      setSaving(false);
    }
  }

  return { form, loading, saving, handleSubmit };
}
