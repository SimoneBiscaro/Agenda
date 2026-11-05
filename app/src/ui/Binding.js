import { html } from './html.js';

const RINGS = Array.from({ length: 13 }, (_, i) => i);

/** Rilegatura ad anelli in cima alla pagina. Solo decorativa. */
export function Binding() {
  return html`<div class="binding" aria-hidden="true">
    ${RINGS.map((i) => html`<span class="binding__ring" key=${i}></span>`)}
  </div>`;
}
