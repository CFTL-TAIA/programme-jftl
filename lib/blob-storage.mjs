import { BlobPreconditionFailedError, del, get, put } from '@vercel/blob';
import { readFileSync, writeFileSync } from 'node:fs';

const dataToken = process.env.bdd_READ_WRITE_TOKEN || process.env.BDD_READ_WRITE_TOKEN || '';
const mediaToken = process.env.taia_READ_WRITE_TOKEN || process.env.TAIA_READ_WRITE_TOKEN || '';
const configuredStorageMode = String(process.env.TAIA_STORAGE_MODE || '').trim().toLowerCase();
const mutableBlobCacheMaxAgeSeconds = 0;

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export const dataBlobPrefix = 'Data';
export const mediaBlobPrefix = 'medias';

function isForcedLocalMode() {
  return configuredStorageMode === 'local';
}

function buildBlobPath(prefix, fileName) {
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${String(fileName || '').replace(/^\/+/, '')}`;
}

async function readBlobText(pathname, access, token) {
  const result = await get(pathname, { access, token });

  if (!result) {
    return null;
  }

  return new Response(result.stream).text();
}

async function readBlobJsonWithMetadata(pathname, access, token) {
  const result = await get(pathname, { access, token });

  if (!result) {
    return {
      data: null,
      etag: null
    };
  }

  const text = await new Response(result.stream).text();

  return {
    data: JSON.parse(text),
    etag: result.blob?.etag || null
  };
}

function isBlobUrl(value) {
  return /^https?:\/\/[^\s]+\.blob\.vercel-storage\.com\//i.test(String(value || ''));
}

export function isDataBlobStorageEnabled() {
  if (isForcedLocalMode()) {
    return false;
  }

  return dataToken.length > 0;
}

export function isMediaBlobStorageEnabled() {
  if (isForcedLocalMode()) {
    return false;
  }

  return mediaToken.length > 0;
}

export function getDataStorageLabel() {
  if (isForcedLocalMode()) {
    return 'local-json-forced';
  }

  return isDataBlobStorageEnabled() ? 'vercel-blob' : 'local-json';
}

export function getMediaStorageLabel() {
  if (isForcedLocalMode()) {
    return 'local-filesystem-forced';
  }

  return isMediaBlobStorageEnabled() ? 'vercel-blob' : 'local-filesystem';
}

export function isBlobPreconditionFailedError(error) {
  return error instanceof BlobPreconditionFailedError || error?.message?.includes('Precondition failed: ETag mismatch.');
}

async function retryBlobOperation(operation, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (isBlobPreconditionFailedError(error) && attempt < maxAttempts) {
        await wait(150 * attempt);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Le stockage distant est encore en cours de synchronisation. Attendez quelques secondes puis recommencez.');
}

export async function readDataJsonWithMetadata(fileName, localFilePath) {
  if (isDataBlobStorageEnabled()) {
    const result = await readBlobJsonWithMetadata(buildBlobPath(dataBlobPrefix, fileName), 'private', dataToken);

    if (result.data !== null) {
      return result;
    }
  }

  return {
    data: JSON.parse(readFileSync(localFilePath, 'utf8')),
    etag: null
  };
}

export async function readDataJson(fileName, localFilePath) {
  const result = await readDataJsonWithMetadata(fileName, localFilePath);
  return result.data;
}

export async function writeDataJson(fileName, items, localFilePath, expectedEtag = null) {
  const payload = JSON.stringify(items, null, 2) + '\n';

  if (!isDataBlobStorageEnabled()) {
    writeFileSync(localFilePath, payload, 'utf8');
    return;
  }

  const pathname = buildBlobPath(dataBlobPrefix, fileName);
  const options = {
    access: 'private',
    token: dataToken,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: mutableBlobCacheMaxAgeSeconds
  };

  if (expectedEtag) {
    options.ifMatch = expectedEtag;
  }

  await put(pathname, payload, options);
}

export async function uploadPublicMedia(pathname, buffer, contentType) {
  if (!isMediaBlobStorageEnabled()) {
    return null;
  }

  return retryBlobOperation(() => put(buildBlobPath(mediaBlobPrefix, pathname), buffer, {
    access: 'public',
    token: mediaToken,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: mutableBlobCacheMaxAgeSeconds
  }));
}

export async function deletePublicMedia(reference) {
  if (!isMediaBlobStorageEnabled() || !isBlobUrl(reference)) {
    return;
  }

  await retryBlobOperation(() => del(reference, { token: mediaToken }));
}