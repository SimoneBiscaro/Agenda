/*
 * Collegamento della copia di sicurezza all'app (CLAUDE.md §9): sessione, vault, chiave in memoria
 * (o ricordata in IndexedDB come CryptoKey non estraibile), pianificazione (avvio, ritorno della rete,
 * ogni 60 s in primo piano, uscendo dall'app) e nuovi tentativi con attese crescenti.
 * Lo stato è un segnale letto dal puntino nell'intestazione e da Impostazioni.
 */
import { signal } from './state.js';
import { CLOCK_OFFSET_KEY, getRepo, setClockOffset } from './repo.js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config.js';
import { AuthError, clockCorrection, createAuth, NetworkError } from '../sync/auth.js';
import { ApiError, createApi, isRetryable } from '../sync/api.js';
import { createVault, DecryptError, openVault, WrongPassphrase } from '../sync/crypto.js';
import { META, runSync } from '../sync/sync.js';

export const cloudConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const SYNC_INTERVAL_MS = 60_000;
/** Attese tra un tentativo fallito e il successivo, in secondi. */
export const BACKOFF_S = [2, 4, 8, 16, 32, 60, 120, 300];
/** Passphrase: almeno 12 caratteri (meglio una frase di 4–5 parole). */
export const MIN_PASSPHRASE = 12;
const USER_KEY = 'sync.userId';

/**
 * phase:
 *  off       non collegata su questo dispositivo
 *  expired   collegamento scaduto: serve accedere di nuovo
 *  locked    accesso fatto, manca la passphrase
 *  idle      pronta, in attesa del primo invio
 *  syncing   copia in corso
 *  ok        copia aggiornata
 *  offline   senza rete
 *  error     ultimo tentativo fallito (con nuovo tentativo pianificato se ha senso)
 */
export const syncState = signal({
  phase: 'off', email: null, lastSyncAt: null, error: null, vault: null, remembered: false, retryAt: null,
});

const set = (patch) => { syncState.value = { ...syncState.value, ...patch }; };

/** Colore del puntino nell'intestazione: null = nessun puntino (copia non collegata). */
export function dotState(phase) {
  if (phase === 'off') return null;
  if (phase === 'offline') return 'offline';
  if (phase === 'ok' || phase === 'syncing' || phase === 'idle') return 'ok';
  return 'warning';
}

let auth = null;
let api = null;
let key = null;
let started = false;
let running = null;
let again = null;
let failures = 0;
let retryTimer = 0;

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Messaggio a parole, senza gergo (regola 9). */
export function describeSyncError(err) {
  if (err instanceof DecryptError) return 'La copia nel cloud non si legge con questa passphrase.';
  if (err instanceof WrongPassphrase) return 'Passphrase non corretta.';
  if (err instanceof NetworkError) return 'Internet non raggiungibile. Riprova più tardi.';
  if (err instanceof AuthError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 404 || ['PGRST202', 'PGRST205', '42P01', '42883'].includes(err.code)) {
      return 'Il cloud non è ancora pronto per l’Agenda.';
    }
    if (err.status === 403 || err.code === '42501') return 'Il cloud ha rifiutato l’accesso.';
    return 'Il cloud non risponde. Riprova più tardi.';
  }
  return 'Qualcosa non ha funzionato. Riprova più tardi.';
}

function withLock(fn) {
  // Più schede aperte: una sola fa la copia alla volta.
  if (typeof navigator !== 'undefined' && navigator.locks?.request) return navigator.locks.request('agenda-sync', fn);
  return fn();
}

function clients(repo) {
  auth ??= createAuth({
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
    load: () => repo.getMeta(META.session),
    save: async (s) => {
      await repo.setMeta(META.session, s);
      // Ogni nuovo token porta l'ora del server: se l'orologio del telefono è sfasato, si corregge.
      if (s && s.skewMs != null) {
        const offset = clockCorrection(s.skewMs);
        setClockOffset(offset);
        await repo.setMeta(CLOCK_OFFSET_KEY, offset);
      }
    },
  });
  api ??= createApi({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, getAccessToken: (o) => auth.getAccessToken(o) });
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  const delay = BACKOFF_S[Math.min(failures, BACKOFF_S.length - 1)] * 1000;
  failures += 1;
  retryTimer = setTimeout(() => { syncNow(); }, delay);
  return Date.now() + delay;
}

function handleError(err) {
  if (err instanceof AuthError && (err.code === 'session_expired' || err.code === 'not_signed_in')) {
    set({ phase: 'expired', error: describeSyncError(err), retryAt: null });
    return;
  }
  if (err instanceof NetworkError && !isOnline()) {
    set({ phase: 'offline', error: null, retryAt: null });
    return;
  }
  const retry = !(err instanceof DecryptError) && (isRetryable(err) || err instanceof ApiError);
  set({ phase: 'error', error: describeSyncError(err), retryAt: retry ? scheduleRetry() : null });
  // Rete e server temporaneamente giù sono attesi: in console solo gli errori inattesi.
  if (!isRetryable(err)) console.warn('Copia di sicurezza:', err);
}

/**
 * Fa la copia adesso. Se è già in corso, ne accoda un'altra al termine.
 * @param {{ pushOnly?: boolean }} [opts] pushOnly: solo invio (uscendo dall'app)
 */
