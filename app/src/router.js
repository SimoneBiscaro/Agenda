import { signal } from './store/state.js';
import { isValidDs } from './domain/dates.js';

/*
 * Router hash (CLAUDE.md §8):
 *   #/settimana/AAAA-MM-GG  #/mese/AAAA-MM  #/giorno/AAAA-MM-GG  #/impostazioni  #/catalogo
 * Ogni rotta ha `view` e, per le viste di calendario, `anchor` (sempre una data AAAA-MM-GG;
 * per il mese è il giorno 1).
 */

/** Oggi a Roma, come AAAA-MM-GG. Unico punto che legge l'orologio per il calendario. */
export function todayDs(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * @param {string} hash
 * @returns {{ view: string, anchor?: string } | null} null se la rotta non esiste
 */
export function parseHash(hash) {
  const clean = String(hash || '').replace(/^#\/?/, '').replace(/[?].*$/, '').replace(/\/+$/, '');
  const [view, arg, ...rest] = clean.split('/');
  if (rest.length) return null;
  if (view === 'impostazioni' || view === 'catalogo') return arg === undefined ? { view } : null;
  if (view === 'settimana' || view === 'giorno') return isValidDs(arg) ? { view, anchor: arg } : null;
  if (view === 'mese') return /^\d{4}-\d{2}$/.test(arg || '') && isValidDs(`${arg}-01`) ? { view, anchor: `${arg}-01` } : null;
  return null;
}

/** Percorso hash (senza #) di una rotta. */
export function pathFor(view, anchor) {
  if (view === 'mese') return `/mese/${anchor.slice(0, 7)}`;
  if (view === 'settimana' || view === 'giorno') return `/${view}/${anchor}`;
  return `/${view}`;
}

export const defaultPath = (today) => pathFor('settimana', today);

export const route = signal(parseHash(typeof location !== 'undefined' ? location.hash : '') || null);

export function navigate(path, { replace = false } = {}) {
  const target = `#${path}`;
  if (location.hash === target) return;
  if (replace) {
    history.replaceState(null, '', `${location.pathname}${location.search}${target}`);
    route.value = parseHash(target);
  } else {
    location.hash = target;
  }
}

function syncFromHash() {
  const next = parseHash(location.hash);
  if (!next) {
    navigate(defaultPath(todayDs()), { replace: true });
    return;
  }
  const cur = route.value;
  if (!cur || cur.view !== next.view || cur.anchor !== next.anchor) route.value = next;
}

/** Avvio: senza rotta valida si apre la Settimana di oggi. */
export function startRouter() {
  window.addEventListener('hashchange', syncFromHash);
  syncFromHash();
}
