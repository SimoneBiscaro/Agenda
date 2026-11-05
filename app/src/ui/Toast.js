import { html } from './html.js';
import { signal, useSignal } from '../store/state.js';

export const TOAST_MS = 2200;
const toast = signal(null);
let timer = 0;
let seq = 0;

/** Mostra un messaggio breve in basso, sopra il pulsante (es. "Impegno salvato"). */
export function showToast(message) {
  clearTimeout(timer);
  toast.value = { id: ++seq, message };
  timer = setTimeout(() => { toast.value = null; }, TOAST_MS);
}

/** Contenitore sempre presente: role=status annuncia il testo agli screen reader. */
export function ToastHost() {
  const t = useSignal(toast);
  return html`
    <div class="toast-host" role="status" aria-live="polite">
      ${t && html`<div class="toast" key=${t.id}>${t.message}</div>`}
    </div>`;
}
