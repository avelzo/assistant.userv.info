import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { getAiUsageDashboard, isAiUsageRange } from '@/lib/admin/ai-usage-stats';

export async function GET(request: Request) {
  const admin = await requireAdminSession();
  if (!admin.ok) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: admin.status });
  }

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get('range') || '7d';
  if (!isAiUsageRange(rangeParam)) {
    return NextResponse.json({ error: 'Période invalide.' }, { status: 400 });
  }

  const dashboard = await getAiUsageDashboard(rangeParam);
  return NextResponse.json(dashboard);
}
