import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!ownerEmail) {
    throw new Error('OWNER_EMAIL est obligatoire.');
  }

  const result = await prisma.user.updateMany({
    where: { email: ownerEmail },
    data: { role: 'admin' },
  });

  if (result.count !== 1) {
    throw new Error('Aucun compte unique n’a été promu. Vérifiez OWNER_EMAIL.');
  }

  console.log(JSON.stringify({ promoted: 1 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Promotion admin impossible.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
