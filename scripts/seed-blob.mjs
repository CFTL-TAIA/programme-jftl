import './load-local-env.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const databaseDir = join(rootDir, 'BDD');
const dataToken = process.env.bdd_READ_WRITE_TOKEN || process.env.BDD_READ_WRITE_TOKEN;
const mediaToken = process.env.taia_READ_WRITE_TOKEN || process.env.TAIA_READ_WRITE_TOKEN;

function requireToken(value, name) {
  if (!value) {
    throw new Error(`La variable ${name} est obligatoire pour le seed Blob.`);
  }
}

async function uploadJsonFiles() {
  const jsonFiles = ['Conference.json', 'Speakers.json', 'Salle.json', 'Entreprise.json'];

  for (const fileName of jsonFiles) {
    const payload = readFileSync(join(databaseDir, fileName), 'utf8');
    await put(`Data/${fileName}`, payload, {
      access: 'private',
      token: dataToken,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60
    });

    console.log(`JSON seed -> Data/${fileName}`);
  }
}

async function uploadMediaDirectory(localDirName, blobDirName) {
  const absoluteDir = join(databaseDir, localDirName);

  for (const fileName of readdirSync(absoluteDir)) {
    const absoluteFilePath = join(absoluteDir, fileName);
    const stats = statSync(absoluteFilePath);

    if (!stats.isFile()) {
      continue;
    }

    await put(`medias/${blobDirName}/${fileName}`, readFileSync(absoluteFilePath), {
      access: 'public',
      token: mediaToken,
      allowOverwrite: true,
      addRandomSuffix: false,
      cacheControlMaxAge: 60
    });

    console.log(`MEDIA seed -> medias/${blobDirName}/${fileName}`);
  }
}

requireToken(dataToken, 'bdd_READ_WRITE_TOKEN');
requireToken(mediaToken, 'taia_READ_WRITE_TOKEN');

await uploadJsonFiles();
await uploadMediaDirectory('photos', 'photos');
await uploadMediaDirectory('logos', 'logos');

console.log('Seed Blob termine.');