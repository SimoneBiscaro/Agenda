import { html } from './html.js';
import { signal, useSignal } from '../store/state.js';

export const TOAST_MS = 2200;
const LEAVE_MS = 200;
const toasts = signal([]);
let seq = 0;

/** Mostra un messaggio breve in basso, sopra il pulsante principale, per 2,2 s. */
export function showToast(message) {
  const id = ++seq;
  toasts.value = [...toasts.value.slice(-1), { id, message, leaving: false }];
  setTimeout(() => {
    toasts.value = toasts.value.map((t) => (t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id); }, LEAVE_MS);
  }, TOAST_MS);
}

export function ToastHost() {
  const list = useSignal(toasts);
  return html`<div class="toast-host" role="status" aria-live="polite">
    ${list.map((t) => html`<div key=${t.id} class=${`toast${t.leaving ? ' is-leaving' : ''}`}>${t.message}</div>`)}
  </div>`;
}
