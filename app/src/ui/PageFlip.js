import { useRef } from '../../vendor/preact-hooks.mjs';
import { html } from './html.js';

/**
 * Contenitore della pagina che si sfoglia.
 * A ogni cambio di `flipKey` la pagina entra da destra (`dir` = "next") o da sinistra ("prev").
 * Le animazioni sono 4 (avanti/indietro × A/B): alternare A e B le fa ripartire anche
 * quando si sfoglia due volte nella stessa direzione. Con reduced-motion il CSS le spegne.
 * @param {{ flipKey: string, dir?: 'next'|'prev'|null, children?: any, onPointerDown?: any, onPointerUp?: any, onPointerCancel?: any, onClickCapture?: any }} props
 */
export function PageFlip({ flipKey, dir = null, children, ...handlers }) {
  const state = useRef({ key: flipKey, phase: 'a', anim: '' });
  const s = state.current;
  if (s.key !== flipKey) {
    s.key = flipKey;
    if (dir === 'next' || dir === 'prev') {
      s.phase = s.phase === 'a' ? 'b' : 'a';
      s.anim = `pageflip--${dir}-${s.phase}`;
    } else {
      s.anim = '';
    }
  }
  return html`<div class=${`pageflip ${s.anim}`.trim()} ...${handlers}>${children}</div>`;
}
