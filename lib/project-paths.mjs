import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const rootDir = join(__dirname, '..');
export const seedDataDir = join(rootDir, 'src', 'api', 'data');
export const siteMediaDir = join(rootDir, 'src', 'site', 'assets', 'media');
export const distSiteMediaDir = join(rootDir, 'dist', 'assets', 'media');
export const publicPhotoBase = '/assets/media/photos';
export const publicLogoBase = '/assets/media/logos';