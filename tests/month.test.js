import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekFromMonth, startOfWeek } from '../app/src/domain/dates.js';
import { monthBars } from '../app/src/domain/events.js';

test('da Mese a Settimana: settimana di oggi nel mese corrente, altrimenti la prima del mese', () => {
  assert.equal(weekFromMonth('2026-11-01', '2026-11-05'), '2026-11-05');
  assert.equal(weekFromMonth('2026-12-01', '2026-11-05'), '2026-12-01');
  assert.equal(startOfWeek(weekFromMonth('2026-11-01', '2026-10-20')), '2026-10-26'); // l'1 novembre è domenica
  assert.equal(weekFromMonth('2027-11-01', '2026-11-05'), '2027-11-01');
});

test('monthBars: annuali e impegni fuori mese visibili nella griglia', () => {
  const events = [
    { id: 'a', title: 'Compleanno', date: '2025-11-30', time: '', categoryId: 'cat-famiglia', repeat: 'yearly', deleted: false },
    { id: 'b', title: 'Pesca', date: '2026-12-06', time: '', categoryId: 'cat-pesca', repeat: 'none', deleted: false },
    { id: 'c', title: 'Eliminato', date: '2026-11-10', time: '', categoryId: 'cat-casa', repeat: 'none', deleted: true },
  ];
  const bars = monthBars(events, 2026, 11);
  assert.deepEqual(bars['2026-11-30'].bars, [{ eventId: 'a', categoryId: 'cat-famiglia' }]);
  assert.equal(bars['2026-12-06'].count, 1); // ultima cella della griglia di novembre
  assert.equal(bars['2026-11-10'].count, 0);
});
