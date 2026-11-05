import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRepo } from '../app/src/store/repo.js';
import { seedDefaults } from '../app/src/store/seed.js';
import { createAuth, AuthError, NetworkError, REFRESH_MARGIN_MS } from '../app/src/sync/auth.js';
import { createApi, normalizeTs, pullChanges, shiftTs } from '../app/src/sync/api.js';
import { createVault, fromBase64 } from '../app/src/sync/crypto.js';
import { META, mergeRemote, pullRemote, pushOutbox, remoteWins, runSync, stampAfter } from '../app/src/sync/sync.js';
import { createMemoryAdapter } from './helpers/memory-db.js';
import { createFakeSupabase, FAKE_KEY, FAKE_URL, pgTs } from './helpers/fake-supabase.js';

const EMAIL = 'simo@example.com';
const PASSWORD = 'password-giusta';

/** Un dispositivo: repo in memoria con orologio controllabile, auth e api verso il finto server. */
function device(server, name, start = '2026-11-03T10:00:00.000Z') {
  let now = Date.parse(start);
  let n = 0;
  const repo = createRepo(createMemoryAdapter(), {
    clock: () => new Date(now),
    uuid: () => `${name}-${String(++n).padStart(4, '0')}`,
  });
  const auth = createAuth({
    url: FAKE_URL, anonKey: FAKE_KEY, fetch: server.fetch, clock: () => now,
    load: () => repo.getMeta(META.session), save: (s) => repo.setMeta(META.session, s),
  });
  const api = createApi({ url: FAKE_URL, anonKey: FAKE_KEY, fetch: server.fetch, getAccessToken: (o) => auth.getAccessToken(o) });
  return {
    repo, auth, api,
    advance(ms) { now += ms; },
    get now() { return now; },
    async connect(key) { await auth.signIn(EMAIL, PASSWORD); this.key = key; },
    sync(opts = {}) { return runSync({ repo, api, key: this.key, ...opts }); },
  };
}

let sharedKey;
async function testKey() {
  sharedKey ??= (await createVault('passphrase di prova lunga', { iterations: 1000 })).key;
  return sharedKey;
}

const live = async (repo, entity) => (await repo.list(entity)).sort((a, b) => (a.id < b.id ? -1 : 1));

/* ---------- Istanti del server ---------- */

test('normalizeTs: timestamptz di Postgres → UTC a microsecondi, larghezza fissa', () => {
  assert.equal(normalizeTs('2026-11-03T12:00:00.1+00:00'), '2026-11-03T12:00:00.100000Z');
  assert.equal(normalizeTs('2026-11-03T12:00:00+00:00'), '2026-11-03T12:00:00.000000Z');
  assert.equal(normalizeTs('2026-11-03 13:00:00.123456+01'), '2026-11-03T12:00:00.123456Z');
  assert.equal(normalizeTs('2026-11-03T12:00:00.123456789Z'), '2026-11-03T12:00:00.123456Z');
  assert.throws(() => normalizeTs('ieri'), /non valido/);
  // l'ordine come stringa è l'ordine nel tempo
  assert.ok(normalizeTs('2026-11-03T12:00:00.9+00:00') > normalizeTs('2026-11-03T12:00:00.10001+00:00'));
  assert.ok(normalizeTs('2026-11-03T12:00:00.09+00:00') < normalizeTs('2026-11-03T12:00:00.1+00:00'));
});

test('shiftTs conserva i microsecondi e attraversa i secondi', () => {
  assert.equal(shiftTs('2026-11-03T12:00:00.000100Z', -5000), '2026-11-03T11:59:55.000100Z');
  assert.equal(shiftTs('2026-11-03T12:00:00.000100Z', -1), '2026-11-03T11:59:59.999100Z');
  assert.equal(shiftTs('2026-12-31T23:59:59.999999Z', 1), '2027-01-01T00:00:00.000999Z');
});

