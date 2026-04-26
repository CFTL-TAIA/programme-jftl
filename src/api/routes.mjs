const conferenceTypeEnum = ['session', 'keynote', 'sponsor', 'networking', 'demo', 'closing'];
const mediaUploadMaxBytes = 2 * 1024 * 1024;
const photoMaxDimensions = '1200 x 1600 px';
const logoMaxDimensions = '1600 x 800 px';

function stringProperty(description, example, format) {
  return {
    type: 'string',
    description,
    ...(format ? { format } : {}),
    ...(example !== undefined ? { example } : {})
  };
}

function integerProperty(description, example) {
  return {
    type: 'integer',
    description,
    ...(example !== undefined ? { example } : {})
  };
}

function arrayProperty(description, itemSchema, example) {
  return {
    type: 'array',
    description,
    items: itemSchema,
    ...(example !== undefined ? { example } : {})
  };
}

function objectSchema(description, required, properties, example) {
  return {
    type: 'object',
    description,
    required,
    properties,
    ...(example !== undefined ? { example } : {})
  };
}

const conferenceSchema = objectSchema(
  'Conférence ou créneau du programme.',
  ['id', 'nom', 'horaire', 'type', 'speakerIds', 'salleIds'],
  {
    id: stringProperty('Identifiant technique unique de la conférence.', 'conf-ouverture-olivier-denoo'),
    nom: stringProperty('Titre affiché dans le programme.', 'Ouverture par Olivier Denoo'),
    horaire: stringProperty('Date et heure ISO 8601 du créneau.', '2026-06-09T09:00:00+02:00', 'date-time'),
    type: {
      type: 'string',
      description: 'Type métier explicite du créneau.',
      enum: conferenceTypeEnum,
      example: 'session'
    },
    speakerIds: arrayProperty('Identifiants des speakers liés.', stringProperty('Identifiant speaker.'), ['spk-olivier-denoo']),
    salleIds: arrayProperty('Identifiants des salles liées. Une liste vide représente un événement général.', stringProperty('Identifiant salle.'), ['sal-auditorium-moebius'])
  },
  {
    id: 'conf-ouverture-olivier-denoo',
    nom: 'Ouverture par Olivier Denoo',
    horaire: '2026-06-09T09:00:00+02:00',
    type: 'session',
    speakerIds: ['spk-olivier-denoo'],
    salleIds: ['sal-auditorium-moebius']
  }
);

const speakerSchema = objectSchema(
  'Speaker du programme.',
  ['id', 'nom', 'prenom'],
  {
    id: stringProperty('Identifiant technique unique du speaker.', 'spk-bruno-legeard'),
    nom: stringProperty('Nom du speaker.', 'Legeard'),
    prenom: stringProperty('Prénom du speaker.', 'Bruno'),
    photo: stringProperty(`Chemin ou URL publique de la photo du speaker. Upload admin limite a 2 Mo et ${photoMaxDimensions}.`, 'https://example.public.blob.vercel-storage.com/medias/photos/bruno-legeard.jpg'),
    entreprise: stringProperty('Identifiant de l’entreprise rattachée.', 'ent-smartesting')
  },
  {
    id: 'spk-bruno-legeard',
    nom: 'Legeard',
    prenom: 'Bruno',
    photo: 'https://example.public.blob.vercel-storage.com/medias/photos/bruno-legeard.jpg',
    entreprise: 'ent-smartesting'
  }
);

const salleSchema = objectSchema(
  'Salle du programme.',
  ['id', 'nom', 'etage', 'contenance'],
  {
    id: stringProperty('Identifiant technique unique de la salle.', 'sal-auditorium-moebius'),
    nom: stringProperty('Nom affiché de la salle.', 'Auditorium Moebius'),
    etage: integerProperty('Étage de la salle.', 0),
    contenance: integerProperty('Capacité maximale de la salle.', 420)
  },
  {
    id: 'sal-auditorium-moebius',
    nom: 'Auditorium Moebius',
    etage: 0,
    contenance: 420
  }
);

