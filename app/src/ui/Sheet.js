import { createPortal } from '../../vendor/preact.mjs';
import { useEffect, useId, useRef, useState } from '../../vendor/preact-hooks.mjs';
import { html } from './html.js';

const EXIT_MS = 280;
const DRAG_CLOSE_PX = 110;

/* Pila dei pannelli aperti: solo quello in cima riceve tocchi, Esc e focus. */
const stack = [];
function refreshInert() {
  const app = document.getElementById('app');
  if (app) app.inert = stack.length > 0;
  document.documentElement.classList.toggle('has-sheet', stack.length > 0);
  stack.forEach((el, i) => { el.inert = i !== stack.length - 1; });
}

/**
 * Pannello dal basso (raggio 22 px, al massimo 90% dell'altezza, maniglia grigia).
 * Si chiude con un tocco sullo sfondo scurito, con Esc o trascinando giù la maniglia.
 * Il focus entra nel pannello e torna dove era alla chiusura.
 * @param {{ open: boolean, onClose: () => void, title: string, children?: any, footer?: any, role?: string, describedBy?: string }} props
 */
export function Sheet({ open, onClose, title, children, footer, role = 'dialog', describedBy }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const drag = useRef(null);
  const titleId = `sheet-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (open) {
      if (!returnFocus.current) returnFocus.current = document.activeElement;
      setMounted(true);
      setDragY(0);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;
    const root = rootRef.current;
    stack.push(root);
    refreshInert();
    const first = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current;
    first?.focus({ preventScroll: true });

    const onKey = (e) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === root) {
        e.preventDefault();
        closeRef.current?.();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const i = stack.indexOf(root);
      if (i >= 0) stack.splice(i, 1);
      refreshInert();
      const el = returnFocus.current;
      returnFocus.current = null;
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus({ preventScroll: true });
    };
  }, [mounted]);

  if (!mounted) return null;

  const onGrabDown = (e) => {
    drag.current = { y: e.clientY, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onGrabMove = (e) => {
    if (drag.current?.id === e.pointerId) setDragY(Math.max(0, e.clientY - drag.current.y));
  };
  const onGrabUp = (e) => {
    if (drag.current?.id !== e.pointerId) return;
    const dy = e.clientY - drag.current.y;
    drag.current = null;
    if (dy > DRAG_CLOSE_PX) onClose();
    else setDragY(0);
  };

  const cls = `sheet${visible && open ? ' is-open' : ''}${dragY ? ' is-dragging' : ''}`;
  return createPortal(html`
    <div class=${cls} ref=${rootRef} style=${`--drag-y:${dragY}px`}>
      <div class="sheet__backdrop" onClick=${onClose} aria-hidden="true"></div>
      <div class="sheet__panel" role=${role} aria-modal="true" aria-labelledby=${titleId}
        aria-describedby=${describedBy} tabindex="-1" ref=${panelRef}>
        <div class="sheet__grab" onPointerDown=${onGrabDown} onPointerMove=${onGrabMove}
          onPointerUp=${onGrabUp} onPointerCancel=${onGrabUp} aria-hidden="true"><span></span></div>
        <h2 class="sheet__title" id=${titleId}>${title}</h2>
        <div class="sheet__body">${children}</div>
        ${footer && html`<div class="sheet__foot">${footer}</div>`}
      </div>
    </div>`, document.body);
}
