import { html } from '../../ui/html.js';

const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

/**
 * Pagina del giorno: riga "Giorno" (tutto il giorno) e righe orarie 07:00–22:00.
 * Inserimento e modifica con un tocco arrivano in Fase 3.
 * @param {{ anchor: string }} props
 */
export function GiornoView({ anchor }) {
  return html`
    <ol class="day" aria-label="Ore del giorno" data-day=${anchor}>
      <li class="day__row day__row--allday">
        <span class="day__hour">Giorno</span>
        <span class="day__slot"></span>
      </li>
      ${HOURS.map((h) => html`
        <li class="day__row" key=${h}>
          <span class="day__hour"><time>${h}</time></span>
          <span class="day__slot"></span>
        </li>`)}
    </ol>`;
}
