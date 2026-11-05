/*
 * Date di calendario in formato 'AAAA-MM-GG', senza ore né fusi: i calcoli usano solo
 * anno, mese e giorno (via Date.UTC), così il cambio dell'ora legale non sposta mai un giorno.
 * Funzioni pure: "oggi" arriva sempre come parametro.
 * Fase 1: quanto serve a titoli e navigazione. La Fase 2 completa e testa il resto (§7).
 */

export const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
export const DAY_INITIALS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
export const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export const MONTH_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

const DAY_MS = 86400000;
const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_MONTH = /^(\d{4})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');

/** Iniziale maiuscola. */
export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** @returns {{ y: number, m: number, d: number }} m da 1 a 12 */
export function parseDate(ds) {
  const m = RE_DATE.exec(String(ds));
  if (!m) throw new RangeError(`Data non valida: ${ds}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function formatDate(y, m, d) {
  return `${String(y).padStart(4, '0')}-${pad(m)}-${pad(d)}`;
}

/** true se la stringa è una data di calendario esistente (es. niente 2026-02-30). */
export function isValidDate(ds) {
  const m = RE_DATE.exec(String(ds ?? ''));
  if (!m) return false;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

/** true se la stringa è un mese 'AAAA-MM' valido. */
export function isValidMonth(key) {
  const m = RE_MONTH.exec(String(key ?? ''));
  return Boolean(m) && Number(m[2]) >= 1 && Number(m[2]) <= 12;
}

export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y, m) {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

const toDayNumber = (ds) => {
  const { y, m, d } = parseDate(ds);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
};
const fromDayNumber = (n) => {
  const t = new Date(n * DAY_MS);
  return formatDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
};

export function addDays(ds, n) {
  return fromDayNumber(toDayNumber(ds) + n);
}

/** Differenza in giorni b − a. */
export function diffDays(a, b) {
  return toDayNumber(b) - toDayNumber(a);
}

/** Giorno della settimana: 0 = lunedì … 6 = domenica. */
export function weekday(ds) {
  // il giorno 0 (1970-01-01) era un giovedì
  return (((toDayNumber(ds) + 3) % 7) + 7) % 7;
}

/** Lunedì della settimana di ds. */
export function startOfWeek(ds) {
  return addDays(ds, -weekday(ds));
}

/** Numero di settimana ISO 8601 (la settimana appartiene all'anno del suo giovedì). */
export function isoWeek(ds) {
  const thursday = addDays(ds, 3 - weekday(ds));
  const { y } = parseDate(thursday);
  return Math.floor(diffDays(formatDate(y, 1, 1), thursday) / 7) + 1;
}

export function monthKey(ds) {
  return ds.slice(0, 7);
}

export function firstOfMonth(key) {
  return `${key.slice(0, 7)}-01`;
}

/** Il giorno 1 del mese spostato di n mesi. */
export function addMonths(ds, n) {
  const { y, m } = parseDate(ds);
  const idx = y * 12 + (m - 1) + n;
  return formatDate(Math.floor(idx / 12), (idx % 12) + 1, 1);
}

/** "5 novembre" */
export function dayMonth(ds) {
  const { m, d } = parseDate(ds);
  return `${d} ${MONTH_NAMES[m - 1]}`;
}

/** "Giovedì 5 novembre 2026" */
export function longDate(ds) {
  const { y } = parseDate(ds);
  return `${DAY_NAMES[weekday(ds)]} ${dayMonth(ds)} ${y}`;
}

/** Titolo e sottotitolo della settimana: mese e anno del giovedì; "2 – 8 nov · settimana 45". */
export function weekLabel(ds) {
  const monday = startOfWeek(ds);
  const sunday = addDays(monday, 6);
  const thu = parseDate(addDays(monday, 3));
  const a = parseDate(monday);
  const b = parseDate(sunday);
  const range = a.m === b.m
    ? `${a.d} – ${b.d} ${MONTH_SHORT[b.m - 1]}`
    : `${a.d} ${MONTH_SHORT[a.m - 1]} – ${b.d} ${MONTH_SHORT[b.m - 1]}`;
  return {
    title: `${capitalize(MONTH_NAMES[thu.m - 1])} ${thu.y}`,
    subtitle: `${range} · settimana ${isoWeek(monday)}`,
  };
}

/** "Novembre 2026" da 'AAAA-MM' o da una data. */
export function monthLabel(keyOrDate) {
  const y = Number(keyOrDate.slice(0, 4));
  const m = Number(keyOrDate.slice(5, 7));
  return `${capitalize(MONTH_NAMES[m - 1])} ${y}`;
}

/** Titolo "Giovedì 5" e sottotitolo "Oggi · novembre 2026" (o solo "novembre 2026"). */
export function dayLabel(ds, today) {
  const { y, m, d } = parseDate(ds);
  const month = `${MONTH_NAMES[m - 1]} ${y}`;
  return {
    title: `${DAY_NAMES[weekday(ds)]} ${d}`,
    subtitle: ds === today ? `Oggi · ${month}` : month,
  };
}

/** I 7 giorni della settimana di ds, da lunedì. */
export function weekDays(ds) {
  const monday = startOfWeek(ds);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/**
 * Griglia del mese: righe da lunedì a domenica, 4, 5 o 6 righe secondo il mese.
 * @returns {{ ds: string, inMonth: boolean, isToday: boolean, weekday: number }[][]}
 */
export function monthGrid(year, month, today = '') {
  const first = formatDate(year, month, 1);
  const last = formatDate(year, month, daysInMonth(year, month));
  const start = startOfWeek(first);
  const rows = Math.ceil((diffDays(start, last) + 1) / 7);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, c) => {
    const ds = addDays(start, r * 7 + c);
    return { ds, inMonth: ds.slice(0, 7) === first.slice(0, 7), isToday: ds === today, weekday: c };
  }));
}

/**
 * Navigazione delle frecce: settimana ±7 giorni, mese → giorno 1 del mese ±1, giorno ±1.
 * @param {'settimana'|'mese'|'giorno'} view
 * @param {string} anchor data 'AAAA-MM-GG'
 * @param {1|-1} dir
 */
export function step(view, anchor, dir) {
  if (view === 'settimana') return addDays(anchor, 7 * dir);
  if (view === 'mese') return addMonths(anchor, dir);
  return addDays(anchor, dir);
}

/** Data di oggi nel fuso indicato (predefinito Europe/Rome), dato un istante. */
export function todayIn(instant, timeZone = 'Europe/Rome') {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(instant);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Ora corrente (0–23) nel fuso indicato, dato un istante. */
export function hourIn(instant, timeZone = 'Europe/Rome') {
  const h = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(instant);
  return Number(h);
}
