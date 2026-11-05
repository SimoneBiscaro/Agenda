import { useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Binding } from '../../ui/Binding.js';
import { Header } from '../../ui/Header.js';
import { Segmented } from '../../ui/Segmented.js';
import { BigButton } from '../../ui/BigButton.js';
import { PageFlip } from '../../ui/PageFlip.js';
import { Sheet } from '../../ui/Sheet.js';
import { CategoryChip } from '../../ui/CategoryChip.js';
import { ColorPicker } from '../../ui/ColorPicker.js';
import { showToast } from '../../ui/Toast.js';
import { Confirm } from '../../ui/Confirm.js';
import { SyncDot } from '../../ui/SyncDot.js';
import { Icon, ICON_NAMES } from '../../ui/icons.js';
import { BUILTIN_CATEGORIES, PALETTE, colorName } from '../../domain/categories.js';

/*
 * #/catalogo — pagina di sviluppo, non linkata: ogni componente in tutti i suoi stati.
 */

const TOKENS = ['paper', 'paper-2', 'paper-weekend', 'today', 'line', 'field-border', 'white',
  'ink', 'ink-2', 'ink-3', 'binding', 'ribbon', 'ribbon-dark', 'ribbon-tint', 'focus'];

const SCALE = [
  ['Titolo pagina · 1,75 rem', 'page-title', 'var(--font-title)'],
  ['Numero giorno · 1,875 rem', 'day-num', 'var(--font-title)'],
  ['Titolo sheet · 1,625 rem', 'sheet-title', 'var(--font-title)'],
  ['Pulsante principale · 1,375 rem', 'button', 'var(--font-ui)'],
  ['Testo impegno · 1,125 rem', 'event', 'var(--font-ui)'],
  ['Etichetta · 1 rem', 'label', 'var(--font-ui)'],
  ['+2 · 0,8125 rem grassetto', 'more', 'var(--font-ui)'],
];

const PAGES = ['Pagina 1', 'Pagina 2', 'Pagina 3', 'Pagina 4', 'Pagina 5'];

function Section({ title, children }) {
  return html`
    <section class="cat__section">
      <h2 class="cat__title">${title}</h2>
      ${children}
    </section>`;
}

