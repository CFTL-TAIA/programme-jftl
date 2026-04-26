import { escapeHtml, fetchCollection, getSpeakerFullName, resolveSiteUrl, unregisterLegacyServiceWorkers } from './shared.js';

const sessionTokenKey = 'taia-admin-token';
const sessionDateKey = 'taia-admin-date';
const sessionScopeKey = 'taia-admin-scope';
const sessionPermissionsKey = 'taia-admin-permissions';
const adminReloadDelayMs = 5000;

const conferenceTypeOptions = [
  { value: 'session', label: 'Session' },
  { value: 'keynote', label: 'Keynote' },
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'networking', label: 'Networking' },
  { value: 'demo', label: 'Démo éditeur' },
  { value: 'closing', label: 'Clôture' }
];

const resourceConfigs = {
  conference: {
    label: 'Conférences',
    singularLabel: 'conférence',
    endpoint: '/api/conference',
    accentClass: 'accent-coral',
    idPrefix: 'conf',
    optionLabel: (item) => item.nom,
    idSource: (payload) => payload.nom,
    fields: [
      { name: 'nom', label: 'Titre', type: 'text', required: true },
      { name: 'horaire', label: 'Date et heure', type: 'datetime-local', required: true },
      { name: 'type', label: 'Type', type: 'select', required: true, options: conferenceTypeOptions },
      { name: 'speakerIds', label: 'Speakers liés', type: 'multiselect', optionsFrom: 'speaker', optionLabel: (item) => getSpeakerFullName(item) },
      { name: 'salleIds', label: 'Salles liées', type: 'multiselect', optionsFrom: 'salle', optionLabel: (item) => item.nom }
    ]
  },
  speaker: {
    label: 'Speakers',
    singularLabel: 'speaker',
    endpoint: '/api/speaker',
    accentClass: 'accent-teal',
    idPrefix: 'spk',
    optionLabel: (item) => getSpeakerFullName(item),
    idSource: (payload) => `${payload.prenom || ''} ${payload.nom || ''}`,
    fields: [
      { name: 'prenom', label: 'Prénom', type: 'text', required: true },
      { name: 'nom', label: 'Nom', type: 'text', required: true },
      {
        name: 'photo',
        label: 'Photo',
        type: 'text',
        placeholder: '/BDD/photos/photo.jpg',
        fullWidth: true,
        upload: {
          label: 'Charger une photo',
          accept: 'image/*,.svg,.webp',
          hideTextInput: true,
          nameSource: (payload) => `${payload.prenom || ''} ${payload.nom || ''}`,
          maxSizeBytes: 2 * 1024 * 1024,
          maxWidth: 1200,
          maxHeight: 1600,
          helperText: 'PNG, JPG, GIF, SVG ou WebP. Taille max 2 Mo. Dimensions max 1200 x 1600 px.'
        }
      },
      { name: 'entreprise', label: 'Entreprise', type: 'select', optionsFrom: 'entreprise', optionLabel: (item) => item.nomEntreprise, emptyLabel: 'Aucune entreprise communiquée' }
    ]
  },
  salle: {
    label: 'Salles',
    singularLabel: 'salle',
    endpoint: '/api/salle',
    accentClass: 'accent-gold',
    idPrefix: 'sal',
    optionLabel: (item) => item.nom,
    idSource: (payload) => payload.nom,
    fields: [
      { name: 'nom', label: 'Nom', type: 'text', required: true },
      { name: 'etage', label: 'Étage', type: 'number', required: true, min: 0, step: 1 },
      { name: 'contenance', label: 'Contenance', type: 'number', required: true, min: 0, step: 1 }
    ]
  },
  entreprise: {
    label: 'Entreprises',
    singularLabel: 'entreprise',
    endpoint: '/api/entreprise',
    accentClass: 'accent-berry',
    idPrefix: 'ent',
    optionLabel: (item) => item.nomEntreprise,
    idSource: (payload) => payload.nomEntreprise,
    fields: [
      { name: 'nomEntreprise', label: 'Nom de l’entreprise', type: 'text', required: true, fullWidth: true },
      {
        name: 'logo',
        label: 'Logo',
        type: 'text',
        placeholder: '/BDD/logos/logo.png',
        fullWidth: true,
        upload: {
          label: 'Charger un logo',
          accept: 'image/*,.svg,.webp',
          hideTextInput: true,
          nameSource: (payload) => payload.nomEntreprise || '',
          maxSizeBytes: 2 * 1024 * 1024,
          maxWidth: 1600,
          maxHeight: 800,
          helperText: 'PNG, JPG, GIF, SVG ou WebP. Taille max 2 Mo. Dimensions max 1600 x 800 px.'
        }
      },
      { name: 'siteUrl', label: 'Site web', type: 'url', placeholder: 'https://example.test/' }
    ]
  }
};