const entrepriseSchema = objectSchema(
  'Entreprise ou organisation liée au programme.',
  ['id', 'nomEntreprise'],
  {
    id: stringProperty('Identifiant technique unique de l’entreprise.', 'ent-smartesting'),
    nomEntreprise: stringProperty('Nom affiché de l’entreprise.', 'Smartesting'),
    logo: stringProperty(`Chemin ou URL publique du logo. Upload admin limite a 2 Mo et ${logoMaxDimensions}.`, 'https://example.public.blob.vercel-storage.com/medias/logos/smartesting.png'),
    siteUrl: stringProperty('URL du site de l’entreprise.', 'https://www.smartesting.com/', 'uri')
  },
  {
    id: 'ent-smartesting',
    nomEntreprise: 'Smartesting',
    logo: 'https://example.public.blob.vercel-storage.com/medias/logos/smartesting.png',
    siteUrl: 'https://www.smartesting.com/'
  }
);

function filterSchema(properties) {
  return {
    type: 'object',
    description: 'Filtres réellement appliqués par la route.',
    properties
  };
}

function listSchema(itemSchema, filterProperties, collectionDescription) {
  return objectSchema(
    collectionDescription,
    ['items', 'total', 'filters'],
    {
      items: {
        type: 'array',
        description: 'Liste filtrée des éléments trouvés.',
        items: itemSchema
      },
      total: integerProperty('Nombre total d’éléments retournés.', 1),
      filters: filterSchema(filterProperties)
    }
  );
}

function mutationSchema(itemSchema, messageExample) {
  return objectSchema(
    'Réponse standard après création ou mise à jour.',
    ['item', 'message'],
    {
      item: itemSchema,
      message: stringProperty('Message de confirmation.', messageExample)
    }
  );
}

const deleteSchema = objectSchema(
  'Réponse standard après suppression.',
  ['deletedId', 'total', 'message'],
  {
    deletedId: stringProperty('Identifiant supprimé.', 'conf-exemple-admin'),
    total: integerProperty('Nombre d’éléments restants.', 0),
    message: stringProperty('Message de confirmation.', 'conference supprime avec succes.')
  }
);

const adminHintSchema = objectSchema(
  'Informations publiques pour générer le JWT côté admin.',
  ['dateStamp', 'generationRule', 'scopes', 'helperCommand', 'requiredEnvironment'],
  {
    dateStamp: stringProperty('Date métier du jour en Europe/Paris.', '2026-04-23'),
    generationRule: stringProperty('Règle de signature du JWT sans exposer les secrets.', 'Le JWT est signe chaque jour avec la date du jour Europe/Paris et un mot de passe configure cote serveur.'),
    scopes: {
      type: 'array',
      description: 'Niveaux d’accès possibles.',
      items: objectSchema(
        'Définition d’un scope admin.',
        ['name', 'permissions', 'unlocks'],
        {
          name: stringProperty('Nom du scope.', 'editor'),
          permissions: arrayProperty('Permissions HTTP autorisées.', stringProperty('Permission unitaire.'), ['read', 'update']),
          unlocks: arrayProperty('Sections UI déverrouillées.', stringProperty('Section UI.'), ['modifier'])
        }
      )
    },
    helperCommand: stringProperty('Commande locale d’aide pour générer un JWT si les variables sont configurées.', 'npm run admin-token'),
    requiredEnvironment: arrayProperty('Variables d’environnement nécessaires côté serveur.', stringProperty('Nom de variable.'), ['TAIA_ADMIN_EDITOR_PASSWORD', 'TAIA_ADMIN_SUPER_PASSWORD', 'DATABASE_URL'])
  }
);

const adminTokenRequestSchema = objectSchema(
  'Mot de passe admin envoyé pour obtenir le JWT du jour.',
  ['password'],
  {
    password: stringProperty('Secret saisi par l’administrateur. Ne jamais exposer la valeur réelle dans la documentation.', '********')
  }
);

