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
