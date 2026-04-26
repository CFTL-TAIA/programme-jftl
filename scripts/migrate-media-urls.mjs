import './load-local-env.mjs';
import { head } from '@vercel/blob';
import { closeDataStorage, migrateStoredMediaReferences, isPostgresDataStorageEnabled } from '../lib/data-storage.mjs';
import { getMediaBlobToken, isMediaBlobStorageEnabled, parseManagedMediaReference } from '../lib/blob-storage.mjs';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const verbose = args.has('--verbose');

if (!isPostgresDataStorageEnabled()) {
  console.error('Aucune connexion Postgres configuree. Definissez taia_bdd_DATABASE_URL, DATABASE_URL ou POSTGRES_URL.');
  process.exit(1);
}

async function resolveCanonicalUrl(reference) {
  const parsedReference = parseManagedMediaReference(reference);

  if (!parsedReference) {
    return {
      skipped: true,
      reason: 'reference-non-geree',
      nextValue: reference
    };
  }

  if (!isMediaBlobStorageEnabled()) {
    return {
      skipped: false,
      nextValue: parsedReference.previewPath,
      reason: 'fallback-local'
    };
  }

  try {
    const blob = await head(parsedReference.pathname, { token: getMediaBlobToken() });
    return {
      skipped: false,
      nextValue: blob.url,
      reason: 'blob-canonical'
    };
  } catch (error) {
    return {
      skipped: true,
      nextValue: reference,
      reason: `blob-introuvable: ${error.message}`
    };
  }
}

try {
  const result = await migrateStoredMediaReferences({
    dryRun,
    resolveCanonicalUrl,
    logger: {
      log(message) {
        if (verbose) {
          console.log(message);
        }
      }
    }
  });

  console.log(dryRun ? 'Dry-run migration medias terminee.' : 'Migration medias terminee.');
  console.log(`Speakers mis a jour: ${result.updatedSpeakers}`);
  console.log(`Entreprises mises a jour: ${result.updatedEntreprises}`);
  console.log(`References ignorees: ${result.skipped}`);

  if (result.details.length > 0) {
    console.log('Details:');

    for (const detail of result.details) {
      console.log(`- ${detail.table}:${detail.id} -> ${detail.status}${detail.reason ? ` (${detail.reason})` : ''}`);
    }
  }
} finally {
  await closeDataStorage();
}