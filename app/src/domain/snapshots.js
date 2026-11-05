/*
 * Fotografie giornaliere della copia di sicurezza (CLAUDE.md §7, §9, D7). Funzioni pure.
 * Una fotografia: { schemaVersion, appVersion, createdAt, records: [...] } cifrata con la chiave del vault.
 */

export const SNAPSHOT_SCHEMA_VERSION = 1;
export const SNAPSHOT_INTERVAL_HOURS = 20;
export const SNAPSHOTS_KEPT = 30;
const HOUR_MS = 3_600_000;

export const SNAPSHOT_MESSAGES = {
  newer: 'Questa copia è stata fatta con una versione più nuova dell’app. Aggiorna l’app e riprova.',
  invalid: 'Questa copia non si può leggere.',
};

const toMs = (v) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v));

/** Vero se non è mai stata fatta una fotografia o se sono passate almeno 20 ore dall'ultima. */
export function shouldSnapshot(lastSnapshotAt, now) {
  if (!lastSnapshotAt) return true;
  const last = toMs(lastSnapshotAt);
  if (!Number.isFinite(last)) return true;
  return toMs(now) - last >= SNAPSHOT_INTERVAL_HOURS * HOUR_MS;
}

const createdOf = (s) => s.created_at ?? s.createdAt ?? '';

/** Fotografie da eliminare: tutte tranne le 30 più recenti. */
export function toPrune(list) {
  const sorted = [...list].sort((a, b) => toMs(createdOf(b)) - toMs(createdOf(a))
    || String(b.id).localeCompare(String(a.id)));
  return sorted.slice(SNAPSHOTS_KEPT);
}

const liveEvents = (records) => records.filter((r) => r.entity === 'event' && !r.deleted);

/** Contenuto in chiaro di una fotografia (prima della cifratura). */
export function buildSnapshot(records, { appVersion, createdAt }) {
  return { schemaVersion: SNAPSHOT_SCHEMA_VERSION, appVersion, createdAt, records };
}

/** Riassunto da mostrare nell'elenco: numero di impegni e data. */
export function summary(payload) {
  return {
    eventCount: liveEvents(payload?.records ?? []).length,
    createdAt: payload?.createdAt ?? null,
    date: String(payload?.createdAt ?? '').slice(0, 10),
  };
}

/**
 * Controlla una fotografia prima del ripristino.
 * @returns {{ ok: true, records: Array<object> } | { ok: false, message: string }}
 */
export function checkSnapshot(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.records)
    || !Number.isInteger(payload.schemaVersion)) {
    return { ok: false, message: SNAPSHOT_MESSAGES.invalid };
  }
  if (payload.schemaVersion > SNAPSHOT_SCHEMA_VERSION) return { ok: false, message: SNAPSHOT_MESSAGES.newer };
  return { ok: true, records: payload.records };
}
