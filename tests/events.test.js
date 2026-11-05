import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  occurrences, compareInDay, weekRows, monthBars, dayRows, validate, countLabel, moreLabel, eventsOn, MESSAGES,
} from '../app/src/domain/events.js';

let n = 0;
const ev = (fields) => ({ id: `e${++n}`, entity: 'event', title: 'Impegno', time: '', categoryId: 'cat-altro', repeat: 'none', deleted: false, ...fields });

test('occurrences: solo impegni non eliminati nell\'intervallo, con eventId e data', () => {
  const a = ev({ date: '2026-11-05', title: 'A' });
  const b = ev({ date: '2026-11-10', title: 'B' });
  const gone = ev({ date: '2026-11-06', deleted: true });
  const out = occurrences([a, b, gone], '2026-11-01', '2026-11-08');
  assert.equal(out.length, 1);
  assert.equal(out[0].eventId, a.id);
  assert.equal(out[0].date, '2026-11-05');
  assert.deepEqual(occurrences([a], '2026-11-05', '2026-11-05').map((o) => o.title), ['A']);
  assert.deepEqual(occurrences([a], '2026-11-08', '2026-11-01'), []);
});

test('annuale del 29/02/2028: 28/02 nel 2029, 29/02 nel 2032', () => {
  const bday = ev({ date: '2028-02-29', repeat: 'yearly', title: 'Compleanno' });
  assert.deepEqual(occurrences([bday], '2029-01-01', '2029-12-31').map((o) => o.date), ['2029-02-28']);
  assert.deepEqual(occurrences([bday], '2032-01-01', '2032-12-31').map((o) => o.date), ['2032-02-29']);
  assert.deepEqual(eventsOn([bday], '2029-03-01'), []);
  const all = occurrences([bday], '2028-01-01', '2032-12-31');
  assert.deepEqual(all.map((o) => o.date), ['2028-02-29', '2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29']);
  assert.ok(all.every((o) => o.eventId === bday.id && o.originalDate === '2028-02-29'));
});

test('annuale non mostrato prima del suo anno né prima della sua data', () => {
  const ann = ev({ date: '2026-11-05', repeat: 'yearly' });
  assert.deepEqual(occurrences([ann], '2025-01-01', '2025-12-31'), []);
  assert.deepEqual(occurrences([ann], '2026-01-01', '2026-11-04'), []);
  assert.deepEqual(occurrences([ann], '2024-01-01', '2027-12-31').map((o) => o.date), ['2026-11-05', '2027-11-05']);
});

test('ordinamento nel giorno: tutto il giorno → ora → titolo', () => {
  const day = '2026-11-05';
  const list = [
    ev({ date: day, time: '15:00', title: 'Zeta' }),
    ev({ date: day, time: '09:30', title: 'Medico' }),
    ev({ date: day, time: '', title: 'zucchine' }),
    ev({ date: day, time: '09:30', title: 'Banca' }),
    ev({ date: day, time: '', title: 'Àncora' }),
    ev({ date: day, time: '06:30', title: 'Analisi' }),
  ];
  assert.deepEqual(eventsOn(list, day).map((o) => `${o.time}|${o.title}`),
    ['|Àncora', '|zucchine', '06:30|Analisi', '09:30|Banca', '09:30|Medico', '15:00|Zeta']);
  assert.ok(compareInDay({ time: '', title: 'b' }, { time: '00:00', title: 'a' }) < 0);
});

test('weekRows: 7 righe, al massimo 2 impegni e "+ altri N"', () => {
  const list = [
    ev({ date: '2026-11-05', time: '10:00', title: 'Uno' }),
    ev({ date: '2026-11-05', time: '11:00', title: 'Due' }),
    ev({ date: '2026-11-05', time: '12:00', title: 'Tre' }),
    ev({ date: '2026-11-05', time: '', title: 'Quattro' }),
    ev({ date: '2026-11-07', time: '', title: 'Sabato' }),
    ev({ date: '2026-11-09', time: '', title: 'Fuori' }),
  ];
  const rows = weekRows(list, '2026-11-05', '2026-11-05');
  assert.equal(rows.length, 7);
  assert.equal(rows[0].ds, '2026-11-02');
  const thu = rows[3];
  assert.equal(thu.isToday, true);
  assert.deepEqual(thu.items.map((o) => o.title), ['Quattro', 'Uno']);
  assert.equal(thu.more, 2);
  assert.equal(thu.moreLabel, '+ altri 2');
  assert.equal(thu.countLabel, '4 impegni');
  assert.equal(rows[5].isWeekend, true);
  assert.equal(rows[5].more, 0);
  assert.equal(rows[5].moreLabel, '');
  assert.equal(rows[5].countLabel, '1 impegno');
  assert.equal(rows[6].countLabel, 'Nessun impegno');
  assert.equal(rows.filter((r) => r.isToday).length, 1);
});