test('pullChanges: righe con lo stesso server_ts a cavallo delle pagine, ognuna letta una volta', async () => {
  const ts = (us) => pgTs(Date.parse('2026-11-03T10:00:00Z') * 1000 + us);
  const all = [
    { id: 'a', server_ts: ts(1) },
    { id: 'b', server_ts: ts(5) }, { id: 'c', server_ts: ts(5) }, { id: 'd', server_ts: ts(5) },
    { id: 'e', server_ts: ts(5) }, { id: 'f', server_ts: ts(5) },
    { id: 'g', server_ts: ts(9) },
  ];
  const queries = [];
  const fetchPage = async ({ since, offset, limit }) => {
    queries.push({ since, offset });
    const from = since ? all.filter((r) => normalizeTs(r.server_ts) >= since) : all;
    return from.slice(offset, offset + limit);
  };
  const seen = [];
  const res = await pullChanges(fetchPage, null, { pageSize: 2, onPage: async (rows) => { seen.push(...rows.map((r) => r.id)); } });
  assert.deepEqual(seen, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.equal(res.rows, 7);
  assert.equal(res.cursor, normalizeTs(ts(9)));
  assert.ok(queries.some((q) => q.offset > 2), 'blocco di pari merito saltato con offset crescente');

  // dal cursore: si rilegge una finestra di 5 s prima (le righe ripetute vengono scartate dal merge)
  const again = [];
  const res2 = await pullChanges(fetchPage, res.cursor, { pageSize: 10, onPage: async (rows) => { again.push(...rows.map((r) => r.id)); } });
  assert.deepEqual(again, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.equal(res2.cursor, res.cursor);
});

/* ---------- Merge last-writer-wins ---------- */

test('remoteWins: vince il più recente; a parità resta il locale', () => {
  const local = { updatedAt: '2026-11-03T10:00:00.000Z', deleted: false };
  assert.equal(remoteWins(null, local), true);
  assert.equal(remoteWins(local, { updatedAt: '2026-11-03T10:00:00.001Z' }), true);
  assert.equal(remoteWins(local, { updatedAt: '2026-11-03T09:59:59.999Z' }), false);
  assert.equal(remoteWins(local, { updatedAt: '2026-11-03T10:00:00.000Z' }), false);
  // updated_at di Postgres (+00:00) confrontato come istante, non come stringa
  assert.equal(remoteWins(local, { updatedAt: '2026-11-03T10:00:00.5+00:00' }), true);
  // primo collegamento: il cloud prevale anche se più vecchio
  assert.equal(remoteWins(local, { updatedAt: '2026-11-01T00:00:00.000Z' }, { preferRemote: true }), true);
  assert.equal(remoteWins(local, { ...local }, { preferRemote: true }), false);
});

test('mergeRemote: conflitti, tombstone e righe ripetute', () => {
  const L = (id, updatedAt, extra = {}) => ({ entity: 'event', id, updatedAt, deleted: false, ...extra });
  const local = new Map([
    ['event:1', L('1', '2026-11-03T10:00:00.000Z', { amount: 10 })],
    ['event:2', L('2', '2026-11-03T12:00:00.000Z', { amount: 20 })],
    ['event:3', L('3', '2026-11-03T10:00:00.000Z', { amount: 30 })],
  ]);
  const out = mergeRemote(local, [
    L('1', '2026-11-03T11:00:00.000Z', { amount: 11 }), // remoto più nuovo → vince
    L('2', '2026-11-03T11:00:00.000Z', { amount: 21 }), // remoto più vecchio → resta il locale
    L('3', '2026-11-03T10:30:00.000Z', { deleted: true }), // eliminazione più recente → tombstone
    L('4', '2026-11-03T09:00:00.000Z', { amount: 40 }), // nuovo
    L('4', '2026-11-03T08:00:00.000Z', { amount: 39 }), // ripetuto e più vecchio → ignorato
  ]);
  const byId = Object.fromEntries(out.map((r) => [r.id, r]));
  assert.deepEqual(Object.keys(byId).sort(), ['1', '3', '4']);
  assert.equal(byId[1].amount, 11);
  assert.equal(byId[3].deleted, true);
  assert.equal(byId[4].amount, 40);
});

test('stampAfter: le correzioni della dedupe superano anche orologi avanti', () => {
  const now = '2026-11-03T10:00:00.000Z';
  assert.equal(stampAfter(now, [{ updatedAt: '2026-11-03T09:00:00.000Z' }]), now);
  assert.equal(stampAfter(now, [{ updatedAt: '2026-11-03T10:05:00.000Z' }]), '2026-11-03T10:05:00.001Z');
});

/* ---------- Auth ---------- */

test('auth: credenziali sbagliate, accesso, sessione salvata', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  await assert.rejects(d.auth.signIn(EMAIL, 'sbagliata'), (err) => err instanceof AuthError && err.code === 'invalid_credentials' && /non corretti/.test(err.message));
  const s = await d.auth.signIn(` ${EMAIL} `, PASSWORD);
  assert.equal(s.user.email, EMAIL);
  assert.equal((await d.repo.getMeta(META.session)).refreshToken, s.refreshToken);
  assert.equal(await d.auth.getAccessToken(), s.accessToken);
});

test('auth: refresh automatico vicino alla scadenza, una sola richiesta per più chiamate', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  const first = await d.auth.signIn(EMAIL, PASSWORD);
  d.advance(3600_000 - REFRESH_MARGIN_MS + 1);
  const tokens = await Promise.all([d.auth.getAccessToken(), d.auth.getAccessToken(), d.auth.getAccessToken()]);
  assert.equal(new Set(tokens).size, 1);
  assert.notEqual(tokens[0], first.accessToken);
  assert.equal(server.state.calls.filter((c) => c.search === '?grant_type=refresh_token').length, 1);
  const saved = await d.repo.getMeta(META.session);
  assert.notEqual(saved.refreshToken, first.refreshToken, 'refresh token ruotato e salvato');
});

