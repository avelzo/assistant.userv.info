import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';

export async function GET() {
  const result = await requireAdminSession();
  if (!result.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
