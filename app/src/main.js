import { render } from '../vendor/preact.mjs';
import { useEffect, useRef } from '../vendor/preact-hooks.mjs';
import { html } from './ui/html.js';
import { signal, useSignal } from './store/state.js';
import { route, startRouter, navigate, pathFor, todayDs } from './router.js';
import { step, startOfWeek, monthStart, weekLabel, monthLabel, dayLabel } from './domain/dates.js';
import { Binding } from './ui/Binding.js';
import { Header } from './ui/Header.js';
import { PageFlip } from './ui/PageFlip.js';
import { BigButton } from './ui/BigButton.js';
import { ToastHost } from './ui/Toast.js';
import { SettimanaView } from './views/settimana/SettimanaView.js';
import { MeseView } from './views/mese/MeseView.js';
import { GiornoView } from './views/giorno/GiornoView.js';
import { ImpostazioniView } from './views/impostazioni/ImpostazioniView.js';
import { CatalogoView } from './views/catalogo/CatalogoView.js';

/* ---------- Oggi (si aggiorna a mezzanotte e al ritorno in primo piano) ---------- */
const today = signal(todayDs());
const refreshToday = () => { today.value = todayDs(); };
setInterval(refreshToday, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshToday(); });

/* ---------- Ricordi di navigazione ---------- */
let dayOrigin = 'settimana'; // da dove si è aperto il Giorno
let lastCalendar = null; // dove torna "‹ Torna all'agenda" dalle Impostazioni
route.subscribe((r) => {
  if (!r) return;
  if (r.view === 'settimana' || r.view === 'mese') { dayOrigin = r.view; lastCalendar = r; }
  if (r.view === 'giorno') lastCalendar = r;
});

const CALENDAR = new Set(['settimana', 'mese', 'giorno']);

/** Chiave che identifica la pagina mostrata: cambia solo se cambia davvero la pagina. */
function pageKey(r) {
  if (!r) return '';
  if (r.view === 'settimana') return `settimana:${startOfWeek(r.anchor)}`;
  if (r.view === 'mese') return `mese:${monthStart(r.anchor)}`;
  if (r.view === 'giorno') return `giorno:${r.anchor}`;
  return r.view;
}

/** Direzione dello sfoglio tra due pagine della stessa vista. */
function flipDir(prev, next) {
  if (!prev || !next || prev.view !== next.view || !CALENDAR.has(next.view)) return null;
  const a = pageKey(prev);
  const b = pageKey(next);
  if (a === b) return null;
  return b > a ? 'next' : 'prev';
}

/* ---------- Avviso di versione nuova ---------- */
const waitingWorker = signal(null);
let reloadRequested = false;

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadRequested) location.reload();
  });
  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    if (reg.waiting && navigator.serviceWorker.controller) waitingWorker.value = reg.waiting;
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) waitingWorker.value = worker;
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  } catch {
    /* Senza service worker l'app funziona lo stesso, solo non offline. */
  }
}

function UpdateBanner() {
  const worker = useSignal(waitingWorker);
  if (!worker) return null;
  const update = () => {
    reloadRequested = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
  return html`
    <button type="button" class="update-banner" onClick=${update}>
      C'è una versione nuova — Tocca per aggiornare
    </button>`;
}

/* ---------- App ---------- */
function headerFor(r, t) {
  const go = (view, anchor) => navigate(pathFor(view, anchor));
  if (r.view === 'impostazioni' || r.view === 'catalogo') {
    const back = lastCalendar || { view: 'settimana', anchor: t };
    return {
      backLabel: 'Torna all\'agenda',
      onBack: () => go(back.view, back.anchor),
      title: r.view === 'impostazioni' ? 'Impostazioni' : 'Catalogo',
    };
  }
  const flip = (dir) => go(r.view, step(r.view, r.anchor, dir));
  const common = { onPrev: () => flip(-1), onNext: () => flip(1) };
  if (r.view === 'giorno') {
    const toMonth = dayOrigin === 'mese';
    return {
      ...common,
      ...dayLabel(r.anchor, t),
      backLabel: toMonth ? 'Torna al mese' : 'Torna alla settimana',
      onBack: () => go(dayOrigin, toMonth ? monthStart(r.anchor) : r.anchor),
      onToday: () => go('giorno', t),
      prevLabel: 'Giorno prima',
      nextLabel: 'Giorno dopo',
    };
  }
  const isWeek = r.view === 'settimana';
  return {
    ...common,
    ...(isWeek ? weekLabel(r.anchor) : monthLabel(r.anchor, t)),
    view: r.view,
    // Settimana → mese che la contiene; Mese → la settimana di oggi se è questo mese, altrimenti la prima.
    onView: (v) => go(v, v === 'mese'
      ? monthStart(r.anchor)
      : (monthStart(r.anchor) === monthStart(t) ? t : r.anchor)),
    onSettings: () => navigate('/impostazioni'),
    onToday: () => go(r.view, isWeek ? t : monthStart(t)),
    prevLabel: isWeek ? 'Settimana prima' : 'Mese prima',
    nextLabel: isWeek ? 'Settimana dopo' : 'Mese dopo',
  };
}

function App() {
  const r = useSignal(route);
  const t = useSignal(today);
  const prev = useRef(null);
  const dir = flipDir(prev.current, r);
  useEffect(() => { prev.current = r; });
  const mainRef = useRef(null);
  const key = pageKey(r);
  useEffect(() => { mainRef.current?.scrollTo?.(0, 0); }, [key]);

  if (!r) return null;
  const openDay = (ds) => navigate(pathFor('giorno', ds));
  let page;
  if (r.view === 'settimana') page = html`<${SettimanaView} anchor=${r.anchor} today=${t} onOpenDay=${openDay} />`;
  else if (r.view === 'mese') page = html`<${MeseView} anchor=${r.anchor} today=${t} onOpenDay=${openDay} />`;
  else if (r.view === 'giorno') page = html`<${GiornoView} anchor=${r.anchor} today=${t} />`;
  else if (r.view === 'impostazioni') page = html`<${ImpostazioniView} />`;
  else page = html`<${CatalogoView} />`;

  const calendar = CALENDAR.has(r.view);
  return html`
    <div class="app">
      <${Binding} />
      <${UpdateBanner} />
      <${Header} ...${headerFor(r, t)} />
      <main class="app__main" id="contenuto" ref=${mainRef}>
        ${calendar
          ? html`<${PageFlip} flipKey=${key} dir=${dir}>${page}<//>`
          : html`<div class="page">${page}</div>`}
      </main>
      ${calendar && html`
        <div class="bottombar">
          <${BigButton} label="Nuovo impegno" icon="plus" />
        </div>`}
      <${ToastHost} />
    </div>`;
}

startRouter();
render(html`<${App} />`, document.getElementById('app'));
registerServiceWorker();
