import { useEffect, useState } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { apiFetch, ApiError, nullifyEmptyStrings } from '../../api/client';

// Chaque section des réglages du site (Accueil, À propos, Studio et contact,
// Réseaux sociaux, Général, Pages légales) a sa propre table côté backend et son
// propre formulaire ici — ce hook factorise le chargement (GET) et l'enregistrement
// (PUT) communs à toutes, pour que chaque *SettingsForm.tsx ne décrive que ses
// propres champs (voir docs/ANALYSE-PLAN-BACKEND.md, refonte du panneau admin du
// 26/08).
//
// La plupart des champs sont de simples chaînes (valeur par défaut '' si non
// précisé) ; certains (téléphones/emails de contact, voir ContactSettingsForm.tsx)
// sont des listes de chaînes — passer `emptyValues` explicitement dans ce cas (`[]`
// pour ces champs) puisqu'un défaut '' n'aurait pas de sens pour un tableau.
export function useSectionSettingsForm<T extends Record<string, string | string[]>>(
  path: string,
  fields: readonly (keyof T & string)[],
  successMessage: string,
  emptyValues?: T,
) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const defaults =
    emptyValues ??
    fields.reduce((acc, key) => {
      acc[key] = '' as T[keyof T & string];
      return acc;
    }, {} as T);

  const form = useForm<T>({ initialValues: defaults });

  useEffect(() => {
    let cancelled = false;
    apiFetch<Record<string, unknown>>(path)
      .then((data) => {
        if (cancelled) return;
        const values = { ...defaults };
        for (const key of fields) {
          const raw = data[key];
          values[key] = (raw ?? defaults[key]) as T[keyof T & string];
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
