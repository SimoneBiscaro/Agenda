import { signal } from './store/state.js';
import { isValidDate, isValidMonth } from './domain/dates.js';

/*
 * Router a hash (CLAUDE.md §8):
 *   #/settimana/AAAA-MM-GG · #/mese/AAAA-MM · #/giorno/AAAA-MM-GG · #/impostazioni · #/catalogo
 */

/**
 * Converte l'hash in rotta. Restituisce null se la rotta non esiste.
 * @returns {{ view: 'settimana'|'mese'|'giorno'|'impostazioni'|'catalogo', anchor: string|null } | null}
 */
export function parseHash(hash) {
  const clean = String(hash || '').replace(/^#\/?/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
  const [view, arg, ...rest] = clean.split('/');
  if (rest.length) return null;
  if ((view === 'settimana' || view === 'giorno') && isValidDate(arg)) return { view, anchor: arg };
  if (view === 'mese' && isValidMonth(arg)) return { view, anchor: arg };
  if ((view === 'impostazioni' || view === 'catalogo') && arg === undefined) return { view, anchor: null };
  return null;
}

/** Hash della rotta. */
export function toHash({ view, anchor }) {
  return anchor ? `#/${view}/${anchor}` : `#/${view}`;
}

export const homeHash = (today) => `#/settimana/${today}`;

/** Rotta corrente; `dir` dice da che parte sfogliare (1 avanti, −1 indietro, 0 nessuna animazione). */
export const route = signal(null);

let pendingDir = 0;

/** Va a una rotta; con dir ≠ 0 la pagina si sfoglia. */
export function navigate(next, dir = 0) {
  const target = toHash(next);
  if (location.hash === target) return;
  pendingDir = dir;
  location.hash = target;
}

/**
 * Avvia il router. `getToday` dà la data di oggi (Europe/Rome).
 * All'avvio l'app apre sempre la Settimana di oggi (§8); solo #/catalogo resta raggiungibile a mano.
 */
export function startRouter(getToday) {
  const first = parseHash(location.hash);
  if (!first || first.view !== 'catalogo') {
    history.replaceState(null, '', `${location.pathname}${location.search}${homeHash(getToday())}`);
  }
  const sync = () => {
    const parsed = parseHash(location.hash);
    const dir = pendingDir;
    pendingDir = 0;
    if (!parsed) {
      const home = homeHash(getToday());
      history.replaceState(null, '', `${location.pathname}${location.search}${home}`);
      route.value = { ...parseHash(home), dir: 0 };
      return;
    }
    route.value = { ...parsed, dir };
  };
  window.addEventListener('hashchange', sync);
  sync();
}
