import { del, get, put } from '@vercel/blob';
import { readFileSync, writeFileSync } from 'node:fs';

const dataToken = process.env.bdd_READ_WRITE_TOKEN || process.env.BDD_READ_WRITE_TOKEN || '';
const mediaToken = process.env.taia_READ_WRITE_TOKEN || process.env.TAIA_READ_WRITE_TOKEN || '';

export const dataBlobPrefix = 'Data';
export const mediaBlobPrefix = 'medias';

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

function isBlobUrl(value) {
  return /^https?:\/\/[^\s]+\.blob\.vercel-storage\.com\//i.test(String(value || ''));
}

export function isDataBlobStorageEnabled() {
  return dataToken.length > 0;
}

export function isMediaBlobStorageEnabled() {
  return mediaToken.length > 0;
}

export function getDataStorageLabel() {
  return isDataBlobStorageEnabled() ? 'vercel-blob' : 'local-json';
}

export function getMediaStorageLabel() {
  return isMediaBlobStorageEnabled() ? 'vercel-blob' : 'local-filesystem';
}

export async function readDataJson(fileName, localFilePath) {
  if (isDataBlobStorageEnabled()) {
    const blobText = await readBlobText(buildBlobPath(dataBlobPrefix, fileName), 'private', dataToken);

    if (blobText !== null) {
      return JSON.parse(blobText);
    }
  }

  return JSON.parse(readFileSync(localFilePath, 'utf8'));
}

export async function writeDataJson(fileName, items, localFilePath) {
  const payload = JSON.stringify(items, null, 2) + '\n';

  if (!isDataBlobStorageEnabled()) {
    writeFileSync(localFilePath, payload, 'utf8');
    return;
  }

  const pathname = buildBlobPath(dataBlobPrefix, fileName);
  const current = await get(pathname, { access: 'private', token: dataToken });
  const options = {
    access: 'private',
    token: dataToken,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8',
    cacheControlMaxAge: 60
  };

  if (current?.blob?.etag) {
    options.ifMatch = current.blob.etag;
  }

  await put(pathname, payload, options);
}

export async function uploadPublicMedia(pathname, buffer, contentType) {
  if (!isMediaBlobStorageEnabled()) {
    return null;
  }

  return put(buildBlobPath(mediaBlobPrefix, pathname), buffer, {
    access: 'public',
    token: mediaToken,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 60
  });
}

export async function deletePublicMedia(reference) {
  if (!isMediaBlobStorageEnabled() || !isBlobUrl(reference)) {
    return;
  }

  await del(reference, { token: mediaToken });
}