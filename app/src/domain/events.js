/*
 * Impegni (CLAUDE.md §6, §7). Funzioni pure: "oggi" e gli intervalli arrivano come parametri.
 * Un impegno: { id, title, date 'AAAA-MM-GG', time 'HH:MM' | '' (tutto il giorno), categoryId,
 *               repeat 'none' | 'yearly', deleted, demo? }
 */
import {
  isValidDs, isValidTime, parseDs, sameDayInYear, weekDays, weekday, monthGrid,
} from './dates.js';

export const TITLE_MAX = 80;
export const WEEK_ROW_MAX = 2;
export const MONTH_BARS_MAX = 3;
export const FIRST_HOUR = 7;
export const LAST_HOUR = 22;

export const MESSAGES = {
  titleEmpty: 'Scrivi che cosa devi fare.',
  titleLong: 'Al massimo 80 caratteri.',
  date: 'Scegli il giorno.',
  time: 'Scegli l\'ora.',
};

const collator = new Intl.Collator('it', { sensitivity: 'base', numeric: true });

/** Ordine nel giorno: prima "tutto il giorno", poi per ora, poi per titolo. */
export function compareInDay(a, b) {
  const aa = a.time ? 1 : 0;
  const bb = b.time ? 1 : 0;
  if (aa !== bb) return aa - bb;
  if (a.time !== b.time) return a.time < b.time ? -1 : 1;
  return collator.compare(a.title ?? '', b.title ?? '')
    || String(a.eventId ?? a.id).localeCompare(String(b.eventId ?? b.id));
}

const isLive = (e) => Boolean(e) && !e.deleted && (e.entity === undefined || e.entity === 'event');

/**
 * Occorrenze degli impegni non eliminati tra `from` e `to` (inclusi), ordinate per giorno e poi
 * con compareInDay. Gli annuali compaiono ogni anno a partire da quello della data originale.
 * Ogni occorrenza è una copia dell'impegno con `eventId`, `date` (dell'occorrenza) e `originalDate`.
 */
export function occurrences(events, from, to) {
  if (!isValidDs(from) || !isValidDs(to) || from > to) return [];
  const fromY = parseDs(from).y;
  const toY = parseDs(to).y;
  const out = [];
  for (const e of events) {
    if (!isLive(e) || !isValidDs(e.date)) continue;
    const base = { ...e, eventId: e.id, originalDate: e.date };
    if (e.repeat === 'yearly') {
      const startY = Math.max(fromY, parseDs(e.date).y);
      for (let y = startY; y <= toY; y++) {
        const ds = sameDayInYear(e.date, y);
        if (ds >= from && ds <= to && ds >= e.date) out.push({ ...base, date: ds });
      }
    } else if (e.date >= from && e.date <= to) {
      out.push({ ...base, date: e.date });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : compareInDay(a, b)));
}

/** Occorrenze di un solo giorno, già ordinate. */
export function eventsOn(events, ds) {
  return occurrences(events, ds, ds);
}

/** "Nessun impegno", "1 impegno", "N impegni". */
export function countLabel(n) {
  if (!n) return 'Nessun impegno';
  return n === 1 ? '1 impegno' : `${n} impegni`;
}

/** Testo per gli impegni che non entrano: "+ 1 altro", "+ altri N". */
export function moreLabel(n) {
  if (n <= 0) return '';
  return n === 1 ? '+ 1 altro' : `+ altri ${n}`;
}

const groupByDate = (list) => {
  const map = new Map();
  for (const o of list) {
    if (!map.has(o.date)) map.set(o.date, []);
    map.get(o.date).push(o);
  }
  return map;
};

/**
 * Le 7 righe della settimana di `anchor`: al massimo 2 impegni per riga e "+ altri N".
 * @returns {Array<{ ds, weekday, isToday, isWeekend, items, more, moreLabel, count, countLabel }>}
 */
export function weekRows(events, anchor, today) {
  const days = weekDays(anchor);
  const byDay = groupByDate(occurrences(events, days[0], days[6]));
  return days.map((ds) => {
    const all = byDay.get(ds) ?? [];
    const more = Math.max(0, all.length - WEEK_ROW_MAX);
    const wd = weekday(ds);
    return {
      ds,
      weekday: wd,
      isToday: ds === today,
      isWeekend: wd >= 5,
      items: all.slice(0, WEEK_ROW_MAX),
      more,
      moreLabel: moreLabel(more),
      count: all.length,
      countLabel: countLabel(all.length),
    };
  });
}

