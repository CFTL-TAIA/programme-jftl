import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { imageSize } from 'image-size';
import { basename, extname, join } from 'node:path';
import { deletePublicMedia, getMediaStorageLabel, isMediaBlobStorageEnabled, uploadPublicMedia } from './blob-storage.mjs';
import { distSiteMediaDir, publicLogoBase, publicPhotoBase, siteMediaDir } from './project-paths.mjs';

const uploadTargets = {
  photo: {
    sourceDir: join(siteMediaDir, 'photos'),
    distDir: join(distSiteMediaDir, 'photos'),
    publicBase: publicPhotoBase,
    blobDir: 'photos',
    maxWidth: 1200,
    maxHeight: 1600
  },
  logo: {
    sourceDir: join(siteMediaDir, 'logos'),
    distDir: join(distSiteMediaDir, 'logos'),
    publicBase: publicLogoBase,
    blobDir: 'logos',
    maxWidth: 1600,
    maxHeight: 800
  }
};

export const maxMediaUploadBytes = 2 * 1024 * 1024;

const extensionByMime = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp'
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) {
    throw new Error('Image encodée invalide.');
  }

  const mimeType = match[1];
  const extension = extensionByMime[mimeType];
  if (!extension) {
    throw new Error(`Format d'image non supporté: ${mimeType}.`);
  }

  return {
    mimeType,
    extension,
    buffer: Buffer.from(match[2], 'base64')
  };
}

function getUploadTarget(fieldName) {
  const target = uploadTargets[fieldName];
  if (!target) {
    throw new Error(`Champ média non supporté: ${fieldName}.`);
  }

  return target;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeCopies(target, fileName, buffer) {
  ensureDir(target.sourceDir);
  ensureDir(target.distDir);
  writeFileSync(join(target.sourceDir, fileName), buffer);
  writeFileSync(join(target.distDir, fileName), buffer);
}

function deleteCopies(target, fileName) {
  for (const dir of [target.sourceDir, target.distDir]) {
    const filePath = join(dir, fileName);
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

function validateBufferSize(buffer) {
  if (buffer.byteLength > maxMediaUploadBytes) {
    throw new Error('Le fichier depasse la taille maximale autorisee de 2 Mo.');
  }
}

function validateImageDimensions(target, buffer) {
  const { width, height } = imageSize(buffer);

  if (!width || !height) {
    throw new Error('Impossible de determiner les dimensions de l image.');
  }

  if (width > target.maxWidth || height > target.maxHeight) {
    throw new Error(`Les dimensions maximales autorisees sont ${target.maxWidth} x ${target.maxHeight} px.`);
  }
}

export function getMediaUploadRules(fieldName) {
  const target = getUploadTarget(fieldName);

  return {
    maxBytes: maxMediaUploadBytes,
    maxWidth: target.maxWidth,
    maxHeight: target.maxHeight,
    maxDisplaySize: '2 Mo',
    storage: getMediaStorageLabel()
  };
}

function resolveManagedMediaTarget(reference) {
  const normalizedReference = String(reference || '').trim();

  if (!normalizedReference) {
    return null;
  }

  for (const [fieldName, target] of Object.entries(uploadTargets)) {
    if (normalizedReference.startsWith(`${target.publicBase}/`)) {
      return {
        fieldName,
        target,
        fileName: basename(normalizedReference)
      };
    }

    if (normalizedReference.includes(`/medias/${target.blobDir}/`)) {
      return {
        fieldName,
        target,
        fileName: basename(normalizedReference)
      };
    }
  }

  return null;
}

export async function deleteAdminMedia(reference) {
  const managedMedia = resolveManagedMediaTarget(reference);

  if (!managedMedia?.fileName) {
    return false;
  }

  if (managedMedia.target.publicBase && String(reference).startsWith(`${managedMedia.target.publicBase}/`)) {
    deleteCopies(managedMedia.target, managedMedia.fileName);
    return true;
  }

  await deletePublicMedia(reference);
  return true;
}

export async function saveAdminMedia({ fieldName, currentPath, fileNameStem, dataUrl }) {
  const target = getUploadTarget(fieldName);
  const { mimeType, extension, buffer } = parseDataUrl(dataUrl);
  validateBufferSize(buffer);
  validateImageDimensions(target, buffer);
  const currentFileName = currentPath ? basename(currentPath) : '';
  const currentStem = currentFileName ? basename(currentFileName, extname(currentFileName)) : '';
  const nextStem = currentStem || slugify(fileNameStem);

  if (!nextStem) {
    throw new Error('Impossible de déterminer un nom de fichier pour le média.');
  }

  const nextFileName = `${nextStem}.${extension}`;
  if (currentFileName && currentFileName !== nextFileName && !isMediaBlobStorageEnabled()) {
    deleteCopies(target, currentFileName);
  }

  let publicPath;

  if (isMediaBlobStorageEnabled()) {
    const blob = await uploadPublicMedia(`${target.blobDir}/${nextFileName}`, buffer, mimeType);

    if (currentPath && currentPath !== blob.url) {
      await deletePublicMedia(currentPath);
    }

    publicPath = blob.url;
  } else {
    writeCopies(target, nextFileName, buffer);
    publicPath = `${target.publicBase}/${nextFileName}`;
  }

  return {
    publicPath,
    requiresResourceSave: Boolean(currentPath && currentPath !== publicPath),
    message: currentPath && currentPath !== publicPath
      ? 'Image chargée. Enregistrez maintenant la ressource pour mettre à jour l’URL.'
      : 'Image chargée avec succès.'
  };
}