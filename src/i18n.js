import { ihkMessages } from './data/ihk.messages.js';

const STORAGE_KEY = 'vl-language';
const SESSION_STORAGE_KEY = 'vl-language-session';
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = new Set(['en', 'de']);
const listeners = new Set();
let currentLanguage = null;

const MESSAGES = Object.freeze({
  en: Object.freeze({
    ...ihkMessages.en,
    'meta.title': 'Vladimir Leicht — Information Technology Specialist - Systems Integration',
    'meta.description': 'Portfolio of Vladimir Leicht, Information Technology Specialist - Systems Integration. Final project, private IT projects and CV.',
    'brand.role': 'Information Technology Specialist - Systems Integration',
    'nav.finalProject': 'Final Project',
    'nav.privateProjects': 'Private IT Projects',
    'nav.automation': 'Automation',
    'nav.cv': 'CV',
    'nav.education': 'Education',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',
    'boot.initialising': 'Initialising',
    'intro.skip': 'Skip intro',
    'card.abschluss.title': 'Final Project',
    'card.abschluss.subtitle': 'Server · UEM · Clients · Migration',
    'card.projekte.title': 'Private IT Projects',
    'card.projekte.subtitle': 'Self-built · Automation · Experiments',
    'card.lebenslauf.title': 'CV',
    'card.lebenslauf.subtitle': 'Career · Skills · Contact',
    'footer.chooseArea': 'Choose section',
    'lang.switch': 'Switch to German',
    'route.home': 'Home',
    'route.finalProject': 'Final Project',
    'route.privateProjects': 'Private IT Projects',
    'route.automation': 'Automation',
    'route.cv': 'CV',
    'route.career': 'Employment History',
    'route.education': 'Education',
    'route.skills': 'Skills',
    'route.contact': 'Contact',
    'route.readable': 'Reading Version',
    'breadcrumb.current': 'Current path: {path}',
    'breadcrumb.returnTo': 'Return to {label}',
    'footer.selectSection': 'Choose section',
    'footer.readerLead': 'Choose section · Scroll ·',
    'footer.resumeLead': 'Scroll to continue ·',
    'footer.escProjection': 'ESC to projection',
    'footer.escBack': 'ESC back',
    'footer.ariaProjection': 'Return to projection',
    'footer.ariaMain': 'Return to main section',
    'footer.ariaNone': 'No return action available',
    'error.webgl': 'The 3D scene could not be started. Please enable WebGL or hardware acceleration in your browser.',
    'reader.articleAria': 'CV of Vladimir Leicht',
    'reader.closeAria': 'Close reading version',
    'reader.live': 'Reading version · English CV data',
    'reader.sync': 'SYNC',
    'reader.navAria': 'CV sections',
    'reader.profile': 'Profile',
    'reader.skills': 'Skills',
    'reader.education': 'Education',
    'reader.career': 'Employment History',
    'reader.contact': 'Contact',
    'reader.bodyAria': 'Scrollable CV content',
    'reader.decrypting': 'Loading CV data …',
    'reader.readable': 'Reading Version',
    'reader.projection': 'Projection',
    'reader.channelError': 'Data channel interrupted',
    'reader.retry': 'Reload',
    'reader.timeout': 'Loading timed out',
    'reader.invalidData': 'Invalid data format',
    'reader.networkError': 'Network connection failed',
    'reader.kickerProfile': 'Professional Profile · 2026',
    'reader.focusLabel': 'Core focus:',
    'reader.factFocus': 'Core Focus',
    'reader.factLocation': 'Location',
    'reader.kickerQualification': 'Qualification',
    'reader.educationTitle': 'Education & Practical Experience',
    'reader.kickerExperience': 'Experience',
    'reader.careerTitle': 'Employment History',
    'reader.kickerSkills': 'Skills',
    'reader.skillsTitle': 'Technology & Working Style',
    'reader.technicalSkills': 'Technical Skills',
    'reader.languagesWorkingStyle': 'Languages & Working Style',
    'reader.interestsAria': 'Interests',
    'reader.interestsKicker': 'Balance',
    'reader.interestsTitle': 'Interests',
    'reader.kickerContact': 'Availability',
    'reader.email': 'Email',
    'reader.location': 'Location',
    'reader.availability': 'Availability',
    'reader.birthDate': 'Date of Birth',
    'reader.emailAction': 'Send email',
    'download.pdf': 'CV – Reading Version (PDF)',
    'download.docx': 'CV – Reading Version (DOCX)',
    'download.visible': 'Download',
    'card.finalProject.title': 'FINAL PROJECT',
    'card.finalProject.subtitle': 'Server, UEM, Clients, Migration',
    'card.projects.title': 'IT PROJECTS',
    'card.projects.subtitle': 'Custom Builds, Automation, Experimentation',
    'card.cv.title': 'CV',
    'card.cv.subtitle': 'Employment History, Skills, Contact',
  }),
  de: Object.freeze({
    ...ihkMessages.de,
    'meta.title': 'Vladimir Leicht — Fachinformatiker für Systemintegration',
    'meta.description': 'Portfolio von Vladimir Leicht, Fachinformatiker für Systemintegration. Abschlussprojekt, private IT-Projekte und Lebenslauf.',
    'brand.role': 'Fachinformatiker für Systemintegration',
    'nav.finalProject': 'Abschlussprojekt',
    'nav.privateProjects': 'Private IT-Projekte',
    'nav.automation': 'Automatisierung',
    'nav.cv': 'Lebenslauf',
    'nav.education': 'Bildungsweg',
    'nav.skills': 'Fähigkeiten',
    'nav.contact': 'Kontakt',
    'boot.initialising': 'Initialisiere',
    'intro.skip': 'Intro überspringen',
    'card.abschluss.title': 'Abschlussprojekt',
    'card.abschluss.subtitle': 'Server · UEM · Clients · Migration',
    'card.projekte.title': 'IT-Projekte',
    'card.projekte.subtitle': 'Eigenbau · Automatisierung · Experiment',
    'card.lebenslauf.title': 'Lebenslauf',
    'card.lebenslauf.subtitle': 'Werdegang · Fähigkeiten · Kontakt',
    'footer.chooseArea': 'Bereich wählen',
    'lang.switch': 'Switch to English',
    'route.home': 'Home',
    'route.finalProject': 'Abschlussprojekt',
    'route.privateProjects': 'Private IT-Projekte',
    'route.automation': 'Automatisierung',
    'route.cv': 'Lebenslauf',
    'route.career': 'Werdegang',
    'route.education': 'Ausbildung',
    'route.skills': 'Kompetenzen',
    'route.contact': 'Kontakt',
    'route.readable': 'Lesefassung',
    'breadcrumb.current': 'Aktueller Pfad: {path}',
    'breadcrumb.returnTo': 'Zu {label} zurückkehren',
    'footer.selectSection': 'Bereich wählen',
    'footer.readerLead': 'Abschnitt wählen · Scrollen ·',
    'footer.resumeLead': 'Scrollen zum Weiterlesen ·',
    'footer.escProjection': 'ESC zur Projektion',
    'footer.escBack': 'ESC zurück',
    'footer.ariaProjection': 'Zur Projektion zurückkehren',
    'footer.ariaMain': 'Zum Hauptbereich zurückkehren',
    'footer.ariaNone': 'Kein Rücksprung verfügbar',
    'error.webgl': 'Die 3D-Szene konnte nicht gestartet werden. Bitte WebGL bzw. Hardwarebeschleunigung im Browser aktivieren.',
    'reader.articleAria': 'Lebenslauf von Vladimir Leicht',
    'reader.closeAria': 'Lesefassung schließen',
    'reader.live': 'Lesefassung · Deutscher CV-Datensatz',
    'reader.sync': 'Synchron',
    'reader.navAria': 'Lebenslaufabschnitte',
    'reader.profile': 'Profil',
    'reader.skills': 'Kompetenzen',
    'reader.education': 'Ausbildung',
    'reader.career': 'Werdegang',
    'reader.contact': 'Kontakt',
    'reader.bodyAria': 'Scrollbarer Lebenslaufinhalt',
    'reader.decrypting': 'Lebenslaufdaten werden geladen …',
    'reader.readable': 'Lesefassung',
    'reader.projection': 'Projektion',
    'reader.channelError': 'Datenkanal unterbrochen',
    'reader.retry': 'Erneut laden',
    'reader.timeout': 'Zeitüberschreitung beim Laden',
    'reader.invalidData': 'Ungültiges Datenformat',
    'reader.networkError': 'Netzwerkverbindung fehlgeschlagen',
    'reader.kickerProfile': 'Systemprofil · 2026',
    'reader.focusLabel': 'Mein Fokus',
    'reader.factFocus': 'Schwerpunkt',
    'reader.factLocation': 'Standort',
    'reader.kickerQualification': 'Qualifikation',
    'reader.educationTitle': 'Ausbildung & Praxis',
    'reader.kickerExperience': 'Erfahrung',
    'reader.careerTitle': 'Beruflicher Werdegang',
    'reader.kickerSkills': 'Kompetenzen',
    'reader.skillsTitle': 'Technik & Arbeitsweise',
    'reader.technicalSkills': 'Technische Kompetenzen',
    'reader.languagesWorkingStyle': 'Sprachen & Arbeitsweise',
    'reader.interestsAria': 'Interessen',
    'reader.interestsKicker': 'Ausgleich',
    'reader.interestsTitle': 'Interessen',
    'reader.kickerContact': 'Erreichbarkeit',
    'reader.email': 'E-Mail',
    'reader.location': 'Standort',
    'reader.availability': 'Verfügbarkeit',
    'reader.birthDate': 'Geburtsdatum',
    'reader.emailAction': 'E-Mail schreiben',
    'download.pdf': 'Lebenslauf als PDF herunterladen',
    'download.docx': 'Lesefassung als DOCX herunterladen',
    'download.visible': 'Download',
    'card.finalProject.title': 'ABSCHLUSSPROJEKT',
    'card.finalProject.subtitle': 'Server, UEM, Clients, Migration',
    'card.projects.title': 'IT-PROJEKTE',
    'card.projects.subtitle': 'Eigenbau, Automatisierung, Experiment',
    'card.cv.title': 'LEBENSLAUF',
    'card.cv.subtitle': 'Werdegang, Fähigkeiten, Kontakt',
  }),
});

