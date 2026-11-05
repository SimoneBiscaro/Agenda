import { render } from '../vendor/preact.mjs';
import { useLayoutEffect, useRef, useState } from '../vendor/preact-hooks.mjs';
import { html } from './ui/html.js';
import { signal, useSignal } from './store/state.js';
import { route, navigate, startRouter } from './router.js';
import {
  dayLabel, diffDays, firstOfMonth, hourIn, longDate, monthKey, monthLabel, step, todayIn, weekDays, weekLabel,
} from './domain/dates.js';
import { Binding } from './ui/Binding.js';
import { Header } from './ui/Header.js';
import { PageFlip } from './ui/PageFlip.js';
import { BigButton } from './ui/BigButton.js';
import { Sheet } from './ui/Sheet.js';
import { ToastHost } from './ui/Toast.js';
import { Icon } from './ui/icons.js';
import { SettimanaView } from './views/settimana/SettimanaView.js';
import { MeseView } from './views/mese/MeseView.js';
import { GiornoView } from './views/giorno/GiornoView.js';
import { ImpostazioniView } from './views/impostazioni/ImpostazioniView.js';
import { CatalogoView } from './views/catalogo/CatalogoView.js';

/* ---------- Orologio: oggi e ora corrente a Roma ---------- */
const today = signal(todayIn(new Date()));
const nowHour = signal(hourIn(new Date()));
function tick() {
  const now = new Date();
  today.value = todayIn(now);
  nowHour.value = hourIn(now);
}
setInterval(tick, 60000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });

/* ---------- Service worker e avviso di versione nuova ---------- */
const waitingWorker = signal(null);
let reloading = false;

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) location.reload();
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
    // Senza service worker l'app funziona lo stesso, solo non offline.
  }
}

function UpdateBanner() {
  const worker = useSignal(waitingWorker);
  if (!worker) return null;
  return html`<button type="button" class="update-banner" onClick=${() => {
    reloading = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }}>C’è una versione nuova — Tocca per aggiornare</button>`;
}

/* ---------- Navigazione fra le viste ---------- */

/** Ultima vista Settimana/Mese aperta: serve a "Torna alla settimana/al mese". */
let lastMain = 'settimana';

const NAV = {
  settimana: { prev: 'Settimana precedente', next: 'Settimana successiva' },
  mese: { prev: 'Mese precedente', next: 'Mese successivo' },
  giorno: { prev: 'Giorno precedente', next: 'Giorno successivo' },
};

/** Data di riferimento della rotta (per il mese, il giorno 1). */
const anchorDate = (r) => (r.view === 'mese' ? firstOfMonth(r.anchor) : r.anchor);

function routeFor(view, ds) {
  return view === 'mese' ? { view, anchor: monthKey(ds) } : { view, anchor: ds };
}

/** Giorno proposto da "+ Nuovo impegno": quello aperto, altrimenti oggi se visibile, altrimenti il primo visibile. */
function newEventDate(r, t) {
  if (r.view === 'giorno') return r.anchor;
  if (r.view === 'settimana') {
    const days = weekDays(r.anchor);
    return days.includes(t) ? t : days[0];
  }
  return monthKey(t) === r.anchor ? t : firstOfMonth(r.anchor);
}

function headerProps(r, t) {
  const ds = anchorDate(r);
  const go = (dir) => navigate(routeFor(r.view, step(r.view, ds, dir)), dir);
  const goToday = () => {
    const target = routeFor(r.view, t);
    const current = r.view === 'mese' ? firstOfMonth(r.anchor) : r.anchor;
    const targetDs = r.view === 'mese' ? firstOfMonth(target.anchor) : t;
    navigate(target, Math.sign(diffDays(current, targetDs)));
  };
  const base = {
    onPrev: () => go(-1), onNext: () => go(1), onToday: goToday,
    prevLabel: NAV[r.view].prev, nextLabel: NAV[r.view].next,
  };
  if (r.view === 'giorno') {
    const dl = dayLabel(r.anchor, t);
    return {
      ...base, variant: 'day', title: dl.title, subtitle: dl.subtitle,
      backLabel: lastMain === 'mese' ? 'Torna al mese' : 'Torna alla settimana',
      onBack: () => navigate(routeFor(lastMain, r.anchor)),
    };
  }
  const onView = (v) => {
    if (v === 'mese') navigate(routeFor('mese', r.anchor));
    else navigate({ view: 'settimana', anchor: newEventDate(r, t) });
  };
  const titles = r.view === 'settimana' ? weekLabel(r.anchor) : { title: monthLabel(r.anchor), subtitle: '' };
  return {
    ...base, ...titles, view: r.view, onView,
    onSettings: () => navigate({ view: 'impostazioni', anchor: null }),
  };
}

