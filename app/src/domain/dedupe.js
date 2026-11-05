import { normName, OTHER_ID } from './categories.js';

/*
 * Deduplicazione dopo il download dal cloud (CLAUDE.md §7).
 * Due dispositivi possono creare offline la stessa categoria: per ogni gruppo di categorie
 * non builtin con lo stesso nome normalizzato vince la più vecchia (createdAt, poi id),
 * gli impegni passano alla vincitrice e le perdenti diventano tombstone.
 * Gli impegni non si deduplicano. Risultato deterministico: uguale su ogni dispositivo.
 */

const byOldest = (a, b) =>
  (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * @param {Array<object>} records tutti i record locali
 * @param {string} now istante ISO usato come updatedAt delle modifiche
 * @returns {Array<object>} solo i record modificati (impegni ricollegati e categorie perdenti)
 */
export function dedupe(records, now) {
  const groups = new Map();
  for (const c of records) {
    if (c.entity !== 'category' || c.deleted || c.builtin || c.id === OTHER_ID) continue;
    const k = c.normName || normName(c.name);
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }

  const remap = new Map();
  const changed = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const [winner, ...losers] = [...group].sort(byOldest);
    for (const l of losers) {
      remap.set(l.id, winner.id);
      changed.push({ ...l, deleted: true, updatedAt: now });
    }
  }
  if (!remap.size) return [];

  for (const e of records) {
    if (e.entity === 'event' && !e.deleted && remap.has(e.categoryId)) {
      changed.push({ ...e, categoryId: remap.get(e.categoryId), updatedAt: now });
    }
  }
  return changed;
}
