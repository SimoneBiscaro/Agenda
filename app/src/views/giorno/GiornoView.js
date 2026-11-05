import { useEffect, useRef } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';

export const FIRST_HOUR = 7;
export const LAST_HOUR = 22;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
const hh = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * Pagina del giorno: riga "Giorno" (tutto il giorno) e righe orarie 07:00–22:00.
 * Se è oggi, all'apertura scorre all'ora corrente meno un'ora.
 * @param {{ anchor: string, today: string, nowHour: number }} props
 */
export function GiornoView({ anchor, today, nowHour }) {
  const ref = useRef(null);
  const isToday = anchor === today;
  const nowRow = Math.min(LAST_HOUR, Math.max(FIRST_HOUR, nowHour));

  useEffect(() => {
    if (!isToday || !ref.current) return;
    const target = Math.max(FIRST_HOUR, nowHour - 1);
    const row = ref.current.querySelector(`[data-hour="${target}"]`);
    const scroller = ref.current.closest('.page-scroll');
    if (row && scroller && target > FIRST_HOUR) scroller.scrollTop = row.offsetTop;
  }, [anchor]);

  return html`<ol class="day" ref=${ref} aria-label="Ore del giorno">
    <li class="day-row day-row--allday">
      <span class="day-row__label">Giorno</span>
      <span class="day-row__body"></span>
    </li>
    ${HOURS.map((h) => html`<li key=${h} data-hour=${h}
      class=${`day-row${isToday && h === nowRow ? ' day-row--now' : ''}`}>
      <span class="day-row__label">${hh(h)}</span>
      <span class="day-row__body"></span>
    </li>`)}
  </ol>`;
}
