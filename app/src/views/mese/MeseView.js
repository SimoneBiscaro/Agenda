import { html } from '../../ui/html.js';
import { monthGrid, parseDs, WEEKDAYS, WEEKDAYS_INITIAL, MONTHS } from '../../domain/dates.js';

/**
 * Griglia del mese, da lunedì a domenica (4, 5 o 6 righe). Toccare un giorno apre il Giorno.
 * Barrette colore e legenda delle categorie arrivano in Fase 4.
 * @param {{ anchor: string, today: string, onOpenDay: (ds: string) => void }} props
 */
export function MeseView({ anchor, today, onOpenDay }) {
  const { y, m } = parseDs(anchor);
  const rows = monthGrid(y, m, today);
  return html`
    <div class="month" style=${`--rows:${rows.length}`}>
      <div class="month__head" aria-hidden="true">
        ${WEEKDAYS_INITIAL.map((l, i) => html`<span key=${i} class=${i >= 5 ? 'is-weekend' : ''}>${l}</span>`)}
      </div>
      <div class="month__grid">
        ${rows.flat().map((c) => {
          const p = parseDs(c.ds);
          const label = `${WEEKDAYS[c.weekday]} ${p.d} ${MONTHS[p.m - 1]}${c.isToday ? ', oggi' : ''}. Apri il giorno`;
          return html`
            <button type="button" key=${c.ds} aria-label=${label} onClick=${() => onOpenDay(c.ds)}
              class=${`month__cell${c.inMonth ? '' : ' is-out'}${c.isToday ? ' is-today' : ''}${c.weekday >= 5 ? ' is-weekend' : ''}`}>
              <span class="month__num" aria-hidden="true">${p.d}</span>
            </button>`;
        })}
      </div>
    </div>`;
}