const modeDefinitions = {
  update: {
    title: 'Modifier',
    permission: 'update',
    submitLabel: 'Enregistrer'
  },
  create: {
    title: 'Créer',
    permission: 'create',
    submitLabel: 'Créer',
    confirmMessage: (resourceLabel) => `Confirmer la création de cette ressource ${resourceLabel} ?`
  },
  delete: {
    title: 'Supprimer',
    permission: 'delete',
    submitLabel: 'Supprimer',
    confirmMessage: (resourceLabel) => `Confirmer la suppression définitive de cette ressource ${resourceLabel} ?`
  }
};

const state = {
  token: sessionStorage.getItem(sessionTokenKey) || '',
  tokenDate: sessionStorage.getItem(sessionDateKey) || '',
  scope: sessionStorage.getItem(sessionScopeKey) || '',
  permissions: JSON.parse(sessionStorage.getItem(sessionPermissionsKey) || '[]'),
  resources: {
    conference: [],
    speaker: [],
    salle: [],
    entreprise: []
  },
  selectedIds: {
    update: {},
    delete: {}
  },
  cardMessages: {},
  expandedCards: {},
  reloadTimerId: null,
  busyReason: ''
};

function can(permission) {
  return state.permissions.includes(permission);
}

function getAuthHeaders() {
  return state.token ? { authorization: `Bearer ${state.token}` } : {};
}

function getCardMessage(mode, resourceType) {
  return state.cardMessages[`${mode}:${resourceType}`] || { text: '', tone: 'muted' };
}

function setCardMessage(mode, resourceType, text, tone = 'muted') {
  state.cardMessages[`${mode}:${resourceType}`] = { text, tone };
}

function getCardStateKey(mode, resourceType) {
  return `${mode}:${resourceType}`;
}

function isCardExpanded(mode, resourceType) {
  return state.expandedCards[getCardStateKey(mode, resourceType)] ?? false;
}

function setCardExpanded(mode, resourceType, expanded) {
  state.expandedCards[getCardStateKey(mode, resourceType)] = expanded;
}

function setFeedback(message, tone = 'muted') {
  const node = document.getElementById('admin-auth-message');
  node.textContent = message;
  node.dataset.tone = tone;
}

function setBusyState(isBusy, message = 'Mise a jour en cours...') {
  const overlay = document.getElementById('admin-busy-overlay');
  const messageNode = document.getElementById('admin-busy-message');

  if (!overlay || !messageNode) {
    return;
  }

  overlay.hidden = !isBusy;
  messageNode.textContent = message;
  document.body.classList.toggle('is-busy', isBusy);
  state.busyReason = isBusy ? message : '';
}

function updateTokenUi() {
  const output = document.getElementById('admin-token-output');
  const status = document.getElementById('admin-token-status');
  const date = document.getElementById('admin-token-date');
  const scope = document.getElementById('admin-token-scope');
  const permissions = document.getElementById('admin-token-permissions');

  if (state.token) {
    output.value = state.token;
    status.textContent = 'Token chargé en session';
    date.textContent = state.tokenDate || '--';
    scope.textContent = state.scope || '--';
    permissions.textContent = state.permissions.length ? state.permissions.join(', ') : '--';
    return;
  }

  output.value = 'Pas de token en session.';
  status.textContent = 'Aucun token chargé';
  date.textContent = '--';
  scope.textContent = '--';
  permissions.textContent = '--';
}

function updateAccessUi() {
  const workspace = document.getElementById('admin-workspace');
  const badge = document.getElementById('admin-access-badge');
  const copy = document.getElementById('admin-access-copy');

  workspace.hidden = !state.token;
  badge.textContent = state.scope ? `scope: ${state.scope}` : 'scope: --';

  if (!state.token) {
    copy.textContent = 'Aucune rubrique n\'est visible tant qu\'un token valide n\'a pas été généré.';
  } else if (state.scope === 'admin-plus') {
    copy.textContent = 'Le token admin-plus ouvre Modifier, Créer et Supprimer.';
  } else {
    copy.textContent = 'Le token editor ouvre uniquement Modifier.';
  }

  for (const [mode, definition] of Object.entries(modeDefinitions)) {
    const section = document.querySelector(`[data-access="${definition.permission}"]`);
    if (section) {
      section.hidden = !can(definition.permission);
    }
  }
}