const adminTokenResponseSchema = objectSchema(
  'Réponse de génération du JWT admin.',
  ['token', 'dateStamp', 'scope', 'permissions', 'message'],
  {
    token: stringProperty('JWT Bearer valide pour la journée courante.', 'jwt-token-du-jour'),
    dateStamp: stringProperty('Date métier du token.', '2026-04-23'),
    scope: stringProperty('Scope accordé au token.', 'editor'),
    permissions: arrayProperty('Permissions accordées.', stringProperty('Permission accordée.'), ['read', 'update']),
    message: stringProperty('Message de confirmation.', 'Token admin genere avec succes.')
  }
);

const adminMediaRequestSchema = objectSchema(
  'Charge une image admin en base64 pour obtenir une URL publique ou un chemin local selon le mode de stockage actif.',
  ['fieldName', 'fileNameStem', 'dataUrl'],
  {
    resourceType: stringProperty('Type de ressource en cours d’edition.', 'speaker'),
    fieldName: {
      type: 'string',
      description: 'Champ media cible.',
      enum: ['photo', 'logo'],
      example: 'photo'
    },
    currentPath: stringProperty('Chemin ou URL actuelle si un media existe deja.', 'https://example.public.blob.vercel-storage.com/medias/photos/bruno-legeard.jpg'),
    fileNameStem: stringProperty('Base de nom de fichier utilisee pour produire le nom final du media.', 'bruno-legeard'),
    dataUrl: stringProperty(`Image en data URL base64. Taille maximale ${mediaUploadMaxBytes} octets. Photos max ${photoMaxDimensions}. Logos max ${logoMaxDimensions}.`, 'data:image/jpeg;base64,/9j/...')
  }
);

const adminMediaResponseSchema = objectSchema(
  'Resultat d’un chargement media admin.',
  ['publicPath', 'requiresResourceSave', 'message'],
  {
    publicPath: stringProperty('URL publique Blob ou chemin local de preview du media charge.', 'https://example.public.blob.vercel-storage.com/medias/photos/bruno-legeard.jpg'),
    requiresResourceSave: {
      type: 'boolean',
      description: 'Indique si la ressource metier doit encore etre enregistree pour persister la nouvelle URL.',
      example: true
    },
    message: stringProperty('Message de retour pour l’interface admin.', 'Image chargee. Enregistrez maintenant la ressource pour mettre a jour l URL.')
  }
);