export function CatalogoView() {
  const [large, setLarge] = useState(() => document.documentElement.classList.contains('large-text'));
  const [view, setView] = useState('settimana');
  const [page, setPage] = useState({ i: 0, dir: null });
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState('cat-salute');
  const [color, setColor] = useState(PALETTE[0].color);

  const toggleLarge = () => {
    const next = !large;
    document.documentElement.classList.toggle('large-text', next);
    setLarge(next);
  };
  const flip = (d) => setPage((p) => ({ i: (p.i + d + PAGES.length) % PAGES.length, dir: d > 0 ? 'next' : 'prev' }));

  return html`
    <div class="cat">
      <${Section} title="Testo più grande">
        <label class="switch">
          <input type="checkbox" role="switch" checked=${large} onChange=${toggleLarge} />
          <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
          <span class="switch__label">Testo più grande (+15%)</span>
        </label>
      <//>

      <${Section} title="Scala del testo">
        <div class="cat__stack">
          ${SCALE.map(([label, token, font]) => html`
            <p key=${token} style=${`font-size:var(--fs-${token});font-family:${font};${token === 'more' ? 'font-weight:700;' : ''}`}>${label}</p>`)}
        </div>
      <//>

      <${Section} title="Colori">
        <div class="cat__swatches">
          ${TOKENS.map((t) => html`
            <div class="cat__swatch" key=${t}>
              <span style=${`background:var(--${t})`}></span><code>--${t}</code>
            </div>`)}
        </div>
        <div class="cat__swatches">
          ${PALETTE.map((p) => html`
            <div class="cat__palette" key=${p.color} style=${`background:${p.color}`}>${p.name}</div>`)}
        </div>
      <//>

      <${Section} title="Rilegatura">
        <div class="cat__frame"><${Binding} /></div>
      <//>

      <${Section} title="Intestazione — Settimana e Mese">
        <div class="cat__frame">
          <${Header} view=${view} onView=${setView} onSettings=${() => showToast('Impostazioni')}
            onToday=${() => showToast('Oggi')} title="Novembre 2026" subtitle="2 – 8 nov · settimana 45"
            onPrev=${() => showToast('Settimana prima')} onNext=${() => showToast('Settimana dopo')}
            prevLabel="Settimana prima" nextLabel="Settimana dopo" />
        </div>
        <div class="cat__frame">
          <${Header} view="mese" onView=${() => {}} onSettings=${() => {}} onToday=${() => {}}
            title="Dicembre 2026" subtitle="30 nov – 6 dic · settimana 49" onPrev=${() => {}} onNext=${() => {}}
            status=${html`<${SyncDot} state="ok" />`} />
        </div>
      <//>

      <${Section} title="Intestazione — Giorno">
        <div class="cat__frame">
          <${Header} backLabel="Torna alla settimana" onBack=${() => showToast('Indietro')} onToday=${() => {}}
            title="Giovedì 5" subtitle="Oggi · novembre 2026" onPrev=${() => {}} onNext=${() => {}} />
        </div>
        <div class="cat__frame">
          <${Header} backLabel="Torna al mese" onBack=${() => {}} onToday=${() => {}}
            title="Mercoledì 30" subtitle="dicembre 2026" onPrev=${() => {}} onNext=${() => {}} />
        </div>
      <//>

      <${Section} title="Selettore">
        <div class="cat__stack">
          <${Segmented} label="Vista" options=${[{ value: 'settimana', label: 'Settimana' }, { value: 'mese', label: 'Mese' }]} value=${view} onChange=${setView} />
          <${Segmented} label="Quando" options=${[{ value: 'tutto', label: 'Tutto il giorno' }, { value: 'ora', label: 'A un orario' }]} value="ora" onChange=${() => {}} />
        </div>
      <//>

      <${Section} title="Pulsanti grandi">
        <div class="cat__stack">
          <${BigButton} label="Nuovo impegno" icon="plus" onClick=${() => showToast('Impegno salvato')} />
          <${BigButton} label="Salva impegno" onClick=${() => {}} />
          <${BigButton} label="Annulla" variant="secondary" onClick=${() => {}} />
          <${BigButton} label="Elimina questo impegno" variant="danger" onClick=${() => {}} />
          <${BigButton} label="Non disponibile" disabled />
        </div>
      <//>

      <${Section} title="Sfoglio della pagina">
        <div class="cat__flip">
          <button type="button" class="arrow" aria-label="Pagina prima" onClick=${() => flip(-1)}><${Icon} name="chevron-left" size=${32} stroke=${2.8} /></button>
          <div class="cat__flip-page">
            <${PageFlip} flipKey=${String(page.i)} dir=${page.dir}>
              <div class="cat__flip-sheet">${PAGES[page.i]}</div>
            <//>
          </div>
          <button type="button" class="arrow" aria-label="Pagina dopo" onClick=${() => flip(1)}><${Icon} name="chevron-right" size=${32} stroke=${2.8} /></button>
        </div>
      <//>

      <${Section} title="Pannello dal basso e conferma">
        <div class="cat__stack">
          <${BigButton} label="Apri un pannello" variant="secondary" onClick=${() => setSheet(true)} />
          <${BigButton} label="Chiedi conferma" variant="secondary" onClick=${() => setConfirm(true)} />
        </div>
        <${Sheet} open=${sheet} onClose=${() => setSheet(false)} title="Nuovo impegno"
          footer=${html`
            <${BigButton} label="Salva impegno" onClick=${() => { setSheet(false); showToast('Impegno salvato'); }} />
            <${BigButton} label="Annulla" variant="secondary" onClick=${() => setSheet(false)} />`}>
          <p class="cat__p">Il pannello sale dal basso. Si chiude toccando lo sfondo scuro, con Esc o trascinando giù la maniglia.</p>
          <div class="chips">
            ${BUILTIN_CATEGORIES.map((c) => html`<${CategoryChip} key=${c.id} name=${c.name} color=${c.color} selected=${c.id === selected} onClick=${() => setSelected(c.id)} />`)}
          </div>
          <${BigButton} label="Elimina questo impegno" variant="danger" onClick=${() => setConfirm(true)} />
        <//>
        <${Confirm} open=${confirm} question="Vuoi davvero eliminarlo?" detail="Modifichi e elimini l'impegno di tutti gli anni."
          yesLabel="Sì, elimina" onYes=${() => { setConfirm(false); setSheet(false); showToast('Impegno eliminato'); }}
          onNo=${() => setConfirm(false)} />
      <//>

      <${Section} title="Categorie">
        <div class="chips">
          ${BUILTIN_CATEGORIES.map((c) => html`
            <${CategoryChip} key=${c.id} name=${c.name} color=${c.color} selected=${c.id === selected} onClick=${() => setSelected(c.id)} />`)}
          <${CategoryChip} add name="Nuova" onClick=${() => showToast('Nuova categoria')} />
        </div>
      <//>

      <${Section} title="Colori della categoria">
        <${ColorPicker} value=${color} onChange=${setColor} />
        <p class="cat__p">Scelto: ${colorName(color)}</p>
      <//>

      <${Section} title="Messaggi brevi">
        <div class="cat__stack">
          <${BigButton} label="Impegno salvato" variant="secondary" onClick=${() => showToast('Impegno salvato')} />
          <${BigButton} label="Modifiche salvate" variant="secondary" onClick=${() => showToast('Modifiche salvate')} />
          <${BigButton} label="Impegno eliminato" variant="secondary" onClick=${() => showToast('Impegno eliminato')} />
        </div>
      <//>

      <${Section} title="Copia di sicurezza">
        <div class="cat__row">
          ${['ok', 'offline', 'warning'].map((s) => html`
            <span class="cat__dot" key=${s}><${SyncDot} state=${s} onClick=${() => {}} /><span>${{ ok: 'Aggiornata', offline: 'Senza rete', warning: 'Da sistemare' }[s]}</span></span>`)}
        </div>
      <//>

      <${Section} title="Icone">
        <div class="cat__row">
          ${ICON_NAMES.map((n) => html`<span class="cat__icon" key=${n}><${Icon} name=${n} size=${32} /><code>${n}</code></span>`)}
        </div>
      <//>
    </div>`;
}
