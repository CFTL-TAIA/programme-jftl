import { applyCorsHeaders, readRequestBody, sendBadRequest, sendCorsPreflight, sendJson, sendMethodNotAllowedFor, sendServerError, sendUnauthorized } from '../lib/api-service.mjs';
import { saveAdminMedia } from '../lib/admin-media.mjs';
import { getBearerToken, requireAdminPermission, verifyAdminToken } from '../lib/admin-auth.mjs';

function requireAdminJwt(request) {
  const token = getBearerToken(request);
  const payload = verifyAdminToken(token);
  return requireAdminPermission(payload, 'update');
}

export default async function handler(request, response) {
  applyCorsHeaders(request, response, ['POST', 'OPTIONS']);

  if (request.method === 'OPTIONS') {
    sendCorsPreflight(request, response, ['POST', 'OPTIONS']);
    return;
  }

  if (request.method !== 'POST') {
    sendMethodNotAllowedFor(response, ['POST']);
    return;
  }

  try {
    requireAdminJwt(request);
    const payload = await readRequestBody(request);

    if (!payload?.fieldName || !payload?.dataUrl) {
      sendBadRequest(response, 'Les champs fieldName et dataUrl sont obligatoires.');
      return;
    }

    sendJson(response, saveAdminMedia(payload));
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendBadRequest(response, 'Corps JSON invalide.');
      return;
    }

    if (error.message.includes('JWT') || error.message.includes('Permission admin')) {
      sendUnauthorized(response, error.message);
      return;
    }

    if (error.message.includes('obligatoire') || error.message.includes('supporté') || error.message.includes('nom de fichier') || error.message.includes('encodée')) {
      sendBadRequest(response, error.message);
      return;
    }

    sendServerError(response, error.message || 'Erreur interne.');
  }
}