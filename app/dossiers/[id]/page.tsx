import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { DossierWorkspace } from '@/components/dossiers/DossierWorkspace';
import { getAuthSession } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Dossier',
  description: 'Assistant et document de votre démarche.',
};

export default async function DossierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession();
  if (!session) {
    redirect('/auth/login?callbackUrl=/dossiers');
  }

  const { id } = await params;

  return (
    <main className="min-h-screen bg-ivory">
      <Header />
      <DossierWorkspace
        dossierId={id}
        emailVerified={Boolean(session.user.emailVerified)}
      />
    </main>
  );
}
