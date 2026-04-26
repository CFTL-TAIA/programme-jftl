import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const entreprises = JSON.parse(readFileSync(join(rootDir, 'src', 'api', 'data', 'Entreprise.json'), 'utf8'));
const logosDir = join(rootDir, 'src', 'site', 'assets', 'media', 'logos');

mkdirSync(logosDir, { recursive: true });

function getInitials(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

for (const entreprise of entreprises) {
  const fileName = entreprise.logo.replace('/assets/media/logos/', '');
  const filePath = join(logosDir, fileName);
  const initials = getInitials(entreprise.nomEntreprise) || 'E';
  const escapedName = entreprise.nomEntreprise
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${escapedName}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#183153" />
      <stop offset="100%" stop-color="#0f9a94" />
    </linearGradient>
  </defs>
  <rect width="640" height="360" rx="32" fill="url(#bg)" />
  <circle cx="110" cy="112" r="56" fill="rgba(255,255,255,0.16)" />
  <text x="110" y="130" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">${initials}</text>
  <text x="60" y="222" font-family="Segoe UI, Arial, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${escapedName}</text>
  <text x="60" y="274" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#dbeafe">Logo placeholder a remplacer</text>
</svg>
`;

  writeFileSync(filePath, svg, 'utf8');
}