import { html } from '../../ui/html.js';
import { DAY_INITIALS, DAY_NAMES, dayMonth, monthGrid, parseDate } from '../../domain/dates.js';

/**
 * Pagina del mese: griglia di 7 colonne (4, 5 o 6 righe). Toccare un giorno lo apre.
 * @param {{ anchor: string, today: string, onOpenDay: (ds: string) => void }} props anchor = 'AAAA-MM'
 */
export function MeseView({ anchor, today, onOpenDay }) {
  const y = Number(anchor.slice(0, 4));
  const m = Number(anchor.slice(5, 7));
  const rows = monthGrid(y, m, today);
  return html`<div class="month">
    <div class="month__head" aria-hidden="true">
      ${DAY_INITIALS.map((d, i) => html`<span key=${i} class=${`month__wd${i >= 5 ? ' month__wd--weekend' : ''}`}>${d}</span>`)}
    </div>
    <div class="month__grid" role="list" aria-label="Giorni del mese">
      ${rows.flat().map((c) => {
        const cls = `month-cell${c.weekday >= 5 ? ' month-cell--weekend' : ''}${c.inMonth ? '' : ' month-cell--out'}${c.isToday ? ' month-cell--today' : ''}`;
        const label = `${DAY_NAMES[c.weekday]} ${dayMonth(c.ds)}${c.isToday ? ', oggi' : ''}`;
        return html`<button key=${c.ds} type="button" role="listitem" class=${cls} aria-label=${label}
          aria-current=${c.isToday ? 'date' : undefined} onClick=${() => onOpenDay(c.ds)}>
          <span class="month-cell__num" aria-hidden="true">${parseDate(c.ds).d}</span>
        </button>`;
      })}
    </div>
  </div>`;
}
