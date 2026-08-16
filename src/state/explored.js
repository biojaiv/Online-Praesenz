const STORAGE_KEY = 'vl-portfolio-explored-v1';
const VALID_ROOTS = new Set(['abschluss', 'projekte', 'lebenslauf']);

function readStored() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

const explored = new Set(readStored());
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...explored]));
  } catch {
    // Privater Modus oder blockierter Speicher: Zustand bleibt fuer den Tab aktiv.
  }
}

export function markExplored(target) {
  const normalised = String(target || '').replace(/^#/, '').trim();
  const root = normalised.split('/')[0];
  if (!VALID_ROOTS.has(root)) return false;

  const before = explored.size;
  explored.add(root);
  explored.add(normalised);
  if (explored.size === before) return false;

  persist();
  const snapshot = getExplored();
  listeners.forEach((listener) => listener(snapshot));
  return true;
}

export function getExplored() {
  return new Set(explored);
}

export function onExploredChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