function setActionBusy(card, isBusy) {
  const controls = card.querySelectorAll('button, input, select, textarea');

  for (const control of controls) {
    if (control.id === 'admin-token-output') {
      continue;
    }

    control.disabled = isBusy;
  }
}

function getResourceOptions(resourceType) {
  return state.resources[resourceType] || [];
}

function buildSlugPart(value) {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 60);
}

function buildGeneratedId(resourceType, payload) {
  const config = resourceConfigs[resourceType];
  const base = buildSlugPart(config.idSource(payload)) || 'nouveau';
  const existingIds = new Set(getResourceOptions(resourceType).map((item) => item.id));

  let candidate = `${config.idPrefix}-${base}`;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${config.idPrefix}-${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function toDateTimeLocal(isoString) {
  return isoString ? String(isoString).slice(0, 16) : '';
}

function fromDateTimeLocal(value) {
  return value ? `${value}:00+02:00` : '';
}

function getEmptyValue(field) {
  if (field.type === 'multiselect') {
    return [];
  }

  if (field.name === 'type') {
    return 'session';
  }

  return '';
}

function getInitialDraft(resourceType) {
  return Object.fromEntries(resourceConfigs[resourceType].fields.map((field) => [field.name, getEmptyValue(field)]));
}

function getSelectedItem(resourceType, mode) {
  const selectedId = state.selectedIds[mode]?.[resourceType];
  return getResourceOptions(resourceType).find((item) => item.id === selectedId) || getResourceOptions(resourceType)[0] || null;
}

function getFieldValue(field, value) {
  if (field.type === 'datetime-local') {
    return toDateTimeLocal(value);
  }

  if (field.type === 'multiselect') {
    return Array.isArray(value) ? value : [];
  }

  return value ?? '';
}

function buildSelectOptions(field) {
  if (field.options) {
    return field.options;
  }

  if (!field.optionsFrom) {
    return [];
  }

  return getResourceOptions(field.optionsFrom).map((item) => ({ value: item.id, label: field.optionLabel(item) }));
}

function buildMediaPreviewMarkup(field, currentValue) {
  if (!currentValue) {
    return `
      <div class="admin-media-preview is-empty" data-role="media-preview" data-field-name="${escapeHtml(field.name)}">
        <p>Aperçu indisponible tant qu’aucun fichier n’est chargé.</p>
      </div>
    `;
  }

  return `
    <figure class="admin-media-preview" data-role="media-preview" data-field-name="${escapeHtml(field.name)}">
      <img src="${escapeHtml(resolveSiteUrl(String(currentValue)))}" alt="${escapeHtml(field.label)}" loading="lazy" />
      <figcaption>${escapeHtml(String(currentValue))}</figcaption>
    </figure>
  `;
}

function buildFieldMarkup(resourceType, field, value, mode) {
  const fieldId = `${mode}-${resourceType}-${field.name}`;
  const label = `${field.label}${field.required ? ' *' : ''}`;
  const currentValue = getFieldValue(field, value);
  const fieldClassName = `admin-field${field.fullWidth ? ' admin-field-full' : ''}`;

  if (field.type === 'select') {
    const options = buildSelectOptions(field);
    return `
      <label class="${fieldClassName}" for="${fieldId}">
        <span>${escapeHtml(label)}</span>
        <select id="${fieldId}" name="${field.name}" ${field.required ? 'required' : ''}>
          ${!field.required || field.emptyLabel ? `<option value="">${escapeHtml(field.emptyLabel || 'Sélectionner')}</option>` : ''}
          ${options
            .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === currentValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
            .join('')}
        </select>
      </label>
    `;
  }

  if (field.type === 'multiselect') {
    const options = buildSelectOptions(field);
    const selectedValues = new Set(currentValue);
    return `
      <label class="${fieldClassName}" for="${fieldId}">
        <span>${escapeHtml(label)}</span>
        <select id="${fieldId}" name="${field.name}" multiple size="6">
          ${options
            .map((option) => `<option value="${escapeHtml(option.value)}" ${selectedValues.has(option.value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`)
            .join('')}
        </select>
      </label>
    `;
  }

  if (field.upload) {
    if (field.upload.hideTextInput) {
      return `
        <div class="admin-upload-field-group${field.fullWidth ? ' admin-field-full' : ''}">
          <div class="admin-upload-heading">
            <span>${escapeHtml(label)}</span>
            <p class="admin-upload-current">${currentValue ? 'Fichier actuellement enregistré.' : 'Aucun fichier chargé pour le moment.'}</p>
            <p class="admin-upload-rules">${escapeHtml(field.upload.helperText || '')}</p>
          </div>
          ${buildMediaPreviewMarkup(field, currentValue)}
          <input id="${fieldId}" name="${field.name}" type="hidden" value="${escapeHtml(String(currentValue))}" />
          <label class="button button-secondary admin-upload-trigger" for="${fieldId}-file">${escapeHtml(field.upload.label)}</label>
          <input
            id="${fieldId}-file"
            class="admin-upload-input"
            type="file"
            accept="${escapeHtml(field.upload.accept)}"
            data-role="media-upload"
            data-field-name="${escapeHtml(field.name)}"
          />
        </div>
      `;
    }

    return `
      <div class="admin-upload-field-group${field.fullWidth ? ' admin-field-full' : ''}">
        <label class="${fieldClassName}" for="${fieldId}">
          <span>${escapeHtml(label)}</span>
          <input
            id="${fieldId}"
            name="${field.name}"
            type="text"
            value="${escapeHtml(String(currentValue))}"
            ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}
            ${field.required ? 'required' : ''}
          />
        </label>
        <label class="admin-field admin-field-upload" for="${fieldId}-file">
          <span>${escapeHtml(field.upload.label)}</span>
          <input
            id="${fieldId}-file"
            type="file"
            accept="${escapeHtml(field.upload.accept)}"
            data-role="media-upload"
            data-field-name="${escapeHtml(field.name)}"
          />
        </label>
      </div>
    `;
  }

  return `
    <label class="${fieldClassName}" for="${fieldId}">
      <span>${escapeHtml(label)}</span>
      <input
        id="${fieldId}"
        name="${field.name}"
        type="${field.type}"
        value="${escapeHtml(String(currentValue))}"
        ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}
        ${field.min !== undefined ? `min="${field.min}"` : ''}
        ${field.step !== undefined ? `step="${field.step}"` : ''}
        ${field.required ? 'required' : ''}
      />
    </label>
  `;
}

function buildCardMarkup(resourceType, mode) {
  const config = resourceConfigs[resourceType];
  const selectedItem = mode === 'create' ? getInitialDraft(resourceType) : getSelectedItem(resourceType, mode);
  const message = getCardMessage(mode, resourceType);
  const generatedId = mode === 'create' ? buildGeneratedId(resourceType, selectedItem) : selectedItem?.id || '--';
  const selectMarkup = mode === 'create'
    ? ''
    : `
      <label class="admin-field">
        <span>${escapeHtml(config.singularLabel)} existante *</span>
        <select data-role="resource-select">
          ${getResourceOptions(resourceType)
            .map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedItem?.id ? 'selected' : ''}>${escapeHtml(config.optionLabel(item))}</option>`)
            .join('')}
        </select>
      </label>
    `;

  if (mode === 'delete') {
    return `
      <details class="admin-card ${config.accentClass}" ${isCardExpanded(mode, resourceType) ? 'open' : ''}>
        <summary>
          <span>
            <span class="resource-kicker">${escapeHtml(config.label)}</span>
            <strong>Supprimer une ${escapeHtml(config.singularLabel)}</strong>
          </span>
          <span class="pill">${escapeHtml(resourceType)}</span>
        </summary>
        <div class="admin-card-body">
          ${selectMarkup}
          <p class="admin-generated-id">Identifiant ciblé: <strong>${escapeHtml(generatedId)}</strong></p>
          <div class="admin-inline-actions">
            <button type="button" class="button button-dark" data-action="submit">Supprimer</button>
          </div>
          <p class="admin-feedback" data-tone="${escapeHtml(message.tone)}">${escapeHtml(message.text || 'Une confirmation sera demandée avant suppression.')}</p>
        </div>
      </details>
    `;
  }

  return `
    <details class="admin-card ${config.accentClass}" ${isCardExpanded(mode, resourceType) ? 'open' : ''}>
      <summary>
        <span>
          <span class="resource-kicker">${escapeHtml(config.label)}</span>
          <strong>${escapeHtml(modeDefinitions[mode].title)} ${escapeHtml(config.singularLabel)}</strong>
        </span>
        <span class="pill">${escapeHtml(resourceType)}</span>
      </summary>
      <div class="admin-card-body">
        ${selectMarkup}
        <form data-role="resource-form" class="admin-resource-form" novalidate>
          <p class="admin-generated-id">Identifiant ${mode === 'create' ? 'généré' : 'courant'}: <strong data-role="id-preview">${escapeHtml(generatedId)}</strong></p>
          <div class="admin-form-grid">
            ${config.fields.map((field) => buildFieldMarkup(resourceType, field, selectedItem?.[field.name], mode)).join('')}
          </div>
          <div class="admin-inline-actions">
            ${mode === 'create' ? '<button type="button" class="button button-ghost" data-action="reset">Réinitialiser</button>' : ''}
            <button type="submit" class="button ${mode === 'update' ? 'button-secondary' : ''}">${escapeHtml(modeDefinitions[mode].submitLabel)}</button>
          </div>
        </form>
        <p class="admin-feedback" data-tone="${escapeHtml(message.tone)}">${escapeHtml(message.text || 'Les champs marqués d’un * sont obligatoires.')}</p>
      </div>
    </details>
  `;
}

function renderAdminWorkspace() {
  for (const mode of Object.keys(modeDefinitions)) {
    const container = document.querySelector(`[data-mode="${mode}"]`);

    if (!container) {
      continue;
    }

    if (!can(modeDefinitions[mode].permission)) {
      container.innerHTML = '';
      continue;
    }

    container.innerHTML = Object.keys(resourceConfigs)
      .map((resourceType) => buildCardMarkup(resourceType, mode))
      .join('');

    for (const resourceType of Object.keys(resourceConfigs)) {
      bindCard(container, resourceType, mode);
    }
  }
}

function normalizeFormPayload(resourceType, form) {
  const formData = new FormData(form);
  const payload = {};

  for (const field of resourceConfigs[resourceType].fields) {
    if (field.type === 'multiselect') {
      payload[field.name] = formData.getAll(field.name).filter(Boolean);
      continue;
    }

    const rawValue = formData.get(field.name);
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';

    if (field.type === 'datetime-local') {
      payload[field.name] = fromDateTimeLocal(value);
    } else if (field.type === 'number') {
      payload[field.name] = value === '' ? '' : Number(value);
    } else {
      payload[field.name] = value;
    }
  }

  if (resourceType === 'speaker' && !payload.entreprise) {
    payload.entreprise = 'ent-non-communique';
  }

  return payload;
}

function validatePayload(resourceType, payload) {
  switch (resourceType) {
    case 'conference':
      if (!payload.nom) {
        return 'Le titre est obligatoire.';
      }
      if (!payload.horaire) {
        return 'La date et heure sont obligatoires.';
      }
      if (!payload.type) {
        return 'Le type de conférence est obligatoire.';
      }
      return null;
    case 'speaker':
      if (!payload.prenom || !payload.nom) {
        return 'Le prénom et le nom sont obligatoires.';
      }
      return null;
    case 'salle':
      if (!payload.nom) {
        return 'Le nom de la salle est obligatoire.';
      }
      if (!Number.isInteger(payload.etage) || payload.etage < 0) {
        return 'L’étage doit être un entier positif ou nul.';
      }
      if (!Number.isInteger(payload.contenance) || payload.contenance < 0) {
        return 'La contenance doit être un entier positif ou nul.';
      }
      return null;
    case 'entreprise':
      if (!payload.nomEntreprise) {
        return 'Le nom de l’entreprise est obligatoire.';
      }
      return null;
    default:
      return null;
  }
}

async function sendJsonRequest(url, method, payload) {
  const response = await fetch(resolveSiteUrl(url), {
    method,
    headers: {
      ...(payload ? { 'content-type': 'application/json' } : {}),
      ...getAuthHeaders()
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Erreur ${response.status}`);
  }

  return data;
}

