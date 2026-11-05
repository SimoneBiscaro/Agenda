import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normName, validateCategory, deleteCategoryOps, canDelete, canRename, sortCategories, categoryOf,
  isPaletteColor, BUILTIN_CATEGORIES, OTHER_ID, CATEGORY_MESSAGES, PALETTE,
} from '../app/src/domain/categories.js';

const cats = BUILTIN_CATEGORIES.map((c) => ({ ...c, entity: 'category', normName: normName(c.name), deleted: false }));

test('normName: minuscolo, trim, spazi singoli, senza accenti', () => {
  assert.equal(normName('  Città   di  Mare '), 'citta di mare');
  assert.equal(normName('CAFFÈ'), 'caffe');
  assert.equal(normName('Perché\tnò'), 'perche no');
  assert.equal(normName(''), '');
  assert.equal(normName(null), '');
});

test('nome duplicato con accenti diversi rifiutato', () => {
  const list = [...cats, { id: 'c1', entity: 'category', name: 'Caffè', normName: 'caffe', color: '#8E3B8E' }];
  const r = validateCategory({ name: 'caffe\'', color: '#8E3B8E' }, list);
  assert.equal(r.ok, true); // l'apostrofo lo rende diverso
  for (const name of ['Caffe', 'CAFFÉ', '  caffè  ', 'Càffé']) {
    assert.equal(validateCategory({ name, color: '#8E3B8E' }, list).errors.name, 'Esiste già una categoria con questo nome.', name);
  }
  assert.equal(validateCategory({ name: 'Salùte', color: '#B3261E' }, list).errors.name, CATEGORY_MESSAGES.duplicate);
  // rinominare se stessa con un'altra grafia è permesso
  assert.equal(validateCategory({ name: 'CAFFÈ', color: '#8E3B8E' }, list, 'c1').ok, true);
  // una categoria eliminata non blocca il nome
  const deleted = list.map((c) => (c.id === 'c1' ? { ...c, deleted: true } : c));
  assert.equal(validateCategory({ name: 'Caffè', color: '#8E3B8E' }, deleted).ok, true);
});

test('validateCategory: vuoto, troppo lungo, colore fuori palette', () => {
  assert.equal(validateCategory({ name: '   ', color: '#B3261E' }, cats).errors.name, CATEGORY_MESSAGES.empty);
  assert.equal(validateCategory({ name: 'x'.repeat(25), color: '#B3261E' }, cats).errors.name, CATEGORY_MESSAGES.long);
  assert.equal(validateCategory({ name: 'x'.repeat(24), color: '#b3261e' }, cats).ok, true);
  assert.equal(validateCategory({ name: 'Bocce', color: '#123456' }, cats).errors.color, CATEGORY_MESSAGES.color);
  const v = validateCategory({ name: '  Bocce   con  amici ', color: '#4e7d1e' }, cats).value;
  assert.deepEqual(v, { name: 'Bocce con amici', normName: 'bocce con amici', color: '#4E7D1E' });
  assert.ok(PALETTE.every((p) => isPaletteColor(p.color)));
});

test('"Altro" non si elimina né si rinomina', () => {
  const altro = cats.find((c) => c.id === OTHER_ID);
  const salute = cats.find((c) => c.id === 'cat-salute');
  assert.equal(canDelete(altro), false);
  assert.equal(canRename(altro), false);
  assert.equal(canDelete(salute), true);
  assert.equal(canRename(salute), true);
  assert.equal(validateCategory({ name: 'Varie', color: '#4A4A4A' }, cats, OTHER_ID).ok, false);
  assert.throws(() => deleteCategoryOps(OTHER_ID, []));
});

test('eliminazione di una categoria: i suoi impegni passano a cat-altro', () => {
  const events = [
    { id: 'e1', entity: 'event', categoryId: 'cat-pesca', deleted: false },
    { id: 'e2', entity: 'event', categoryId: 'cat-pesca', deleted: true },
    { id: 'e3', entity: 'event', categoryId: 'cat-casa', deleted: false },
    { id: 'e4', entity: 'event', categoryId: 'cat-pesca', deleted: false },
  ];
  assert.deepEqual(deleteCategoryOps('cat-pesca', events), [
    { entity: 'event', id: 'e1', patch: { categoryId: 'cat-altro' } },
    { entity: 'event', id: 'e4', patch: { categoryId: 'cat-altro' } },
    { entity: 'category', id: 'cat-pesca', patch: { deleted: true } },
  ]);
});

test('ordine delle categorie e categoria di un impegno', () => {
  const extra = { id: 'c9', name: 'Bocce', order: 5, deleted: false };
  const sorted = sortCategories([cats[5], extra, ...cats.slice(0, 5)]);
  assert.equal(sorted.at(-1).id, OTHER_ID);
  assert.deepEqual(sorted.slice(0, 2).map((c) => c.id), ['cat-salute', 'cat-famiglia']);
  assert.equal(categoryOf('cat-casa', cats).name, 'Casa');
  assert.equal(categoryOf('sparita', cats).id, OTHER_ID);
  assert.equal(categoryOf('cat-casa', cats.map((c) => (c.id === 'cat-casa' ? { ...c, deleted: true } : c))).id, OTHER_ID);
});

test('categorie predefinite con id fissi (§6)', () => {
  assert.deepEqual(BUILTIN_CATEGORIES.map((c) => `${c.id} ${c.name} ${c.color}`), [
    'cat-salute Salute #B3261E', 'cat-famiglia Famiglia #1F5FAD', 'cat-casa Casa #7A4E1D',
    'cat-pesca Pesca #00796B', 'cat-giardino Giardino #4E7D1E', 'cat-altro Altro #4A4A4A',
  ]);
  assert.deepEqual(BUILTIN_CATEGORIES.filter((c) => c.builtin).map((c) => c.id), [OTHER_ID]);
});
