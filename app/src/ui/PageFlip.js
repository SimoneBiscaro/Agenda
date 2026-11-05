import { useRef } from '../../vendor/preact-hooks.mjs';
import { html } from './html.js';

/**
 * Contenitore che "sfoglia" la pagina quando cambia `pageKey`.
 * dir = 1: la pagina entra da destra (avanti); dir = -1: da sinistra (indietro); 0: nessuna animazione.
 * Le animazioni si alternano A/B, così ripartono anche con due sfogli di fila nella stessa direzione.
 * Con prefers-reduced-motion il CSS le spegne.
 * @param {{ pageKey: string, dir?: 1|-1|0, children?: any }} props
 */
export function PageFlip({ pageKey, dir = 0, children }) {
  const state = useRef({ key: pageKey, cls: '', parity: false });
  const s = state.current;
  if (s.key !== pageKey) {
    s.key = pageKey;
    if (dir) {
      s.parity = !s.parity;
      s.cls = `flip__page--${dir > 0 ? 'next' : 'prev'}-${s.parity ? 'a' : 'b'}`;
    } else {
      s.cls = '';
    }
  }
  return html`<div class="flip"><div class=${`flip__page ${s.cls}`.trim()}>${children}</div></div>`;
}
