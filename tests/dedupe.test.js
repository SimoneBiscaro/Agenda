import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe } from '../app/src/domain/dedupe.js';

const NOW = '2026-11-05T10:00:00.000Z';
const cat = (id, name, createdAt, extra = {}) => ({ entity: 'category', id, name, createdAt, updatedAt: createdAt, deleted: false, builtin: false, color: '#8E3B8E', ...extra });
const ev = (id, categoryId, extra = {}) => ({ entity: 'event', id, title: id, date: '2026-11-05', time: '', categoryId, repeat: 'none', deleted: false, updatedAt: '2026-11-01T00:00:00.000Z', ...extra });

test('categorie con lo stesso nome normalizzato: vince la più vecchia, impegni spostati', () => {
  const records = [
    cat('c-new', 'Bócce', '2026-11-04T10:00:00.000Z'),
    cat('c-old', 'bocce ', '2026-11-02T10:00:00.000Z'),
    cat('c-mid', 'BOCCE', '2026-11-03T10:00:00.000Z', { normName: 'bocce' }),
    ev('e1', 'c-new'), ev('e2', 'c-mid'), ev('e3', 'c-old'), ev('e4', 'c-new', { deleted: true }),
  ];
  const changed = dedupe(records, NOW);
  const byId = Object.fromEntries(changed.map((r) => [r.id, r]));
  assert.equal(byId['c-new'].deleted, true);
  assert.equal(byId['c-mid'].deleted, true);
  assert.equal(byId['c-old'], undefined);
  assert.equal(byId.e1.categoryId, 'c-old');
  assert.equal(byId.e2.categoryId, 'c-old');
  assert.equal(byId.e3, undefined);
  assert.equal(byId.e4, undefined, 'gli impegni eliminati non si toccano');
  assert.ok(changed.every((r) => r.updatedAt === NOW));
  assert.equal(changed.length, 4);
});

test('a parità di createdAt vince l\'id minore; risultato uguale in ogni ordine', () => {
  const a = cat('b-id', 'Orto', '2026-11-02T10:00:00.000Z');
  const b = cat('a-id', 'orto', '2026-11-02T10:00:00.000Z');
  const r1 = dedupe([a, b], NOW);
  const r2 = dedupe([b, a], NOW);
  assert.deepEqual(r1, r2);
  assert.deepEqual(r1.map((r) => r.id), ['b-id']);
});

test('builtin, eliminate e impegni non si deduplicano', () => {
  const records = [
    cat('cat-altro', 'Altro', '2026-11-01T00:00:00.000Z', { builtin: true }),
    cat('c1', 'Altro', '2026-11-02T00:00:00.000Z'),
    cat('c2', 'Pesca', '2026-11-02T00:00:00.000Z', { deleted: true }),
    cat('c3', 'Pesca', '2026-11-03T00:00:00.000Z'),
    ev('e1', 'c1', { title: 'Uguale' }), ev('e2', 'c1', { title: 'Uguale' }),
  ];
  assert.deepEqual(dedupe(records, NOW), []);
});
