/*
 * Sfoglio con il dito (CLAUDE.md §7). Funzioni pure: gli istanti arrivano come parametri.
 * Solo `touch-action: pan-y` sulla pagina: lo scorrimento verticale resta libero.
 */

export const SWIPE_MIN_PX = 60;
export const SWIPE_RATIO = 1.3;
/** Dopo uno sfoglio i tocchi sono ignorati per 350 ms: niente apertura involontaria di un giorno. */
export const TAP_LOCK_MS = 350;

/**
 * @param {number} dx spostamento orizzontale (negativo = verso sinistra)
 * @param {number} dy spostamento verticale
 * @returns {'next'|'prev'|null} 'next' trascinando verso sinistra, 'prev' verso destra
 */
export function classifySwipe(dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  if (Math.abs(dx) <= SWIPE_RATIO * Math.abs(dy)) return null;
  if (dx <= -SWIPE_MIN_PX) return 'next';
  if (dx >= SWIPE_MIN_PX) return 'prev';
  return null;
}

/** true se un tocco all'istante `now` (ms) va ignorato perché arriva subito dopo uno sfoglio. */
export function isTapLocked(lastSwipeAt, now) {
  return Number.isFinite(lastSwipeAt) && now - lastSwipeAt >= 0 && now - lastSwipeAt < TAP_LOCK_MS;
}