function getInputValue(form, fieldName) {
  const field = form.elements.namedItem(fieldName);
  return field && 'value' in field ? String(field.value || '') : '';
}

function buildUploadNameSource(form, resourceType, field, mode) {
  const payload = normalizeFormPayload(resourceType, form);
  const selectedItem = mode === 'update' ? getSelectedItem(resourceType, 'update') : null;
  const livePayload = {
    ...selectedItem,
    ...payload
  };

  for (const candidateField of resourceConfigs[resourceType].fields) {
    if (candidateField.type === 'multiselect') {
      continue;
    }

    const liveValue = getInputValue(form, candidateField.name).trim();
    if (liveValue) {
      livePayload[candidateField.name] = liveValue;
    }
  }

  return String(field.upload.nameSource(livePayload) || '').trim();
}

function setInputValue(form, fieldName, value) {
  const field = form.elements.namedItem(fieldName);
  if (field && 'value' in field) {
    field.value = value;
  }
}

function updateCardFeedback(card, text, tone = 'muted') {
  const feedback = card.querySelector('.admin-feedback');
  if (!feedback) {
    return;
  }

  feedback.textContent = text;
  feedback.dataset.tone = tone;
}

function updateMediaPreview(card, field, path) {
  const preview = card.querySelector(`[data-role="media-preview"][data-field-name="${field.name}"]`);
  const currentCopy = preview?.previousElementSibling?.classList.contains('admin-upload-heading')
    ? preview.previousElementSibling.querySelector('.admin-upload-current')
    : card.querySelector('.admin-upload-current');

  if (!preview) {
    return;
  }

  if (!path) {
    preview.classList.add('is-empty');
    preview.innerHTML = '<p>Aperçu indisponible tant qu’aucun fichier n’est chargé.</p>';
    if (currentCopy) {
      currentCopy.textContent = 'Aucun fichier chargé pour le moment.';
    }
    return;
  }

  preview.classList.remove('is-empty');
  preview.innerHTML = `
    <img src="${escapeHtml(resolveSiteUrl(path))}" alt="${escapeHtml(field.label)}" loading="lazy" />
    <figcaption>${escapeHtml(path)}</figcaption>
  `;

  if (currentCopy) {
    currentCopy.textContent = 'Fichier actuellement enregistré.';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossible de lire les dimensions du fichier.'));
    };

    image.src = objectUrl;
  });
}

