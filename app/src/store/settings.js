import { signal } from './state.js';

/**
 * Impostazioni dell'interfaccia. In Fase 1 valgono per la sessione aperta;
 * dalla Fase 2 il valore viene salvato nel record `settings` di IndexedDB.
 */
export const largeText = signal(false);

/** Applica "Testo più grande" (D5): la base del testo passa da 16 a 18,4 px. */
export function setLargeText(on) {
  largeText.value = Boolean(on);
  document.documentElement.classList.toggle('large-text', largeText.value);
}