function normaliseLanguage(value) {
  const language = String(value || '').toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGES.has(language) ? language : DEFAULT_LANGUAGE;
}

function storedLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normaliseLanguage(stored);
  } catch {
    // Fall through to session storage.
  }
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) return normaliseLanguage(stored);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
  return DEFAULT_LANGUAGE;
}

export function getLanguage() {
  if (currentLanguage) return currentLanguage;
  currentLanguage = storedLanguage();
  return currentLanguage;
}

export function t(key, replacements = {}) {
  const language = getLanguage();
  let value = MESSAGES[language]?.[key]
    ?? MESSAGES[DEFAULT_LANGUAGE]?.[key]
    ?? key;
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export function applyStaticTranslations() {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.title = t('meta.title');

  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', t('meta.description'));

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }

  const switcher = document.getElementById('language-switch');
  if (switcher) {
    const target = language === 'en' ? 'de' : 'en';
    switcher.textContent = target.toUpperCase();
    switcher.dataset.languageTarget = target;
    switcher.setAttribute('aria-label', t('lang.switch'));
    switcher.title = t('lang.switch');
  }
}

export function setLanguage(value) {
  const previous = getLanguage();
  const language = normaliseLanguage(value);
  currentLanguage = language;

  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, language);
    } catch {
      // Language still changes for the current session in memory.
    }
  }

  applyStaticTranslations();

  if (language !== previous) {
    for (const listener of listeners) {
      try {
        listener(language, previous);
      } catch (error) {
        console.error('Language listener failed:', error);
      }
    }
  }
  return language;
}

export function onLanguageChange(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  return () => listeners.delete(listener);
}