async function validateMediaFile(field, file) {
  if (file.size > field.upload.maxSizeBytes) {
    throw new Error('Le fichier depasse la taille maximale autorisee de 2 Mo.');
  }

  const { width, height } = await readImageDimensions(file);

  if (width > field.upload.maxWidth || height > field.upload.maxHeight) {
    throw new Error(`Les dimensions maximales autorisees sont ${field.upload.maxWidth} x ${field.upload.maxHeight} px.`);
  }
}

async function uploadMediaFile({ card, form, resourceType, mode, field, file }) {
  const selectedItem = mode === 'update' ? getSelectedItem(resourceType, 'update') : null;
  const currentPath = getInputValue(form, field.name) || selectedItem?.[field.name] || '';
  const fileNameStem = buildUploadNameSource(form, resourceType, field, mode);

  if (!currentPath && !fileNameStem) {
    throw new Error('Renseignez d’abord le nom associé avant de charger une image.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const result = await sendJsonRequest('/api/admin/media', 'POST', {
    resourceType,
    fieldName: field.name,
    currentPath,
    fileNameStem,
    dataUrl
  });

  setInputValue(form, field.name, result.publicPath);
  updateMediaPreview(card, field, result.publicPath);
  updateCardFeedback(card, result.message, result.requiresResourceSave ? 'warning' : 'success');
  return result;
}