export function syncNow({ pushOnly = false } = {}) {
  if (!cloudConfigured || !key || !auth) return Promise.resolve(null);
  if (!isOnline()) {
    set({ phase: 'offline', retryAt: null });
    return Promise.resolve(null);
  }
  if (running) {
    again = again === null ? pushOnly : again && pushOnly;
    return running;
  }
  clearTimeout(retryTimer);
  running = (async () => {
    set({ phase: 'syncing', error: null, retryAt: null });
    try {
      const repo = await getRepo();
      const res = await withLock(() => runSync({ repo, api, key, pushOnly }));
      const lastSyncAt = new Date().toISOString();
      await repo.setMeta(META.lastSyncAt, lastSyncAt);
      failures = 0;
      set({ phase: 'ok', lastSyncAt, error: null });
      return res;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      running = null;
      if (again !== null) {
        const next = again;
        again = null;
        syncNow({ pushOnly: next });
      }
    }
  })();
  return running;
}

let changeTimer = 0;
/** Dopo una modifica locale: invio entro un paio di secondi (le modifiche ravvicinate vanno insieme). */
export function scheduleSoon() {
  if (!key) return;
  clearTimeout(changeTimer);
  changeTimer = setTimeout(async () => {
    // Le modifiche arrivate dal cloud non entrano in coda: niente da inviare, niente giro in più.
    const repo = await getRepo();
    if ((await repo.outbox()).length) syncNow();
  }, 2000);
}

function attachListeners() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => { if (key) syncNow(); });
  window.addEventListener('offline', () => { if (key) set({ phase: 'offline', retryAt: null }); });
  document.addEventListener('visibilitychange', () => {
    if (!key) return;
    // In primo piano si scarica subito; uscendo si inviano le modifiche ancora in coda.
    if (document.visibilityState === 'visible') syncNow();
    else syncNow({ pushOnly: true });
  });
  setInterval(() => {
    if (key && document.visibilityState === 'visible') syncNow();
  }, SYNC_INTERVAL_MS);
}

/** Avvio: riprende il collegamento salvato e, se la chiave è ricordata, fa subito la copia. */
export async function initCloud() {
  if (!cloudConfigured || started) return;
  started = true;
  const repo = await getRepo();
  clients(repo);
  attachListeners();
  const [session, savedKey, lastSyncAt] = await Promise.all([
    auth.getSession(), repo.getMeta(META.key), repo.getMeta(META.lastSyncAt),
  ]);
  if (!session) {
    set({ phase: 'off', lastSyncAt: lastSyncAt ?? null });
    return;
  }
  key = savedKey ?? null;
  set({ email: session.user?.email ?? null, lastSyncAt: lastSyncAt ?? null, remembered: Boolean(key), phase: key ? 'idle' : 'locked' });
  if (key) syncNow();
}

/** Legge dal cloud se la passphrase esiste già (per scegliere tra "crea" e "inserisci"). */
export async function refreshVaultInfo() {
  if (!api) return null;
  const vault = await api.getVault();
  set({ vault: vault ? 'present' : 'missing' });
  return vault;
}

async function resetSyncMeta(repo) {
  await Promise.all([META.key, META.cursor, META.initialDone, META.lastSyncAt, USER_KEY].map((k) => repo.setMeta(k, null)));
}

/** Accesso con email e password dell'utente dedicato. */
export async function signIn(email, password) {
  const repo = await getRepo();
  clients(repo);
  const session = await auth.signIn(email, password);
  // Un account diverso dal precedente riparte da zero (chiave e cursore sono per utente).
  const previous = await repo.getMeta(USER_KEY);
  if (previous && previous !== session.user.id) {
    await resetSyncMeta(repo);
    key = null;
  }
  await repo.setMeta(USER_KEY, session.user.id);
  set({ email: session.user.email, phase: key ? 'idle' : 'locked', error: null, vault: null });
  if (key) syncNow();
  else await refreshVaultInfo();
  return session;
}

async function adoptKey(newKey, remember) {
  const repo = await getRepo();
  key = newKey;
  // La CryptoKey non è estraibile: in IndexedDB finisce l'oggetto, non i byte della chiave.
  await repo.setMeta(META.key, remember ? newKey : null);
  set({ phase: 'idle', vault: 'present', remembered: remember, error: null });
  return syncNow();
}

/** Primo collegamento: crea il vault con una nuova passphrase. */
export async function createPassphrase(passphrase, { remember = true } = {}) {
  const { key: newKey, vault } = await createVault(passphrase);
  if (await api.createVault(vault)) return adoptKey(newKey, remember);
  // Un altro dispositivo l'ha creato nel frattempo: la passphrase deve essere quella.
  set({ vault: 'present' });
  return unlock(passphrase, { remember });
}

/** Collegamenti successivi: verifica la passphrase con il vault. */
export async function unlock(passphrase, { remember = true } = {}) {
  const vault = await api.getVault();
  if (!vault) {
    set({ vault: 'missing' });
    throw new Error('Nel cloud non c’è ancora una passphrase: creala.');
  }
  return adoptKey(await openVault(passphrase, vault), remember);
}

/** "Scollega": esce e dimentica chiave e cursore. Gli impegni sul telefono restano. */
export async function disconnect() {
  const repo = await getRepo();
  clients(repo);
  clearTimeout(retryTimer);
  clearTimeout(changeTimer);
  key = null;
  failures = 0;
  await auth.signOut();
  await resetSyncMeta(repo);
  set({ phase: 'off', email: null, lastSyncAt: null, error: null, vault: null, remembered: false, retryAt: null });
}
