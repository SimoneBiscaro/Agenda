import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isoWeek, monthGrid, step, weekLabel, startOfWeek, weekDays, longDate, dayMonth, sameDayInYear,
  isValidTime, isValidDs, addDays, diffDays, WEEKDAYS, WEEKDAYS_SHORT, WEEKDAYS_INITIAL, MONTHS, MONTHS_SHORT,
} from '../app/src/domain/dates.js';

/* Casi limite obbligatori di Fase 2 (CLAUDE.md §7). */

test('isoWeek: 2026-01-01 → 1, 2026-12-28 → 53, 2027-01-01 → 53 del 2026', () => {
  assert.deepEqual(isoWeek('2026-01-01'), { year: 2026, week: 1 });
  assert.deepEqual(isoWeek('2026-12-28'), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek('2027-01-01'), { year: 2026, week: 53 });
  assert.deepEqual(isoWeek('2027-01-04'), { year: 2027, week: 1 });
});

test('monthGrid: febbraio 2027 = 4 righe, novembre 2026 = 6, ottobre 2026 = 5, marzo 2026 = 6', () => {
  // Il prompt della fase indica 5 righe per novembre 2026, ma l'1 è domenica e il 30 è lunedì: sono 6.
  assert.equal(monthGrid(2027, 2).length, 4);
  assert.equal(monthGrid(2026, 11).length, 6);
  assert.equal(monthGrid(2026, 10).length, 5);
  assert.equal(monthGrid(2026, 3).length, 6);
});

test('monthGrid: celle da lunedì, inMonth, isToday e weekday', () => {
  const g = monthGrid(2026, 11, '2026-11-05');
  for (const row of g) {
    assert.equal(row.length, 7);
    row.forEach((c, i) => assert.equal(c.weekday, i));
  }
  assert.deepEqual(g[0][0], { ds: '2026-10-26', inMonth: false, isToday: false, weekday: 0 });
  assert.deepEqual(g[0][6], { ds: '2026-11-01', inMonth: true, isToday: false, weekday: 6 });
  assert.deepEqual(g[1][3], { ds: '2026-11-05', inMonth: true, isToday: true, weekday: 3 });
  assert.equal(g.flat().filter((c) => c.isToday).length, 1);
  assert.equal(g.flat().filter((c) => c.inMonth).length, 30);
  assert.deepEqual(g[5][6], { ds: '2026-12-06', inMonth: false, isToday: false, weekday: 6 });
});

test('step in vista mese dal 31 gennaio va al 1 febbraio (e non salta marzo)', () => {
  assert.equal(step('mese', '2026-01-31', 1), '2026-02-01');
  assert.equal(step('mese', '2026-03-31', -1), '2026-02-01');
  assert.equal(step('mese', '2028-02-29', 1), '2028-03-01');
});

test('settimana che cavalca due mesi e due anni (29/12/2026 – 04/01/2027)', () => {
  assert.equal(startOfWeek('2027-01-03'), '2026-12-28');
  assert.deepEqual(weekDays('2026-12-31'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
  assert.deepEqual(weekLabel('2027-01-01'), { title: 'Dicembre 2026', subtitle: '28 dic – 3 gen · settimana 53' });
  // la settimana del 29/12/2026 è la stessa; quella del 04/01/2027 è la 1 del 2027, titolo dal giovedì 7 gennaio
  assert.deepEqual(weekLabel('2026-12-29'), weekLabel('2027-01-01'));
  assert.deepEqual(weekLabel('2027-01-04'), { title: 'Gennaio 2027', subtitle: '4 – 10 gen · settimana 1' });
  assert.equal(step('settimana', '2026-12-29', 1), '2027-01-05');
});

test('cambio dell\'ora legale: 29/03/2026 e 25/10/2026 sono giorni normali', () => {
  assert.equal(addDays('2026-03-28', 1), '2026-03-29');
  assert.equal(addDays('2026-03-29', 1), '2026-03-30');
  assert.equal(addDays('2026-10-25', 1), '2026-10-26');
  assert.equal(addDays('2026-10-26', -1), '2026-10-25');
  assert.equal(diffDays('2026-03-28', '2026-03-30'), 2);
  assert.equal(diffDays('2026-10-24', '2026-10-26'), 2);
  assert.equal(step('settimana', '2026-10-19', 1), '2026-10-26');
  assert.equal(step('giorno', '2026-03-29', -1), '2026-03-28');
  assert.deepEqual(weekDays('2026-03-29'), ['2026-03-23', '2026-03-24', '2026-03-25', '2026-03-26', '2026-03-27', '2026-03-28', '2026-03-29']);
});

test('fine mese e anno bisestile', () => {
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2027-02-28', 1), '2027-03-01');
  assert.equal(addDays('2100-02-28', 1), '2100-03-01');
  assert.equal(addDays('2000-02-28', 1), '2000-02-29');
  assert.equal(step('giorno', '2026-04-30', 1), '2026-05-01');
  assert.ok(isValidDs('2000-02-29'));
  assert.ok(!isValidDs('2100-02-29'));
  assert.ok(!isValidDs('2026-13-01'));
  assert.ok(!isValidDs('26-11-05'));
});

test('nomi italiani e formati per esteso', () => {
  assert.deepEqual(WEEKDAYS, ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']);
  assert.deepEqual(WEEKDAYS_SHORT, ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']);
  assert.deepEqual(WEEKDAYS_INITIAL, ['L', 'M', 'M', 'G', 'V', 'S', 'D']);
  assert.equal(MONTHS.length, 12);
  assert.equal(MONTHS[0], 'gennaio');
  assert.equal(MONTHS_SHORT[11], 'dic');
  assert.equal(longDate('2026-11-05'), 'Giovedì 5 novembre 2026');
  assert.equal(longDate('2027-01-01'), 'Venerdì 1 gennaio 2027');
  assert.equal(dayMonth('2026-11-05'), '5 novembre');
});

test('sameDayInYear e isValidTime', () => {
  assert.equal(sameDayInYear('2028-02-29', 2029), '2029-02-28');
  assert.equal(sameDayInYear('2028-02-29', 2032), '2032-02-29');
  assert.equal(sameDayInYear('2026-11-05', 2030), '2030-11-05');
  for (const ok of ['00:00', '09:05', '23:59']) assert.ok(isValidTime(ok), ok);
  for (const bad of ['', '24:00', '9:00', '12:60', '12:5', 'ab:cd', null]) assert.ok(!isValidTime(bad), String(bad));
});