async function loadResource(resourceType) {
  const payload = await fetchCollection(resourceConfigs[resourceType].endpoint);
  state.resources[resourceType] = payload.items;

  if (!state.selectedIds.update[resourceType] && payload.items[0]) {
    state.selectedIds.update[resourceType] = payload.items[0].id;
  }

  if (!state.selectedIds.delete[resourceType] && payload.items[0]) {
    state.selectedIds.delete[resourceType] = payload.items[0].id;
  }
}

async function ensureResourcesLoaded(forceReload = false) {
  const shouldLoad = forceReload || Object.values(state.resources).every((items) => items.length === 0);

  if (!shouldLoad) {
    return;
  }

  await Promise.all(Object.keys(resourceConfigs).map((resourceType) => loadResource(resourceType)));
}

function scheduleAdminReload() {
  if (state.reloadTimerId) {
    window.clearTimeout(state.reloadTimerId);
  }

  setBusyState(true, `Modification enregistree. Rechargement complet dans ${Math.round(adminReloadDelayMs / 1000)} s...`);

  state.reloadTimerId = window.setTimeout(() => {
    state.reloadTimerId = null;
    window.location.reload();
  }, adminReloadDelayMs);
}

async function refreshWorkspace(message, tone = 'success', scheduleReload = false) {
  await ensureResourcesLoaded(true);
  renderAdminWorkspace();
  updateAccessUi();

  if (scheduleReload) {
    setFeedback(`${message} Rechargement complet dans ${Math.round(adminReloadDelayMs / 1000)} s...`, tone);
    scheduleAdminReload();
    return;
  }

  setFeedback(message, tone);
}

