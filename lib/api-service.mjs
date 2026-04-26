import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBlobPreconditionFailedError, readDataJson, readDataJsonWithMetadata, writeDataJson } from './blob-storage.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const databaseDir = join(rootDir, 'BDD');
const corsAllowedOrigins = new Set([
  'http://localhost:8080',
  'https://cftl-taia.github.io',
  'https://programme-jftl.vercel.app'
]);

export const resourceDefinitions = {
  conference: {
    collectionKey: 'conferences',
    fileName: 'Conference.json',
    idField: 'id'
  },
  speaker: {
    collectionKey: 'speakers',
    fileName: 'Speakers.json',
    idField: 'id'
  },
  salle: {
    collectionKey: 'salles',
    fileName: 'Salle.json',
    idField: 'id'
  },
  entreprise: {
    collectionKey: 'entreprises',
    fileName: 'Entreprise.json',
    idField: 'id'
  }
};

export const conferenceTypes = ['session', 'keynote', 'sponsor', 'networking', 'demo', 'closing'];

function getResourceDefinition(resourceType) {
  const definition = resourceDefinitions[resourceType];

  if (!definition) {
    throw new Error(`Type de ressource inconnu: ${resourceType}`);
  }

  return definition;
}

function getResourcePath(resourceType) {
  return join(databaseDir, getResourceDefinition(resourceType).fileName);
}

async function readJsonFile(fileName) {
  return readDataJson(fileName, join(databaseDir, fileName));
}

async function readJsonFileWithMetadata(fileName) {
  return readDataJsonWithMetadata(fileName, join(databaseDir, fileName));
}

export async function writeJsonResource(resourceType, items, expectedEtag = null) {
  await writeDataJson(getResourceDefinition(resourceType).fileName, items, getResourcePath(resourceType), expectedEtag);
}

export async function loadDatabase() {
  return {
    conferences: await readJsonFile('Conference.json'),
    speakers: await readJsonFile('Speakers.json'),
    salles: await readJsonFile('Salle.json'),
    entreprises: await readJsonFile('Entreprise.json')
  };
}

export async function loadResource(resourceType, database = null) {
  const definition = getResourceDefinition(resourceType);
  const resolvedDatabase = database || await loadDatabase();
  return resolvedDatabase[definition.collectionKey];
}

export function readFilters(url, names) {
  const filters = {};

  for (const name of names) {
    const value = url.searchParams.get(name);
    filters[name] = value === null || value === '' ? null : value;
  }

  return filters;
}

export function includesText(value, expected) {
  if (!expected) {
    return true;
  }

  return String(value).toLowerCase().includes(String(expected).toLowerCase());
}

export function normalizeFloor(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return Number(value);
}

export function speakerMatchesFloor(database, speakerId, floor) {
  if (floor === null) {
    return true;
  }

  const matchingConference = database.conferences.find((conference) => {
    if (!conference.speakerIds.includes(speakerId)) {
      return false;
    }

    return conference.salleIds.some((salleId) => {
      const salle = database.salles.find((room) => room.id === salleId);
      return salle ? Number(salle.etage) === floor : false;
    });
  });

  return Boolean(matchingConference);
}

