import { NextResponse } from 'next/server';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]/duplicate');
  if (!actor.ok) {
    return actor.response;
  }

  const { id } = await context.params;
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  try {
    const dossier = await dossierService.duplicate(actor.userId, id);
    return NextResponse.json({ dossier }, { status: 201 });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
