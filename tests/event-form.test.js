import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newEventDate, newForm, editForm, validate, DEFAULT_TIME } from '../app/src/domain/events.js';

test('"+ Nuovo impegno": giorno aperto, oggi se visibile, altrimenti il primo visibile', () => {
  const today = '2026-11-05';
  assert.equal(newEventDate('giorno', '2026-12-24', today), '2026-12-24');
  assert.equal(newEventDate('settimana', '2026-11-02', today), today);
  assert.equal(newEventDate('settimana', '2026-11-12', today), '2026-11-09');
  assert.equal(newEventDate('settimana', '2026-12-31', today), '2026-12-28');
  assert.equal(newEventDate('mese', '2026-11-01', today), today);
  assert.equal(newEventDate('mese', '2027-02-01', today), '2027-02-01');
});

test('modulo nuovo: "Tutto il giorno" con 09:00 pronto; da una riga oraria "A un orario"', () => {
  assert.deepEqual(newForm('2026-11-05'), {
    title: '', date: '2026-11-05', timeMode: 'allday', time: DEFAULT_TIME, categoryId: 'cat-altro', repeat: 'none',
  });
  const f = newForm('2026-11-05', '15:00');
  assert.equal(f.timeMode, 'time');
  assert.equal(f.time, '15:00');
  // salvando "Tutto il giorno" l'ora non viene salvata
  assert.equal(validate({ ...newForm('2026-11-05'), title: 'Pesca' }).value.time, '');
});

test('modulo di modifica: valori dell\'impegno, ida e ritorno con validate', () => {
  const ev = { id: 'e1', title: 'Compleanno di Anna', date: '2026-11-14', time: '', categoryId: 'cat-famiglia', repeat: 'yearly' };
  const f = editForm(ev);
  assert.deepEqual(f, { title: ev.title, date: ev.date, timeMode: 'allday', time: DEFAULT_TIME, categoryId: 'cat-famiglia', repeat: 'yearly' });
  const v = validate(f).value;
  assert.deepEqual(v, { title: ev.title, date: ev.date, time: '', categoryId: 'cat-famiglia', repeat: 'yearly' });
  const timed = editForm({ ...ev, time: '18:30', repeat: 'none', categoryId: undefined });
  assert.equal(timed.timeMode, 'time');
  assert.equal(timed.time, '18:30');
  assert.equal(timed.categoryId, 'cat-altro');
  assert.equal(timed.repeat, 'none');
});
