import { html } from '../../ui/html.js';
import { parseDs, WEEKDAYS, WEEKDAYS_SHORT, MONTHS } from '../../domain/dates.js';
import { weekRows } from '../../domain/events.js';
import { categoryOf } from '../../domain/categories.js';

/** Un impegno nella riga della settimana: barretta colore, ora (se c'è) e titolo. Solo da leggere. */
function WeekEvent({ ev, categories }) {
  const cat = categoryOf(ev.categoryId, categories);
  return html`
    <span class="wev" style=${`--cat:${cat.color}`}>
      <span class="wev__bar" aria-hidden="true"></span>
      ${ev.time && html`<time class="wev__time">${ev.time}</time>`}
      <span class="wev__title">${ev.title}</span>
    </span>`;
}

const spoken = (row, categories) => row.items.map((ev) => {
  const cat = categoryOf(ev.categoryId, categories);
  return `${ev.time ? `alle ${ev.time}` : 'tutto il giorno'}: ${ev.title} (${cat.name})`;
}).join('; ');

/**
 * Pagina della settimana: 7 righe da lunedì a domenica con al massimo 2 impegni ciascuna.
 * Toccare un punto qualunque della riga apre il Giorno (D1): dalla settimana non si inserisce.
 * @param {{ anchor: string, today: string, events: object[], categories: object[], onOpenDay: (ds: string) => void }} props
 */
export function SettimanaView({ anchor, today, events, categories, onOpenDay }) {
  const rows = weekRows(events, anchor, today);
  return html`
    <ol class="week" aria-label="Giorni della settimana">
      ${rows.map((row) => {
        const { m, d } = parseDs(row.ds);
        const what = row.count ? `${row.countLabel}. ${spoken(row, categories)}${row.more ? `; ${row.moreLabel}` : ''}` : row.countLabel;
        const label = `${WEEKDAYS[row.weekday]} ${d} ${MONTHS[m - 1]}${row.isToday ? ', oggi' : ''}. ${what}. Apri il giorno`;
        return html`
          <li key=${row.ds}>
            <button type="button" aria-label=${label} onClick=${() => onOpenDay(row.ds)}
              aria-current=${row.isToday ? 'date' : undefined}
              class=${`week__row${row.isToday ? ' is-today' : ''}${row.isWeekend ? ' is-weekend' : ''}`}>
              <span class="week__date" aria-hidden="true">
                <span class="week__num">${d}</span>
                <span class="week__dow">${WEEKDAYS_SHORT[row.weekday]}</span>
              </span>
              <span class="week__events" aria-hidden="true">
                ${row.items.map((ev) => html`<${WeekEvent} key=${`${ev.eventId}:${ev.date}`} ev=${ev} categories=${categories} />`)}
                ${row.more > 0 && html`<span class="week__more">${row.moreLabel}</span>`}
              </span>
            </button>
          </li>`;
      })}
    </ol>`;
}
