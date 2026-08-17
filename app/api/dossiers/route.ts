import { NextResponse } from 'next/server';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, requireDossierActor } from '@/lib/dossiers/http';

export async function GET(request: Request) {
  const actor = await requireDossierActor(request, '/api/dossiers');
  if (!actor.ok) {
    return actor.response;
  }

  try {
    const dossiers = await dossierService.list(actor.userId);
    return NextResponse.json({ dossiers });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const actor = await requireDossierActor(request, '/api/dossiers');
  if (!actor.ok) {
    return actor.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  try {
    const dossier = await dossierService.create(actor.userId, (body ?? {}) as Record<string, unknown>);
    return NextResponse.json({ dossier }, { status: 201 });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
