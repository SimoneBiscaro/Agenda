import { html } from './html.js';
import { Icon } from './icons.js';
import { Segmented } from './Segmented.js';
import { SyncDot } from './SyncDot.js';

const VIEWS = [{ value: 'settimana', label: 'Settimana' }, { value: 'mese', label: 'Mese' }];

/**
 * Intestazione a due righe.
 * Riga 1 — normale: Settimana | Mese, puntino copia, ingranaggio, "Oggi";
 *          Giorno: "‹ Torna alla settimana/al mese" e "Oggi".
 * Riga 2 — freccia ‹, titolo (Lora) e sottotitolo, freccia ›.
 */
export function Header({
  variant = 'normal', view, onView, onToday, onSettings, syncState = null, onSync,
  backLabel, onBack, title, subtitle, onPrev, onNext, prevLabel, nextLabel,
}) {
  const bar = variant === 'day'
    ? html`<div class="header__bar">
        <button type="button" class="btn btn--text header__back" onClick=${onBack}>
          <${Icon} name="back" /><span>${backLabel}</span>
        </button>
        <button type="button" class="btn btn--secondary header__today" onClick=${onToday}>Oggi</button>
      </div>`
    : html`<div class="header__bar">
        <${Segmented} label="Vista" options=${VIEWS} value=${view} onChange=${onView} />
        <span class="header__spacer"></span>
        ${syncState && html`<${SyncDot} state=${syncState} onClick=${onSync} />`}
        <button type="button" class="icon-btn" aria-label="Impostazioni" onClick=${onSettings}><${Icon} name="gear" /></button>
        <button type="button" class="btn btn--secondary header__today" onClick=${onToday}>Oggi</button>
      </div>`;

  return html`<header class="header">
    ${bar}
    <div class="header__nav">
      <button type="button" class="header__arrow" aria-label=${prevLabel} onClick=${onPrev}><${Icon} name="chevron-left" /></button>
      <div class="header__titles" aria-live="polite" aria-atomic="true">
        <h1 class="header__title">${title}</h1>
        ${subtitle && html`<p class="header__subtitle">${subtitle}</p>`}
      </div>
      <button type="button" class="header__arrow" aria-label=${nextLabel} onClick=${onNext}><${Icon} name="chevron-right" /></button>
    </div>
  </header>`;
}
