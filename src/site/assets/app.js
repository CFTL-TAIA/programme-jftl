import { compareSpeakersByName, escapeHtml, fetchCollection, formatTime, getSpeakerFullName, resolveSiteUrl, unregisterLegacyServiceWorkers } from './shared.js';

function renderEmptyState(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<li class="empty-state">${escapeHtml(message)}</li>`;
}

function renderConferences(items) {
  const container = document.getElementById('conference-list');

  if (items.length === 0) {
    renderEmptyState('conference-list', 'Aucune conference disponible.');
    return;
  }

  container.innerHTML = items
    .map((conference) => {
      return `
        <li class="resource-item">
          <h3>${escapeHtml(conference.nom)}</h3>
          <div class="resource-meta">
            <span class="pill">${escapeHtml(conference.id)}</span>
            <span class="pill">${escapeHtml(conference.horaire)}</span>
            <span class="pill">${escapeHtml(conference.speakerIds.length)} speaker(s)</span>
            <span class="pill">${escapeHtml(conference.salleIds.join(', '))}</span>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderSpeakers(items) {
  const container = document.getElementById('speaker-list');

  if (items.length === 0) {
    renderEmptyState('speaker-list', 'Aucun speaker disponible.');
    return;
  }

  container.innerHTML = items
    .map((speaker) => {
      return `
        <li class="resource-item">
          <img class="speaker-photo-image" src="${escapeHtml(resolveSiteUrl(speaker.photo))}" alt="Portrait de ${escapeHtml(getSpeakerFullName(speaker))}" />
          <div>
            <h3>${escapeHtml(getSpeakerFullName(speaker))}</h3>
            <div class="resource-meta">
              <span class="pill">${escapeHtml(speaker.id)}</span>
              <span class="pill">${escapeHtml(speaker.photo)}</span>
            </div>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderSalles(items) {
  const container = document.getElementById('salle-list');

  if (items.length === 0) {
    renderEmptyState('salle-list', 'Aucune salle disponible.');
    return;
  }

  container.innerHTML = items
    .map((salle) => {
      return `
        <li class="resource-item">
          <h3>${escapeHtml(salle.nom)}</h3>
          <div class="resource-meta">
            <span class="pill">${escapeHtml(salle.id)}</span>
            <span class="pill">Etage ${escapeHtml(String(salle.etage))}</span>
            <span class="pill">${escapeHtml(salle.contenance)} places</span>
          </div>
        </li>
      `;
    })
    .join('');
}

function renderEntreprises(items) {
  const container = document.getElementById('entreprise-list');

  if (!container) {
    return;
  }

  if (items.length === 0) {
    renderEmptyState('entreprise-list', 'Aucune entreprise disponible.');
    return;
  }

  container.innerHTML = items
    .map((entreprise) => {
      return `
        <li class="resource-item">
          <img class="speaker-photo-image" src="${escapeHtml(resolveSiteUrl(entreprise.logo))}" alt="Logo ${escapeHtml(entreprise.nomEntreprise)}" />
          <div>
            <h3>${escapeHtml(entreprise.nomEntreprise)}</h3>
            <div class="resource-meta">
              <span class="pill">${escapeHtml(entreprise.id)}</span>
              <a class="pill" href="${escapeHtml(entreprise.siteUrl)}" target="_blank" rel="noreferrer">Site</a>
            </div>
          </div>
        </li>
      `;
    })
    .join('');
}

async function loadDashboard() {
  const preview = document.getElementById('api-preview');

  try {
    const reloaded = await unregisterLegacyServiceWorkers();
    if (reloaded) {
      return;
    }

    const [conferences, speakers, salles, entreprises] = await Promise.all([
      fetchCollection('/api/conference'),
      fetchCollection('/api/speaker'),
      fetchCollection('/api/salle'),
      fetchCollection('/api/entreprise')
    ]);

    document.getElementById('conference-count').textContent = conferences.total;
    document.getElementById('speaker-count').textContent = speakers.total;
    document.getElementById('salle-count').textContent = salles.total;
    const entrepriseCountNode = document.getElementById('entreprise-count');
    if (entrepriseCountNode) {
      entrepriseCountNode.textContent = entreprises.total;
    }

    preview.textContent = JSON.stringify(
      {
        total: conferences.total,
        exemple: conferences.items.slice(0, 2).map((conference) => ({
          id: conference.id,
          nom: conference.nom,
          horaire: formatTime(conference.horaire),
          speakerIds: conference.speakerIds,
          salleIds: conference.salleIds
        }))
      },
      null,
      2
    );

    renderConferences(conferences.items);
    renderSpeakers([...speakers.items].sort(compareSpeakersByName));
    renderSalles(salles.items);
    renderEntreprises(entreprises.items);
  } catch (error) {
    preview.textContent = 'Erreur lors du chargement des donnees JSON.';
    renderEmptyState('conference-list', 'Chargement des conferences impossible.');
    renderEmptyState('speaker-list', 'Chargement des speakers impossible.');
    renderEmptyState('salle-list', 'Chargement des salles impossible.');
    if (document.getElementById('entreprise-list')) {
      renderEmptyState('entreprise-list', 'Chargement des entreprises impossible.');
    }
    console.error(error);
  }
}

loadDashboard();