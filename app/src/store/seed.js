import { BUILTIN_CATEGORIES, normName } from '../domain/categories.js';

export const SETTINGS_ID = 'settings';
/** Valori predefiniti del record settings (CLAUDE.md §6). */
export const DEFAULT_SETTINGS = { largeText: false };

/**
 * Primo avvio: crea le 6 categorie predefinite con gli id fissi (D4) e il record settings.
 * Idempotente: crea solo ciò che manca, e non ricrea una predefinita che l'utente ha eliminato
 * (la sua tombstone ha lo stesso id).
 * @returns {Promise<number>} numero di record creati
 */
export async function seedDefaults(repo) {
  const ops = [];
  if (!(await repo.get('settings', SETTINGS_ID, { includeDeleted: true }))) {
    ops.push({ entity: 'settings', create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS } });
  }
  for (const c of BUILTIN_CATEGORIES) {
    if (await repo.get('category', c.id, { includeDeleted: true })) continue;
    ops.push({ entity: 'category', create: { ...c, normName: normName(c.name) } });
  }
  if (ops.length) await repo.batch(ops);
  return ops.length;
}

/** Manutenzione all'avvio: elimina davvero le tombstone più vecchie di 180 giorni. */
export async function startupMaintenance(repo) {
  return { purged: await repo.purgeTombstones() };
}