export const apiRoutes = [
  {
    id: 'conference-list',
    method: 'GET',
    path: '/api/conference',
    summary: 'Lister les conférences',
    description: 'Retourne les conférences avec filtres optionnels sur id, nom, speakerId, salleId et horaire.',
    tags: ['Conference'],
    handlerName: 'getConferences',
    responseSchema: listSchema(conferenceSchema, {
      id: stringProperty('Filtre appliqué sur id.'),
      nom: stringProperty('Filtre appliqué sur nom.'),
      speakerId: stringProperty('Filtre appliqué sur speakerId.'),
      salleId: stringProperty('Filtre appliqué sur salleId.'),
      horaire: stringProperty('Filtre appliqué sur horaire.')
    }, 'Collection de conférences filtrées.'),
    queryParameters: [
      { name: 'id', description: 'Filtre optionnel sur l’identifiant de conférence.' },
      { name: 'nom', description: 'Filtre optionnel sur le titre de conférence.' },
      { name: 'speakerId', description: 'Filtre optionnel sur un identifiant de speaker présent dans la conférence.' },
      { name: 'salleId', description: 'Filtre optionnel sur un identifiant de salle associée à la conférence.' },
      { name: 'horaire', description: 'Filtre optionnel sur la date ou l’horaire sous forme texte.' }
    ]
  },
  {
    id: 'conference-create',
    method: 'POST',
    path: '/api/conference',
    summary: 'Créer une conférence',
    description: 'Crée une conférence après authentification Bearer JWT admin-plus.',
    tags: ['Conference'],
    requiresAuth: true,
    successStatus: 201,
    requestBodySchema: conferenceSchema,
    requestBodyExample: {
      id: 'conf-exemple-admin',
      nom: 'Conférence créée depuis l’admin',
      horaire: '2026-06-09T18:00:00+02:00',
      type: 'session',
      speakerIds: ['spk-bruno-legeard'],
      salleIds: ['sal-auditorium-moebius']
    },
    responseSchema: mutationSchema(conferenceSchema, 'conference cree avec succes.'),
    exampleResponse: {
      item: {
        id: 'conf-exemple-admin',
        nom: 'Conférence créée depuis l’admin',
        horaire: '2026-06-09T18:00:00+02:00',
        type: 'session',
        speakerIds: ['spk-bruno-legeard'],
        salleIds: ['sal-auditorium-moebius']
      },
      message: 'conference cree avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'conference-update',
    method: 'PUT',
    path: '/api/conference',
    summary: 'Mettre à jour une conférence',
    description: 'Remplace une conférence existante après authentification Bearer JWT editor ou admin-plus.',
    tags: ['Conference'],
    requiresAuth: true,
    requestBodySchema: conferenceSchema,
    requestBodyExample: {
      id: 'conf-ouverture-olivier-denoo',
      nom: 'Ouverture par Olivier Denoo',
      horaire: '2026-06-09T09:00:00+02:00',
      type: 'session',
      speakerIds: ['spk-olivier-denoo'],
      salleIds: ['sal-auditorium-moebius']
    },
    responseSchema: mutationSchema(conferenceSchema, 'conference mis a jour avec succes.'),
    exampleResponse: {
      item: {
        id: 'conf-ouverture-olivier-denoo',
        nom: 'Ouverture par Olivier Denoo',
        horaire: '2026-06-09T09:00:00+02:00',
        type: 'session',
        speakerIds: ['spk-olivier-denoo'],
        salleIds: ['sal-auditorium-moebius']
      },
      message: 'conference mis a jour avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'conference-delete',
    method: 'DELETE',
    path: '/api/conference',
    summary: 'Supprimer une conférence',
    description: 'Supprime une conférence via son identifiant après authentification Bearer JWT admin-plus.',
    tags: ['Conference'],
    requiresAuth: true,
    responseSchema: deleteSchema,
    queryParameters: [{ name: 'id', description: 'Identifiant de la conférence à supprimer.' }],
    exampleResponse: {
      deletedId: 'conf-exemple-admin',
      total: 0,
      message: 'conference supprime avec succes.'
    }
  },
  {
    id: 'speaker-list',
    method: 'GET',
    path: '/api/speaker',
    summary: 'Lister les speakers',
    description: 'Retourne les speakers avec filtres optionnels sur id, nom, etage et entreprise.',
    tags: ['Speaker'],
    handlerName: 'getSpeakers',
    responseSchema: listSchema(speakerSchema, {
      id: stringProperty('Filtre appliqué sur id.'),
      nom: stringProperty('Filtre appliqué sur nom.'),
      etage: stringProperty('Filtre appliqué sur étage.'),
      entreprise: stringProperty('Filtre appliqué sur entreprise.')
    }, 'Collection de speakers filtrés.'),
    queryParameters: [
      { name: 'id', description: 'Filtre optionnel sur l’identifiant du speaker.' },
      { name: 'nom', description: 'Filtre optionnel sur le nom ou le prénom du speaker.' },
      { name: 'etage', description: 'Filtre optionnel sur l’étage des salles liées aux conférences du speaker.' },
      { name: 'entreprise', description: 'Filtre optionnel sur l’identifiant de l’entreprise rattachée au speaker.' }
    ]
  },
  {
    id: 'speaker-create',
    method: 'POST',
    path: '/api/speaker',
    summary: 'Créer un speaker',
    description: 'Crée un speaker après authentification Bearer JWT admin-plus.',
    tags: ['Speaker'],
    requiresAuth: true,
    successStatus: 201,
    requestBodySchema: speakerSchema,
    requestBodyExample: {
      id: 'spk-admin-demo',
      nom: 'Demo',
      prenom: 'Admin',
      photo: '/BDD/photos/admin-demo.jpg',
      entreprise: 'ent-smartesting'
    },
    responseSchema: mutationSchema(speakerSchema, 'speaker cree avec succes.'),
    exampleResponse: {
      item: {
        id: 'spk-admin-demo',
        nom: 'Demo',
        prenom: 'Admin',
        photo: '/BDD/photos/admin-demo.jpg',
        entreprise: 'ent-smartesting'
      },
      message: 'speaker cree avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'speaker-update',
    method: 'PUT',
    path: '/api/speaker',
    summary: 'Mettre à jour un speaker',
    description: 'Remplace un speaker existant après authentification Bearer JWT editor ou admin-plus.',
    tags: ['Speaker'],
    requiresAuth: true,
    requestBodySchema: speakerSchema,
    requestBodyExample: {
      id: 'spk-bruno-legeard',
      nom: 'Legeard',
      prenom: 'Bruno',
      photo: '/BDD/photos/bruno-legeard.jpg',
      entreprise: 'ent-smartesting'
    },
    responseSchema: mutationSchema(speakerSchema, 'speaker mis a jour avec succes.'),
    exampleResponse: {
      item: {
        id: 'spk-bruno-legeard',
        nom: 'Legeard',
        prenom: 'Bruno',
        photo: '/BDD/photos/bruno-legeard.jpg',
        entreprise: 'ent-smartesting'
      },
      message: 'speaker mis a jour avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'speaker-delete',
    method: 'DELETE',
    path: '/api/speaker',
    summary: 'Supprimer un speaker',
    description: 'Supprime un speaker via son identifiant après authentification Bearer JWT admin-plus. Si la photo du speaker est un media gere par TAIA, elle est aussi supprimee du stockage associe.',
    tags: ['Speaker'],
    requiresAuth: true,
    responseSchema: deleteSchema,
    queryParameters: [{ name: 'id', description: 'Identifiant du speaker à supprimer.' }],
    exampleResponse: {
      deletedId: 'spk-admin-demo',
      total: 0,
      message: 'speaker supprime avec succes.'
    }
  },
  {
    id: 'salle-list',
    method: 'GET',
    path: '/api/salle',
    summary: 'Lister les salles',
    description: 'Retourne les salles avec filtres optionnels sur id, nom et etage.',
    tags: ['Salle'],
    handlerName: 'getSalles',
    responseSchema: listSchema(salleSchema, {
      id: stringProperty('Filtre appliqué sur id.'),
      nom: stringProperty('Filtre appliqué sur nom.'),
      etage: stringProperty('Filtre appliqué sur étage.')
    }, 'Collection de salles filtrées.'),
    queryParameters: [
      { name: 'id', description: 'Filtre optionnel sur l’identifiant de salle.' },
      { name: 'nom', description: 'Filtre optionnel sur le nom de salle.' },
      { name: 'etage', description: 'Filtre optionnel sur l’étage.' }
    ]
  },
  {
    id: 'salle-create',
    method: 'POST',
    path: '/api/salle',
    summary: 'Créer une salle',
    description: 'Crée une salle après authentification Bearer JWT admin-plus.',
    tags: ['Salle'],
    requiresAuth: true,
    successStatus: 201,
    requestBodySchema: salleSchema,
    requestBodyExample: {
      id: 'sal-admin-demo',
      nom: 'Salle Admin',
      etage: 9,
      contenance: 42
    },
    responseSchema: mutationSchema(salleSchema, 'salle cree avec succes.'),
    exampleResponse: {
      item: {
        id: 'sal-admin-demo',
        nom: 'Salle Admin',
        etage: 9,
        contenance: 42
      },
      message: 'salle cree avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'salle-update',
    method: 'PUT',
    path: '/api/salle',
    summary: 'Mettre à jour une salle',
    description: 'Remplace une salle existante après authentification Bearer JWT editor ou admin-plus.',
    tags: ['Salle'],
    requiresAuth: true,
    requestBodySchema: salleSchema,
    requestBodyExample: {
      id: 'sal-2-4',
      nom: 'Salle 2.4',
      etage: 2,
      contenance: 70
    },
    responseSchema: mutationSchema(salleSchema, 'salle mis a jour avec succes.'),
    exampleResponse: {
      item: {
        id: 'sal-2-4',
        nom: 'Salle 2.4',
        etage: 2,
        contenance: 70
      },
      message: 'salle mis a jour avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'salle-delete',
    method: 'DELETE',
    path: '/api/salle',
    summary: 'Supprimer une salle',
    description: 'Supprime une salle via son identifiant après authentification Bearer JWT admin-plus.',
    tags: ['Salle'],
    requiresAuth: true,
    responseSchema: deleteSchema,
    queryParameters: [{ name: 'id', description: 'Identifiant de la salle à supprimer.' }],
    exampleResponse: {
      deletedId: 'sal-admin-demo',
      total: 0,
      message: 'salle supprime avec succes.'
    }
  },
  {
    id: 'entreprise-list',
    method: 'GET',
    path: '/api/entreprise',
    summary: 'Lister les entreprises',
    description: 'Retourne les entreprises avec filtres optionnels sur id, nomEntreprise et speakerId.',
    tags: ['Entreprise'],
    handlerName: 'getEntreprises',
    responseSchema: listSchema(entrepriseSchema, {
      id: stringProperty('Filtre appliqué sur id.'),
      nomEntreprise: stringProperty('Filtre appliqué sur nomEntreprise.'),
      speakerId: stringProperty('Filtre appliqué sur speakerId.')
    }, 'Collection d’entreprises filtrées.'),
    queryParameters: [
      { name: 'id', description: 'Filtre optionnel sur l’identifiant de l’entreprise.' },
      { name: 'nomEntreprise', description: 'Filtre optionnel sur le nom de l’entreprise.' },
      { name: 'speakerId', description: 'Filtre optionnel sur un identifiant de speaker rattaché à l’entreprise.' }
    ]
  },
  {
    id: 'entreprise-create',
    method: 'POST',
    path: '/api/entreprise',
    summary: 'Créer une entreprise',
    description: 'Crée une entreprise après authentification Bearer JWT admin-plus.',
    tags: ['Entreprise'],
    requiresAuth: true,
    successStatus: 201,
    requestBodySchema: entrepriseSchema,
    requestBodyExample: {
      id: 'ent-admin-demo',
      nomEntreprise: 'Entreprise Admin',
      logo: '/BDD/logos/entreprise-admin.png',
      siteUrl: 'https://example.test/'
    },
    responseSchema: mutationSchema(entrepriseSchema, 'entreprise cree avec succes.'),
    exampleResponse: {
      item: {
        id: 'ent-admin-demo',
        nomEntreprise: 'Entreprise Admin',
        logo: '/BDD/logos/entreprise-admin.png',
        siteUrl: 'https://example.test/'
      },
      message: 'entreprise cree avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'entreprise-update',
    method: 'PUT',
    path: '/api/entreprise',
    summary: 'Mettre à jour une entreprise',
    description: 'Remplace une entreprise existante après authentification Bearer JWT editor ou admin-plus.',
    tags: ['Entreprise'],
    requiresAuth: true,
    requestBodySchema: entrepriseSchema,
    requestBodyExample: {
      id: 'ent-smartesting',
      nomEntreprise: 'Smartesting',
      logo: '/BDD/logos/smartesting.png',
      siteUrl: 'https://www.smartesting.com/'
    },
    responseSchema: mutationSchema(entrepriseSchema, 'entreprise mis a jour avec succes.'),
    exampleResponse: {
      item: {
        id: 'ent-smartesting',
        nomEntreprise: 'Smartesting',
        logo: '/BDD/logos/smartesting.png',
        siteUrl: 'https://www.smartesting.com/'
      },
      message: 'entreprise mis a jour avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'entreprise-delete',
    method: 'DELETE',
    path: '/api/entreprise',
    summary: 'Supprimer une entreprise',
    description: 'Supprime une entreprise via son identifiant après authentification Bearer JWT admin-plus. Si le logo de l entreprise est un media gere par TAIA, il est aussi supprime du stockage associe.',
    tags: ['Entreprise'],
    requiresAuth: true,
    responseSchema: deleteSchema,
    queryParameters: [{ name: 'id', description: 'Identifiant de l’entreprise à supprimer.' }],
    exampleResponse: {
      deletedId: 'ent-admin-demo',
      total: 0,
      message: 'entreprise supprime avec succes.'
    }
  },
  {
    id: 'admin-token-hint',
    method: 'GET',
    path: '/api/admin/token',
    summary: 'Obtenir la configuration publique du token admin',
    description: 'Retourne la date métier du jour, les scopes disponibles et les variables d’environnement attendues sans exposer les secrets.',
    tags: ['Admin'],
    responseSchema: adminHintSchema,
    exampleResponse: {
      dateStamp: '2026-04-23',
      generationRule: 'Le JWT est signe chaque jour avec la date du jour Europe/Paris et un mot de passe configure cote serveur.',
      scopes: [
        { name: 'editor', permissions: ['read', 'update'], unlocks: ['modifier'] },
        { name: 'admin-plus', permissions: ['read', 'update', 'create', 'delete'], unlocks: ['modifier', 'creer', 'supprimer'] }
      ],
      helperCommand: 'npm run admin-token',
      requiredEnvironment: ['TAIA_ADMIN_EDITOR_PASSWORD', 'TAIA_ADMIN_SUPER_PASSWORD']
    },
    queryParameters: []
  },
  {
    id: 'admin-token-create',
    method: 'POST',
    path: '/api/admin/token',
    summary: 'Générer un token admin journalier',
    description: 'Génère un JWT Bearer valide pour la journée courante après vérification du mot de passe admin configuré côté serveur.',
    tags: ['Admin'],
    requestBodySchema: adminTokenRequestSchema,
    requestBodyExample: {
      password: '********'
    },
    responseSchema: adminTokenResponseSchema,
    exampleResponse: {
      token: 'jwt-token-du-jour',
      dateStamp: '2026-04-23',
      scope: 'editor',
      permissions: ['read', 'update'],
      message: 'Token admin genere avec succes.'
    },
    queryParameters: []
  },
  {
    id: 'admin-media-upload',
    method: 'POST',
    path: '/api/admin/media',
    summary: 'Charger une image admin',
    description: `Charge une photo de speaker ou un logo d entreprise. Taille maximale 2 Mo. Photos limitees a ${photoMaxDimensions}. Logos limites a ${logoMaxDimensions}. En production, l upload cible Vercel Blob ; en local sans token Blob, un fallback sur le systeme de fichiers reste actif. L interface admin effectue ensuite un rechargement complet differe de 2 secondes apres un create, update ou delete reussi pour laisser la persistance se stabiliser.`,
    tags: ['Admin'],
    requiresAuth: true,
    requestBodySchema: adminMediaRequestSchema,
    requestBodyExample: {
      resourceType: 'speaker',
      fieldName: 'photo',
      currentPath: '',
      fileNameStem: 'bruno-legeard',
      dataUrl: 'data:image/jpeg;base64,/9j/...'
    },
    responseSchema: adminMediaResponseSchema,
    exampleResponse: {
      publicPath: 'https://example.public.blob.vercel-storage.com/medias/photos/bruno-legeard.jpg',
      requiresResourceSave: false,
      message: 'Image chargee avec succes.'
    },
    queryParameters: []
  }
];
