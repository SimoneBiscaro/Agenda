import { useEffect, useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Icon } from '../../ui/icons.js';
import { Confirm } from '../../ui/Confirm.js';
import { showToast } from '../../ui/Toast.js';
import { useQuery, useSignal } from '../../store/state.js';
import { loadDemo, clearDemo } from '../../store/demo.js';
import { loadSettings, updateSettings, applyLargeText } from '../../store/settings.js';
import { OTHER_ID, sortCategories } from '../../domain/categories.js';
import { APP_VERSION } from '../../version.js';
import { CategoriaSheet } from './CategoriaSheet.js';
import { CloudSheet } from './CloudSheet.js';
import { cloudConfigured, syncNow, syncState } from '../../store/cloud.js';
import { whenLabel } from '../../domain/dates.js';

/** Stato della copia di sicurezza a parole. */
export function copyStatus(s, today) {
  const last = s.lastSyncAt ? ` Ultimo aggiornamento: ${whenLabel(s.lastSyncAt, today)}.` : '';
  switch (s.phase) {
    case 'ok': return `Aggiornata.${last}`;
    case 'syncing':
    case 'idle': return `Aggiornamento in corso…${last}`;
    case 'offline': return `Senza internet: riprende da sola quando torna la rete.${last}`;
    case 'error': return `${s.error} Riprovo da solo tra poco.${last}`;
    case 'expired': return 'Il collegamento è scaduto: ricollegala dall’Area tecnica.';
    case 'locked': return 'Manca la passphrase: ricollegala dall’Area tecnica.';
    default: return 'Non ancora collegata.';
  }
}

/** "Testo più grande": applicato subito alla pagina e salvato per i prossimi avvii. */
function LargeTextSwitch() {
  const { data } = useQuery(() => loadSettings(), ['settings']);
  const on = Boolean(data?.largeText);
  const toggle = async (next) => {
    applyLargeText(next);
    try {
      await updateSettings({ largeText: next });
    } catch {
      applyLargeText(!next);
      showToast('Non è stato salvato. Riprova.');
    }
  };
  return html`
    <label class="switch">
      <input type="checkbox" role="switch" checked=${on} disabled=${!data}
        onChange=${(e) => toggle(e.currentTarget.checked)} />
      <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
      <span class="switch__label">Testo più grande<span class="switch__hint">Tutte le scritte diventano più grandi</span></span>
    </label>`;
}

/**
 * Impostazioni (§8): Testo più grande, Categorie, Copia di sicurezza, Area tecnica.
 * @param {{ today: string, events: object[], categories: object[] }} props
 */
export function ImpostazioniView({ today, events, categories, focusCopy = false }) {
  const [busy, setBusy] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const [editor, setEditor] = useState(null); // { id, open, category? }
  const [cloudOpen, setCloudOpen] = useState(false);
  const sync = useSignal(syncState);
  // Dal puntino nell'intestazione si arriva direttamente alla sezione "Copia di sicurezza".
  useEffect(() => {
    if (focusCopy) document.getElementById('set-copy')?.scrollIntoView({ block: 'start' });
  }, [focusCopy]);

  const run = async (fn, done) => {
    if (busy) return;
    setBusy(true);
    try {
      const n = await fn();
      showToast(done(n));
    } catch {
      showToast('Non è riuscito. Riprova.');
    } finally {
      setBusy(false);
    }
  };
  const openEditor = (category) => setEditor({ id: Date.now(), open: true, category });
  const cats = sortCategories(categories);

  return html`
    <div class="settings">
      <section class="settings__card" aria-labelledby="set-read">
        <h2 class="settings__title" id="set-read">Lettura</h2>
        <${LargeTextSwitch} />
      </section>

      <section class="settings__card" aria-labelledby="set-cat">
        <h2 class="settings__title" id="set-cat">Categorie</h2>
        <ul class="catlist">
          ${cats.map((c) => (c.id === OTHER_ID
            ? html`<li key=${c.id} class="catlist__row catlist__row--locked">
                <span class="legend__dot" style=${`--cat:${c.color}`} aria-hidden="true"></span>
                <span class="catlist__name">${c.name}</span>
                <span class="catlist__note">sempre presente</span>
              </li>`
            : html`<li key=${c.id}>
                <button type="button" class="catlist__row" onClick=${() => openEditor(c)} aria-label=${`${c.name}. Rinomina, cambia colore o elimina`}>
                  <span class="legend__dot" style=${`--cat:${c.color}`} aria-hidden="true"></span>
                  <span class="catlist__name">${c.name}</span>
                  <span class="catlist__edit" aria-hidden="true">Modifica <${Icon} name="chevron-right" size=${20} stroke=${2.6} /></span>
                </button>
              </li>`))}
        </ul>
        <button type="button" class="btn btn--secondary btn--block" onClick=${() => openEditor(null)}>
          <${Icon} name="plus" size=${20} stroke=${2.6} />Aggiungi una categoria
        </button>
      </section>

      <section class="settings__card" aria-labelledby="set-copy">
        <h2 class="settings__title" id="set-copy">Copia di sicurezza</h2>
        <p class="settings__text" aria-live="polite">${copyStatus(sync, today)}</p>
        ${(sync.phase === 'error' || sync.phase === 'offline') && html`
          <button type="button" class="btn btn--secondary btn--block" onClick=${() => syncNow()}>Riprova adesso</button>`}
        ${(sync.phase === 'expired' || sync.phase === 'locked') && html`
          <button type="button" class="btn btn--secondary btn--block" onClick=${() => setCloudOpen(true)}>Ricollega</button>`}
      </section>

      <details class="settings__tech">
        <summary>Area tecnica</summary>
        <div class="settings__tech-body">
          ${cloudConfigured && html`
            <button type="button" class="btn btn--secondary btn--block" onClick=${() => setCloudOpen(true)}>
              ${sync.phase === 'off' ? 'Collega la copia di sicurezza' : 'Collegamento della copia di sicurezza'}
            </button>`}
          <p>Impegni di prova: 12 impegni nelle prossime 4 settimane, per vedere com'è l'agenda piena.
            Si cancellano tutti insieme e non toccano gli impegni veri.</p>
          <button type="button" class="btn btn--secondary btn--block" disabled=${busy}
            onClick=${() => run(() => loadDemo(today), (n) => `${n} impegni di prova caricati`)}>Carica impegni di prova</button>
          <button type="button" class="btn btn--danger btn--block" disabled=${busy}
            onClick=${() => setAskClear(true)}>Cancella impegni di prova</button>
          <p>Versione dell'app: <strong>${APP_VERSION}</strong></p>
        </div>
      </details>
    </div>
    <${CloudSheet} open=${cloudOpen} onClose=${() => setCloudOpen(false)} />
    ${editor && html`<${CategoriaSheet} key=${editor.id} open=${editor.open} category=${editor.category}
      categories=${categories} events=${events} onClose=${() => setEditor({ ...editor, open: false })} />`}
    <${Confirm} open=${askClear} question="Cancellare gli impegni di prova?"
      detail="Gli impegni che hai scritto tu restano." yesLabel="Sì, cancella"
      onNo=${() => setAskClear(false)}
      onYes=${() => { setAskClear(false); run(clearDemo, (n) => (n ? 'Impegni di prova cancellati' : 'Non c’erano impegni di prova')); }} />`;
}
