import { html } from './html.js';
import { Icon } from './icons.js';

/**
 * Pulsante grande (64 px). `variant`: primary (nastro rosso), secondary (carta), danger (bordo rosso).
 * @param {{ label: string, icon?: string, variant?: 'primary'|'secondary'|'danger', onClick?: () => void, disabled?: boolean, type?: string }} props
 */
export function BigButton({ label, icon, variant = 'primary', onClick, disabled = false, type = 'button' }) {
  return html`
    <button type=${type} class=${`bigbtn bigbtn--${variant}`} onClick=${onClick} disabled=${disabled}>
      ${icon && html`<${Icon} name=${icon} size=${28} stroke=${2.8} />`}
      <span>${label}</span>
    </button>`;
}
