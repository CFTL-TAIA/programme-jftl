import { BlobPreconditionFailedError, del, put } from '@vercel/blob';
const mediaToken = process.env.taia_READ_WRITE_TOKEN || process.env.TAIA_READ_WRITE_TOKEN || '';
const mutableBlobCacheMaxAgeSeconds = 0;

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export const mediaBlobPrefix = 'medias';

export function getMediaBlobToken() {
  return mediaToken;
}

function buildBlobPath(prefix, fileName) {
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${String(fileName || '').replace(/^\/+/, '')}`;
}

export function isBlobUrl(value) {
  return /^https?:\/\/[^\s]+\.blob\.vercel-storage\.com\//i.test(String(value || ''));
}

export function parseManagedMediaReference(reference) {
  const normalizedReference = String(reference || '').trim();

  if (!normalizedReference) {
    return null;
  }

  const patterns = [
    {
      regex: /^https?:\/\/[^/]+\/BDD\/(photos|logos)\/([^?#]+)$/i,
      publicBase: '/BDD'
    },
    {
      regex: /^\/BDD\/(photos|logos)\/([^?#]+)$/i,
      publicBase: '/BDD'
    },
    {
      regex: /^https?:\/\/[^/]+\/assets\/media\/(photos|logos)\/([^?#]+)$/i,
      publicBase: '/assets/media'
    },
    {
      regex: /^\/assets\/media\/(photos|logos)\/([^?#]+)$/i,
      publicBase: '/assets/media'
    },
    {
      regex: /^https?:\/\/[^\s]+\.blob\.vercel-storage\.com\/medias\/(photos|logos)\/([^?#]+)$/i,
      publicBase: ''
    }
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(normalizedReference);

    if (!match) {
      continue;
    }

    const mediaKind = match[1].toLowerCase();
    const fileName = decodeURIComponent(match[2]);
    const pathname = buildBlobPath(mediaBlobPrefix, `${mediaKind}/${fileName}`);

    return {
      mediaKind,
      fileName,
      pathname,
      previewPath: `/assets/media/${mediaKind}/${fileName}`,
      legacyPublicBase: pattern.publicBase,
      reference: normalizedReference
    };
  }

  return null;
}

export function isMediaBlobStorageEnabled() {
  return mediaToken.length > 0;
}

export function getMediaStorageLabel() {
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