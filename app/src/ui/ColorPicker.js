import { html } from './html.js';
import { Icon } from './icons.js';

/** Gli 8 colori delle categorie (CLAUDE.md §5), con il nome da leggere ad alta voce. */
export const PALETTE = [
  { name: 'Rosso', color: '#B3261E' },
  { name: 'Blu', color: '#1F5FAD' },
  { name: 'Verde acqua', color: '#00796B' },
  { name: 'Verde', color: '#4E7D1E' },
  { name: 'Marrone', color: '#7A4E1D' },
  { name: 'Arancione', color: '#C2611F' },
  { name: 'Viola', color: '#8E3B8E' },
  { name: 'Grigio', color: '#4A4A4A' },
];

/**
 * Scelta del colore fra gli 8 della palette.
 * @param {{ value: string, onChange: (color: string) => void, label?: string }} props
 */
export function ColorPicker({ value, onChange, label = 'Colore' }) {
  const current = String(value || '').toUpperCase();
  return html`<div class="colors" role="group" aria-label=${label}>
    ${PALETTE.map((p) => {
      const on = p.color === current;
      return html`<button key=${p.color} type="button" class="color-swatch" style=${`background:${p.color}`}
        aria-label=${p.name} aria-pressed=${on ? 'true' : 'false'} onClick=${() => onChange(p.color)}>
        ${on && html`<${Icon} name="check" />`}
      </button>`;
    })}
  </div>`;
}
