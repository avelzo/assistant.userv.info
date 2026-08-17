import { MongoClient, ObjectId } from 'mongodb';
import { AI_CREDIT_COSTS, getDailyFreeCredits, getCreditTimeZone } from '../lib/credits/config';
import { planPaidCreditsMigration } from '../lib/credits/migration';
import { nextCreditResetAt } from '../lib/credits/timezone';

const DRY_RUN = process.argv.includes('--dry-run');

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} est obligatoire.`);
  }
  return value;
}

async function main() {
  const uri = requiredEnv('DATABASE_URL');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const now = new Date();
  const daily = getDailyFreeCredits();
  const nextReset = nextCreditResetAt(now, getCreditTimeZone());

  const users = await db.collection('User').find({}, { projection: { _id: 1, email: 1 } }).toArray();
  const usersByEmail = new Map(users.map((user) => [String(user.email).toLowerCase(), user._id as ObjectId]));

  const balances = await db.collection('credit_balances').find({}).toArray();
  let migratedPaid = 0;
  let created = 0;
  let skipped = 0;
  let orphansRemoved = 0;

  for (const balance of balances) {
    const email = String(balance.email || '').toLowerCase();
    const userId = usersByEmail.get(email);
    if (!userId) {
      if (!DRY_RUN) {
        await db.collection('credit_balances').deleteOne({ _id: balance._id });
      }
      orphansRemoved += 1;
      continue;
    }

    const legacyCredits = Number(balance.credits) || 0;
    const alreadyPaid = Number(balance.paidCredits) || 0;
    const migrationKey = `migration:paid:${String(balance._id)}`;
    const alreadyLogged = Boolean(
      await db.collection('credits_ledger').findOne({ idempotencyKey: migrationKey })
    );
    const plan = planPaidCreditsMigration({
      legacyCredits,
      paidCredits: alreadyPaid,
      hasMigrationLedger: alreadyLogged,
    });
    const shouldCopyPaid = plan.copyLegacy;

    if (DRY_RUN) {
      if (shouldCopyPaid) migratedPaid += 1;
      else skipped += 1;
      continue;
    }

    await db.collection('credit_balances').updateOne(
      { _id: balance._id },
      {
        $set: {
          userId,
          email,
          paidCredits: plan.paidCredits,
          freeCredits: typeof balance.freeCredits === 'number' ? balance.freeCredits : daily,
          freeResetAt: balance.freeResetAt instanceof Date ? balance.freeResetAt : nextReset,
          updatedAt: now,
        },
      }
    );

    if (shouldCopyPaid) {
      await db.collection('credits_ledger').updateOne(
        { idempotencyKey: migrationKey },
        {
          $setOnInsert: {
            email,
            userId,
            delta: legacyCredits,
            pool: 'PAID',
            type: 'PURCHASE',
            source: 'MIGRATION',
            label: 'Migration du solde v1 vers crédits achetés',
            idempotencyKey: migrationKey,
            createdAt: now,
          },
        },
        { upsert: true }
      );
      migratedPaid += 1;
    } else {
      skipped += 1;
    }
  }

  for (const user of users) {
    const existing = await db.collection('credit_balances').findOne({
      $or: [{ userId: user._id }, { email: user.email }],
    });
    if (existing) {
      continue;
    }
    created += 1;
    if (DRY_RUN) {
      continue;
    }
    await db.collection('credit_balances').insertOne({
      userId: user._id,
      email: user.email,
      credits: 0,
      freeCredits: daily,
      paidCredits: 0,
      freeResetAt: nextReset,
      createdAt: now,
      updatedAt: now,
    });
  }

  const ledger = await db.collection('credits_ledger').find({}).toArray();
  let ledgerBackfilled = 0;
  for (const entry of ledger) {
    const updates: Record<string, unknown> = {};
    if (!entry.idempotencyKey) {
      updates.idempotencyKey = `legacy:${String(entry._id)}`;
    }
    if (!entry.userId && entry.email) {
      const userId = usersByEmail.get(String(entry.email).toLowerCase());
      if (userId) {
        updates.userId = userId;
      }
    }
    if (!entry.pool) {
      updates.pool = Number(entry.delta) < 0 ? 'PAID' : 'PAID';
    }
    if (Object.keys(updates).length === 0) {
      continue;
    }
    ledgerBackfilled += 1;
    if (!DRY_RUN) {
      await db.collection('credits_ledger').updateOne({ _id: entry._id }, { $set: updates });
    }
  }

  const packs = await db.collection('CreditPack').find({}).toArray();
  let packsUpdated = 0;
  for (const pack of packs) {
    const granted = Number(pack.creditsGranted);
    if (granted > 0) {
      continue;
    }
    packsUpdated += 1;
    if (!DRY_RUN) {
      await db.collection('CreditPack').updateOne(
        { _id: pack._id },
        { $set: { creditsGranted: (Number(pack.credits) || 0) * AI_CREDIT_COSTS.GENERATE_LETTER } }
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        users: users.length,
        migratedPaid,
        skipped,
        created,
        orphansRemoved,
        ledgerBackfilled,
        packsUpdated,
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration crédits impossible.');
  process.exit(1);
});
