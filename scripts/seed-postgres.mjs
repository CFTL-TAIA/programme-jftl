import './load-local-env.mjs';
import { closeDataStorage, isPostgresDataStorageEnabled, seedPostgresFromLocal } from '../lib/data-storage.mjs';

if (!isPostgresDataStorageEnabled()) {
  console.error('Aucune connexion Postgres configuree. Definissez DATABASE_URL ou POSTGRES_URL.');
  process.exit(1);
}

try {
  const counts = await seedPostgresFromLocal();
  console.log('Seed Postgres termine.');
  console.log(`Entreprises: ${counts.entreprises}`);
  console.log(`Speakers: ${counts.speakers}`);
  console.log(`Salles: ${counts.salles}`);
  console.log(`Conferences: ${counts.conferences}`);
} finally {
  await closeDataStorage();
}