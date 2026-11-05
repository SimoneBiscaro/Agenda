import { useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Confirm } from '../../ui/Confirm.js';
import { showToast } from '../../ui/Toast.js';
import { loadDemo, clearDemo } from '../../store/demo.js';
import { APP_VERSION } from '../../version.js';

/**
 * Impostazioni. Fase 3: Area tecnica (chiusa di default) con gli impegni di prova e la versione.
 * @param {{ today: string }} props
 */
export function ImpostazioniView({ today }) {
  const [busy, setBusy] = useState(false);
  const [askClear, setAskClear] = useState(false);

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

  return html`
    <div class="settings">
      <details class="settings__tech">
        <summary>Area tecnica</summary>
        <div class="settings__tech-body">
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
    <${Confirm} open=${askClear} question="Cancellare gli impegni di prova?"
      detail="Gli impegni che hai scritto tu restano." yesLabel="Sì, cancella"
      onNo=${() => setAskClear(false)}
      onYes=${() => { setAskClear(false); run(clearDemo, (n) => (n ? 'Impegni di prova cancellati' : 'Non c’erano impegni di prova')); }} />`;
}
