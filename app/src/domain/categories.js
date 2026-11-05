/*
 * Categorie: palette e predefinite (CLAUDE.md §5, §6).
 * Fase 1: solo i dati costanti. Le regole (normName, doppioni, eliminazione) arrivano in Fase 2.
 */

/** Gli 8 colori ammessi, con il nome mostrato e letto dallo screen reader. */
export const PALETTE = [
  { color: '#B3261E', name: 'Rosso' },
  { color: '#1F5FAD', name: 'Blu' },
  { color: '#00796B', name: 'Verde acqua' },
  { color: '#4E7D1E', name: 'Verde' },
  { color: '#7A4E1D', name: 'Marrone' },
  { color: '#C2611F', name: 'Arancione' },
  { color: '#8E3B8E', name: 'Viola' },
  { color: '#4A4A4A', name: 'Grigio' },
];

export const OTHER_ID = 'cat-altro';

/** Categorie predefinite con id fissi (D4): due dispositivi non creano doppioni. */
export const BUILTIN_CATEGORIES = [
  { id: 'cat-salute', name: 'Salute', color: '#B3261E', builtin: false, order: 0 },
  { id: 'cat-famiglia', name: 'Famiglia', color: '#1F5FAD', builtin: false, order: 1 },
  { id: 'cat-casa', name: 'Casa', color: '#7A4E1D', builtin: false, order: 2 },
  { id: 'cat-pesca', name: 'Pesca', color: '#00796B', builtin: false, order: 3 },
  { id: 'cat-giardino', name: 'Giardino', color: '#4E7D1E', builtin: false, order: 4 },
  { id: OTHER_ID, name: 'Altro', color: '#4A4A4A', builtin: true, order: 999 },
];

/** Nome leggibile di un colore della palette. */
export function colorName(color) {
  const hit = PALETTE.find((p) => p.color.toLowerCase() === String(color).toLowerCase());
  return hit ? hit.name : '';
}

/* ---------- Regole (Fase 2, CLAUDE.md §7) ---------- */

export const NAME_MAX = 24;
export const CATEGORY_MESSAGES = {
  empty: 'Scrivi il nome della categoria.',
  long: 'Al massimo 24 caratteri.',
  duplicate: 'Esiste già una categoria con questo nome.',
  color: 'Scegli un colore.',
  protected: 'La categoria "Altro" non si può eliminare né rinominare.',
};

/** Nome normalizzato per i confronti: minuscolo, senza spazi in più, senza accenti. */
export function normName(name) {
  return String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ');
}

/** true se il colore è uno degli 8 della palette. */
export function isPaletteColor(color) {
  return PALETTE.some((p) => p.color.toLowerCase() === String(color ?? '').toLowerCase());
}

/** Categorie vive in ordine: per `order`, poi per nome; "Altro" sempre ultima. */
export function sortCategories(categories) {
  return categories.filter((c) => !c.deleted).slice().sort((a, b) => {
    if (a.id === OTHER_ID) return 1;
    if (b.id === OTHER_ID) return -1;
    return (a.order ?? 0) - (b.order ?? 0) || normName(a.name).localeCompare(normName(b.name), 'it');
  });
}

/**
 * Controlla nome e colore di una categoria nuova o modificata.
 * @param {{ name: string, color: string }} form
 * @param {Array<object>} categories categorie esistenti
 * @param {string} [selfId] id della categoria che si sta modificando
 * @returns {{ ok: boolean, errors: { name?: string, color?: string }, value: { name: string, normName: string, color: string } }}
 */
export function validateCategory(form, categories, selfId) {
  const errors = {};
  const name = String(form?.name ?? '').trim().replace(/\s+/g, ' ');
  const nn = normName(name);
  if (selfId === OTHER_ID) errors.name = CATEGORY_MESSAGES.protected;
  else if (!name) errors.name = CATEGORY_MESSAGES.empty;
  else if ([...name].length > NAME_MAX) errors.name = CATEGORY_MESSAGES.long;
  else if (categories.some((c) => !c.deleted && c.id !== selfId && (c.normName ?? normName(c.name)) === nn)) {
    errors.name = CATEGORY_MESSAGES.duplicate;
  }
  if (!isPaletteColor(form?.color)) errors.color = CATEGORY_MESSAGES.color;
  return { ok: Object.keys(errors).length === 0, errors, value: { name, normName: nn, color: String(form?.color ?? '').toUpperCase() } };
}

export const canDelete = (category) => Boolean(category) && category.id !== OTHER_ID && !category.builtin;
export const canRename = canDelete;

/**
 * Operazioni per eliminare una categoria: i suoi impegni passano ad "Altro", lei diventa tombstone.
 * Formato compatibile con repo.batch.
 * @returns {Array<{ entity: string, id: string, patch: object }>}
 */
export function deleteCategoryOps(categoryId, events) {
  if (categoryId === OTHER_ID) throw new Error(CATEGORY_MESSAGES.protected);
  return [
    ...events.filter((e) => !e.deleted && e.categoryId === categoryId)
      .map((e) => ({ entity: 'event', id: e.id, patch: { categoryId: OTHER_ID } })),
    { entity: 'category', id: categoryId, patch: { deleted: true } },
  ];
}

/** Categoria di un impegno; se manca o è eliminata, "Altro". */
export function categoryOf(categoryId, categories) {
  const live = categories.filter((c) => !c.deleted);
  return live.find((c) => c.id === categoryId) ?? live.find((c) => c.id === OTHER_ID)
    ?? BUILTIN_CATEGORIES.find((c) => c.id === OTHER_ID);
}