test('auth: refresh token non più valido → sessione scaduta e cancellata', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  await d.auth.signIn(EMAIL, PASSWORD);
  await d.repo.setMeta(META.session, { ...(await d.repo.getMeta(META.session)), refreshToken: 'rt-falso' });
  const fresh = createAuth({
    url: FAKE_URL, anonKey: FAKE_KEY, fetch: server.fetch, clock: () => d.now,
    load: () => d.repo.getMeta(META.session), save: (s) => d.repo.setMeta(META.session, s),
  });
  await assert.rejects(fresh.getAccessToken({ force: true }), (err) => err.code === 'session_expired');
  assert.equal(await d.repo.getMeta(META.session), null);
  await assert.rejects(fresh.getAccessToken(), (err) => err.code === 'not_signed_in');
});

test('auth: logout revoca il token sul server e cancella la sessione; offline la cancella comunque', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  const s = await d.auth.signIn(EMAIL, PASSWORD);
  await d.auth.signOut();
  assert.equal(server.tokens.has(s.accessToken), false);
  assert.equal(await d.repo.getMeta(META.session), null);
  await d.auth.signIn(EMAIL, PASSWORD);
  server.state.offline = true;
  await d.auth.signOut();
  assert.equal(await d.repo.getMeta(META.session), null);
});

test('api: un 401 rinnova il token e ripete la chiamata', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  await d.auth.signIn(EMAIL, PASSWORD);
  server.expireAllTokens(); // il server rifiuta, il client crede il token ancora valido
  assert.equal(await d.api.getVault(), null);
  assert.equal(server.state.calls.filter((c) => c.search === '?grant_type=refresh_token').length, 1);
});

test('api: vault creato una volta sola; il secondo tentativo risponde false', async () => {
  const server = createFakeSupabase();
  const d = device(server, 'A');
  await d.auth.signIn(EMAIL, PASSWORD);
  const { vault } = await createVault('passphrase di prova', { iterations: 1000 });
  assert.equal(await d.api.createVault(vault), true);
  assert.equal(await d.api.createVault(vault), false);
  assert.deepEqual(await d.api.getVault(), vault);
});

/* ---------- Sync end-to-end tra due dispositivi ---------- */

test('primo dispositivo: invia tutto cifrato; nel cloud niente in chiaro', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  await A.repo.create('event', { title: 'Visita cardiologica', date: '2026-11-20', time: '10:30', categoryId: 'cat-salute', repeat: 'none' });
  await A.repo.create('event', { title: 'Compleanno di Anna', date: '2026-12-01', time: '', categoryId: 'cat-famiglia', repeat: 'yearly' });
  const res = await A.sync();
  assert.equal(res.initial, true);
  assert.equal(res.pushed, 2);
  assert.equal((await A.repo.outbox()).length, 0);
  const rows = server.rows();
  assert.equal(rows.length, 2);
  for (const r of rows) {
    const raw = Buffer.from(fromBase64(r.payload)).toString('latin1');
    for (const secret of ['cardiologica', 'Anna', 'cat-salute', 'yearly', '2026-11-20']) assert.ok(!raw.includes(secret));
    assert.deepEqual(Object.keys(r).sort(), ['deleted', 'entity', 'id', 'iv', 'payload', 'server_micros', 'updated_at', 'user_id']);
  }
  assert.ok(await A.repo.getMeta(META.initialDone));
  // cloud vuoto al primo giro: il cursore arriva con la sync successiva, che non riscrive nulla
  const second = await A.sync();
  assert.equal(second.initial, false);
  assert.equal(second.applied, 0);
  assert.equal(second.pushed, 0);
  assert.ok(await A.repo.getMeta(META.cursor));
});

