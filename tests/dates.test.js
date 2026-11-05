// Fase 1: solo ciò che serve a titoli e frecce. La Fase 2 aggiunge i casi limite di §7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayLabel, isoWeek, monthGrid, monthLabel, startOfWeek, step, todayIn, weekLabel } from '../app/src/domain/dates.js';

test('weekLabel: titolo dal giovedì, sottotitolo con intervallo e settimana ISO', () => {
  assert.deepEqual(weekLabel('2026-11-05'), { title: 'Novembre 2026', subtitle: '2 – 8 nov · settimana 45' });
  assert.deepEqual(weekLabel('2026-12-01'), { title: 'Dicembre 2026', subtitle: '30 nov – 6 dic · settimana 49' });
});

test('startOfWeek e isoWeek', () => {
  assert.equal(startOfWeek('2026-11-08'), '2026-11-02');
  assert.equal(isoWeek('2026-01-01'), 1);
  assert.equal(isoWeek('2027-01-01'), 53);
  assert.equal(isoWeek('2026-12-28'), 53);
});

test('monthGrid: 4, 5 o 6 righe', () => {
  assert.equal(monthGrid(2027, 2).length, 4); // 1 febbraio 2027 è lunedì, 28 giorni
  assert.equal(monthGrid(2026, 10).length, 5);
  assert.equal(monthGrid(2026, 11).length, 6); // 1 novembre 2026 è domenica, il 30 è lunedì
  assert.equal(monthGrid(2026, 3).length, 6);
  const nov = monthGrid(2026, 11, '2026-11-05');
  assert.deepEqual(nov[0][0], { ds: '2026-10-26', inMonth: false, isToday: false, weekday: 0 });
  assert.deepEqual(nov[1][3], { ds: '2026-11-05', inMonth: true, isToday: true, weekday: 3 });
});

test('step: settimana, mese e giorno, anche attraverso il cambio dell\'ora', () => {
  assert.equal(step('settimana', '2026-03-26', 1), '2026-04-02');
  assert.equal(step('mese', '2026-01-31', 1), '2026-02-01');
  assert.equal(step('mese', '2026-01-01', -1), '2025-12-01');
  assert.equal(step('giorno', '2026-03-28', 1), '2026-03-29');
  assert.equal(step('giorno', '2026-03-29', 1), '2026-03-30');
  assert.equal(step('giorno', '2026-10-25', -1), '2026-10-24');
  assert.equal(step('giorno', '2028-02-28', 1), '2028-02-29');
});

test('titoli di mese e giorno', () => {
  assert.equal(monthLabel('2026-11'), 'Novembre 2026');
  assert.deepEqual(dayLabel('2026-11-05', '2026-11-05'), { title: 'Giovedì 5', subtitle: 'Oggi · novembre 2026' });
  assert.deepEqual(dayLabel('2026-11-06', '2026-11-05'), { title: 'Venerdì 6', subtitle: 'novembre 2026' });
});

test('todayIn usa il fuso di Roma', () => {
  assert.equal(todayIn(new Date('2026-11-05T23:30:00Z')), '2026-11-06');
  assert.equal(todayIn(new Date('2026-07-01T21:59:00Z')), '2026-07-01');
});
