import { html } from './html.js';

/** Stato a parole della copia di sicurezza: il colore non porta mai da solo il significato. */
export const SYNC_LABELS = {
  ok: 'Copia di sicurezza aggiornata',
  offline: 'Senza rete: la copia di sicurezza riprende da sola',
  attention: 'Copia di sicurezza: c’è qualcosa da sistemare',
};

/**
 * Puntino discreto nell'intestazione: verde = aggiornata, grigio = senza rete, arancione = da sistemare.
 * @param {{ state: 'ok'|'offline'|'attention', onClick?: () => void }} props
 */
export function SyncDot({ state, onClick }) {
  const label = SYNC_LABELS[state] || SYNC_LABELS.offline;
  return html`<button type="button" class=${`sync-dot sync-dot--${state}`} aria-label=${label} title=${label} onClick=${onClick}>
    <span class="sync-dot__mark" aria-hidden="true">${state === 'attention' ? '!' : ''}</span>
  </button>`;
}
