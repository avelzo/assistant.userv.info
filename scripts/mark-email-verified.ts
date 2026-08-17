import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!ownerEmail) {
    throw new Error('OWNER_EMAIL est obligatoire.');
  }

  const result = await prisma.user.updateMany({
    where: { email: ownerEmail },
    data: { emailVerified: true },
  });

  if (result.count !== 1) {
    throw new Error('Aucun compte unique n’a été marqué vérifié. Vérifiez OWNER_EMAIL.');
  }

  console.log(JSON.stringify({ verified: 1 }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Vérification impossible.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
