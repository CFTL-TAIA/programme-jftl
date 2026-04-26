import { apiRoutes } from '../src/api/routes.mjs';
import { createRouteHandlers } from './api-service.mjs';
import { isPostgresDataStorageEnabled, loadDatabaseData, readLocalSeedDatabase } from './data-storage.mjs';

function cloneSchema(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripSchemaExamples(schema) {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((entry) => stripSchemaExamples(entry));
  }

  const nextSchema = Object.fromEntries(
    Object.entries(schema)
      .filter(([key]) => key !== 'example')
      .map(([key, value]) => [key, stripSchemaExamples(value)])
  );

  return nextSchema;
}

function inferSchema(value) {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchema(value[0]) : {}
    };
  }

  if (value === null) {
    return {
      nullable: true
    };
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string', example: value };
    case 'number':
      return { type: 'number', example: value };
    case 'boolean':
      return { type: 'boolean', example: value };
    case 'object': {
      const properties = Object.fromEntries(
        Object.entries(value).map(([key, childValue]) => [key, inferSchema(childValue)])
      );

      return {
        type: 'object',
        properties,
        example: value
      };
    }
    default:
      return { type: 'string', example: String(value) };
  }
}

export async function buildOpenApiDocument() {
  const database = isPostgresDataStorageEnabled()
    ? await loadDatabaseData()
    : readLocalSeedDatabase();
  const routeHandlers = createRouteHandlers(database);
  const paths = {};

  for (const route of apiRoutes) {
    const methodKey = route.method.toLowerCase();
    const exampleResponse = route.handlerName
      ? routeHandlers[route.handlerName](new URL(`https://taia.local${route.path}`))
      : route.exampleResponse;
    const successStatus = String(route.successStatus || 200);
    const responseSchema = stripSchemaExamples(route.responseSchema ? cloneSchema(route.responseSchema) : inferSchema(exampleResponse));

    paths[route.path] = paths[route.path] || {};
    paths[route.path][methodKey] = {
      summary: route.summary,
      description: route.description,
      tags: route.tags,
      security: route.requiresAuth ? [{ bearerAuth: [] }] : [],
      parameters: route.queryParameters.map((parameter) => ({
        name: parameter.name,
        in: 'query',
        required: false,
        description: parameter.description,
        schema: {
          type: 'string'
        }
      })),
      ...(route.requestBodyExample
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: stripSchemaExamples(route.requestBodySchema ? cloneSchema(route.requestBodySchema) : inferSchema(route.requestBodyExample)),
                  example: route.requestBodyExample
                }
              }
            }
          }
        : {}),
      responses: {
        [successStatus]: {
          description: 'Reponse du service',
          content: {
            'application/json': {
              schema: responseSchema,
              example: exampleResponse
            }
          }
        },
        ...(route.method !== 'GET'
          ? {
              400: {
                description: 'Requete invalide ou validation echouee.'
              }
            }
          : {}),
        ...(route.requiresAuth
          ? {
              401: {
                description: 'JWT manquant, invalide ou scope insuffisant.'
              }
            }
          : {})
      }
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Projet API TAIA',
      version: '0.3.0',
      description: 'Documentation OpenAPI generee a partir des routes reelles serverless du projet, avec schemas explicites, champs requis et scopes admin.'
    },
    servers: [
      {
        url: '/'
      }
    ],
    tags: [
      {
        name: 'Conference',
        description: 'Lecture et administration du programme JFTL 2026.'
      },
      {
        name: 'Speaker',
        description: 'Lecture et administration des speakers.'
      },
      {
        name: 'Salle',
        description: 'Lecture et administration des salles.'
      },
      {
        name: 'Entreprise',
        description: 'Lecture et administration des entreprises.'
      },
      {
        name: 'Admin',
        description: 'Generation du JWT admin journalier et documentation des scopes de securite.'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths
  };
}