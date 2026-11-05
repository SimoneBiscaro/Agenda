import { html } from '../../ui/html.js';
import { addDays, startOfWeek, parseDs, WEEKDAYS, WEEKDAYS_SHORT, MONTHS } from '../../domain/dates.js';

/**
 * Pagina della settimana: 7 righe da lunedì a domenica.
 * Toccare un punto qualunque della riga apre il Giorno (D1).
 * Gli impegni nelle righe arrivano in Fase 3.
 * @param {{ anchor: string, today: string, onOpenDay: (ds: string) => void }} props
 */
export function SettimanaView({ anchor, today, onOpenDay }) {
  const monday = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  return html`
    <ol class="week" aria-label="Giorni della settimana">
      ${days.map((ds, i) => {
        const { m, d } = parseDs(ds);
        const isToday = ds === today;
        const weekend = i >= 5;
        const label = `${WEEKDAYS[i]} ${d} ${MONTHS[m - 1]}${isToday ? ', oggi' : ''}. Apri il giorno`;
        return html`
          <li key=${ds}>
            <button type="button" aria-label=${label} onClick=${() => onOpenDay(ds)}
              class=${`week__row${isToday ? ' is-today' : ''}${weekend ? ' is-weekend' : ''}`}>
              <span class="week__date" aria-hidden="true">
                <span class="week__num">${d}</span>
                <span class="week__dow">${WEEKDAYS_SHORT[i]}</span>
              </span>
              <span class="week__events"></span>
            </button>
          </li>`;
      })}
    </ol>`;
}
