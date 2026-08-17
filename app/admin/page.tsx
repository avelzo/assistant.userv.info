import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { requireAdminSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Administration',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const result = await requireAdminSession();

  if (!result.ok && result.status === 401) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  if (!result.ok) {
    return (
      <main className="min-h-screen bg-ivory">
        <Header />
        <section className="mx-auto w-full max-w-3xl px-6 py-16">
          <h1 className="font-serif text-3xl text-ink">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted">Cette page est réservée aux administrateurs.</p>
        </section>
      </main>
    );
  }

  return <AdminDashboard />;
}
