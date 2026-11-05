import { html } from './html.js';
import { Icon } from './icons.js';

/**
 * Pulsante principale: 64 px, rosso nastro, a tutta larghezza, con icona + davanti.
 * @param {{ label: string, onClick: () => void, icon?: string|null, disabled?: boolean }} props
 */
export function BigButton({ label, onClick, icon = 'plus', disabled = false }) {
  return html`<button type="button" class="btn btn--primary btn--main btn--block" onClick=${onClick} disabled=${disabled}>
    ${icon && html`<${Icon} name=${icon} />`}<span>${label}</span>
  </button>`;
}
