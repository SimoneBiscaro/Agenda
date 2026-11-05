import { useRef, useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Sheet } from '../../ui/Sheet.js';
import { Segmented } from '../../ui/Segmented.js';
import { BigButton } from '../../ui/BigButton.js';
import { CategoryChip } from '../../ui/CategoryChip.js';
import { ColorPicker } from '../../ui/ColorPicker.js';
import { Confirm } from '../../ui/Confirm.js';
import { showToast } from '../../ui/Toast.js';
import { getRepo } from '../../store/repo.js';
import { isValidDs, longDate } from '../../domain/dates.js';
import { validate } from '../../domain/events.js';
import { OTHER_ID, PALETTE, sortCategories, validateCategory } from '../../domain/categories.js';

const WHEN = [
  { value: 'allday', label: 'Tutto il giorno' },
  { value: 'time', label: 'A un orario' },
];

/** Errore sotto il campo, letto subito dagli screen reader. */
const FieldError = ({ id, text }) => (text ? html`<p class="field__error" id=${id} role="alert">${text}</p>` : null);

/** Primo colore della palette non ancora usato (o il primo, se sono tutti usati). */
function freeColor(categories) {
  const used = new Set(categories.filter((c) => !c.deleted).map((c) => String(c.color).toUpperCase()));
  return (PALETTE.find((p) => !used.has(p.color.toUpperCase())) ?? PALETTE[0]).color;
}

/**
 * Pannello "Nuovo impegno" / "Modifica impegno" (§8).
 * @param {{ open: boolean, mode: 'new'|'edit', initial: object, event?: object, categories: object[], onClose: () => void }} props
 */
