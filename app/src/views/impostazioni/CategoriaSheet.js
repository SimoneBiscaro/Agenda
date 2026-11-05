import { useState } from '../../../vendor/preact-hooks.mjs';
import { html } from '../../ui/html.js';
import { Sheet } from '../../ui/Sheet.js';
import { BigButton } from '../../ui/BigButton.js';
import { ColorPicker } from '../../ui/ColorPicker.js';
import { Confirm } from '../../ui/Confirm.js';
import { showToast } from '../../ui/Toast.js';
import { getRepo } from '../../store/repo.js';
import { OTHER_ID, PALETTE, deleteCategoryOps, validateCategory } from '../../domain/categories.js';

/** Primo colore della palette non ancora usato (o il primo, se sono tutti usati). */
function freeColor(categories) {
  const used = new Set(categories.filter((c) => !c.deleted).map((c) => String(c.color).toUpperCase()));
  return (PALETTE.find((p) => !used.has(p.color.toUpperCase())) ?? PALETTE[0]).color;
}

/**
 * Pannello "Nuova categoria" / "Modifica categoria": nome, colore, eliminazione con conferma.
 * "Altro" non arriva mai qui: non si rinomina né si elimina.
 * @param {{ open: boolean, category?: object, categories: object[], events: object[], onClose: () => void }} props
 */
export function CategoriaSheet({ open, category, categories, events, onClose }) {
  const editing = Boolean(category);
  const [form, setForm] = useState(() => ({ name: category?.name ?? '', color: category?.color ?? freeColor(categories) }));
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = editing ? events.filter((e) => !e.deleted && e.categoryId === category.id).length : 0;

  async function save() {
    if (busy) return;
    const r = validateCategory(form, categories, category?.id);
    if (!r.ok) {
      setErrors(r.errors);
      if (r.errors.name) setTimeout(() => document.getElementById('cat-name')?.focus(), 0);
      return;
    }
    setBusy(true);
    try {
      const repo = await getRepo();
      if (editing) {
        await repo.update('category', category.id, r.value);
      } else {
        const order = Math.max(0, ...categories.filter((c) => c.id !== OTHER_ID).map((c) => c.order ?? 0)) + 1;
        await repo.create('category', { ...r.value, builtin: false, order });
      }
      showToast(editing ? 'Categoria salvata' : 'Categoria aggiunta');
      onClose();
    } catch {
      showToast('Non è stata salvata. Riprova.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setConfirm(false);
    try {
      const repo = await getRepo();
      await repo.batch(deleteCategoryOps(category.id, events));
      showToast('Categoria eliminata');
      onClose();
    } catch {
      showToast('Non è stata eliminata. Riprova.');
    }
  }

  return html`
    <${Sheet} open=${open} onClose=${onClose} title=${editing ? 'Modifica categoria' : 'Nuova categoria'}
      footer=${html`
        <${BigButton} label=${editing ? 'Salva le modifiche' : 'Aggiungi la categoria'} onClick=${save} disabled=${busy} />
        <${BigButton} label="Annulla" variant="secondary" onClick=${onClose} />`}>
      <div class="ev-form">
        <div class="field">
          <label class="field__label" for="cat-name">Nome</label>
          <input id="cat-name" class="field__input field__input--big" type="text" value=${form.name}
            enterkeyhint="done" autocomplete="off" autocapitalize="sentences"
            aria-invalid=${errors.name ? 'true' : 'false'} aria-describedby=${errors.name ? 'err-cat-name' : undefined}
            onInput=${(e) => { setForm({ ...form, name: e.currentTarget.value }); setErrors({}); }}
            onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }} />
          ${errors.name && html`<p class="field__error" id="err-cat-name" role="alert">${errors.name}</p>`}
        </div>
        <div class="field">
          <span class="field__label">Colore</span>
          <${ColorPicker} value=${form.color} label="Colore della categoria"
            onChange=${(color) => { setForm({ ...form, color }); setErrors({}); }} />
          ${errors.color && html`<p class="field__error" role="alert">${errors.color}</p>`}
        </div>
        ${editing && html`
          <div class="ev-form__delete">
            <${BigButton} label="Elimina questa categoria" variant="danger" onClick=${() => setConfirm(true)} />
          </div>`}
      </div>
    <//>
    ${editing && html`
      <${Confirm} open=${confirm} question=${`Eliminare la categoria "${category.name}"?`}
        detail=${`Gli impegni di questa categoria passeranno in Altro.${count ? ` (${count === 1 ? '1 impegno' : `${count} impegni`})` : ''}`}
        yesLabel="Sì, elimina" onYes=${remove} onNo=${() => setConfirm(false)} />`}`;
}
