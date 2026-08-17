import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) {
    return '***';
  }
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const execute = hasFlag('--execute');
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  const confirm = process.env.CONFIRM || '';

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      password: true,
      firstname: true,
      lastname: true,
      createdAt: true,
      freeGenerationsUsed: true,
      creditBalance: { select: { credits: true, freeCredits: true, paidCredits: true } },
      _count: {
        select: {
          generations: true,
          creditEntries: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = users.map((user) => ({
    id: user.id,
    email: maskEmail(user.email),
    hasPassword: Boolean(user.password),
    hasName: Boolean(user.firstname || user.lastname),
    createdAt: user.createdAt.toISOString(),
    freeGenerationsUsed: user.freeGenerationsUsed,
    letterCount: user._count.generations,
    ledgerCount: user._count.creditEntries,
    paidCredits: user.creditBalance?.paidCredits ?? user.creditBalance?.credits ?? 0,
    freeCredits: user.creditBalance?.freeCredits ?? 0,
    keep: ownerEmail ? user.email === ownerEmail : false,
  }));

  const keep = ownerEmail ? summary.filter((row) => row.keep) : [];
  const removable = ownerEmail ? summary.filter((row) => !row.keep) : summary;

  console.log(
    JSON.stringify(
      {
        mode: execute ? 'execute' : 'dry-run',
        ownerEmailProvided: Boolean(ownerEmail),
        ownerMatches: keep.length,
        total: summary.length,
        withPassword: summary.filter((row) => row.hasPassword).length,
        withLetters: summary.filter((row) => row.letterCount > 0).length,
        withPaidCredits: summary.filter((row) => row.paidCredits > 0).length,
        removable: removable.length,
        users: summary,
      },
      null,
      2
    )
  );

  if (!execute) {
    return;
  }

  if (!ownerEmail) {
    throw new Error('OWNER_EMAIL est obligatoire pour --execute.');
  }

  if (confirm !== 'DELETE_FAKE_ACCOUNTS') {
    throw new Error('CONFIRM=DELETE_FAKE_ACCOUNTS est obligatoire pour --execute.');
  }

  if (keep.length !== 1) {
    throw new Error('Le compte propriétaire n’a pas été identifié de manière unique. Abandon.');
  }

  const owner = users.find((user) => user.email === ownerEmail);
  if (!owner?.password) {
    throw new Error('Le compte propriétaire n’a pas de mot de passe local. Abandon.');
  }

  const toDelete = users.filter((user) => user.email !== ownerEmail).map((user) => user.email);

  for (const email of toDelete) {
    const user = users.find((entry) => entry.email === email);
    await prisma.$transaction(async (transaction) => {
      await transaction.letterGeneration.deleteMany({ where: { accountEmail: email } });
      await transaction.creditLedgerEntry.deleteMany({ where: { accountEmail: email } });
      await transaction.creditBalance.deleteMany({ where: { email } });
      await transaction.verification.deleteMany({ where: { identifier: email } });
      if (user?.id) {
        await transaction.session.deleteMany({ where: { userId: user.id } });
        await transaction.account.deleteMany({ where: { userId: user.id } });
      }
      await transaction.user.delete({ where: { email } });
    });
  }

  console.log(
    JSON.stringify(
      {
        deleted: toDelete.length,
        keptMasked: maskEmail(ownerEmail),
        keptHasPassword: true,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Erreur audit.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
