import { getRepo } from './repo.js';
import { DEFAULT_SETTINGS, SETTINGS_ID } from './seed.js';

/** Impostazioni correnti, con i valori predefiniti per i campi mancanti. */
export async function loadSettings(repo) {
  const r = repo ?? (await getRepo());
  const s = await r.get('settings', SETTINGS_ID);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

/** Aggiorna le impostazioni, creando il record se manca. */
export async function updateSettings(patch, repo) {
  const r = repo ?? (await getRepo());
  const current = await r.get('settings', SETTINGS_ID, { includeDeleted: true });
  if (!current) return r.create('settings', { id: SETTINGS_ID, ...DEFAULT_SETTINGS, ...patch });
  return r.update('settings', SETTINGS_ID, { ...patch, deleted: false });
}

/** Applica "Testo più grande" (D5) alla pagina. */
export function applyLargeText(on) {
  if (typeof document !== 'undefined') document.documentElement.classList.toggle('large-text', Boolean(on));
}
