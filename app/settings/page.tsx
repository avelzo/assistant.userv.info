import type { Metadata } from 'next';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Paramètres',
  description: 'Gérez les paramètres de votre compte.',
  alternates: {
    canonical: '/settings',
  },
};

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <section className="mx-auto w-full max-w-3xl px-6 pb-16 pt-8">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
      </section>
    </main>
  );
}
