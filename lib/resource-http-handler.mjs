import {
  applyCorsHeaders,
  buildRequestUrl,
  createResource,
  deleteResource,
  executeHandler,
  readRequestBody,
  sendCorsPreflight,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowedFor,
  sendServerError,
  sendUnauthorized,
  updateResource
} from './api-service.mjs';
import { getBearerToken, requireAdminPermission, verifyAdminToken } from './admin-auth.mjs';

function requireAdminJwt(request, permission) {
  const token = getBearerToken(request);
  const payload = verifyAdminToken(token);
  return requireAdminPermission(payload, permission);
}

export async function handleResourceRequest(request, response, resourceType, handlerName, path) {
  try {
    applyCorsHeaders(request, response);

    if (request.method === 'OPTIONS') {
      sendCorsPreflight(request, response);
      return;
    }

    if (request.method === 'GET') {
      const url = buildRequestUrl(request, path);
      sendJson(response, await executeHandler(handlerName, url));
      return;
    }

    if (request.method === 'POST') {
      requireAdminJwt(request, 'create');
      const payload = await readRequestBody(request);
      sendJson(response, { item: await createResource(resourceType, payload), message: `${resourceType} cree avec succes.` }, 201);
      return;
    }

    if (request.method === 'PUT') {
      requireAdminJwt(request, 'update');
      const payload = await readRequestBody(request);
      sendJson(response, { item: await updateResource(resourceType, payload), message: `${resourceType} mis a jour avec succes.` });
      return;
    }

    if (request.method === 'DELETE') {
      requireAdminJwt(request, 'delete');
      const url = buildRequestUrl(request, path);
      const payload = await readRequestBody(request).catch(() => null);
      const id = url.searchParams.get('id') || payload?.id || null;
      sendJson(response, { ...await deleteResource(resourceType, id), message: `${resourceType} supprime avec succes.` });
      return;
    }

    sendMethodNotAllowedFor(response, ['GET', 'POST', 'PUT', 'DELETE']);
  } catch (error) {
    if (error instanceof SyntaxError) {
      sendBadRequest(response, 'Corps JSON invalide.');
      return;
    }

    if (error.message.includes('JWT') || error.message.includes('Mot de passe') || error.message.includes('Permission admin')) {
      sendUnauthorized(response, error.message);
      return;
    }

    if (error.message.includes('obligatoire') || error.message.includes('existe deja') || error.message.includes('Aucune ressource') || error.message.includes('Le corps JSON')) {
      sendBadRequest(response, error.message);
      return;
    }

    sendServerError(response, error.message || 'Erreur interne.');
  }
}