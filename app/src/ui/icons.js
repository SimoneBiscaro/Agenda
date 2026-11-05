import { html } from './html.js';

/* Icone a tratto, 24×24, colore dal testo (currentColor). Sempre decorative: il nome sta nel pulsante. */
const PATHS = {
  'chevron-left': html`<path d="M15 5l-7 7 7 7" />`,
  'chevron-right': html`<path d="M9 5l7 7-7 7" />`,
  back: html`<path d="M14.5 5.5L8 12l6.5 6.5" />`,
  plus: html`<path d="M12 5v14M5 12h14" />`,
  check: html`<path d="M5 12.5l4.5 4.5L19 7.5" />`,
  close: html`<path d="M6 6l12 12M18 6L6 18" />`,
  gear: html`<path stroke-width="2" d="M18.75 10.13L21.1 10.61v2.78l-2.35.48-.66 1.58 1.32 2-1.96 1.96-2-1.32-1.58.66-.48 2.35h-2.78l-.48-2.35-1.58-.66-2 1.32-1.96-1.96 1.32-2-.66-1.58-2.35-.48v-2.78l2.35-.48.66-1.58-1.32-2 1.96-1.96 2 1.32 1.58-.66.48-2.35h2.78l.48 2.35 1.58.66 2-1.32 1.96 1.96-1.32 2z" /><circle cx="12" cy="12" r="3.2" />`,
};

export const ICON_NAMES = Object.keys(PATHS);

/** @param {{ name: keyof typeof PATHS, class?: string }} props */
export function Icon({ name, class: cls = '' }) {
  return html`<svg class=${`icon ${cls}`.trim()} viewBox="0 0 24 24" width="24" height="24" fill="none"
    stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