function bindCard(container, resourceType, mode) {
  const config = resourceConfigs[resourceType];
  const cards = [...container.querySelectorAll('details.admin-card')];
  const card = cards[Object.keys(resourceConfigs).indexOf(resourceType)];

  if (!card) {
    return;
  }

  card.addEventListener('toggle', () => {
    setCardExpanded(mode, resourceType, card.open);
  });

  const select = card.querySelector('[data-role="resource-select"]');
  if (select) {
    select.addEventListener('change', () => {
      state.selectedIds[mode][resourceType] = select.value;
      renderAdminWorkspace();
      updateAccessUi();
    });
  }

  if (mode === 'delete') {
    let isDeleting = false;

    card.querySelector('[data-action="submit"]').addEventListener('click', async () => {
      if (isDeleting) {
        return;
      }

      const item = getSelectedItem(resourceType, 'delete');

      if (!item) {
        updateCardFeedback(card, `Aucune ${config.singularLabel} à supprimer.`, 'warning');
        return;
      }

      if (!window.confirm(modeDefinitions.delete.confirmMessage(config.singularLabel))) {
        return;
      }

      try {
        isDeleting = true;
        setActionBusy(card, true);
        const endpoint = `${config.endpoint}?id=${encodeURIComponent(item.id)}`;
        const result = await sendJsonRequest(endpoint, 'DELETE');
        setCardMessage(mode, resourceType, result.message || 'Suppression réussie.', 'success');
        state.selectedIds.delete[resourceType] = '';
        await refreshWorkspace(`Suppression ${config.singularLabel} effectuée.`, 'success', true);
      } catch (error) {
        updateCardFeedback(card, error.message, 'warning');
      } finally {
        isDeleting = false;
        if (!state.reloadTimerId) {
          setActionBusy(card, false);
        }
      }
    });

    return;
  }

  const form = card.querySelector('[data-role="resource-form"]');
  const resetButton = card.querySelector('[data-action="reset"]');
  const mediaInputs = [...card.querySelectorAll('[data-role="media-upload"]')];
  let isSubmitting = false;
  let isUploadingMedia = false;

  resetButton?.addEventListener('click', () => {
    setCardExpanded(mode, resourceType, true);
    state.cardMessages[`${mode}:${resourceType}`] = { text: 'Formulaire réinitialisé.', tone: 'muted' };
    renderAdminWorkspace();
    updateAccessUi();
  });

  for (const mediaInput of mediaInputs) {
    mediaInput.addEventListener('change', async () => {
      if (isUploadingMedia) {
        mediaInput.value = '';
        return;
      }

      const file = mediaInput.files?.[0];
      if (!file || !form) {
        return;
      }

      const field = config.fields.find((item) => item.name === mediaInput.dataset.fieldName);
      if (!field?.upload) {
        return;
      }

      try {
        isUploadingMedia = true;
        setActionBusy(card, true);
        await validateMediaFile(field, file);
        updateCardFeedback(card, 'Chargement de l’image en cours...');
        await uploadMediaFile({ card, form, resourceType, mode, field, file });
      } catch (error) {
        updateCardFeedback(card, error.message, 'warning');
      } finally {
        isUploadingMedia = false;
        setActionBusy(card, false);
        mediaInput.value = '';
      }
    });
  }

  form?.addEventListener('input', () => {
    if (mode !== 'create') {
      return;
    }

    const payload = normalizeFormPayload(resourceType, form);
    const previewNode = card.querySelector('[data-role="id-preview"]');
    previewNode.textContent = buildGeneratedId(resourceType, payload);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload = normalizeFormPayload(resourceType, form);
    const validationError = validatePayload(resourceType, payload);

    if (validationError) {
      updateCardFeedback(card, validationError, 'warning');
      return;
    }

    if (mode === 'update') {
      const item = getSelectedItem(resourceType, 'update');

      if (!item) {
        updateCardFeedback(card, `Aucune ${config.singularLabel} sélectionnée.`, 'warning');
        return;
      }

      payload.id = item.id;
    }

    if (mode === 'create') {
      payload.id = buildGeneratedId(resourceType, payload);
      if (!window.confirm(modeDefinitions.create.confirmMessage(config.singularLabel))) {
        return;
      }
    }

    try {
      isSubmitting = true;
      setActionBusy(card, true);
      const result = await sendJsonRequest(config.endpoint, mode === 'update' ? 'PUT' : 'POST', payload);
      setCardMessage(mode, resourceType, result.message || 'Opération réussie.', 'success');

      if (mode === 'update') {
        state.selectedIds.update[resourceType] = payload.id;
      }

      await refreshWorkspace(`${modeDefinitions[mode].title} ${config.singularLabel} effectuée.`, 'success', true);
    } catch (error) {
      updateCardFeedback(card, error.message, 'warning');
    } finally {
      isSubmitting = false;
      if (!state.reloadTimerId) {
        setActionBusy(card, false);
      }
    }
  });
}

