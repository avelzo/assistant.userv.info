import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PACKS = [
  {
    code: 'pack-1',
    label: '1 génération',
    credits: 1,
    priceCents: 99,
    highlighted: false,
    active: true,
    sortOrder: 1,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_1 ?? null,
  },
  {
    code: 'pack-5',
    label: 'Pack 5 générations',
    credits: 5,
    priceCents: 399,
    highlighted: true,
    active: true,
    sortOrder: 2,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_5 ?? null,
  },
  {
    code: 'pack-20',
    label: 'Pack 20 générations',
    credits: 20,
    priceCents: 1399,
    highlighted: false,
    active: true,
    sortOrder: 3,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_20 ?? null,
  },
];

async function main() {
  console.log('Seeding credit packs...');
  for (const pack of PACKS) {
    await prisma.creditPack.upsert({
      where: { code: pack.code },
      update: {
        label: pack.label,
        credits: pack.credits,
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
