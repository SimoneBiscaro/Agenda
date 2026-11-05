import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, pathFor, todayDs } from '../app/src/router.js';

test('parseHash riconosce le rotte di §8', () => {
  assert.deepEqual(parseHash('#/settimana/2026-11-05'), { view: 'settimana', anchor: '2026-11-05' });
  assert.deepEqual(parseHash('#/mese/2026-11'), { view: 'mese', anchor: '2026-11-01' });
  assert.deepEqual(parseHash('#/giorno/2028-02-29'), { view: 'giorno', anchor: '2028-02-29' });
  assert.deepEqual(parseHash('#/impostazioni'), { view: 'impostazioni' });
  assert.deepEqual(parseHash('#/catalogo'), { view: 'catalogo' });
});

test('parseHash rifiuta rotte e date non valide', () => {
  for (const h of ['', '#/', '#/oggi', '#/settimana', '#/settimana/2026-02-30', '#/giorno/2027-02-29',
    '#/mese/2026-13', '#/mese/2026-11-05', '#/impostazioni/altro', '#/giorno/05-11-2026']) {
    assert.equal(parseHash(h), null, h);
  }
});

test('pathFor costruisce il percorso giusto', () => {
  assert.equal(pathFor('settimana', '2026-11-05'), '/settimana/2026-11-05');
  assert.equal(pathFor('mese', '2026-11-01'), '/mese/2026-11');
  assert.equal(pathFor('giorno', '2026-11-05'), '/giorno/2026-11-05');
  assert.equal(pathFor('impostazioni'), '/impostazioni');
});

test('todayDs usa il fuso Europe/Rome', () => {
  assert.equal(todayDs(new Date('2026-11-05T22:59:00Z')), '2026-11-05');
  assert.equal(todayDs(new Date('2026-11-05T23:00:00Z')), '2026-11-06'); // mezzanotte a Roma (CET)
  assert.equal(todayDs(new Date('2026-07-31T22:00:00Z')), '2026-08-01'); // ora legale (CEST)
});
