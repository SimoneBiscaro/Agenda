import { html } from './html.js';

/* Icone a tratto, colore dal testo (currentColor). Sempre decorative: il nome sta nel pulsante. */
const PATHS = {
  'chevron-left': html`<path d="M15 5l-7 7 7 7" />`,
  'chevron-right': html`<path d="M9 5l7 7-7 7" />`,
  back: html`<path d="M20 12H5" /><path d="M11 6l-6 6 6 6" />`,
  plus: html`<path d="M12 5v14" /><path d="M5 12h14" />`,
  check: html`<path d="M5 12.5l4.5 4.5L19 7.5" />`,
  close: html`<path d="M6 6l12 12" /><path d="M18 6L6 18" />`,
  gear: html`<path d="M9.94 4.89 L10.20 2.57 L13.80 2.57 L14.06 4.89 L15.56 5.52 L17.40 4.06 L19.94 6.60 L18.48 8.44 L19.11 9.94 L21.43 10.20 L21.43 13.80 L19.11 14.06 L18.48 15.56 L19.94 17.40 L17.40 19.94 L15.56 18.48 L14.06 19.11 L13.80 21.43 L10.20 21.43 L9.94 19.11 L8.44 18.48 L6.60 19.94 L4.06 17.40 L5.52 15.56 L4.89 14.06 L2.57 13.80 L2.57 10.20 L4.89 9.94 L5.52 8.44 L4.06 6.60 L6.60 4.06 L8.44 5.52Z" /><circle cx="12" cy="12" r="3" />`,
};

export const ICON_NAMES = Object.keys(PATHS);

/** @param {{ name: keyof PATHS, size?: number, stroke?: number }} props */
export function Icon({ name, size = 24, stroke = 2.4 }) {
  return html`
    <svg class="icon" width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      ${PATHS[name]}
    </svg>`;
}
