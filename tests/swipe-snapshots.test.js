import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifySwipe, isTapLocked, TAP_LOCK_MS } from '../app/src/domain/swipe.js';
import {
  shouldSnapshot, toPrune, summary, buildSnapshot, checkSnapshot, SNAPSHOT_MESSAGES, SNAPSHOT_SCHEMA_VERSION,
} from '../app/src/domain/snapshots.js';

test('classifySwipe: soglia a 60 px', () => {
  assert.equal(classifySwipe(-59, 0), null);
  assert.equal(classifySwipe(-60, 0), 'next');
  assert.equal(classifySwipe(59, 0), null);
  assert.equal(classifySwipe(60, 0), 'prev');
  assert.equal(classifySwipe(-200, 10), 'next');
  assert.equal(classifySwipe(0, 0), null);
});

test('classifySwipe: diagonale e verticale non sfogliano', () => {
  assert.equal(classifySwipe(-100, 100), null); // 45°
  assert.equal(classifySwipe(-100, 77), null); // 1,3·77 = 100,1 > 100
  assert.equal(classifySwipe(-100, 76), 'next'); // 1,3·76 = 98,8 < 100
  assert.equal(classifySwipe(-130, 100), null); // |dx| = 1,3·|dy|: serve strettamente maggiore
  assert.equal(classifySwipe(-131, 100), 'next');
  assert.equal(classifySwipe(131, -100), 'prev');
  assert.equal(classifySwipe(10, 300), null);
  assert.equal(classifySwipe(Number.NaN, 0), null);
});

test('tocchi ignorati per 350 ms dopo uno sfoglio', () => {
  assert.equal(isTapLocked(1000, 1000), true);
  assert.equal(isTapLocked(1000, 1000 + TAP_LOCK_MS - 1), true);
  assert.equal(isTapLocked(1000, 1000 + TAP_LOCK_MS), false);
  assert.equal(isTapLocked(undefined, 1000), false);
});

test('shouldSnapshot: mai fatta → sì; 19 h 59 → no; 20 h → sì', () => {
  const last = '2026-11-05T08:00:00.000Z';
  assert.equal(shouldSnapshot(null, '2026-11-05T08:00:00.000Z'), true);
  assert.equal(shouldSnapshot(undefined, new Date('2026-11-05T08:00:00Z')), true);
  assert.equal(shouldSnapshot(last, '2026-11-06T03:59:00.000Z'), false);
  assert.equal(shouldSnapshot(last, '2026-11-06T03:59:59.999Z'), false);
  assert.equal(shouldSnapshot(last, '2026-11-06T04:00:00.000Z'), true);
  assert.equal(shouldSnapshot(last, new Date('2026-11-07T08:00:00Z')), true);
  assert.equal(shouldSnapshot('non una data', '2026-11-05T08:00:00Z'), true);
});

test('toPrune con 31 fotografie: elimina solo la più vecchia', () => {
  const list = Array.from({ length: 31 }, (_, i) => ({
    id: `s${i}`, created_at: new Date(Date.UTC(2026, 9, 1 + i, 9)).toISOString(),
  }));
  const shuffled = [...list].reverse().sort((a, b) => (a.id.length - b.id.length) || 0);
  const pruned = toPrune(shuffled);
  assert.deepEqual(pruned.map((s) => s.id), ['s0']);
  assert.deepEqual(toPrune(list.slice(0, 30)), []);
  assert.deepEqual(toPrune([]), []);
  assert.equal(toPrune([...list, { id: 'x', created_at: '2026-01-01T00:00:00Z' }]).length, 2);
});

test('summary, buildSnapshot e controllo della versione', () => {
  const records = [
    { entity: 'event', id: 'a', deleted: false },
    { entity: 'event', id: 'b', deleted: true },
    { entity: 'event', id: 'c', deleted: false },
    { entity: 'category', id: 'cat-altro', deleted: false },
  ];
  const payload = buildSnapshot(records, { appVersion: '0.2.0', createdAt: '2026-11-05T09:12:00.000Z' });
  assert.equal(payload.schemaVersion, SNAPSHOT_SCHEMA_VERSION);
  assert.deepEqual(summary(payload), { eventCount: 2, createdAt: '2026-11-05T09:12:00.000Z', date: '2026-11-05' });
  assert.deepEqual(checkSnapshot(payload), { ok: true, records });
  assert.deepEqual(checkSnapshot({ ...payload, schemaVersion: SNAPSHOT_SCHEMA_VERSION + 1 }), { ok: false, message: SNAPSHOT_MESSAGES.newer });
  assert.deepEqual(checkSnapshot({ records: 'x' }), { ok: false, message: SNAPSHOT_MESSAGES.invalid });
  assert.deepEqual(checkSnapshot(null), { ok: false, message: SNAPSHOT_MESSAGES.invalid });
});
