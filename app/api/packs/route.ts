import { NextResponse } from 'next/server';
import { getCreditPacks } from '@/lib/packs';
import { paidCreditsForPack } from '@/lib/credits/config';

export async function GET() {
  try {
    const packs = await getCreditPacks();

    return NextResponse.json({
      packs: packs.map((pack) => ({
        code: pack.code,
        label: pack.label,
        credits: paidCreditsForPack(pack),
        priceCents: pack.priceCents,
        highlighted: pack.highlighted,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur inattendue.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
