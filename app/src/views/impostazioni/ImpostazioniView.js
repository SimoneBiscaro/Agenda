import { html } from '../../ui/html.js';
import { useSignal } from '../../store/state.js';
import { largeText, setLargeText } from '../../store/settings.js';
import { APP_VERSION } from '../../version.js';

/** Interruttore con etichetta: tutta la riga è toccabile. */
export function SwitchRow({ label, checked, onChange }) {
  return html`<button type="button" class="row-between switch-row" role="switch" aria-checked=${checked ? 'true' : 'false'}
    onClick=${() => onChange(!checked)} style="width:100%;text-align:left">
    <span>${label}</span><span class="switch" data-on=${checked ? "true" : "false"} aria-hidden="true"></span>
  </button>`;
}

/** Impostazioni (Fase 1): testo più grande e versione dell'app. Le altre sezioni arrivano nelle fasi successive. */
export function ImpostazioniView() {
  const large = useSignal(largeText);
  return html`<div class="plain">
    <section class="card" aria-labelledby="imp-testo">
      <h2 class="card__title" id="imp-testo">Lettura</h2>
      <${SwitchRow} label="Testo più grande" checked=${large} onChange=${setLargeText} />
    </section>
    <details class="card">
      <summary class="row-between" style="cursor:pointer;font-weight:700;font-size:var(--fs-event)">Area tecnica</summary>
      <p class="muted" style="margin-top:8px">Versione dell’app: ${APP_VERSION}</p>
    </details>
  </div>`;
}