test('secondo dispositivo: riceve i dati, il cloud prevale su settings e le categorie predefinite si fondono', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A', '2026-11-01T09:00:00.000Z');
  await seedDefaults(A.repo);
  await A.repo.update('settings', 'settings', { largeText: true });
  await A.repo.create('event', { title: 'Pesca al lago', date: '2026-11-08', time: '', categoryId: 'cat-pesca', repeat: 'none' });
  await A.connect(key);
  await A.sync();

  // B nasce dopo: le sue impostazioni predefinite sono più recenti, ma non devono vincere
  const B = device(server, 'B', '2026-11-03T09:00:00.000Z');
  await seedDefaults(B.repo);
  await B.connect(key);
  const res = await B.sync();
  assert.equal(res.initial, true);
  const settingsB = await B.repo.get('settings', 'settings');
  assert.equal(settingsB.largeText, true);
  assert.equal((await live(B.repo, 'event')).length, 1);
  assert.equal((await live(B.repo, 'category')).length, 6, 'le predefinite hanno id fissi: nessun doppione');

  await A.sync();
  const catsA = (await live(A.repo, 'category')).map((c) => c.id);
  const catsB = (await live(B.repo, 'category')).map((c) => c.id);
  assert.deepEqual(catsA, catsB, 'stesse categorie su entrambi');
  assert.equal((await A.repo.get('settings', 'settings')).largeText, true);
});

test('conflitto offline sullo stesso record: vince la modifica più recente, in qualunque ordine si sincronizzi', async () => {
  for (const order of [['A', 'B'], ['B', 'A']]) {
    const server = createFakeSupabase();
    const key = await testKey();
    const A = device(server, 'A');
    const B = device(server, 'B');
    await A.connect(key);
    await B.connect(key);
    const v = await A.repo.create('event', { title: 'Dentista', date: '2026-11-10', time: '09:00', categoryId: 'cat-salute', repeat: 'none' });
    await A.sync();
    await B.sync();

    A.advance(60_000); B.advance(120_000); // offline: A modifica prima, B dopo
    await A.repo.update('event', v.id, { time: '10:00', note: 'portare le lastre' });
    await B.repo.update('event', v.id, { time: '11:30' });

    const devices = { A, B };
    for (const name of order) await devices[name].sync();
    for (const name of order) await devices[name].sync();

    for (const d of [A, B]) {
      const got = await d.repo.get('event', v.id);
      assert.equal(got.time, '11:30', `ordine ${order.join('→')}`);
      assert.equal(got.note, undefined, 'last-writer-wins per record intero');
    }
    // il server non ha accettato la versione più vecchia sopra la più nuova
    assert.equal(server.rows().length, 1);
  }
});

test('eliminazione: la tombstone arriva all\'altro dispositivo', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  const B = device(server, 'B');
  await A.connect(key);
  await B.connect(key);
  const visit = await A.repo.create('event', { title: 'Oculista', date: '2026-11-12', time: '', categoryId: 'cat-salute', repeat: 'none' });
  await A.sync();
  await B.sync();
  assert.ok(await B.repo.get('event', visit.id));
  A.advance(1000);
  await A.repo.softDelete('event', visit.id);
  await A.sync();
  await B.sync();
  assert.equal(await B.repo.get('event', visit.id), null);
  assert.equal((await B.repo.get('event', visit.id, { includeDeleted: true })).deleted, true);
  assert.equal(server.rows().find((r) => r.id === visit.id).deleted, true);
});

test('dedupe dopo la sync: stessa categoria creata offline su due telefoni', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  const B = device(server, 'B');
  await A.connect(key);
  await B.connect(key);
  await A.sync();
  await B.sync();

  const ca = await A.repo.create('category', { name: 'Bocce', normName: 'bocce', color: '#8E3B8E', builtin: false, order: 6 });
  await A.repo.create('event', { title: 'Torneo', date: '2026-11-07', time: '15:00', categoryId: ca.id, repeat: 'none' });
  B.advance(5000);
  const cb = await B.repo.create('category', { name: 'Bócce', normName: 'bocce', color: '#1F5FAD', builtin: false, order: 6 });
  await B.repo.create('event', { title: 'Allenamento', date: '2026-11-09', time: '10:00', categoryId: cb.id, repeat: 'none' });
  // stesso titolo e giorno su due telefoni: gli impegni non si deduplicano
  await A.repo.create('event', { title: 'Dentista', date: '2026-11-12', time: '', categoryId: 'cat-salute', repeat: 'none' });
  await B.repo.create('event', { title: 'Dentista', date: '2026-11-12', time: '', categoryId: 'cat-salute', repeat: 'none' });

  const res = await A.sync();
  await B.sync();
  await A.sync();
  assert.equal(res.deduped, 0, 'A non vede ancora i dati di B');

  for (const d of [A, B]) {
    const cats = (await live(d.repo, 'category')).filter((c) => c.normName === 'bocce');
    assert.equal(cats.length, 1);
    assert.equal(cats[0].id, ca.id, 'vince la più vecchia');
    const events = await live(d.repo, 'event');
    assert.ok(events.filter((e) => ['Torneo', 'Allenamento'].includes(e.title)).every((e) => e.categoryId === ca.id), 'impegni spostati sulla vincitrice');
    assert.equal(events.filter((e) => e.title === 'Dentista').length, 2);
  }
  assert.equal(server.rows().find((r) => r.id === cb.id).deleted, true, 'la perdente è tombstone anche nel cloud');
});

