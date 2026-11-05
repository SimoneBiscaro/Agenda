import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepo, TOMBSTONE_TTL_DAYS } from '../app/src/store/repo.js';
import { openDatabase, DB_VERSION, MIGRATIONS } from '../app/src/store/db.js';
import { seedDefaults, startupMaintenance, SETTINGS_ID } from '../app/src/store/seed.js';
import { loadSettings, updateSettings } from '../app/src/store/settings.js';
import { buildDemoEvents, loadDemo, clearDemo } from '../app/src/store/demo.js';
import { entityVersion } from '../app/src/store/state.js';
import { deleteCategoryOps } from '../app/src/domain/categories.js';
import { occurrences, validate } from '../app/src/domain/events.js';
import { createMemoryAdapter } from './helpers/memory-db.js';
import { createFakeIndexedDB } from './helpers/fake-idb.js';

function setup(start = '2026-11-05T09:00:00.000Z') {
  let t = Date.parse(start);
  let n = 0;
  const adapter = createMemoryAdapter();
  const clock = { set: (iso) => { t = Date.parse(iso); }, advance: (ms) => { t += ms; } };
  const repo = createRepo(adapter, { clock: () => new Date(t), uuid: () => `id-${++n}` });
  return { repo, adapter, clock };
}

test('schema IndexedDB: records [entity,id], outbox, meta; una migrazione per versione', async () => {
  const idb = createFakeIndexedDB();
  await openDatabase('agenda-test', idb);
  assert.deepEqual(idb.schema('agenda-test'), {
    records: { keyPath: ['entity', 'id'], indexes: { entity: 'entity', updatedAt: 'updatedAt' } },
    outbox: { keyPath: 'key', indexes: {} },
    meta: { keyPath: 'key', indexes: {} },
  });
  assert.equal(Object.keys(MIGRATIONS).length, DB_VERSION);
  await openDatabase('agenda-test', idb); // riaprire non ricrea nulla
});

test('create, update, softDelete con date crescenti e outbox', async () => {
  const { repo, adapter, clock } = setup();
  const before = entityVersion('event').value;
  const e = await repo.create('event', { title: 'Dentista', date: '2026-11-10', time: '09:00', categoryId: 'cat-salute', repeat: 'none' });
  assert.equal(e.id, 'id-1');
  assert.equal(e.createdAt, '2026-11-05T09:00:00.000Z');
  assert.equal(e.deleted, false);
  assert.ok(entityVersion('event').value > before);
  const u = await repo.update('event', e.id, { title: 'Dentista Rossi', createdAt: 'x' });
  assert.ok(u.updatedAt > e.updatedAt);
  assert.equal(u.createdAt, e.createdAt);
  clock.advance(1000);
  await repo.softDelete('event', e.id);
  assert.equal(await repo.get('event', e.id), null);
  assert.equal((await repo.get('event', e.id, { includeDeleted: true })).deleted, true);
  assert.deepEqual(await repo.list('event'), []);
  assert.equal((await adapter.outboxList()).length, 1);
});

test('tombstone eliminate davvero dopo 180 giorni', async () => {
  const { repo, clock } = setup();
  const a = await repo.create('event', { title: 'A' });
  const b = await repo.create('event', { title: 'B' });
  await repo.softDelete('event', a.id);
  clock.advance((TOMBSTONE_TTL_DAYS - 1) * 86_400_000);
  assert.equal((await startupMaintenance(repo)).purged, 0);
  await repo.softDelete('event', b.id);
  clock.advance(2 * 86_400_000);
  assert.equal((await startupMaintenance(repo)).purged, 1);
  assert.equal(await repo.get('event', a.id, { includeDeleted: true }), null);
  assert.ok(await repo.get('event', b.id, { includeDeleted: true }));
});

test('seed: 6 categorie con id fissi e settings; idempotente', async () => {
  const { repo } = setup();
  assert.equal(await seedDefaults(repo), 7);
  const cats = await repo.list('category');
  assert.deepEqual(cats.map((c) => c.id).sort(), ['cat-altro', 'cat-casa', 'cat-famiglia', 'cat-giardino', 'cat-pesca', 'cat-salute']);
  assert.equal(cats.find((c) => c.id === 'cat-altro').builtin, true);
  assert.equal(cats.find((c) => c.id === 'cat-salute').normName, 'salute');
  assert.deepEqual((await repo.get('settings', SETTINGS_ID)).largeText, false);
  assert.equal(await seedDefaults(repo), 0);
  assert.equal((await repo.list('category')).length, 6);
  // una predefinita eliminata dall'utente non torna
  await repo.softDelete('category', 'cat-pesca');
  assert.equal(await seedDefaults(repo), 0);
  assert.equal((await repo.list('category')).length, 5);
});

test('settings: lettura con valori predefiniti e aggiornamento', async () => {
  const { repo } = setup();
  assert.deepEqual(await loadSettings(repo), { largeText: false });
  await updateSettings({ largeText: true }, repo);
  assert.equal((await loadSettings(repo)).largeText, true);
  await seedDefaults(repo);
  assert.equal((await loadSettings(repo)).largeText, true, 'il seed non sovrascrive le impostazioni');
});

test('eliminare una categoria sposta i suoi impegni in Altro (in un\'unica scrittura)', async () => {
  const { repo } = setup();
  await seedDefaults(repo);
  const e = await repo.create('event', { title: 'Lago', date: '2026-11-08', time: '', categoryId: 'cat-pesca', repeat: 'none' });
  await repo.batch(deleteCategoryOps('cat-pesca', await repo.list('event')));
  assert.equal((await repo.get('event', e.id)).categoryId, 'cat-altro');
  assert.equal(await repo.get('category', 'cat-pesca'), null);
});

test('impegni di prova: 12 su 4 settimane, tutte le categorie, casi speciali, cancellabili', async () => {
  const today = '2026-11-05';
  const demo = buildDemoEvents(today);
  assert.equal(demo.length, 12);
  assert.ok(demo.every((e) => e.demo === true && validate({ ...e, timeMode: e.time ? 'time' : 'allday' }).ok));
  assert.ok(demo.every((e) => e.date >= today && e.date < '2026-12-03'));
  assert.deepEqual([...new Set(demo.map((e) => e.categoryId))].sort(),
    ['cat-altro', 'cat-casa', 'cat-famiglia', 'cat-giardino', 'cat-pesca', 'cat-salute']);
  assert.equal(demo.filter((e) => e.repeat === 'yearly').length, 1);
  const perDay = demo.reduce((m, e) => m.set(e.date, (m.get(e.date) ?? 0) + 1), new Map());
  assert.ok([...perDay.values()].includes(3));
  assert.ok(demo.some((e) => e.time === '06:30'));
  assert.ok(demo.some((e) => e.time === '23:00'));

  const { repo } = setup();
  await seedDefaults(repo);
  const mine = await repo.create('event', { title: 'Mio', date: today, time: '', categoryId: 'cat-casa', repeat: 'none' });
  assert.equal(await loadDemo(today, repo), 12);
  assert.equal(await loadDemo(today, repo), 12, 'ricaricare non crea doppioni');
  assert.equal((await repo.list('event')).length, 13);
  assert.equal(occurrences(await repo.list('event'), today, '2026-12-02').length, 13);
  assert.equal(await clearDemo(repo), 12);
  assert.deepEqual((await repo.list('event')).map((e) => e.id), [mine.id]);
});