export function createRouteHandlers(database) {
  return {
    getConferences(url) {
      const filters = readFilters(url, ['id', 'nom', 'speakerId', 'salleId', 'horaire']);
      const items = database.conferences.filter((conference) => {
        return (
          includesText(conference.id, filters.id) &&
          includesText(conference.nom, filters.nom) &&
          (!filters.speakerId || conference.speakerIds.includes(filters.speakerId)) &&
          (!filters.salleId || conference.salleIds.includes(filters.salleId)) &&
          includesText(conference.horaire, filters.horaire)
        );
      });

      return {
        items,
        total: items.length,
        filters
      };
    },

    getSpeakers(url) {
      const filters = readFilters(url, ['id', 'nom', 'etage', 'entreprise']);
      const floor = normalizeFloor(filters.etage);
      const items = database.speakers.filter((speaker) => {
        const fullName = `${speaker.prenom} ${speaker.nom}`;

        return (
          includesText(speaker.id, filters.id) &&
          (includesText(speaker.nom, filters.nom) || includesText(speaker.prenom, filters.nom) || includesText(fullName, filters.nom)) &&
          speakerMatchesFloor(database, speaker.id, floor) &&
          includesText(speaker.entreprise, filters.entreprise)
        );
      });

      return {
        items,
        total: items.length,
        filters: {
          ...filters,
          etage: filters.etage
        }
      };
    },

    getSalles(url) {
      const filters = readFilters(url, ['id', 'nom', 'etage']);
      const floor = normalizeFloor(filters.etage);
      const items = database.salles.filter((salle) => {
        return (
          includesText(salle.id, filters.id) &&
          includesText(salle.nom, filters.nom) &&
          (floor === null || Number(salle.etage) === floor)
        );
      });

      return {
        items,
        total: items.length,
        filters: {
          ...filters,
          etage: filters.etage
        }
      };
    },

    getEntreprises(url) {
      const filters = {
        id: url.searchParams.get('id') || null,
        nomEntreprise: url.searchParams.get('nomEntreprise') || null,
        speakerId: url.searchParams.get('speakerId') || null
      };
      const items = database.entreprises.filter((entreprise) => {
        const matchesSpeaker = !filters.speakerId || database.speakers.some((speaker) => {
          return speaker.id === filters.speakerId && speaker.entreprise === entreprise.id;
        });

        return (
          includesText(entreprise.id, filters.id) &&
          includesText(entreprise.nomEntreprise, filters.nomEntreprise) &&
          matchesSpeaker
        );
      });

      return {
        items,
        total: items.length,
        filters
      };
    }
  };
}

function ensureJsonObject(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    throw new Error('Le corps JSON doit etre un objet.');
  }
}

function ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Le champ ${fieldName} est obligatoire.`);
  }

  return value.trim();
}

function ensureOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureInteger(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    throw new Error(`Le champ ${fieldName} doit etre un entier positif ou nul.`);
  }

  return parsedValue;
}

function ensureStringArray(value, fieldName) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`Le champ ${fieldName} doit etre une liste.`);
  }

  return [...new Set(value.map((entry) => ensureNonEmptyString(entry, fieldName)))];
}

function normalizeResourcePayload(resourceType, payload) {
  const id = ensureNonEmptyString(payload.id, 'id');

  switch (resourceType) {
    case 'conference': {
      const type = ensureNonEmptyString(payload.type, 'type');

      if (!conferenceTypes.includes(type)) {
        throw new Error(`Le champ type doit etre une des valeurs suivantes: ${conferenceTypes.join(', ')}.`);
      }

      return {
        id,
        nom: ensureNonEmptyString(payload.nom, 'nom'),
        horaire: ensureNonEmptyString(payload.horaire, 'horaire'),
        type,
        speakerIds: ensureStringArray(payload.speakerIds, 'speakerIds'),
        salleIds: ensureStringArray(payload.salleIds, 'salleIds')
      };
    }
    case 'speaker':
      return {
        id,
        nom: ensureNonEmptyString(payload.nom, 'nom'),
        prenom: ensureNonEmptyString(payload.prenom, 'prenom'),
        photo: ensureOptionalString(payload.photo),
        entreprise: ensureOptionalString(payload.entreprise) || 'ent-non-communique'
      };
    case 'salle':
      return {
        id,
        nom: ensureNonEmptyString(payload.nom, 'nom'),
        etage: ensureInteger(payload.etage, 'etage'),
        contenance: ensureInteger(payload.contenance, 'contenance')
      };
    case 'entreprise':
      return {
        id,
        nomEntreprise: ensureNonEmptyString(payload.nomEntreprise, 'nomEntreprise'),
        logo: ensureOptionalString(payload.logo),
        siteUrl: ensureOptionalString(payload.siteUrl)
      };
    default:
      return payload;
  }
}

async function mutateResourceWithRetry(resourceType, mutation) {
  const definition = getResourceDefinition(resourceType);
  const resourcePath = getResourcePath(resourceType);
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const { data, etag } = await readJsonFileWithMetadata(definition.fileName);
    const items = [...data];

    try {
      const result = mutation(items, definition);
      await writeDataJson(definition.fileName, result.items, resourcePath, etag);
      return result.value;
    } catch (error) {
      if (isBlobPreconditionFailedError(error) && attempt < maxAttempts) {
        continue;
      }

      throw error;
    }
  }

  throw new Error('La ressource a ete modifiee simultanement. Reessayez.');
}

export async function createResource(resourceType, payload) {
  ensureJsonObject(payload);

  const normalizedPayload = normalizeResourcePayload(resourceType, payload);
  return mutateResourceWithRetry(resourceType, (items, definition) => {
    const id = normalizedPayload[definition.idField];

    if (!id) {
      throw new Error(`Le champ ${definition.idField} est obligatoire.`);
    }

    if (items.some((item) => item[definition.idField] === id)) {
      throw new Error(`Une ressource ${resourceType} avec l identifiant ${id} existe deja.`);
    }

    items.push(normalizedPayload);

    return {
      items,
      value: normalizedPayload
    };
  });
}

export async function updateResource(resourceType, payload) {
  ensureJsonObject(payload);

  const normalizedPayload = normalizeResourcePayload(resourceType, payload);
  return mutateResourceWithRetry(resourceType, (items, definition) => {
    const id = normalizedPayload[definition.idField];

    if (!id) {
      throw new Error(`Le champ ${definition.idField} est obligatoire.`);
    }

    const index = items.findIndex((item) => item[definition.idField] === id);

    if (index === -1) {
      throw new Error(`Aucune ressource ${resourceType} avec l identifiant ${id}.`);
    }

    items[index] = normalizedPayload;

    return {
      items,
      value: normalizedPayload
    };
  });
}

export async function deleteResource(resourceType, id) {
  return mutateResourceWithRetry(resourceType, (items, definition) => {
    if (!id) {
      throw new Error(`Le parametre ${definition.idField} est obligatoire.`);
    }

    const nextItems = items.filter((item) => item[definition.idField] !== id);

    if (nextItems.length === items.length) {
      throw new Error(`Aucune ressource ${resourceType} avec l identifiant ${id}.`);
    }

    return {
      items: nextItems,
      value: {
        deletedId: id,
        total: nextItems.length
      }
    };
  });
}

export async function readRequestBody(request) {
  if (typeof request.body === 'string') {
    return request.body.length === 0 ? null : JSON.parse(request.body);
  }

  if (request.body && typeof request.body === 'object' && !(request.body instanceof Uint8Array)) {
    return request.body;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const bodyText = Buffer.concat(chunks).toString('utf8').trim();
  return bodyText.length === 0 ? null : JSON.parse(bodyText);
}

export function buildRequestUrl(request, fallbackPath) {
  const protocolHeader = request.headers['x-forwarded-proto'];
  const protocol = Array.isArray(protocolHeader) ? protocolHeader[0] : protocolHeader || 'http';
  const hostHeader = request.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || 'localhost:8080';
  return new URL(request.url || fallbackPath, `${protocol}://${host}`);
}