test('weekRows con un solo impegno in più: "+ 1 altro"', () => {
  const day = '2026-11-03';
  const rows = weekRows([1, 2, 3].map((i) => ev({ date: day, time: `1${i}:00` })), day, '2026-11-05');
  assert.equal(rows[1].moreLabel, '+ 1 altro');
});

test('monthBars: al massimo 3 barrette col colore della categoria e "+N"', () => {
  const day = '2026-11-12';
  const list = [
    ev({ date: day, time: '08:00', categoryId: 'cat-salute' }),
    ev({ date: day, time: '09:00', categoryId: 'cat-casa' }),
    ev({ date: day, time: '', categoryId: 'cat-pesca' }),
    ev({ date: day, time: '10:00', categoryId: 'cat-famiglia' }),
    ev({ date: day, time: '11:00', categoryId: 'cat-altro' }),
    ev({ date: '2026-10-26', categoryId: 'cat-giardino' }),
  ];
  const bars = monthBars(list, 2026, 11);
  assert.deepEqual(bars[day].bars.map((b) => b.categoryId), ['cat-pesca', 'cat-salute', 'cat-casa']);
  assert.equal(bars[day].more, 2);
  assert.equal(bars[day].moreLabel, '+2');
  assert.equal(bars[day].count, 5);
  assert.deepEqual(bars['2026-10-26'].bars.map((b) => b.categoryId), ['cat-giardino']); // giorno del mese prima, visibile in griglia
  assert.deepEqual(bars['2026-11-01'], { bars: [], more: 0, moreLabel: '', count: 0 });
  assert.equal(Object.keys(bars).length, 42);
});

test('dayRows: riga "Giorno" + 07–22; prima delle 7 nella riga 07, dalle 23 nella riga 22', () => {
  const day = '2026-11-05';
  const rows = dayRows([
    ev({ date: day, time: '06:30', title: 'Presto' }),
    ev({ date: day, time: '07:15', title: 'Sette' }),
    ev({ date: day, time: '23:00', title: 'Tardi' }),
    ev({ date: day, time: '22:10', title: 'Dieci' }),
    ev({ date: day, time: '', title: 'Tutto' }),
    ev({ date: day, time: '00:05', title: 'Notte' }),
    ev({ date: '2026-11-06', time: '10:00', title: 'Domani' }),
  ], day);
  assert.equal(rows.length, 17);
  assert.deepEqual(rows.map((r) => r.label).slice(0, 3), ['Giorno', '07:00', '08:00']);
  assert.equal(rows[16].label, '22:00');
  assert.deepEqual(rows[0].items.map((o) => o.title), ['Tutto']);
  assert.deepEqual(rows[1].items.map((o) => `${o.time} ${o.title}`), ['00:05 Notte', '06:30 Presto', '07:15 Sette']);
  assert.deepEqual(rows[16].items.map((o) => `${o.time} ${o.title}`), ['22:10 Dieci', '23:00 Tardi']);
  assert.equal(rows.reduce((s, r) => s + r.items.length, 0), 6);
});

test('validate: messaggi esatti', () => {
  const ok = { title: '  Dentista  ', date: '2026-11-05', timeMode: 'allday', time: '09:00', categoryId: 'cat-salute' };
  const r = validate(ok);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, { title: 'Dentista', date: '2026-11-05', time: '', categoryId: 'cat-salute', repeat: 'none' });

  assert.equal(validate({ ...ok, title: '     ' }).errors.title, 'Scrivi che cosa devi fare.');
  assert.equal(validate({ ...ok, title: 'x'.repeat(81) }).errors.title, 'Al massimo 80 caratteri.');
  assert.equal(validate({ ...ok, title: 'x'.repeat(80) }).ok, true);
  assert.equal(validate({ ...ok, title: `  ${'x'.repeat(80)}  ` }).ok, true);
  assert.equal(validate({ ...ok, date: '' }).errors.date, 'Scegli il giorno.');
  assert.equal(validate({ ...ok, date: '2026-02-30' }).errors.date, 'Scegli il giorno.');
  assert.equal(validate({ ...ok, timeMode: 'time', time: '' }).errors.time, 'Scegli l\'ora.');
  assert.equal(validate({ ...ok, timeMode: 'time', time: '24:00' }).errors.time, MESSAGES.time);
  const timed = validate({ ...ok, timeMode: 'time', time: '09:05', repeat: 'yearly' });
  assert.equal(timed.ok, true);
  assert.equal(timed.value.time, '09:05');
  assert.equal(timed.value.repeat, 'yearly');
  // con "Tutto il giorno" un'ora non valida è ignorata e non salvata
  assert.deepEqual(validate({ ...ok, timeMode: 'allday', time: 'zz' }).errors, {});
  assert.deepEqual(Object.keys(validate({}).errors).sort(), ['date', 'title']);
});

test('etichette di conteggio', () => {
  assert.equal(countLabel(0), 'Nessun impegno');
  assert.equal(countLabel(1), '1 impegno');
  assert.equal(countLabel(7), '7 impegni');
  assert.equal(moreLabel(0), '');
  assert.equal(moreLabel(3), '+ altri 3');
});
