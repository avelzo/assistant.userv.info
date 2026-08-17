'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DOSSIER_STATUS_LABELS } from '@/lib/dossiers/categories';
import type { DossierSummaryView } from '@/components/dossiers/types';

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function DossierList() {
  const router = useRouter();
  const [dossiers, setDossiers] = useState<DossierSummaryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch('/api/dossiers');
        const data = (await response.json()) as { dossiers?: DossierSummaryView[]; error?: string };
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          throw new Error(data.error || 'Impossible de charger les dossiers.');
        }
        setDossiers(data.dossiers || []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Erreur inattendue.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function duplicate(id: string) {
    setError('');
    const response = await fetch(`/api/dossiers/${id}/duplicate`, { method: 'POST' });
    const data = (await response.json()) as { dossier?: { id: string }; error?: string };
    if (response.ok && data.dossier?.id) {
      router.push(`/dossiers/${data.dossier.id}`);
      return;
    }
    setError(data.error || 'Duplication impossible.');
  }

  async function remove(id: string) {
    if (!window.confirm('Supprimer ce dossier ? Cette action est définitive.')) {
      return;
    }
    const response = await fetch(`/api/dossiers/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setDossiers((current) => current.filter((dossier) => dossier.id !== id));
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Chargement des dossiers…</p>;
  }

  if (error) {
    return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>;
  }

  if (dossiers.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-paper p-8 text-center">
        <p className="font-serif text-xl text-ink">Aucun dossier pour le moment</p>
        <p className="mt-2 text-sm text-muted">Commencez par décrire votre problème.</p>
        <Link
          href="/generate"
          className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-paper hover:bg-primary-hover"
        >
          Commencer une démarche
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {dossiers.map((dossier) => (
        <li key={dossier.id} className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg text-ink">{dossier.title || dossier.objective || 'Sans titre'}</p>
              <p className="mt-1 text-sm text-muted">{dossier.recipientName || 'Destinataire à préciser'}</p>
            </div>
            <span className="rounded-full bg-ivory px-3 py-1 text-xs font-medium text-primary">
              {DOSSIER_STATUS_LABELS[dossier.status]}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs text-muted">Modifié le {formatDate(dossier.updatedAt)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/dossiers/${dossier.id}`}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-paper hover:bg-primary-hover"
            >
              Ouvrir
            </Link>
            <button
              type="button"
              onClick={() => void duplicate(dossier.id)}
              className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-ivory"
            >
              Dupliquer
            </button>
            <button
              type="button"
              onClick={() => void remove(dossier.id)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:text-red-800"
            >
              Supprimer
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
