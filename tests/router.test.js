import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, toHash } from '../app/src/router.js';

test('rotte valide di §8', () => {
  assert.deepEqual(parseHash('#/settimana/2026-11-05'), { view: 'settimana', anchor: '2026-11-05' });
  assert.deepEqual(parseHash('#/mese/2026-11'), { view: 'mese', anchor: '2026-11' });
  assert.deepEqual(parseHash('#/giorno/2026-02-28'), { view: 'giorno', anchor: '2026-02-28' });
  assert.deepEqual(parseHash('#/impostazioni'), { view: 'impostazioni', anchor: null });
  assert.deepEqual(parseHash('#/catalogo'), { view: 'catalogo', anchor: null });
});

test('rotte non valide → null', () => {
  for (const h of ['', '#/', '#/settimana', '#/giorno/2026-02-30', '#/mese/2026-13', '#/mese/2026-11-01',
    '#/impostazioni/altro', '#/oggi', '#/settimana/2026-11-05/x']) {
    assert.equal(parseHash(h), null, h);
  }
});

test('toHash è l\'inverso di parseHash', () => {
  for (const h of ['#/settimana/2026-11-05', '#/mese/2026-11', '#/giorno/2026-11-05', '#/impostazioni']) {
    assert.equal(toHash(parseHash(h)), h);
  }
});
