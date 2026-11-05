/*
 * Date di calendario "AAAA-MM-GG" (CLAUDE.md §7).
 * Si lavora solo su giorni di calendario (aritmetica in UTC), mai su millisecondi locali:
 * il cambio dell'ora legale non sposta mai un giorno.
 * Nessuna funzione legge l'orologio: "oggi" arriva sempre come parametro.
 * Fase 1: quanto basta a titoli e navigazione. In Fase 2 il modulo viene completato e testato a fondo.
 */

export const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const WEEKDAYS_INITIAL = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const DS_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86400000;

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pad = (n) => String(n).padStart(2, '0');

/** true se `ds` è una data di calendario esistente nel formato AAAA-MM-GG. */
export function isValidDs(ds) {
  const m = DS_RE.exec(String(ds ?? ''));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

/** @returns {{ y: number, m: number, d: number }} mese 1–12 */
export function parseDs(ds) {
  const m = DS_RE.exec(ds);
  if (!m) throw new Error(`Data non valida: ${ds}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function toDs(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

export function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Giorni del mese (mese 1–12). */
export function daysInMonth(y, m) {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

const dayNumber = (ds) => {
  const { y, m, d } = parseDs(ds);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
const fromDayNumber = (n) => {
  const t = new Date(n * DAY_MS);
  return toDs(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};

export function addDays(ds, n) {
  return fromDayNumber(dayNumber(ds) + n);
}

/** Giorni da `a` a `b` (positivo se b viene dopo). */
export function diffDays(a, b) {
  return dayNumber(b) - dayNumber(a);
}

/** Giorno della settimana con lunedì = 0 … domenica = 6. */
export function weekday(ds) {
  return ((dayNumber(ds) % 7) + 7 + 3) % 7; // 1970-01-01 era giovedì
}

/** Lunedì della settimana di `ds`. */
export function startOfWeek(ds) {
  return addDays(ds, -weekday(ds));
}

/** Settimana ISO 8601: { year, week }. */
export function isoWeek(ds) {
  const thursday = addDays(ds, 3 - weekday(ds));
  const { y } = parseDs(thursday);
  const week = Math.floor(diffDays(toDs(y, 1, 1), thursday) / 7) + 1;
  return { year: y, week };
}

/** "AAAA-MM" → primo giorno del mese. */
export function monthStart(ds) {
  const { y, m } = parseDs(ds);
  return toDs(y, m, 1);
}

/** Titolo e sottotitolo della settimana: mese del giovedì; "2 – 8 nov · settimana 45". */
export function weekLabel(ds) {
  const mon = startOfWeek(ds);
  const sun = addDays(mon, 6);
  const thu = parseDs(addDays(mon, 3));
  const a = parseDs(mon);
  const b = parseDs(sun);
  const range = a.m === b.m
    ? `${a.d} – ${b.d} ${MONTHS_SHORT[b.m - 1]}`
    : `${a.d} ${MONTHS_SHORT[a.m - 1]} – ${b.d} ${MONTHS_SHORT[b.m - 1]}`;
  return {
    title: `${capitalize(MONTHS[thu.m - 1])} ${thu.y}`,
    subtitle: `${range} · settimana ${isoWeek(mon).week}`,
  };
}

/** Titolo del mese e sottotitolo relativo a oggi. */
export function monthLabel(ds, today) {
  const { y, m } = parseDs(ds);
  const t = parseDs(today);
  const delta = (y - t.y) * 12 + (m - t.m);
  const rel = { 0: 'Questo mese', 1: 'Il mese prossimo', '-1': 'Il mese scorso' }[delta] ?? '';
  return { title: `${capitalize(MONTHS[m - 1])} ${y}`, subtitle: rel };
}

/** "Giovedì 5" e "Oggi · novembre 2026". */
export function dayLabel(ds, today) {
  const { y, m, d } = parseDs(ds);
  const delta = diffDays(today, ds);
  const rel = { 0: 'Oggi', 1: 'Domani', '-1': 'Ieri' }[delta];
  const month = `${MONTHS[m - 1]} ${y}`;
  return {
    title: `${WEEKDAYS[weekday(ds)]} ${d}`,
    subtitle: rel ? `${rel} · ${month}` : month,
  };
}

/** "Giovedì 5 novembre 2026" */
export function longDate(ds) {
  const { y, m, d } = parseDs(ds);
  return `${WEEKDAYS[weekday(ds)]} ${d} ${MONTHS[m - 1]} ${y}`;
}

/** Righe del mese da lunedì a domenica (4, 5 o 6). */
export function monthGrid(year, month, today = '') {
  const first = toDs(year, month, 1);
  const last = toDs(year, month, daysInMonth(year, month));
  const start = startOfWeek(first);
  const rows = [];
  for (let ds = start; diffDays(ds, last) >= 0; ds = addDays(ds, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => {
      const cell = addDays(ds, i);
      return { ds: cell, inMonth: parseDs(cell).m === month, isToday: cell === today, weekday: i };
    }));
  }
  return rows;
}

/**
 * Navigazione (provvisoria, completata in Fase 2):
 * settimana ±7 giorni, mese → giorno 1 del mese ±1, giorno ±1.
 */
export function step(view, anchor, dir) {
  const k = dir < 0 ? -1 : 1;
  if (view === 'settimana') return addDays(anchor, 7 * k);
  if (view === 'giorno') return addDays(anchor, k);
  if (view === 'mese') {
    const { y, m } = parseDs(anchor);
    const idx = y * 12 + (m - 1) + k;
    return toDs(Math.floor(idx / 12), (idx % 12) + 1, 1);
  }
  throw new Error(`Vista sconosciuta: ${view}`);
}

/* ---------- Fase 2 ---------- */

/** I 7 giorni (lunedì → domenica) della settimana di `ds`. */
export function weekDays(ds) {
  const mon = startOfWeek(ds);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** true per sabato e domenica. */
export const isWeekend = (ds) => weekday(ds) >= 5;

/** "5 novembre" */
export function dayMonth(ds) {
  const { m, d } = parseDs(ds);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "5 nov" */
export function shortDate(ds) {
  const { m, d } = parseDs(ds);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
}

/**
 * Data di un impegno annuale nell'anno `year`: stesso giorno e mese;
 * il 29 febbraio diventa 28 febbraio negli anni non bisestili.
 */
export function sameDayInYear(ds, year) {
  const { m, d } = parseDs(ds);
  return toDs(year, m, Math.min(d, daysInMonth(year, m)));
}

/** Ora "HH:MM" valida tra 00:00 e 23:59. */
export function isValidTime(t) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(t ?? ''));
  return Boolean(m) && Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

/**
 * Da Mese a Settimana (§8): se il mese mostrato è quello di oggi si va alla settimana di oggi,
 * altrimenti alla prima settimana del mese (quella che contiene il giorno 1).
 * @param {string} monthDs un giorno qualunque del mese mostrato
 * @param {string} today
 */
export function weekFromMonth(monthDs, today) {
  return monthDs.slice(0, 7) === today.slice(0, 7) ? today : `${monthDs.slice(0, 7)}-01`;
}
