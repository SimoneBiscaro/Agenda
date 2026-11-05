import { html } from './html.js';
import { Sheet } from './Sheet.js';

/**
 * Domanda di conferma con due risposte grandi: "Sì, …" (rosso) e "No".
 * Il fuoco parte da "No", la scelta che non fa danni.
 * @param {{ open: boolean, title?: string, question: string, yesLabel: string, noLabel?: string,
 *   onYes: () => void, onNo: () => void }} props
 */
export function Confirm({ open, title = 'Sei sicuro?', question, yesLabel, noLabel = 'No', onYes, onNo }) {
  return html`<${Sheet} open=${open} onClose=${onNo} title=${title}
    footer=${html`
      <button type="button" class="btn btn--primary btn--main btn--block" onClick=${onYes}>${yesLabel}</button>
      <button type="button" class="btn btn--secondary btn--block" data-autofocus onClick=${onNo}>${noLabel}</button>`}>
    <p class="confirm__question">${question}</p>
  </${Sheet}>`;
}
