import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { seedDataDir } from './project-paths.mjs';

const databaseUrl = String(
  process.env.taia_bdd_DATABASE_URL ||
  process.env.TAIA_BDD_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.NEON_DATABASE_URL ||
  ''
).trim();

let sqlClient = null;
let schemaPromise = null;

function shouldUseSsl(connectionString) {
  return !/localhost|127\.0\.0\.1/i.test(connectionString);
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return JSON.parse(value);
  }

  return [];
}

function readLocalJsonFile(fileName) {
  return JSON.parse(readFileSync(join(seedDataDir, fileName), 'utf8'));
}

function mapConferenceRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    horaire: row.horaire,
    type: row.type,
    speakerIds: normalizeJsonArray(row.speaker_ids),
    salleIds: normalizeJsonArray(row.salle_ids)
  };
}

function mapSpeakerRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    photo: row.photo || '',
    entreprise: row.entreprise || 'ent-non-communique'
  };
}

function mapSalleRow(row) {
  return {
    id: row.id,
    nom: row.nom,
    etage: Number(row.etage),
    contenance: Number(row.contenance)
  };
}

function mapEntrepriseRow(row) {
  return {
    id: row.id,
    nomEntreprise: row.nom_entreprise,
    logo: row.logo || '',
    siteUrl: row.site_url || ''
  };
}

export function isPostgresDataStorageEnabled() {
  return databaseUrl.length > 0;
}

export function getDataStorageLabel() {
  return isPostgresDataStorageEnabled() ? 'postgres' : 'missing-database-url';
}

export function readLocalSeedDatabase() {
  return {
    conferences: readLocalJsonFile('Conference.json'),
    speakers: readLocalJsonFile('Speakers.json'),
    salles: readLocalJsonFile('Salle.json'),
    entreprises: readLocalJsonFile('Entreprise.json')
  };
}

async function ensurePostgresSchema(sql) {
  await sql`
    create table if not exists conferences (
      id text primary key,
      nom text not null,
      horaire text not null,
      type text not null,
      speaker_ids jsonb not null default '[]'::jsonb,
      salle_ids jsonb not null default '[]'::jsonb
    )
  `;

  await sql`
    create table if not exists speakers (
      id text primary key,
      nom text not null,
      prenom text not null,
      photo text not null default '',
      entreprise text not null default 'ent-non-communique'
    )
  `;

  await sql`
    create table if not exists salles (
      id text primary key,
      nom text not null,
      etage integer not null,
      contenance integer not null
    )
  `;

  await sql`
    create table if not exists entreprises (
      id text primary key,
      nom_entreprise text not null,
      logo text not null default '',
      site_url text not null default ''
    )
  `;
}

async function getSqlClient() {
  if (!isPostgresDataStorageEnabled()) {
    return null;
  }

  if (!sqlClient) {
    sqlClient = postgres(databaseUrl, {
      ssl: shouldUseSsl(databaseUrl) ? 'require' : false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 15,
      prepare: false
    });
  }

  if (!schemaPromise) {
    schemaPromise = ensurePostgresSchema(sqlClient);
  }

  await schemaPromise;
  return sqlClient;
}

export async function closeDataStorage() {
  if (!sqlClient) {
    return;
  }

  await sqlClient.end();
  sqlClient = null;
  schemaPromise = null;
}

export async function loadDatabaseData() {
  if (!isPostgresDataStorageEnabled()) {
    throw new Error('taia_bdd_DATABASE_URL ou DATABASE_URL est obligatoire pour charger les donnees metier.');
  }

  const sql = await getSqlClient();
  const [conferenceRows, speakerRows, salleRows, entrepriseRows] = await Promise.all([
    sql`select id, nom, horaire, type, speaker_ids, salle_ids from conferences order by horaire, id`,
    sql`select id, nom, prenom, photo, entreprise from speakers order by nom, prenom, id`,
    sql`select id, nom, etage, contenance from salles order by etage, nom, id`,
    sql`select id, nom_entreprise, logo, site_url from entreprises order by nom_entreprise, id`
  ]);

  return {
    conferences: conferenceRows.map(mapConferenceRow),
    speakers: speakerRows.map(mapSpeakerRow),
    salles: salleRows.map(mapSalleRow),
    entreprises: entrepriseRows.map(mapEntrepriseRow)
  };
}

async function insertConference(sql, item) {
  await sql`
    insert into conferences (id, nom, horaire, type, speaker_ids, salle_ids)
    values (${item.id}, ${item.nom}, ${item.horaire}, ${item.type}, ${JSON.stringify(item.speakerIds)}::jsonb, ${JSON.stringify(item.salleIds)}::jsonb)
  `;
}

async function updateConference(sql, item) {
  await sql`
    update conferences
    set nom = ${item.nom},
        horaire = ${item.horaire},
        type = ${item.type},
        speaker_ids = ${JSON.stringify(item.speakerIds)}::jsonb,
        salle_ids = ${JSON.stringify(item.salleIds)}::jsonb
    where id = ${item.id}
  `;
}

async function insertSpeaker(sql, item) {
  await sql`
    insert into speakers (id, nom, prenom, photo, entreprise)
    values (${item.id}, ${item.nom}, ${item.prenom}, ${item.photo || ''}, ${item.entreprise || 'ent-non-communique'})
  `;
}

async function updateSpeaker(sql, item) {
  await sql`
    update speakers
    set nom = ${item.nom},
        prenom = ${item.prenom},
        photo = ${item.photo || ''},
        entreprise = ${item.entreprise || 'ent-non-communique'}
    where id = ${item.id}
  `;
}

