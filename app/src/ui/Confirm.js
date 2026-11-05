import { useId } from '../../vendor/preact-hooks.mjs';
import { html } from './html.js';
import { Sheet } from './Sheet.js';
import { BigButton } from './BigButton.js';

/**
 * Conferma prima di un'azione importante: domanda + "Sì, …" / "No".
 * "No" riceve il focus: un tocco distratto non elimina niente.
 * @param {{ open: boolean, question: string, detail?: string, yesLabel: string, noLabel?: string, onYes: () => void, onNo: () => void }} props
 */
export function Confirm({ open, question, detail, yesLabel, noLabel = 'No', onYes, onNo }) {
  const detailId = `confirm-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return html`
    <${Sheet} open=${open} onClose=${onNo} title=${question} role="alertdialog" describedBy=${detail ? detailId : undefined}>
      ${detail && html`<p class="confirm__detail" id=${detailId}>${detail}</p>`}
      <div class="confirm__actions">
        <${BigButton} label=${yesLabel} variant="danger" onClick=${onYes} />
        <button type="button" class="bigbtn bigbtn--secondary" data-autofocus onClick=${onNo}><span>${noLabel}</span></button>
      </div>
    <//>`;
}