test('push a lotti di 200 via RPC', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  await A.sync();
  await A.repo.batch(Array.from({ length: 450 }, (_, i) => ({ entity: 'event', create: { title: `Impegno ${i}`, date: '2026-11-03', time: '', categoryId: 'cat-altro', repeat: 'none' } })));
  server.state.calls.length = 0;
  const pushed = await pushOutbox({ repo: A.repo, api: A.api, key });
  assert.equal(pushed, 450);
  const sizes = server.state.calls.filter((c) => c.path === '/rest/v1/rpc/upsert_records').map((c) => c.body.rows.length);
  assert.deepEqual(sizes, [200, 200, 50]);
  assert.equal((await A.repo.outbox()).length, 0);
});

test('pull paginato con molte righe allo stesso server_ts', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  const B = device(server, 'B');
  await A.connect(key);
  await B.connect(key);
  server.state.frozenTs = server.currentMicros();
  await A.repo.batch(Array.from({ length: 7 }, (_, i) => ({ entity: 'event', create: { title: `Impegno ${i}`, date: '2026-11-03', time: '', categoryId: 'cat-altro', repeat: 'none' } })));
  await A.sync();
  const res = await pullRemote({ repo: B.repo, api: B.api, key, cursor: null, pageSize: 3 });
  assert.equal(res.received, 7);
  assert.equal(res.applied, 7);
  assert.equal((await live(B.repo, 'event')).length, 7);
  assert.equal((await B.repo.outbox()).length, 0, 'i record ricevuti non tornano in coda');
});

test('outbox offline → online: la copia fallisce senza perdere la coda né spostare il cursore; poi riprende', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  await A.sync();
  const cursor = await A.repo.getMeta(META.cursor);
  await A.repo.create('event', { title: 'Spesa', date: '2026-11-04', time: '', categoryId: 'cat-casa', repeat: 'none' });
  server.state.offline = true;
  await assert.rejects(A.sync(), NetworkError);
  assert.equal((await A.repo.outbox()).length, 1);
  assert.equal(await A.repo.getMeta(META.cursor), cursor);
  server.state.offline = false;
  server.state.failNext = 1; // un 503 transitorio
  await assert.rejects(A.sync(), (err) => err.status === 503);
  const res = await A.sync();
  assert.equal(res.pushed, 1);
  assert.equal((await A.repo.outbox()).length, 0);
});

test('outbox: una tombstone già eliminata in locale esce dalla coda senza invio', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  await A.sync();
  const b = await A.repo.create('event', { title: 'Vecchio' });
  await A.repo.softDelete('event', b.id);
  A.advance(200 * 86_400_000);
  assert.equal(await A.repo.purgeTombstones(), 1);
  assert.equal(await pushOutbox({ repo: A.repo, api: A.api, key }), 0);
  assert.equal((await A.repo.outbox()).length, 0);
});

test('solo invio (uscendo dall\'app): manda la coda senza leggere dal cloud', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  await A.sync();
  await A.repo.create('event', { title: 'Banca', date: '2026-11-04', time: '11:00', categoryId: 'cat-altro', repeat: 'none' });
  server.state.calls.length = 0;
  const res = await A.sync({ pushOnly: true });
  assert.equal(res.pushed, 1);
  assert.ok(!server.state.calls.some((c) => c.path === '/rest/v1/records'), 'nessuna lettura');
});

test('conteggio dei record nel cloud (esclude le tombstone)', async () => {
  const server = createFakeSupabase();
  const key = await testKey();
  const A = device(server, 'A');
  await A.connect(key);
  const x = await A.repo.create('event', { title: 'Uno' });
  await A.repo.create('event', { title: 'Due' });
  await A.repo.softDelete('event', x.id);
  await A.sync();
  assert.equal(await A.api.countRecords(), 1);
});
