import { test } from 'node:test';
import assert from 'node:assert/strict';
import { step, weekLabel, dayLabel, monthLabel, isoWeek, monthGrid, weekday, isValidDs } from '../app/src/domain/dates.js';

/* Fase 1: solo ciò che serve a titoli e frecce. La batteria completa di §7 arriva in Fase 2. */

test('step: settimana ±7, giorno ±1, mese al giorno 1', () => {
  assert.equal(step('settimana', '2026-11-05', 1), '2026-11-12');
  assert.equal(step('settimana', '2026-11-05', -1), '2026-10-29');
  assert.equal(step('giorno', '2026-12-31', 1), '2027-01-01');
  assert.equal(step('giorno', '2028-03-01', -1), '2028-02-29');
  assert.equal(step('mese', '2026-01-31', 1), '2026-02-01');
  assert.equal(step('mese', '2026-01-01', -1), '2025-12-01');
  assert.equal(step('mese', '2026-12-01', 1), '2027-01-01');
});

test('step attraversa i cambi dell\'ora legale senza saltare giorni', () => {
  assert.equal(step('giorno', '2026-03-28', 1), '2026-03-29');
  assert.equal(step('giorno', '2026-03-29', 1), '2026-03-30');
  assert.equal(step('giorno', '2026-10-25', 1), '2026-10-26');
  assert.equal(step('settimana', '2026-03-23', 1), '2026-03-30');
});

test('titoli di settimana, mese e giorno', () => {
  assert.deepEqual(weekLabel('2026-11-05'), { title: 'Novembre 2026', subtitle: '2 – 8 nov · settimana 45' });
  assert.deepEqual(weekLabel('2026-12-01'), { title: 'Dicembre 2026', subtitle: '30 nov – 6 dic · settimana 49' });
  assert.deepEqual(dayLabel('2026-11-05', '2026-11-05'), { title: 'Giovedì 5', subtitle: 'Oggi · novembre 2026' });
  assert.equal(dayLabel('2026-11-07', '2026-11-05').subtitle, 'novembre 2026');
  assert.deepEqual(monthLabel('2026-11-01', '2026-11-05'), { title: 'Novembre 2026', subtitle: 'Questo mese' });
});

test('isoWeek, weekday, monthGrid e validità delle date', () => {
  assert.deepEqual(isoWeek('2026-01-01'), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
  assert.equal(weekday('2026-11-02'), 0);
  assert.equal(weekday('2026-11-08'), 6);
  assert.equal(monthGrid(2027, 2).length, 4);
  // Novembre 2026 inizia di domenica e finisce di lunedì: 6 righe (CLAUDE.md §7 indica 5 per errore).
  assert.equal(monthGrid(2026, 11).length, 6);
  assert.equal(monthGrid(2026, 12).length, 5);
  assert.equal(monthGrid(2026, 3).length, 6);
  assert.ok(isValidDs('2028-02-29'));
  assert.ok(!isValidDs('2026-02-29'));
});
