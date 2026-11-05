import { html } from './html.js';
import { Icon } from './icons.js';
import { Segmented } from './Segmented.js';

const VIEW_OPTIONS = [
  { value: 'settimana', label: 'Settimana' },
  { value: 'mese', label: 'Mese' },
];

/**
 * Intestazione a due righe su carta --paper-2.
 * Riga 1, variante normale: Settimana | Mese, ingranaggio, "Oggi".
 * Riga 1, variante Giorno (`backLabel`): "‹ Torna alla settimana/al mese" + "Oggi".
 * Riga 2: freccia ‹, titolo (Lora) e sottotitolo, freccia ›.
 * Le frecce si omettono passando `onPrev`/`onNext` nulli (es. Impostazioni).
 * @param {{
 *   view?: string, onView?: (v: string) => void, onSettings?: () => void,
 *   backLabel?: string, onBack?: () => void,
 *   onToday?: () => void,
 *   title: string, subtitle?: string, onPrev?: () => void, onNext?: () => void,
 *   prevLabel?: string, nextLabel?: string, status?: any,
 * }} props
 */
export function Header(props) {
  const {
    view, onView, onSettings, backLabel, onBack, onToday,
    title, subtitle, onPrev, onNext, prevLabel = 'Indietro', nextLabel = 'Avanti', status,
  } = props;
  return html`
    <header class="header">
      <div class="header__row1">
        ${backLabel
          ? html`<button type="button" class="header__back" onClick=${onBack}>
              <${Icon} name="chevron-left" size=${26} stroke=${2.8} /><span>${backLabel}</span>
            </button>`
          : html`<${Segmented} label="Vista" options=${VIEW_OPTIONS} value=${view} onChange=${onView} />`}
        <span class="header__spacer"></span>
        ${status}
        ${!backLabel && onSettings && html`
          <button type="button" class="iconbtn" aria-label="Impostazioni" onClick=${onSettings}>
            <${Icon} name="gear" size=${28} stroke=${2.2} />
          </button>`}
        ${onToday && html`
          <button type="button" class="header__today" onClick=${onToday}>Oggi</button>`}
      </div>
      <div class="header__row2">
        ${onPrev
          ? html`<button type="button" class="arrow" aria-label=${prevLabel} onClick=${onPrev}><${Icon} name="chevron-left" size=${32} stroke=${2.8} /></button>`
          : html`<span class="arrow arrow--empty" aria-hidden="true"></span>`}
        <div class="header__titles">
          <h1 class="header__title">${title}</h1>
          ${subtitle != null && html`<p class="header__subtitle">${subtitle || ' '}</p>`}
        </div>
        ${onNext
          ? html`<button type="button" class="arrow" aria-label=${nextLabel} onClick=${onNext}><${Icon} name="chevron-right" size=${32} stroke=${2.8} /></button>`
          : html`<span class="arrow arrow--empty" aria-hidden="true"></span>`}
      </div>
    </header>`;
}
