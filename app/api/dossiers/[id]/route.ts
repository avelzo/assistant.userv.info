import { NextResponse } from 'next/server';
import { dossierService } from '@/lib/dossiers';
import { dossierErrorResponse, isMongoObjectId, requireDossierActor } from '@/lib/dossiers/http';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function readId(context: RouteContext): Promise<string> {
  const { id } = await context.params;
  return id?.trim() || '';
}

export async function GET(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]');
  if (!actor.ok) {
    return actor.response;
  }

  const id = await readId(context);
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  try {
    const dossier = await dossierService.get(actor.userId, id);
    return NextResponse.json({ dossier });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]');
  if (!actor.ok) {
    return actor.response;
  }

  const id = await readId(context);
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  try {
    const dossier = await dossierService.update(actor.userId, id, (body ?? {}) as Record<string, unknown>);
    return NextResponse.json({ dossier });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await requireDossierActor(request, '/api/dossiers/[id]');
  if (!actor.ok) {
    return actor.response;
  }

  const id = await readId(context);
  if (!isMongoObjectId(id)) {
    return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
  }

  try {
    await dossierService.remove(actor.userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return dossierErrorResponse(error);
  }
}
