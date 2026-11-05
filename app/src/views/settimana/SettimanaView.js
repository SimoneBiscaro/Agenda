import { html } from '../../ui/html.js';
import { DAY_NAMES, DAY_SHORT, dayMonth, parseDate, weekDays, weekday } from '../../domain/dates.js';

/**
 * Pagina della settimana: 7 righe da lunedì a domenica. Toccare una riga apre quel giorno (D1).
 * @param {{ anchor: string, today: string, onOpenDay: (ds: string) => void }} props
 */
export function SettimanaView({ anchor, today, onOpenDay }) {
  return html`<ol class="week" aria-label="Giorni della settimana">
    ${weekDays(anchor).map((ds) => {
      const wd = weekday(ds);
      const isToday = ds === today;
      const cls = `week-row${wd >= 5 ? ' week-row--weekend' : ''}${isToday ? ' week-row--today' : ''}`;
      const label = `${DAY_NAMES[wd]} ${dayMonth(ds)}${isToday ? ', oggi' : ''}. Apri il giorno`;
      return html`<li key=${ds}>
        <button type="button" class=${cls} aria-label=${label} aria-current=${isToday ? 'date' : undefined} onClick=${() => onOpenDay(ds)}>
          <span class="week-row__date" aria-hidden="true">
            <span class="week-row__num">${parseDate(ds).d}</span>
            <span class="week-row__wd">${DAY_SHORT[wd]}</span>
          </span>
          <span class="week-row__body"></span>
        </button>
      </li>`;
    })}
  </ol>`;
}
