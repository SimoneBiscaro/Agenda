import { html } from './html.js';
import { Icon } from './icons.js';

/**
 * Pastiglia di categoria: pallino colorato + nome (il colore non è mai da solo).
 * Con `add` diventa il pulsante "+ Nuova".
 * @param {{ name: string, color?: string, selected?: boolean, add?: boolean, onClick?: () => void }} props
 */
export function CategoryChip({ name, color, selected = false, add = false, onClick }) {
  if (add) {
    return html`
      <button type="button" class="chip chip--add" onClick=${onClick}>
        <${Icon} name="plus" size=${20} stroke=${2.6} /><span>${name}</span>
      </button>`;
  }
  return html`
    <button type="button" class=${`chip${selected ? ' is-selected' : ''}`} aria-pressed=${String(selected)}
      style=${`--chip:${color}`} onClick=${onClick}>
      <span class="chip__dot" aria-hidden="true">${selected && html`<${Icon} name="check" size=${14} stroke=${3.2} />`}</span>
      <span>${name}</span>
    </button>`;
}
