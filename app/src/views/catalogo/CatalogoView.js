import { useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { useSignal } from '../../store/state.js';
import { largeText, setLargeText } from '../../store/settings.js';
import { Binding } from '../../ui/Binding.js';
import { Header } from '../../ui/Header.js';
import { Segmented } from '../../ui/Segmented.js';
import { BigButton } from '../../ui/BigButton.js';
import { PageFlip } from '../../ui/PageFlip.js';
import { Sheet } from '../../ui/Sheet.js';
import { Confirm } from '../../ui/Confirm.js';
import { CategoryChip, AddChip } from '../../ui/CategoryChip.js';
import { ColorPicker, PALETTE } from '../../ui/ColorPicker.js';
import { showToast } from '../../ui/Toast.js';
import { SyncDot, SYNC_LABELS } from '../../ui/SyncDot.js';
import { Icon, ICON_NAMES } from '../../ui/icons.js';
import { SwitchRow } from '../impostazioni/ImpostazioniView.js';
import { SettimanaView } from '../settimana/SettimanaView.js';
import { MeseView } from '../mese/MeseView.js';
import { GiornoView } from '../giorno/GiornoView.js';
import { dayLabel, longDate, monthLabel, step, weekLabel } from '../../domain/dates.js';

/** Le categorie predefinite (§6), qui solo per mostrare le pastiglie. */
const SAMPLE_CATEGORIES = [
  { id: 'cat-salute', name: 'Salute', color: '#B3261E' },
  { id: 'cat-famiglia', name: 'Famiglia', color: '#1F5FAD' },
  { id: 'cat-casa', name: 'Casa', color: '#7A4E1D' },
  { id: 'cat-pesca', name: 'Pesca', color: '#00796B' },
  { id: 'cat-giardino', name: 'Giardino', color: '#4E7D1E' },
  { id: 'cat-altro', name: 'Altro', color: '#4A4A4A' },
];

const TOKENS = ['--paper', '--paper-2', '--paper-weekend', '--today', '--line', '--field-border', '--white',
  '--ink', '--ink-2', '--ink-3', '--binding', '--ribbon', '--ribbon-dark', '--ribbon-tint', '--focus'];

const TYPE_SCALE = [
  ['Titolo pagina · 1,75 rem', 'var(--fs-page-title)', 'var(--font-title)', 600],
  ['Numero giorno · 1,875 rem', 'var(--fs-week-day)', 'var(--font-title)', 600],
  ['Titolo sheet · 1,625 rem', 'var(--fs-sheet-title)', 'var(--font-title)', 600],
  ['Pulsante principale · 1,375 rem', 'var(--fs-main-button)', 'var(--font-ui)', 700],
  ['Testo impegno · 1,125 rem', 'var(--fs-event)', 'var(--font-ui)', 400],
  ['Etichetta · 1 rem', 'var(--fs-label)', 'var(--font-ui)', 700],
  ['+2 nel mese · 0,8125 rem', 'var(--fs-more)', 'var(--font-ui)', 700],
];

const noop = () => {};

/** #/catalogo — ogni componente in tutti i suoi stati. Solo sviluppo, non linkato dall'app. */
export function CatalogoView({ today }) {
  const large = useSignal(largeText);
  const [seg, setSeg] = useState('settimana');
  const [flip, setFlip] = useState({ ds: today, dir: 0 });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cat, setCat] = useState('cat-salute');
  const [color, setColor] = useState(PALETTE[0].color);
  const [sw, setSw] = useState(true);
  const wl = weekLabel(today);
  const dl = dayLabel(today, today);

  return html`<div class="plain catalog">
    <p class="muted">Pagina di sviluppo: tutti i componenti dell’Agenda, in tutti gli stati.</p>

    <section aria-labelledby="c-scala">
      <h2 id="c-scala">Scala del testo</h2>
      <${SwitchRow} label="Testo più grande (+15%)" checked=${large} onChange=${setLargeText} />
      <div class="type-specimen">
        ${TYPE_SCALE.map(([label, size, family, weight]) => html`<p key=${label}
          style=${`font-size:${size};font-family:${family};font-weight:${weight};line-height:1.2`}>${label}</p>`)}
      </div>
    </section>

    <section aria-labelledby="c-colori">
      <h2 id="c-colori">Colori</h2>
      <div class="catalog__stack">
        ${TOKENS.map((t) => html`<div key=${t} class="catalog__token">
          <span class="catalog__chipcolor" style=${`background:var(${t})`}></span><code>${t}</code></div>`)}
      </div>
      <h3>Palette delle categorie (testo bianco sopra)</h3>
      <div class="catalog__stack">
        ${PALETTE.map((p) => html`<div key=${p.color} class="catalog__swatch" style=${`background:${p.color}`}>${p.name} · ${p.color}</div>`)}
      </div>
    </section>

    <section aria-labelledby="c-rilegatura">
      <h2 id="c-rilegatura">Rilegatura</h2>
      <div class="catalog__frame"><${Binding} /></div>
    </section>

    <section aria-labelledby="c-header">
      <h2 id="c-header">Intestazione</h2>
      <h3>Normale · Settimana</h3>
      <div class="catalog__frame catalog__frame--bleed">
        <${Header} view="settimana" onView=${noop} onToday=${noop} onSettings=${noop}
          title=${wl.title} subtitle=${wl.subtitle} onPrev=${noop} onNext=${noop}
          prevLabel="Settimana precedente" nextLabel="Settimana successiva" />
      </div>
      <h3>Normale · Mese, con puntino della copia</h3>
      <div class="catalog__frame catalog__frame--bleed">
        <${Header} view="mese" onView=${noop} onToday=${noop} onSettings=${noop} syncState="ok" onSync=${noop}
          title=${monthLabel(today)} onPrev=${noop} onNext=${noop}
          prevLabel="Mese precedente" nextLabel="Mese successivo" />
      </div>
      <h3>Giorno</h3>
      <div class="catalog__frame catalog__frame--bleed">
        <${Header} variant="day" backLabel="Torna alla settimana" onBack=${noop} onToday=${noop}
          title=${dl.title} subtitle=${dl.subtitle} onPrev=${noop} onNext=${noop}
          prevLabel="Giorno precedente" nextLabel="Giorno successivo" />
      </div>
    </section>

    <section aria-labelledby="c-seg">
      <h2 id="c-seg">Selettore</h2>
      <div class="catalog__stack">
        <${Segmented} label="Vista" value=${seg} onChange=${setSeg}
          options=${[{ value: 'settimana', label: 'Settimana' }, { value: 'mese', label: 'Mese' }]} />
        <p class="muted">Scelta attuale: ${seg === 'settimana' ? 'Settimana' : 'Mese'}</p>
      </div>
    </section>

    <section aria-labelledby="c-btn">
      <h2 id="c-btn">Pulsanti</h2>
      <div class="catalog__stack">
        <${BigButton} label="Nuovo impegno" onClick=${() => showToast('Pulsante principale toccato')} />
        <${BigButton} label="Salva impegno" icon=${null} onClick=${noop} />
        <${BigButton} label="Pulsante disattivato" disabled=${true} onClick=${noop} />
        <button type="button" class="btn btn--secondary btn--block">Annulla</button>
        <button type="button" class="btn btn--danger btn--block">Elimina questo impegno</button>
        <button type="button" class="btn btn--text"><${Icon} name="back" /><span>Torna alla settimana</span></button>
        <button type="button" class="btn btn--secondary" disabled>Secondario disattivato</button>
        <div class="catalog__wrap">
          <button type="button" class="icon-btn" aria-label="Impostazioni"><${Icon} name="gear" /></button>
          <button type="button" class="header__arrow" aria-label="Indietro"><${Icon} name="chevron-left" /></button>
          <button type="button" class="header__arrow" aria-label="Avanti"><${Icon} name="chevron-right" /></button>
        </div>
      </div>
    </section>

    <section aria-labelledby="c-switch">
      <h2 id="c-switch">Interruttore</h2>
      <${SwitchRow} label="Si ripete ogni anno" checked=${sw} onChange=${setSw} />
      <${SwitchRow} label="Spento" checked=${false} onChange=${noop} />
    </section>

    <section aria-labelledby="c-flip">
      <h2 id="c-flip">Sfoglio della pagina</h2>
      <div class="catalog__wrap">
        <button type="button" class="btn btn--secondary" onClick=${() => setFlip((f) => ({ ds: step('giorno', f.ds, -1), dir: -1 }))}>‹ Indietro</button>
        <button type="button" class="btn btn--secondary" onClick=${() => setFlip((f) => ({ ds: step('giorno', f.ds, 1), dir: 1 }))}>Avanti ›</button>
      </div>
      <div class="catalog__frame" style="margin-top:10px">
        <${PageFlip} pageKey=${flip.ds} dir=${flip.dir}>
          <div style="padding:32px 16px;text-align:center;font-family:var(--font-title);font-size:var(--fs-page-title)">${longDate(flip.ds)}</div>
        </${PageFlip}>
      </div>
      <p class="muted" style="margin-top:6px">Con “Riduci movimento” attivo la pagina cambia senza animazione.</p>
    </section>

    <section aria-labelledby="c-sheet">
      <h2 id="c-sheet">Pannello dal basso e conferma</h2>
      <div class="catalog__stack">
        <button type="button" class="btn btn--secondary btn--block" onClick=${() => setSheetOpen(true)}>Apri il pannello</button>
        <button type="button" class="btn btn--danger btn--block" onClick=${() => setConfirmOpen(true)}>Apri la conferma</button>
      </div>
      <${Sheet} open=${sheetOpen} onClose=${() => setSheetOpen(false)} title="Nuovo impegno"
        footer=${html`
          <${BigButton} label="Salva impegno" icon=${null} onClick=${() => { setSheetOpen(false); showToast('Impegno salvato'); }} />
          <button type="button" class="btn btn--secondary btn--block" onClick=${() => setSheetOpen(false)}>Annulla</button>`}>
        <p class="confirm__question">Il pannello sale dal basso. Si chiude toccando lo sfondo scuro, con Esc o trascinando giù la maniglia.</p>
      </${Sheet}>
      <${Confirm} open=${confirmOpen} question="Vuoi davvero eliminarlo?" yesLabel="Sì, elimina"
        onYes=${() => { setConfirmOpen(false); showToast('Impegno eliminato'); }} onNo=${() => setConfirmOpen(false)} />
    </section>

    <section aria-labelledby="c-chip">
      <h2 id="c-chip">Pastiglie delle categorie</h2>
      <div class="chips">
        ${SAMPLE_CATEGORIES.map((c) => html`<${CategoryChip} key=${c.id} name=${c.name} color=${c.color}
          selected=${cat === c.id} onClick=${() => setCat(c.id)} />`)}
        <${AddChip} onClick=${() => showToast('Nuova categoria')} />
      </div>
    </section>

    <section aria-labelledby="c-color">
      <h2 id="c-color">Scelta del colore</h2>
      <${ColorPicker} value=${color} onChange=${setColor} />
      <p class="muted" style="margin-top:8px">Scelto: ${PALETTE.find((p) => p.color === color)?.name}</p>
    </section>

    <section aria-labelledby="c-toast">
      <h2 id="c-toast">Messaggi brevi</h2>
      <div class="catalog__stack">
        ${['Impegno salvato', 'Modifiche salvate', 'Impegno eliminato'].map((m) => html`<button key=${m} type="button"
          class="btn btn--secondary btn--block" onClick=${() => showToast(m)}>${m}</button>`)}
      </div>
    </section>

    <section aria-labelledby="c-sync">
      <h2 id="c-sync">Puntino della copia di sicurezza</h2>
      <div class="catalog__stack">
        ${['ok', 'offline', 'attention'].map((s) => html`<div key=${s} class="catalog__token">
          <${SyncDot} state=${s} onClick=${() => showToast(SYNC_LABELS[s])} /><span>${SYNC_LABELS[s]}</span></div>`)}
      </div>
    </section>

    <section aria-labelledby="c-icons">
      <h2 id="c-icons">Icone</h2>
      <div class="catalog__wrap">
        ${ICON_NAMES.map((n) => html`<div key=${n} class="catalog__icon"><${Icon} name=${n} /><code>${n}</code></div>`)}
      </div>
    </section>

    <section aria-labelledby="c-week">
      <h2 id="c-week">Righe della settimana (normale, oggi, sabato e domenica)</h2>
      <div class="catalog__frame"><${SettimanaView} anchor=${today} today=${today} onOpenDay=${(ds) => showToast(longDate(ds))} /></div>
    </section>

    <section aria-labelledby="c-month">
      <h2 id="c-month">Griglia del mese</h2>
      <div class="catalog__frame"><${MeseView} anchor=${today.slice(0, 7)} today=${today} onOpenDay=${(ds) => showToast(longDate(ds))} /></div>
    </section>

    <section aria-labelledby="c-day">
      <h2 id="c-day">Righe del giorno</h2>
      <div class="catalog__frame"><${GiornoView} anchor=${step('giorno', today, 1)} today=${today} nowHour=${9} /></div>
    </section>
  </div>`;
}
