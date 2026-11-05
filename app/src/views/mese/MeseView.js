import { html } from '../../ui/html.js';
import { monthGrid, parseDs, WEEKDAYS, WEEKDAYS_INITIAL, MONTHS } from '../../domain/dates.js';
import { monthBars, countLabel } from '../../domain/events.js';
import { categoryOf, sortCategories } from '../../domain/categories.js';

/**
 * Pagina del mese: griglia da lunedì a domenica (4, 5 o 6 righe) che riempie la pagina,
 * con al massimo 3 barrette colore per giorno e "+N", e sotto la legenda delle categorie
 * (il colore non è mai da solo: ogni colore ha il suo nome). Toccare un giorno lo apre.
 * @param {{ anchor: string, today: string, events: object[], categories: object[], onOpenDay: (ds: string) => void }} props
 */
export function MeseView({ anchor, today, events, categories, onOpenDay }) {
  const { y, m } = parseDs(anchor);
  const rows = monthGrid(y, m, today);
  const bars = monthBars(events, y, m);
  const legend = sortCategories(categories);
  return html`
    <div class="month" style=${`--rows:${rows.length}`}>
      <div class="month__head" aria-hidden="true">
        ${WEEKDAYS_INITIAL.map((l, i) => html`<span key=${i} class=${i >= 5 ? 'is-weekend' : ''}>${l}</span>`)}
      </div>
      <div class="month__grid">
        ${rows.flat().map((c) => {
          const p = parseDs(c.ds);
          const b = bars[c.ds];
          const names = [...new Set(b.bars.map((x) => categoryOf(x.categoryId, categories).name))];
          const label = `${WEEKDAYS[c.weekday]} ${p.d} ${MONTHS[p.m - 1]}${c.isToday ? ', oggi' : ''}. ${countLabel(b.count)}${names.length ? ` (${names.join(', ')})` : ''}. Apri il giorno`;
          return html`
            <button type="button" key=${c.ds} aria-label=${label} onClick=${() => onOpenDay(c.ds)}
              aria-current=${c.isToday ? 'date' : undefined}
              class=${`month__cell${c.inMonth ? '' : ' is-out'}${c.isToday ? ' is-today' : ''}${c.weekday >= 5 ? ' is-weekend' : ''}`}>
              <span class="month__num" aria-hidden="true">${p.d}</span>
              ${b.count > 0 && html`
                <span class="month__bars" aria-hidden="true">
                  ${b.bars.map((x, i) => html`<span key=${i} class="month__bar" style=${`--cat:${categoryOf(x.categoryId, categories).color}`}></span>`)}
                  ${b.more > 0 && html`<span class="month__more">${b.moreLabel}</span>`}
                </span>`}
            </button>`;
        })}
      </div>
      ${legend.length > 0 && html`
        <ul class="legend" aria-label="Categorie">
          ${legend.map((c) => html`<li key=${c.id} class="legend__item"><span class="legend__dot" style=${`--cat:${c.color}`} aria-hidden="true"></span>${c.name}</li>`)}
        </ul>`}
    </div>`;
}
