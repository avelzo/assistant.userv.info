import { MongoClient, ObjectId } from 'mongodb';
import { textToBlocks } from '../lib/dossiers/document-blocks';
import { planLetterGenerationMigration } from '../lib/dossiers/migration';

const EXECUTE = process.argv.includes('--execute');
const DRY_RUN = !EXECUTE;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} est obligatoire.`);
  }
  return value;
}

function preview(value: unknown, max = 80): string {
  return String(value || '').trim().slice(0, max);
}

async function main() {
  const uri = requiredEnv('DATABASE_URL');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const now = new Date();

  const generations = await db.collection('letter_generations').find({}).toArray();
  let created = 0;
  let linked = 0;
  let skipped = 0;

  for (const generation of generations) {
    const generationId = generation._id as ObjectId;
    const existing = await db.collection('dossiers').findOne({ legacyGenerationId: generationId });
    const email = String(generation.email || '').toLowerCase();
    const user = email ? await db.collection('User').findOne({ email }) : null;
    const plan = planLetterGenerationMigration({
      alreadyLinked: Boolean(generation.dossierId),
      legacyDossierExists: Boolean(existing),
      hasUser: Boolean(user),
    });

    if (plan === 'skip') {
      skipped += 1;
      continue;
    }

    if (plan === 'link' && existing) {
      if (!DRY_RUN) {
        await db.collection('letter_generations').updateOne(
          { _id: generationId },
          { $set: { dossierId: existing._id } }
        );
      }
      linked += 1;
      continue;
    }

    created += 1;
    if (DRY_RUN || !user) {
      continue;
    }

    const objective = preview(generation.details, 2000);
    const title = preview(generation.subject || generation.recipient || objective, 80);
    const dossierId = new ObjectId();
    const documentId = new ObjectId();

    await db.collection('dossiers').insertOne({
      _id: dossierId,
      userId: user._id,
      title,
      objective,
      recipientName: preview(generation.recipient, 200),
      recipientCategory: preview(generation.category, 80),
      context: preview(generation.details, 8000),
      status: 'DRAFT',
      advice: '',
      questions: [],
      legacyGenerationId: generationId,
      createdAt: generation.createdAt instanceof Date ? generation.createdAt : now,
      updatedAt: now,
    });

    await db.collection('documents').insertOne({
      _id: documentId,
      dossierId,
      bodyFormat: 'blocks-v1',
      bodyBlocks: textToBlocks(String(generation.letter || '')),
      emailSubject: preview(generation.subject, 300),
      emailBody: String(generation.emailVersion || ''),
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });

    await db.collection('letter_generations').updateOne(
      { _id: generationId },
      { $set: { dossierId } }
    );
  }

  console.log(
    JSON.stringify(
      {
        dryRun: DRY_RUN,
        generations: generations.length,
        created,
        linked,
        skipped,
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration dossiers impossible.');
  process.exit(1);
});
