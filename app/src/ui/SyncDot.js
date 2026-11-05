import { html } from './html.js';

/** Stato della copia di sicurezza a parole (il colore non basta). */
export const SYNC_LABELS = {
  ok: 'Copia di sicurezza aggiornata',
  offline: 'Senza rete: la copia di sicurezza si farà più tardi',
  warning: 'Copia di sicurezza: c\'è qualcosa da sistemare',
};

/**
 * Puntino discreto nell'intestazione: verde pieno, anello grigio o rombo arancione
 * (anche la forma cambia, non solo il colore).
 * @param {{ state: 'ok'|'offline'|'warning', onClick?: () => void }} props
 */
export function SyncDot({ state, onClick }) {
  const label = SYNC_LABELS[state] || SYNC_LABELS.offline;
  return html`
    <button type="button" class=${`syncdot syncdot--${state}`} aria-label=${label} title=${label} onClick=${onClick}>
      <span class="syncdot__dot" aria-hidden="true"></span>
    </button>`;
}
