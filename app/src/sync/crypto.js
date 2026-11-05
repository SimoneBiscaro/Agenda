/*
 * Primitive crittografiche su WebCrypto (CLAUDE.md §2 e §9):
 * AES-GCM 256 con chiave derivata da PBKDF2-SHA256, 600.000 iterazioni.
 * Funziona sia nel browser sia in Node 20+ (globalThis.crypto).
 */

export const PBKDF2_ITERATIONS = 600_000;
const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder();

export function randomBytes(n) {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(text) {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Chiave AES-GCM non estraibile derivata dalla passphrase. */
export async function deriveKey(passphrase, salt, iterations = PBKDF2_ITERATIONS) {
  const base = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** AES-GCM con IV casuale da 12 byte. `aad` (facoltativo) lega il cifrato a un contesto. */
export async function encryptBytes(key, bytes, aad) {
  const iv = randomBytes(12);
  const params = aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv };
  const data = new Uint8Array(await subtle().encrypt(params, key, bytes));
  return { iv, data };
}

export async function decryptBytes(key, iv, data, aad) {
  const params = aad ? { name: 'AES-GCM', iv, additionalData: aad } : { name: 'AES-GCM', iv };
  return new Uint8Array(await subtle().decrypt(params, key, data));
}

/* ---------- Sync cifrata: record e vault ---------- */

/** Testo noto cifrato nel vault: decifrarlo prova che la passphrase è giusta. */
export const VAULT_CHECK = 'Agenda vault v1';
const VAULT_AAD = enc.encode('agenda:vault');
const dec = new TextDecoder();

export class WrongPassphrase extends Error {
  constructor() { super('Passphrase non corretta'); this.code = 'passphrase'; }
}

export class DecryptError extends Error {
  constructor(entity, id) {
    super(`Impossibile decifrare ${entity}/${id}`);
    this.code = 'decrypt';
  }
}

/** Il cifrato è legato a entità e id: il server non può scambiare il contenuto tra due righe. */
const recordAad = (entity, id) => enc.encode(`agenda:${entity}:${id}`);

/**
 * Cifra un record per la tabella `records`.
 * @returns {Promise<{ iv: string, payload: string }>} base64
 */
export async function encryptRecord(key, record) {
  const { iv, data } = await encryptBytes(key, enc.encode(JSON.stringify(record)), recordAad(record.entity, record.id));
  return { iv: toBase64(iv), payload: toBase64(data) };
}

/**
 * Decifra una riga `{ entity, id, iv, payload }` e controlla che il contenuto corrisponda.
 * @throws {DecryptError}
 */
export async function decryptRecord(key, row) {
  let record;
  try {
    const bytes = await decryptBytes(key, fromBase64(row.iv), fromBase64(row.payload), recordAad(row.entity, row.id));
    record = JSON.parse(dec.decode(bytes));
  } catch {
    throw new DecryptError(row.entity, row.id);
  }
  if (record?.entity !== row.entity || record?.id !== row.id) throw new DecryptError(row.entity, row.id);
  return record;
}

/**
 * Primo dispositivo: crea il vault (salt casuale + verifier) e la chiave.
 * @returns {Promise<{ key: CryptoKey, vault: { salt: string, verifier: string, iterations: number } }>}
 */
export async function createVault(passphrase, { iterations = PBKDF2_ITERATIONS } = {}) {
  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt, iterations);
  const { iv, data } = await encryptBytes(key, enc.encode(VAULT_CHECK), VAULT_AAD);
  return { key, vault: { salt: toBase64(salt), verifier: `v1.${toBase64(iv)}.${toBase64(data)}`, iterations } };
}

/**
 * Dispositivi successivi: deriva la chiave e la verifica con il verifier del vault.
 * @returns {Promise<CryptoKey>}
 * @throws {WrongPassphrase}
 */
export async function openVault(passphrase, vault) {
  const [version, iv, data] = String(vault?.verifier ?? '').split('.');
  if (version !== 'v1' || !iv || !data) throw new Error('Vault non valido');
  const key = await deriveKey(passphrase, fromBase64(vault.salt), vault.iterations);
  try {
    const plain = dec.decode(await decryptBytes(key, fromBase64(iv), fromBase64(data), VAULT_AAD));
    if (plain !== VAULT_CHECK) throw new Error('verifier diverso');
  } catch {
    throw new WrongPassphrase();
  }
  return key;
}
