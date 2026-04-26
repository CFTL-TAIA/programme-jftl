import './load-local-env.mjs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { put } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const databaseDir = join(rootDir, 'BDD');
const mediaToken = process.env.taia_READ_WRITE_TOKEN || process.env.TAIA_READ_WRITE_TOKEN;
const supportedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

function requireToken(value, name) {
  if (!value) {
    throw new Error(`La variable ${name} est obligatoire pour le seed Blob.`);
  }
}

async function uploadMediaDirectory(localDirName, blobDirName) {
  const absoluteDir = join(databaseDir, localDirName);

  for (const fileName of readdirSync(absoluteDir)) {
    const absoluteFilePath = join(absoluteDir, fileName);
    const stats = statSync(absoluteFilePath);
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    if (!stats.isFile() || !supportedImageExtensions.has(extension)) {
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

requireToken(mediaToken, 'taia_READ_WRITE_TOKEN');

await uploadMediaDirectory('photos', 'photos');
await uploadMediaDirectory('logos', 'logos');

console.log('Seed Blob medias termine.');