let lastAgendaRoute = null;

function AgendaScreen({ r, t, hour }) {
  const scrollRef = useRef(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newDate, setNewDate] = useState(t);
  const pageKey = `${r.view}/${r.anchor}`;

  // Ogni pagina nuova parte dall'alto (il Giorno di oggi poi scorre da sé all'ora giusta).
  useLayoutEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [pageKey]);

  const openDay = (ds) => navigate({ view: 'giorno', anchor: ds });
  let page;
  if (r.view === 'settimana') page = html`<${SettimanaView} anchor=${r.anchor} today=${t} onOpenDay=${openDay} />`;
  else if (r.view === 'mese') page = html`<${MeseView} anchor=${r.anchor} today=${t} onOpenDay=${openDay} />`;
  else page = html`<${GiornoView} anchor=${r.anchor} today=${t} nowHour=${hour} />`;

  return html`
    <${Header} ...${headerProps(r, t)} />
    <main class="page-scroll" ref=${scrollRef}>
      <${PageFlip} pageKey=${pageKey} dir=${r.dir}>${page}</${PageFlip}>
    </main>
    <div class="bottom-bar">
      <${BigButton} label="Nuovo impegno" onClick=${() => { setNewDate(newEventDate(r, t)); setNewOpen(true); }} />
    </div>
    <${Sheet} open=${newOpen} onClose=${() => setNewOpen(false)} title="Nuovo impegno"
      footer=${html`<button type="button" class="btn btn--secondary btn--block" data-autofocus onClick=${() => setNewOpen(false)}>Annulla</button>`}>
      <p class="confirm__question"><strong>Quale giorno?</strong><br />${longDate(newDate)}</p>
    </${Sheet}>`;
}

function PlainScreen({ title, onBack, backLabel, children }) {
  return html`
    <header class="header">
      ${onBack && html`<div class="header__bar">
        <button type="button" class="btn btn--text header__back" onClick=${onBack}><${Icon} name="back" /><span>${backLabel}</span></button>
      </div>`}
      <h1 class="header__title" style="text-align:center;padding:6px 0 8px">${title}</h1>
    </header>
    <main class="page-scroll">${children}</main>`;
}

function App() {
  const r = useSignal(route);
  const t = useSignal(today);
  const hour = useSignal(nowHour);
  if (!r) return null;

  let screen;
  if (r.view === 'impostazioni') {
    const back = lastAgendaRoute || { view: 'settimana', anchor: t };
    screen = html`<${PlainScreen} title="Impostazioni" backLabel="Torna all’agenda" onBack=${() => navigate(back)}>
      <${ImpostazioniView} />
    </${PlainScreen}>`;
  } else if (r.view === 'catalogo') {
    screen = html`<${PlainScreen} title="Catalogo dei componenti"><${CatalogoView} today=${t} /></${PlainScreen}>`;
  } else {
    if (r.view !== 'giorno') lastMain = r.view;
    lastAgendaRoute = { view: r.view, anchor: r.anchor };
    screen = html`<${AgendaScreen} r=${r} t=${t} hour=${hour} />`;
  }

  return html`<${UpdateBanner} /><${Binding} />${screen}`;
}

startRouter(() => today.value);
const root = document.getElementById('app');
root.textContent = '';
render(html`<${App} />`, root);
// I messaggi brevi stanno fuori da #app: restano leggibili anche quando uno sheet rende inerte la pagina.
render(html`<${ToastHost} />`, document.getElementById('toasts'));
registerServiceWorker();