export function ImpegnoSheet({ open, mode, initial, event, categories, onClose }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [newCat, setNewCat] = useState(null); // { name, color } mentre si crea una categoria
  const [catErrors, setCatErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  const editing = mode === 'edit';
  const yearly = editing && event?.repeat === 'yearly';
  const cats = sortCategories(categories);
  const selectedId = cats.some((c) => c.id === form.categoryId) ? form.categoryId : OTHER_ID;
  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k === 'timeMode' ? 'time' : k];
      return next;
    });
  };

  const focusFirstError = (errs) => {
    const field = ['title', 'date', 'time'].find((k) => errs[k]);
    if (field) setTimeout(() => bodyRef.current?.querySelector(`[name="${field}"]`)?.focus(), 0);
  };

  async function save() {
    if (busy) return;
    const r = validate({ ...form, categoryId: selectedId });
    if (!r.ok) {
      setErrors(r.errors);
      focusFirstError(r.errors);
      return;
    }
    setBusy(true);
    try {
      const repo = await getRepo();
      const fields = { title: r.value.title, date: r.value.date, time: r.value.time, categoryId: r.value.categoryId, repeat: r.value.repeat };
      if (editing) await repo.update('event', event.id, fields);
      else await repo.create('event', fields);
      showToast(editing ? 'Modifiche salvate' : 'Impegno salvato');
      onClose();
    } catch {
      showToast('Non è stato salvato. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setConfirm(false);
    try {
      const repo = await getRepo();
      await repo.softDelete('event', event.id);
      showToast('Impegno eliminato');
      onClose();
    } catch {
      showToast('Non è stato eliminato. Riprova.');
    }
  }

  async function addCategory() {
    const r = validateCategory(newCat, categories);
    if (!r.ok) {
      setCatErrors(r.errors);
      setTimeout(() => bodyRef.current?.querySelector('[name="catName"]')?.focus(), 0);
      return;
    }
    try {
      const repo = await getRepo();
      const order = Math.max(0, ...categories.filter((c) => c.id !== OTHER_ID).map((c) => c.order ?? 0)) + 1;
      const created = await repo.create('category', { ...r.value, builtin: false, order });
      set({ categoryId: created.id });
      setNewCat(null);
      setCatErrors({});
    } catch {
      setCatErrors({ name: 'Non è stata aggiunta. Riprova.' });
    }
  }

  const err = (k) => (errors[k] ? `err-${k}` : undefined);

  return html`
    <${Sheet} open=${open} onClose=${onClose} title=${editing ? 'Modifica impegno' : 'Nuovo impegno'}
      footer=${html`
        ${yearly && html`<p class="ev-form__note">Modifichi e elimini l'impegno di tutti gli anni.</p>`}
        <${BigButton} label=${editing ? 'Salva le modifiche' : 'Salva impegno'} onClick=${save} disabled=${busy} />
        <${BigButton} label="Annulla" variant="secondary" onClick=${onClose} />`}>
      <div class="ev-form" ref=${bodyRef}>
        <div class="field">
          <label class="field__label" for="ev-title">Che cosa?</label>
          <input id="ev-title" name="title" class="field__input field__input--big" type="text" value=${form.title}
            enterkeyhint="done" autocomplete="off" autocapitalize="sentences"
            aria-invalid=${errors.title ? 'true' : 'false'} aria-describedby=${err('title')}
            onInput=${(e) => set({ title: e.currentTarget.value })}
            onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
          <${FieldError} id="err-title" text=${errors.title} />
        </div>

        <div class="field">
          <label class="field__label" for="ev-date">Quale giorno?</label>
          <p class="ev-form__longdate" aria-hidden="true">${isValidDs(form.date) ? longDate(form.date) : 'Nessun giorno scelto'}</p>
          <input id="ev-date" name="date" class="field__input" type="date" value=${form.date}
            aria-invalid=${errors.date ? 'true' : 'false'} aria-describedby=${err('date')}
            onInput=${(e) => set({ date: e.currentTarget.value })} onChange=${(e) => set({ date: e.currentTarget.value })} />
          <${FieldError} id="err-date" text=${errors.date} />
        </div>

        <div class="field">
          <span class="field__label" id="ev-when">A che ora?</span>
          <${Segmented} label="A che ora?" options=${WHEN} value=${form.timeMode} onChange=${(v) => set({ timeMode: v })} />
          ${form.timeMode === 'time' && html`
            <label class="sr-only" for="ev-time">Ora</label>
            <input id="ev-time" name="time" class="field__input field__input--time" type="time" step="300" value=${form.time}
              aria-invalid=${errors.time ? 'true' : 'false'} aria-describedby=${err('time')}
              onInput=${(e) => set({ time: e.currentTarget.value })} onChange=${(e) => set({ time: e.currentTarget.value })} />`}
          <${FieldError} id="err-time" text=${errors.time} />
        </div>

        <label class="switch">
          <input type="checkbox" role="switch" checked=${form.repeat === 'yearly'}
            onChange=${(e) => set({ repeat: e.currentTarget.checked ? 'yearly' : 'none' })} />
          <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
          <span class="switch__label">Si ripete ogni anno<span class="switch__hint">compleanni, anniversari</span></span>
        </label>

        <div class="field" role="group" aria-labelledby="ev-cat">
          <span class="field__label" id="ev-cat">Categoria</span>
          <div class="chips">
            ${cats.map((c) => html`<${CategoryChip} key=${c.id} name=${c.name} color=${c.color}
              selected=${c.id === selectedId} onClick=${() => set({ categoryId: c.id })} />`)}
            ${!newCat && html`<${CategoryChip} add name="Nuova" onClick=${() => { setNewCat({ name: '', color: freeColor(categories) }); setCatErrors({}); setTimeout(() => bodyRef.current?.querySelector('[name="catName"]')?.focus(), 0); }} />`}
          </div>
          ${newCat && html`
            <div class="newcat">
              <label class="field__label" for="ev-catname">Nome della nuova categoria</label>
              <input id="ev-catname" name="catName" class="field__input" type="text" value=${newCat.name}
                enterkeyhint="done" autocomplete="off" aria-invalid=${catErrors.name ? 'true' : 'false'}
                aria-describedby=${catErrors.name ? 'err-catname' : undefined}
                onInput=${(e) => { setNewCat({ ...newCat, name: e.currentTarget.value }); setCatErrors({}); }}
                onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }} />
              <${FieldError} id="err-catname" text=${catErrors.name} />
              <span class="field__label">Colore</span>
              <${ColorPicker} value=${newCat.color} label="Colore della nuova categoria"
                onChange=${(color) => { setNewCat({ ...newCat, color }); setCatErrors({}); }} />
              <${FieldError} id="err-catcolor" text=${catErrors.color} />
              <div class="newcat__actions">
                <button type="button" class="btn btn--primary" onClick=${addCategory}>Aggiungi la categoria</button>
                <button type="button" class="btn btn--secondary" onClick=${() => { setNewCat(null); setCatErrors({}); }}>Annulla</button>
              </div>
            </div>`}
        </div>

        ${editing && html`
          <div class="ev-form__delete">
            <${BigButton} label="Elimina questo impegno" variant="danger" onClick=${() => setConfirm(true)} />
          </div>`}
      </div>
    <//>
    ${editing && html`
      <${Confirm} open=${confirm} question="Vuoi davvero eliminarlo?"
        detail=${yearly ? 'Si elimina l’impegno di tutti gli anni.' : event?.title}
        yesLabel="Sì, elimina" onYes=${remove} onNo=${() => setConfirm(false)} />`}`;
}
