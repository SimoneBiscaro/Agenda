import { useEffect, useRef } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { dayRows, FIRST_HOUR } from '../../domain/events.js';
import { categoryOf } from '../../domain/categories.js';

/** Impegno nella pagina del giorno: ora vera, titolo e categoria (pallino + nome). Tocco = modifica. */
function DayEvent({ ev, categories, onEdit }) {
  const cat = categoryOf(ev.categoryId, categories);
  const when = ev.time ? `alle ${ev.time}` : 'tutto il giorno';
  return html`
    <button type="button" class="dev" style=${`--cat:${cat.color}`} onClick=${() => onEdit(ev)}
      aria-label=${`${ev.title}, ${when}, ${cat.name}${ev.repeat === 'yearly' ? ', ogni anno' : ''}. Modifica`}>
      <span class="dev__bar" aria-hidden="true"></span>
      <span class="dev__text" aria-hidden="true">
        <span class="dev__title">${ev.time && html`<time class="dev__time">${ev.time}</time>`}${ev.title}</span>
        <span class="dev__cat">${cat.name}${ev.repeat === 'yearly' ? ' · ogni anno' : ''}</span>
      </span>
    </button>`;
}

/**
 * Pagina del giorno: riga "Giorno" (tutto il giorno) e righe orarie 07:00–22:00.
 * Tocco su un'ora vuota o sulla sua etichetta → Nuovo impegno a quell'ora; sulla riga "Giorno" →
 * Nuovo impegno "Tutto il giorno"; su un impegno → Modifica impegno.
 * Se il giorno è oggi, all'apertura la pagina scorre all'ora corrente meno un'ora.
 * @param {{ anchor: string, today: string, nowHour: number, events: object[], categories: object[],
 *   onNew: (date: string, time: string) => void, onEdit: (ev: object) => void }} props
 */
export function GiornoView({ anchor, today, nowHour, events, categories, onNew, onEdit }) {
  const ref = useRef(null);
  const rows = dayRows(events, anchor);
  const isToday = anchor === today;

  useEffect(() => {
    if (!isToday || !ref.current) return;
    const target = Math.max(FIRST_HOUR, nowHour - 1);
    const row = ref.current.querySelector(`[data-hour="${target}"]`);
    const scroller = ref.current.closest('.app__main');
    if (row && scroller) scroller.scrollTop = row.offsetTop - ref.current.offsetTop;
  }, [anchor]);

  return html`
    <ol class="day" aria-label="Ore del giorno" ref=${ref}>
      ${rows.map((row) => {
        const allday = row.hour === null;
        const time = allday ? '' : row.label;
        const newLabel = allday ? 'Nuovo impegno per tutto il giorno' : `Nuovo impegno alle ${row.label}`;
        const now = isToday && !allday && row.hour === Math.min(22, Math.max(FIRST_HOUR, nowHour));
        const cls = `day__row${allday ? ' day__row--allday' : ''}${now ? ' is-now' : ''}`;
        if (!row.items.length) {
          return html`
            <li key=${row.key} data-hour=${row.hour ?? undefined}>
              <button type="button" class=${`${cls} day__row--empty`} aria-label=${newLabel} onClick=${() => onNew(anchor, time)}>
                <span class="day__hour" aria-hidden="true">${row.label}</span>
                <span class="day__slot" aria-hidden="true"></span>
              </button>
            </li>`;
        }
        return html`
          <li key=${row.key} data-hour=${row.hour ?? undefined} class=${cls}>
            <button type="button" class="day__hour" aria-label=${newLabel} onClick=${() => onNew(anchor, time)}>${row.label}</button>
            <span class="day__slot">
              ${row.items.map((ev) => html`<${DayEvent} key=${ev.eventId} ev=${ev} categories=${categories} onEdit=${onEdit} />`)}
            </span>
          </li>`;
      })}
    </ol>`;
}