export async function executeHandler(handlerName, url, database = null) {
  const routeHandlers = createRouteHandlers(database || await loadDatabase());
  return routeHandlers[handlerName](url);
}

export function applyCorsHeaders(request, response, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  const originHeader = request.headers?.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  response.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Max-Age', '86400');
  response.setHeader('Vary', 'Origin');

  if (origin && corsAllowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin);
  }
}

export function sendCorsPreflight(request, response, allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
  applyCorsHeaders(request, response, allowedMethods);
  response.statusCode = 204;
  response.end();
}

export function sendJson(response, payload, status = 200) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload, null, 2));
}

export function sendMethodNotAllowed(response) {
  response.setHeader('Allow', 'GET');
  sendJson(
    response,
    {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Seules les requetes GET sont supportees pour le moment.'
      }
    },
    405
  );
}

export function sendMethodNotAllowedFor(response, allowedMethods) {
  response.setHeader('Allow', allowedMethods.join(', '));
  sendJson(
    response,
    {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Methodes supportees: ${allowedMethods.join(', ')}.`
      }
    },
    405
  );
}

export function sendBadRequest(response, message) {
  sendJson(
    response,
    {
      error: {
        code: 'BAD_REQUEST',
        message
      }
    },
    400
  );
}

export function sendUnauthorized(response, message = 'Authentification requise.') {
  sendJson(
    response,
    {
      error: {
        code: 'UNAUTHORIZED',
        message
      }
    },
    401
  );
}

export function sendServerError(response, message) {
  sendJson(
    response,
    {
      error: {
        code: 'SERVER_ERROR',
        message
      }
    },
    500
  );
}