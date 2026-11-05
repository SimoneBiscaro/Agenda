import { html } from '../../ui/html.js';
import { APP_VERSION } from '../../version.js';

/** Impostazioni: le sezioni si riempiono nelle fasi 3–6. */
export function ImpostazioniView() {
  return html`
    <div class="settings">
      <details class="settings__tech">
        <summary>Area tecnica</summary>
        <p>Versione dell'app: <strong>${APP_VERSION}</strong></p>
      </details>
    </div>`;
}
