import { html } from './html.js';
import { Icon } from './icons.js';

/**
 * Pastiglia di categoria: pallino colorato + nome. Selezionata: bordo marcato, fondo giallo e spunta.
 * @param {{ name: string, color: string, selected?: boolean, onClick?: () => void }} props
 */
export function CategoryChip({ name, color, selected = false, onClick }) {
  return html`<button type="button" class="chip" aria-pressed=${selected ? 'true' : 'false'} onClick=${onClick}>
    <span class="chip__dot" style=${`background:${color}`} aria-hidden="true"></span>
    <span>${name}</span>
    ${selected && html`<${Icon} name="check" />`}
  </button>`;
}

/** Pastiglia "+ Nuova" per creare una categoria. */
export function AddChip({ label = 'Nuova', onClick }) {
  return html`<button type="button" class="chip chip--add" onClick=${onClick}>
    <${Icon} name="plus" /><span>${label}</span>
  </button>`;
}
