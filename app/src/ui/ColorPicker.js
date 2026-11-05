import { html } from './html.js';
import { Icon } from './icons.js';
import { PALETTE } from '../domain/categories.js';

/**
 * Scelta tra gli 8 colori della palette (radiogroup, frecce per spostarsi).
 * @param {{ value: string, onChange: (color: string) => void, label?: string }} props
 */
export function ColorPicker({ value, onChange, label = 'Colore' }) {
  const current = PALETTE.findIndex((p) => p.color === value);
  const onKey = (e, i) => {
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + PALETTE.length) % PALETTE.length;
    onChange(PALETTE[next].color);
    e.currentTarget.parentElement.children[next]?.focus();
  };
  return html`
    <div class="colors" role="radiogroup" aria-label=${label}>
      ${PALETTE.map((p, i) => {
        const on = p.color === value;
        return html`
          <button type="button" key=${p.color} role="radio" aria-checked=${String(on)} aria-label=${p.name}
            tabindex=${on || (current < 0 && i === 0) ? '0' : '-1'}
            class=${`colors__swatch${on ? ' is-selected' : ''}`} style=${`--sw:${p.color}`}
            onClick=${() => onChange(p.color)} onKeyDown=${(e) => onKey(e, i)}>
            ${on && html`<${Icon} name="check" size=${26} stroke=${3.2} />`}
          </button>`;
      })}
    </div>`;
}