async function insertSalle(sql, item) {
  await sql`
    insert into salles (id, nom, etage, contenance)
    values (${item.id}, ${item.nom}, ${item.etage}, ${item.contenance})
  `;
}

async function updateSalle(sql, item) {
  await sql`
    update salles
    set nom = ${item.nom},
        etage = ${item.etage},
        contenance = ${item.contenance}
    where id = ${item.id}
  `;
}

async function insertEntreprise(sql, item) {
  await sql`
    insert into entreprises (id, nom_entreprise, logo, site_url)
    values (${item.id}, ${item.nomEntreprise}, ${item.logo || ''}, ${item.siteUrl || ''})
  `;
}

async function updateEntreprise(sql, item) {
  await sql`
    update entreprises
    set nom_entreprise = ${item.nomEntreprise},
        logo = ${item.logo || ''},
        site_url = ${item.siteUrl || ''}
    where id = ${item.id}
  `;
}

export async function createStoredResource(resourceType, item) {
  const sql = await getSqlClient();

  switch (resourceType) {
    case 'conference':
      await insertConference(sql, item);
      return;
    case 'speaker':
      await insertSpeaker(sql, item);
      return;
    case 'salle':
      await insertSalle(sql, item);
      return;
    case 'entreprise':
      await insertEntreprise(sql, item);
      return;
    default:
      throw new Error(`Type de ressource inconnu: ${resourceType}`);
  }
}

export async function updateStoredResource(resourceType, item) {
  const sql = await getSqlClient();

  switch (resourceType) {
    case 'conference':
      await updateConference(sql, item);
      return;
    case 'speaker':
      await updateSpeaker(sql, item);
      return;
    case 'salle':
      await updateSalle(sql, item);
      return;
    case 'entreprise':
      await updateEntreprise(sql, item);
      return;
    default:
      throw new Error(`Type de ressource inconnu: ${resourceType}`);
  }
}

export async function deleteStoredResource(resourceType, id) {
  const sql = await getSqlClient();

  switch (resourceType) {
    case 'conference':
      await sql`delete from conferences where id = ${id}`;
      return;
    case 'speaker':
      await sql`delete from speakers where id = ${id}`;
      return;
    case 'salle':
      await sql`delete from salles where id = ${id}`;
      return;
    case 'entreprise':
      await sql`delete from entreprises where id = ${id}`;
      return;
    default:
      throw new Error(`Type de ressource inconnu: ${resourceType}`);
  }
}

export async function seedPostgresFromLocal() {
  const sql = await getSqlClient();
  const database = readLocalSeedDatabase();

  await sql.begin(async (transaction) => {
    await transaction`truncate table conferences, speakers, salles, entreprises`;

    for (const entreprise of database.entreprises) {
      await insertEntreprise(transaction, entreprise);
    }

    for (const speaker of database.speakers) {
      await insertSpeaker(transaction, speaker);
    }

    for (const salle of database.salles) {
      await insertSalle(transaction, salle);
    }

    for (const conference of database.conferences) {
      await insertConference(transaction, conference);
    }
  });

  return {
    conferences: database.conferences.length,
    speakers: database.speakers.length,
    salles: database.salles.length,
    entreprises: database.entreprises.length
  };
}

export async function migrateStoredMediaReferences({ dryRun = false, resolveCanonicalUrl, logger = console } = {}) {
  if (typeof resolveCanonicalUrl !== 'function') {
    throw new Error('resolveCanonicalUrl est obligatoire pour migrer les URLs media.');
  }

  const sql = await getSqlClient();
  const [speakerRows, entrepriseRows] = await Promise.all([
    sql`select id, photo from speakers order by id`,
    sql`select id, logo from entreprises order by id`
  ]);

  const details = [];
  let updatedSpeakers = 0;
  let updatedEntreprises = 0;
  let skipped = 0;

  async function migrateRows(rows, fieldName, tableName, onUpdate) {
    for (const row of rows) {
      const currentValue = String(row[fieldName] || '').trim();

      if (!currentValue) {
        continue;
      }

      const resolution = await resolveCanonicalUrl(currentValue, { tableName, fieldName, id: row.id });

      if (resolution.skipped) {
        skipped += 1;
        details.push({ table: tableName, id: row.id, status: 'skip', reason: resolution.reason || '' });
        logger.log(`${tableName}:${row.id} skip ${resolution.reason || ''}`);
        continue;
      }

      const nextValue = String(resolution.nextValue || '').trim();

      if (!nextValue || nextValue === currentValue) {
        details.push({ table: tableName, id: row.id, status: 'noop', reason: resolution.reason || '' });
        continue;
      }

      if (!dryRun) {
        await onUpdate(row.id, nextValue);
      }

      details.push({ table: tableName, id: row.id, status: dryRun ? 'would-update' : 'updated', reason: resolution.reason || '' });
      logger.log(`${tableName}:${row.id} ${dryRun ? 'would-update' : 'updated'} -> ${nextValue}`);
    }
  }

  await migrateRows(speakerRows, 'photo', 'speakers', async (id, nextValue) => {
    await sql`update speakers set photo = ${nextValue} where id = ${id}`;
    updatedSpeakers += 1;
  });

  await migrateRows(entrepriseRows, 'logo', 'entreprises', async (id, nextValue) => {
    await sql`update entreprises set logo = ${nextValue} where id = ${id}`;
    updatedEntreprises += 1;
  });

  return {
    updatedSpeakers,
    updatedEntreprises,
    skipped,
    details
  };
}