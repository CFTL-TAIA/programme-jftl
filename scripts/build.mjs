import './load-local-env.mjs';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOpenApiDocument } from '../lib/openapi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const srcSiteDir = join(rootDir, 'src', 'site');
const swaggerDocsDir = join(rootDir, 'docs', 'Swagger');

function resetDist() {
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true });
  }

  mkdirSync(distDir, { recursive: true });
}

function writeNoJekyll() {
  writeFileSync(join(distDir, '.nojekyll'), '');
}

function copySite() {
  cpSync(srcSiteDir, distDir, { recursive: true });
}

function copySwaggerUi() {
  const targetDir = join(distDir, 'docs', 'Swagger');
  mkdirSync(targetDir, { recursive: true });
  cpSync(join(swaggerDocsDir, 'index.html'), join(targetDir, 'index.html'));
}

async function writeGeneratedArtifacts() {
  const openApiDocument = JSON.stringify(await buildOpenApiDocument(), null, 2);
  writeFileSync(join(swaggerDocsDir, 'openapi.json'), openApiDocument + '\n');
  writeFileSync(join(distDir, 'docs', 'Swagger', 'openapi.json'), openApiDocument + '\n');
}

resetDist();
copySite();
copySwaggerUi();
await writeGeneratedArtifacts();
writeNoJekyll();