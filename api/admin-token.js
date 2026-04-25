import { applyCorsHeaders, readRequestBody, sendBadRequest, sendCorsPreflight, sendJson, sendMethodNotAllowedFor, sendServerError } from '../lib/api-service.mjs';
import { getAdminPasswordHint, issueAdminToken } from '../lib/admin-auth.mjs';

export default async function handler(request, response) {
  applyCorsHeaders(request, response, ['GET', 'POST', 'OPTIONS']);

  if (request.method === 'OPTIONS') {
    sendCorsPreflight(request, response, ['GET', 'POST', 'OPTIONS']);
    return;
  }

  if (request.method === 'GET') {
    sendJson(response, getAdminPasswordHint());
    return;
  }

  if (request.method !== 'POST') {
    sendMethodNotAllowedFor(response, ['GET', 'POST']);
    return;
  }

  try {
    const payload = await readRequestBody(request);
    if (!payload?.password) {
      sendBadRequest(response, 'Le champ password est obligatoire.');
      return;
    }

    sendJson(response, { ...issueAdminToken(payload.password), message: 'Token admin genere avec succes.' });
  } catch (error) {
    if (error.message.includes('Mot de passe') || error.message.includes('Configuration admin')) {
      sendBadRequest(response, error.message);
      return;
    }

    sendServerError(response, error.message || 'Erreur interne.');
  }
}