/**
 * Barrette del mese: per ogni giorno della griglia (anche quelli dei mesi accanto)
 * al massimo 3 barrette col colore della categoria e "+N" oltre.
 * @returns {Record<string, { bars: Array<{ eventId, categoryId }>, more: number, moreLabel: string, count: number }>}
 */
export function monthBars(events, year, month) {
  const cells = monthGrid(year, month).flat();
  const byDay = groupByDate(occurrences(events, cells[0].ds, cells[cells.length - 1].ds));
  const out = {};
  for (const { ds } of cells) {
    const all = byDay.get(ds) ?? [];
    const more = Math.max(0, all.length - MONTH_BARS_MAX);
    out[ds] = {
      bars: all.slice(0, MONTH_BARS_MAX).map((o) => ({ eventId: o.eventId, categoryId: o.categoryId })),
      more,
      moreLabel: more ? `+${more}` : '',
      count: all.length,
    };
  }
  return out;
}

const hh = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * Righe della pagina Giorno: "Giorno" (tutto il giorno) e una riga per ora dalle 07 alle 22.
 * Un impegno prima delle 7 sta nella riga 07, dalle 23 in poi nella riga 22; l'ora vera resta nell'impegno.
 * @returns {Array<{ key: string, label: string, hour: number|null, items: Array<object> }>}
 */
export function dayRows(events, ds) {
  const rows = [{ key: 'giorno', label: 'Giorno', hour: null, items: [] }];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) rows.push({ key: hh(h), label: hh(h), hour: h, items: [] });
  for (const o of eventsOn(events, ds)) {
    if (!o.time) { rows[0].items.push(o); continue; }
    const h = Math.min(LAST_HOUR, Math.max(FIRST_HOUR, Number(o.time.slice(0, 2))));
    rows[h - FIRST_HOUR + 1].items.push(o);
  }
  return rows;
}

/**
 * Controlla il modulo dell'impegno.
 * @param {{ title?: string, date?: string, timeMode?: 'allday'|'time', time?: string,
 *   categoryId?: string, repeat?: 'none'|'yearly' }} form
 * @returns {{ ok: boolean, errors: { title?: string, date?: string, time?: string },
 *   value: { title: string, date: string, time: string, categoryId?: string, repeat: 'none'|'yearly' } }}
 */
export function validate(form = {}) {
  const errors = {};
  const title = String(form.title ?? '').trim();
  if (!title) errors.title = MESSAGES.titleEmpty;
  else if ([...title].length > TITLE_MAX) errors.title = MESSAGES.titleLong;
  const date = String(form.date ?? '');
  if (!isValidDs(date)) errors.date = MESSAGES.date;
  const timed = form.timeMode === 'time';
  const time = timed ? String(form.time ?? '') : '';
  if (timed && !isValidTime(time)) errors.time = MESSAGES.time;
  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: {
      title,
      date,
      time, // salvata solo con "A un orario"
      categoryId: form.categoryId,
      repeat: form.repeat === 'yearly' ? 'yearly' : 'none',
    },
  };
}

/* ---------- Modulo dell'impegno (Fase 3) ---------- */

export const DEFAULT_TIME = '09:00';

/**
 * Giorno proposto da "+ Nuovo impegno" (§8): quello del Giorno aperto, altrimenti oggi se è
 * visibile, altrimenti il primo giorno visibile (lunedì della settimana o giorno 1 del mese).
 * @param {'settimana'|'mese'|'giorno'} view
 * @param {string} anchor 'AAAA-MM-GG' (per il mese, un giorno qualunque del mese)
 * @param {string} today
 */
export function newEventDate(view, anchor, today) {
  if (view === 'giorno') return anchor;
  if (view === 'mese') return anchor.slice(0, 7) === today.slice(0, 7) ? today : `${anchor.slice(0, 7)}-01`;
  const days = weekDays(anchor);
  return days.includes(today) ? today : days[0];
}

/**
 * Valori iniziali del modulo "Nuovo impegno". Senza ora: "Tutto il giorno" (con 09:00 pronto
 * se si sceglie "A un orario"); con ora (tocco su una riga oraria): "A un orario".
 */
export function newForm(date, time = '', categoryId = 'cat-altro') {
  return {
    title: '', date, timeMode: time ? 'time' : 'allday', time: time || DEFAULT_TIME, categoryId, repeat: 'none',
  };
}

/** Valori iniziali del modulo "Modifica impegno". */
export function editForm(event) {
  return {
    title: event.title ?? '',
    date: event.date,
    timeMode: event.time ? 'time' : 'allday',
    time: event.time || DEFAULT_TIME,
    categoryId: event.categoryId || 'cat-altro',
    repeat: event.repeat === 'yearly' ? 'yearly' : 'none',
  };
}
