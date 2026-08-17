import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RETIRED_PACK_CODES = ['pack-1', 'pack-5', 'pack-20'];

const PACKS = [
  {
    code: 'pack-30',
    label: '30 crédits',
    credits: 30,
    creditsGranted: 30,
    priceCents: 299,
    highlighted: false,
    active: true,
    sortOrder: 1,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_30 ?? null,
  },
  {
    code: 'pack-80',
    label: '80 crédits',
    credits: 80,
    creditsGranted: 80,
    priceCents: 699,
    highlighted: true,
    active: true,
    sortOrder: 2,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_80 ?? null,
  },
  {
    code: 'pack-200',
    label: '200 crédits',
    credits: 200,
    creditsGranted: 200,
    priceCents: 1399,
    highlighted: false,
    active: true,
    sortOrder: 3,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_200 ?? null,
  },
];

async function main() {
  console.log('Seeding credit packs...');

  for (const code of RETIRED_PACK_CODES) {
    await prisma.creditPack.updateMany({
      where: { code },
      data: { active: false },
    });
  }

  for (const pack of PACKS) {
    await prisma.creditPack.upsert({
      where: { code: pack.code },
      update: {
        label: pack.label,
        credits: pack.credits,
        creditsGranted: pack.creditsGranted,
        priceCents: pack.priceCents,
        highlighted: pack.highlighted,
        active: pack.active,
        sortOrder: pack.sortOrder,
        stripePriceId: pack.stripePriceId,
      },
      create: pack,
    });
    console.log(`  - ${pack.code}: ${pack.label} (${pack.priceCents / 100}€)`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
