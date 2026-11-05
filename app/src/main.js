import { render } from '../vendor/preact.mjs';
import { useEffect, useLayoutEffect, useRef } from '../vendor/preact-hooks.mjs';
import { html } from './ui/html.js';
import { signal, useSignal, useQuery } from './store/state.js';
import { route, startRouter, navigate, pathFor, todayDs, hourNow } from './router.js';
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
import { ImpegnoSheet } from './views/impegno/ImpegnoSheet.js';
import { newEventDate, newForm, editForm } from './domain/events.js';
import { classifySwipe, isTapLocked } from './domain/swipe.js';
import { getRepo } from './store/repo.js';
import { seedDefaults, startupMaintenance } from './store/seed.js';
import { loadSettings, applyLargeText } from './store/settings.js';

/* ---------- Oggi (si aggiorna a mezzanotte e al ritorno in primo piano) ---------- */
const today = signal(todayDs());
const nowHour = signal(hourNow());
const refreshToday = () => { today.value = todayDs(); nowHour.value = hourNow(); };
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

/* ---------- Pannello Nuovo / Modifica impegno ---------- */
const editor = signal(null); // { id, open, mode, initial, event }
let editorSeq = 0;
function openNew(date, time = '') {
  editor.value = { id: ++editorSeq, open: true, mode: 'new', initial: newForm(date, time) };
}
function openEdit(event) {
  editor.value = { id: ++editorSeq, open: true, mode: 'edit', initial: editForm(event), event };
}
const closeEditor = () => { if (editor.value) editor.value = { ...editor.value, open: false }; };

/** Impegni e categorie, riletti a ogni modifica. */
async function loadAgenda() {
  const repo = await getRepo();
  const [events, categories] = await Promise.all([repo.list('event'), repo.list('category')]);
  return { events, categories };
}
const EMPTY = { events: [], categories: [] };

/* ---------- Sfoglio con il dito (o trascinando con il mouse) ---------- */
function useSwipe(r) {
  const start = useRef(null);
  const lastSwipeAt = useRef(-Infinity);
  if (!r || !CALENDAR.has(r.view)) return {};
  return {
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    },
    onPointerUp: (e) => {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const kind = classifySwipe(e.clientX - s.x, e.clientY - s.y);
      if (!kind) return;
      lastSwipeAt.current = performance.now();
      navigate(pathFor(r.view, step(r.view, r.anchor, kind === 'next' ? 1 : -1)));
    },
    onPointerCancel: () => { start.current = null; },
    // Dopo uno sfoglio i tocchi sono ignorati per 350 ms: niente giorno aperto per sbaglio.
    onClickCapture: (e) => {
      if (isTapLocked(lastSwipeAt.current, performance.now())) { e.preventDefault(); e.stopPropagation(); }
    },
  };
}

function App() {
  const r = useSignal(route);
  const t = useSignal(today);
  const hour = useSignal(nowHour);
  const ed = useSignal(editor);
  const { data = EMPTY } = useQuery(loadAgenda, ['event', 'category']);
  const prev = useRef(null);
  const dir = flipDir(prev.current, r);
  useEffect(() => { prev.current = r; });
  const mainRef = useRef(null);
  const key = pageKey(r);
  // Prima degli effetti delle viste: così il Giorno di oggi può poi scorrere all'ora giusta.
  useLayoutEffect(() => { if (mainRef.current) mainRef.current.scrollTop = 0; }, [key]);
  const swipe = useSwipe(r);

  if (!r) return null;
  const { events, categories } = data;
  const openDay = (ds) => navigate(pathFor('giorno', ds));
  const editOccurrence = (occ) => {
    const ev = events.find((e) => e.id === occ.eventId);
    if (ev) openEdit(ev);
  };
  let page;
  if (r.view === 'settimana') page = html`<${SettimanaView} anchor=${r.anchor} today=${t} events=${events} categories=${categories} onOpenDay=${openDay} />`;
  else if (r.view === 'mese') page = html`<${MeseView} anchor=${r.anchor} today=${t} onOpenDay=${openDay} />`;
  else if (r.view === 'giorno') page = html`<${GiornoView} anchor=${r.anchor} today=${t} nowHour=${hour} events=${events} categories=${categories} onNew=${openNew} onEdit=${editOccurrence} />`;
  else if (r.view === 'impostazioni') page = html`<${ImpostazioniView} today=${t} />`;
  else page = html`<${CatalogoView} />`;

  const calendar = CALENDAR.has(r.view);
  return html`
    <div class="app">
      <${Binding} />
      <${UpdateBanner} />
      <${Header} ...${headerFor(r, t)} />
      <main class="app__main" id="contenuto" ref=${mainRef}>
        ${calendar
          ? html`<${PageFlip} flipKey=${key} dir=${dir} ...${swipe}>${page}<//>`
          : html`<div class="page">${page}</div>`}
      </main>
      ${calendar && html`
        <div class="bottombar">
          <${BigButton} label="Nuovo impegno" icon="plus" onClick=${() => openNew(newEventDate(r.view, r.anchor, t))} />
        </div>`}
      <${ToastHost} />
    </div>
    ${ed && html`<${ImpegnoSheet} key=${ed.id} open=${ed.open} mode=${ed.mode} initial=${ed.initial}
      event=${ed.event} categories=${categories} onClose=${closeEditor} />`}`;
}

/* ---------- Archivio locale ---------- */
/** Al primo avvio crea categorie e impostazioni; a ogni avvio elimina le tombstone scadute. */
async function initStore() {
  try {
    const repo = await getRepo();
    await seedDefaults(repo);
    await startupMaintenance(repo);
    applyLargeText((await loadSettings(repo)).largeText);
  } catch (err) {
    console.warn('Archivio locale non disponibile:', err);
  }
}

startRouter();
render(html`<${App} />`, document.getElementById('app'));
initStore();
registerServiceWorker();
