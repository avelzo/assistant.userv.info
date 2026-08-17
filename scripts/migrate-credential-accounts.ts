import { PrismaClient } from '@prisma/client';
import { displayName } from '@/lib/register-guards';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      password: { not: null },
    },
    select: {
      id: true,
      email: true,
      password: true,
      firstname: true,
      lastname: true,
      name: true,
      accounts: {
        where: { providerId: 'credential' },
        select: { id: true },
      },
    },
  });

  let migrated = 0;
  let skipped = 0;
  let named = 0;

  for (const user of users) {
    const password = user.password;
    if (!password) {
      skipped += 1;
      continue;
    }

    const name = user.name?.trim() || displayName(user.firstname, user.lastname, user.email);
    if (!user.name?.trim() && name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
      named += 1;
    }

    if (user.accounts.length > 0) {
      skipped += 1;
      continue;
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password,
      },
    });
    migrated += 1;
  }

  console.log(
    JSON.stringify(
      {
        credentialAccountsCreated: migrated,
        skipped,
        namesFilled: named,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Migration auth impossible.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
