export const githubProjectUrl = 'https://github.com/CFTL-TAIA/programme-jftl';
export const programmeTitle = 'PROGRAMME DE LA JFTL 2026';

function getSiteRootUrl() {
  const rootLink = document.querySelector('.site-nav a[href], .site-header .brand[href]');

  return new URL(rootLink?.getAttribute('href') || './', window.location.href);
}

export function resolveSiteUrl(path) {
  const value = String(path || '');

  if (!value) {
    return getSiteRootUrl().toString();
  }

  if (/^[a-z]+:/i.test(value) || value.startsWith('//')) {
    return value;
  }

  return new URL(value.replace(/^\/+/, ''), getSiteRootUrl()).toString();
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function unregisterLegacyServiceWorkers() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    return false;
  }

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if (navigator.serviceWorker.controller) {
    window.location.reload();
    return true;
  }

  return false;
}

export async function fetchCollection(path) {
  const requestUrl = resolveSiteUrl(path);
  const response = await fetch(requestUrl);

  if (!response.ok) {
    throw new Error(`Erreur API sur ${requestUrl}`);
  }

  return response.json();
}

export function getSpeakerFullName(speaker) {
  return `${speaker.prenom} ${speaker.nom}`;
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function formatTime(isoString) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  })
    .format(new Date(isoString))
    .replace(':', 'h');
}

export function formatLongDate(isoString) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeZone: 'Europe/Paris'
  }).format(new Date(isoString));
}

export function sortConferencesByTime(a, b) {
  return new Date(a.horaire).getTime() - new Date(b.horaire).getTime() || a.nom.localeCompare(b.nom, 'fr');
}

export function getConferenceVariant(conference) {
  if (conference.type) {
    return conference.type;
  }

  const title = conference.nom.toLowerCase();

  if (title.includes('keynote')) {
    return 'keynote';
  }

  if (title.includes('20 minutes pour convaincre')) {
    return 'sponsor';
  }

  if (title.includes('cocktail') || title.includes('visite des stands') || title.includes('collation')) {
    return 'networking';
  }

  if (title.includes('démonstration éditeur')) {
    return 'demo';
  }

  if (title.includes('remise des prix') || title.includes('clôture')) {
    return 'closing';
  }

  return 'session';
}

export async function fetchDataset() {
  const [conferencePayload, speakerPayload, sallePayload, entreprisePayload] = await Promise.all([
    fetchCollection('/api/conference'),
    fetchCollection('/api/speaker'),
    fetchCollection('/api/salle'),
    fetchCollection('/api/entreprise')
  ]);

  const conferences = [...conferencePayload.items].sort(sortConferencesByTime);
  const speakers = [...speakerPayload.items].sort((left, right) => {
    const leftName = `${left.nom} ${left.prenom}`;
    const rightName = `${right.nom} ${right.prenom}`;
    return leftName.localeCompare(rightName, 'fr');
  });
  const salles = [...sallePayload.items].sort((left, right) => {
    return left.etage - right.etage || left.nom.localeCompare(right.nom, 'fr');
  });
  const entreprises = [...entreprisePayload.items].sort((left, right) => {
    return left.nomEntreprise.localeCompare(right.nomEntreprise, 'fr');
  });

  return {
    conferences,
    speakers,
    salles,
    entreprises,
    conferenceMap: new Map(conferences.map((conference) => [conference.id, conference])),
    speakerMap: new Map(speakers.map((speaker) => [speaker.id, speaker])),
    salleMap: new Map(salles.map((salle) => [salle.id, salle])),
    entrepriseMap: new Map(entreprises.map((entreprise) => [entreprise.id, entreprise]))
  };
}

export function findEntrepriseByConferenceTitle(conference, dataset) {
  const normalizedTitle = normalizeText(conference.nom);

  return dataset.entreprises.filter((entreprise) => {
    const normalizedEntreprise = normalizeText(entreprise.nomEntreprise);
    const candidates = [normalizedEntreprise];

    if (normalizedEntreprise.startsWith('groupe ')) {
      candidates.push(normalizedEntreprise.replace('groupe ', ''));
    }

    return candidates.some((candidate) => normalizedTitle.includes(candidate));
  });
}

export function getConferenceEntreprises(conference, dataset) {
  const entrepriseIds = new Set();

  for (const speakerId of conference.speakerIds) {
    const speaker = dataset.speakerMap.get(speakerId);
    if (speaker?.entreprise) {
      entrepriseIds.add(speaker.entreprise);
    }
  }

  const entreprisesFromSpeakers = [...entrepriseIds]
    .map((entrepriseId) => dataset.entrepriseMap.get(entrepriseId))
    .filter((entreprise) => entreprise && entreprise.id !== 'ent-non-communique');

  if (entreprisesFromSpeakers.length > 0) {
    return entreprisesFromSpeakers;
  }

  return findEntrepriseByConferenceTitle(conference, dataset).filter((entreprise) => entreprise.id !== 'ent-non-communique');
}

export function enrichConference(conference, dataset) {
  const speakers = conference.speakerIds
    .map((speakerId) => dataset.speakerMap.get(speakerId))
    .filter(Boolean);
  const salles = conference.salleIds
    .map((salleId) => dataset.salleMap.get(salleId))
    .filter(Boolean);

  return {
    ...conference,
    speakers,
    salles,
    entreprises: getConferenceEntreprises(conference, dataset),
    timeText: formatTime(conference.horaire),
    dateText: formatLongDate(conference.horaire),
    variant: getConferenceVariant(conference)
  };
}

export function getSpeakerSessions(speakerId, dataset) {
  return dataset.conferences
    .filter((conference) => conference.speakerIds.includes(speakerId))
    .map((conference) => enrichConference(conference, dataset));
}

export function getSalleSessions(salleId, dataset) {
  return dataset.conferences
    .filter((conference) => conference.salleIds.includes(salleId))
    .map((conference) => enrichConference(conference, dataset));
}

export function getEntrepriseSpeakers(entrepriseId, dataset) {
  if (entrepriseId === 'ent-non-communique') {
    return [];
  }

  return dataset.speakers.filter((speaker) => speaker.entreprise === entrepriseId);
}

export function getEntrepriseSessions(entrepriseId, dataset) {
  return dataset.conferences
    .map((conference) => enrichConference(conference, dataset))
    .filter((conference) => conference.entreprises.some((entreprise) => entreprise.id === entrepriseId));
}

export function getActiveId() {
  return new URLSearchParams(window.location.search).get('id');
}

export function selectActive(items, activeId) {
  return items.find((item) => item.id === activeId) ?? items[0] ?? null;
}

export function getSpeakerInitials(speaker) {
  return `${speaker.prenom[0] || ''}${speaker.nom[0] || ''}`.toUpperCase();
}

export function describeSalle(salle) {
  return `Etage ${salle.etage} · ${salle.contenance} places`;
}

export function getSpeakerEntreprise(speaker, dataset) {
  if (!speaker.entreprise || speaker.entreprise === 'ent-non-communique') {
    return null;
  }

  return dataset.entrepriseMap.get(speaker.entreprise) ?? null;
}