import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whenLabel } from '../app/src/domain/dates.js';
import { dotState, describeSyncError } from '../app/src/store/cloud.js';
import { AuthError, NetworkError, authErrorFrom } from '../app/src/sync/auth.js';
import { ApiError } from '../app/src/sync/api.js';
import { DecryptError, WrongPassphrase } from '../app/src/sync/crypto.js';

test('whenLabel: "oggi alle 9:12", "ieri", data per esteso, fuso di Roma', () => {
  assert.equal(whenLabel('2026-11-05T08:12:00Z', '2026-11-05'), 'oggi alle 9:12');
  assert.equal(whenLabel('2026-11-04T23:30:00Z', '2026-11-05'), 'oggi alle 0:30'); // già il 5 a Roma
  assert.equal(whenLabel('2026-11-04T17:05:00Z', '2026-11-05'), 'ieri alle 18:05');
  assert.equal(whenLabel('2026-11-02T09:00:00Z', '2026-11-05'), 'il 2 novembre alle 10:00');
  assert.equal(whenLabel('2026-07-01T08:00:00Z', '2026-11-05'), 'il 1 luglio alle 10:00'); // ora legale
  assert.equal(whenLabel('2025-12-31T10:00:00Z', '2026-11-05'), 'il 31 dicembre 2025 alle 11:00');
  assert.equal(whenLabel('non una data', '2026-11-05'), '');
});

test('puntino: verde aggiornata, grigio senza rete, arancione da sistemare, nessuno se non collegata', () => {
  assert.equal(dotState('off'), null);
  for (const p of ['ok', 'syncing', 'idle']) assert.equal(dotState(p), 'ok');
  assert.equal(dotState('offline'), 'offline');
  for (const p of ['error', 'expired', 'locked']) assert.equal(dotState(p), 'warning');
});

test('messaggi senza gergo (regola 9): mai sync, record, cache, codici di errore', () => {
  const errors = [
    new DecryptError('event', 'x'), new WrongPassphrase(), new NetworkError(new Error('x')),
    authErrorFrom(400, { error_code: 'invalid_credentials' }), authErrorFrom(429, {}), authErrorFrom(500, {}),
    authErrorFrom(400, { error_code: 'email_not_confirmed' }), new AuthError('Il collegamento è scaduto: collega di nuovo la copia di sicurezza.', 'session_expired', 400),
    new ApiError('x', 404, 'PGRST202'), new ApiError('x', 403), new ApiError('x', 401), new ApiError('x', 503), new Error('boom'),
  ];
  for (const err of errors) {
    const msg = describeSyncError(err);
    assert.ok(msg.length > 5, msg);
    assert.doesNotMatch(msg, /sync|record|cache|\d{3}|supabase|rls|jwt|token/i, msg);
  }
});
