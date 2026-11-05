import { html } from './html.js';

/**
 * Selettore a due o più scelte (es. Settimana | Mese). Ogni scelta è un pulsante con aria-pressed.
 * @param {{ options: { value: string, label: string }[], value: string, onChange: (v: string) => void, label: string }} props
 */
export function Segmented({ options, value, onChange, label }) {
  return html`<div class="segmented" role="group" aria-label=${label}>
    ${options.map((o) => html`<button key=${o.value} type="button" class="segmented__btn"
      aria-pressed=${o.value === value ? 'true' : 'false'}
      onClick=${() => { if (o.value !== value) onChange(o.value); }}>${o.label}</button>`)}
  </div>`;
}