async function loadHint() {
  const response = await fetchCollection('/api/admin/token');
  const node = document.getElementById('admin-hint');
  node.innerHTML = `
    <p><strong>Date du jour :</strong> ${escapeHtml(response.dateStamp)}</p>
    <p>${escapeHtml(response.generationRule)}</p>
    <p><strong>Variables attendues :</strong> ${escapeHtml((response.requiredEnvironment || []).join(', '))}</p>
    <ul class="tag-list compact">
      ${(response.scopes || [])
        .map((scope) => `<li>${escapeHtml(scope.name)}: ${escapeHtml((scope.unlocks || []).join(', '))}</li>`)
        .join('')}
    </ul>
    <p><strong>Astuce Swagger :</strong> génère le JWT ici, puis colle uniquement le token dans le bouton Authorize.</p>
  `;
}

function persistSession() {
  sessionStorage.setItem(sessionTokenKey, state.token);
  sessionStorage.setItem(sessionDateKey, state.tokenDate);
  sessionStorage.setItem(sessionScopeKey, state.scope);
  sessionStorage.setItem(sessionPermissionsKey, JSON.stringify(state.permissions));
}

function clearSession() {
  setBusyState(false);
  state.token = '';
  state.tokenDate = '';
  state.scope = '';
  state.permissions = [];
  state.cardMessages = {};
  state.expandedCards = {};
  sessionStorage.removeItem(sessionTokenKey);
  sessionStorage.removeItem(sessionDateKey);
  sessionStorage.removeItem(sessionScopeKey);
  sessionStorage.removeItem(sessionPermissionsKey);
}

function bindAuthForm() {
  const form = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const logoutButton = document.getElementById('admin-logout');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const result = await sendJsonRequest('/api/admin/token', 'POST', { password: passwordInput.value });
      state.token = result.token;
      state.tokenDate = result.dateStamp;
      state.scope = result.scope;
      state.permissions = result.permissions || [];
      persistSession();
      updateTokenUi();
      await ensureResourcesLoaded(true);
      renderAdminWorkspace();
      updateAccessUi();
      setFeedback(`JWT ${result.scope} chargé en session pour cette journée.`, 'success');
      passwordInput.value = '';
    } catch (error) {
      setFeedback(error.message, 'warning');
    }
  });

  logoutButton.addEventListener('click', () => {
    clearSession();
    updateTokenUi();
    updateAccessUi();
    renderAdminWorkspace();
    setFeedback('Token admin supprimé de la session.', 'muted');
  });
}

async function initAdmin() {
  const reloaded = await unregisterLegacyServiceWorkers();
  if (reloaded) {
    return;
  }

  bindAuthForm();
  updateTokenUi();
  updateAccessUi();
  await loadHint();

  if (state.token) {
    await ensureResourcesLoaded(true);
    renderAdminWorkspace();
    updateAccessUi();
    setFeedback('Token admin restauré depuis la session courante.', 'success');
  }
}

initAdmin().catch((error) => {
  setFeedback('Chargement de l’interface admin impossible.', 'warning');
  console.error(error);
});