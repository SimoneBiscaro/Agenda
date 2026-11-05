import { html } from './html.js';

/**
 * Selettore a due o più voci (es. Settimana | Mese).
 * @param {{ label: string, options: { value: string, label: string }[], value: string, onChange: (v: string) => void }} props
 */
export function Segmented({ label, options, value, onChange }) {
  return html`
    <div class="segmented" role="group" aria-label=${label}>
      ${options.map((o) => html`
        <button type="button" key=${o.value} class="segmented__btn" aria-pressed=${String(o.value === value)}
          onClick=${() => { if (o.value !== value) onChange(o.value); }}>${o.label}</button>`)}
    </div>`;
}
