// End-to-end encryption for notes. Everything here runs in the browser; the server only
// ever receives scrambled text, so nobody with database access (the admin included) can
// read a note.
//
// How the keys fit together:
//  - Each person has one random note key (AES-256-GCM). It locks and unlocks their notes.
//  - The note key is stored on the server only in locked ("wrapped") form, twice:
//      1. locked with a key made from their password (PBKDF2-SHA256, 600k rounds)
//      2. locked with a recovery key they keep (for when the password is forgotten)
//  - Once unlocked, the note key is kept on this device (IndexedDB) as a key that can be
//    used but not read out, so the app opens without asking for the password every time.
//    Signing out deletes it.

const ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

/** The note_keys row: nothing in it is readable without the password or recovery key. */
export interface KeyRow {
  salt: string;
  iterations: number;
  wrapped: string;
  recovery_salt: string | null;
  recovery: string | null;
}

/** The parts of a note that get locked. Points and the date stay readable (the tree needs them). */
export interface Secret {
  subject: string;
  note: string;
  tags: string[];
}

type Bytes = Uint8Array<ArrayBuffer>;

// ---------------- bytes <-> text ----------------

function toB64(bytes: Bytes): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromB64(text: string): Bytes {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function join(a: Bytes, b: Bytes): Bytes {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

const random = (n: number): Bytes => crypto.getRandomValues(new Uint8Array(n));

// Recovery keys: 160 random bits written as 8 groups of 4 letters/digits (Crockford base32,
// which leaves out I, L, O and U so it is hard to misread when copied by hand).
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function makeRecoveryKey(): string {
  const bytes = random(20);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  return out.match(/.{4}/g)!.join('-');
}

function readRecoveryKey(text: string): Bytes | null {
  const clean = text.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (clean.length !== 32 || /U/.test(clean)) return null;
  const out = new Uint8Array(20);
  let bits = 0;
  let value = 0;
  let i = 0;
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out[i++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return out;
}

// ---------------- keys that lock the note key ----------------

async function passwordKey(password: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, base, { name: 'AES-GCM', length: 256 }, false, [
    'wrapKey',
    'unwrapKey',
  ]);
}

async function recoveryKeyKey(code: Bytes, salt: Bytes): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', code, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('rooted recovery v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  );
}

// The user id is mixed in, so a locked key copied onto someone else's account won't open.
const keyLabel = (userId: string) => enc.encode(`rooted:key:${userId}`);

async function wrap(noteKey: CryptoKey, lock: CryptoKey, userId: string): Promise<string> {
  const iv = random(12);
  const sealed = new Uint8Array(await crypto.subtle.wrapKey('raw', noteKey, lock, { name: 'AES-GCM', iv, additionalData: keyLabel(userId) }));
  return toB64(join(iv, sealed));
}

/** Throws when `lock` is the wrong key (wrong password or recovery key). */
async function unwrap(blob: string, lock: CryptoKey, userId: string, extractable: boolean): Promise<CryptoKey> {
  const bytes = fromB64(blob);
  return crypto.subtle.unwrapKey(
    'raw',
    bytes.slice(12),
    lock,
    { name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: keyLabel(userId) },
    'AES-GCM',
    extractable,
    ['encrypt', 'decrypt'],
  );
}

/** A copy of the note key that this device can use but never read out. */
async function deviceCopy(noteKey: CryptoKey): Promise<CryptoKey> {
  const raw = await crypto.subtle.exportKey('raw', noteKey);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** A brand-new note key, locked with the password and with a new recovery key. */
export async function createKeys(userId: string, password: string): Promise<{ row: KeyRow; key: CryptoKey; recoveryKey: string }> {
  const noteKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const salt = random(16);
  const recoveryKey = makeRecoveryKey();
  const recoverySalt = random(16);
  const row: KeyRow = {
    salt: toB64(salt),
    iterations: ITERATIONS,
    wrapped: await wrap(noteKey, await passwordKey(password, salt, ITERATIONS), userId),
    recovery_salt: toB64(recoverySalt),
    recovery: await wrap(noteKey, await recoveryKeyKey(readRecoveryKey(recoveryKey)!, recoverySalt), userId),
  };
  return { row, key: await deviceCopy(noteKey), recoveryKey };
}

/** Opens the note key with the password. Throws if the password doesn't match. */
export async function openWithPassword(userId: string, row: KeyRow, password: string, extractable = false): Promise<CryptoKey> {
  const lock = await passwordKey(password, fromB64(row.salt), row.iterations);
  return unwrap(row.wrapped, lock, userId, extractable);
}

/**
 * Opens the note key with the recovery key and locks it again with the (new) password.
 * Returns the new password-locked parts of the row, and the key for this device.
 */
export async function openWithRecovery(
  userId: string,
  row: KeyRow,
  recoveryKey: string,
  password: string,
): Promise<{ update: Pick<KeyRow, 'salt' | 'iterations' | 'wrapped'>; key: CryptoKey }> {
  const code = readRecoveryKey(recoveryKey);
  if (!code) throw new Error('A recovery key has 32 letters and numbers, like ABCD-EFGH-… — check it and try again.');
  if (!row.recovery || !row.recovery_salt) throw new Error('This account has no recovery key yet.');
  let noteKey: CryptoKey;
  try {
    noteKey = await unwrap(row.recovery, await recoveryKeyKey(code, fromB64(row.recovery_salt)), userId, true);
  } catch {
    throw new Error("That recovery key doesn't match this account.");
  }
  const salt = random(16);
  const update = { salt: toB64(salt), iterations: ITERATIONS, wrapped: await wrap(noteKey, await passwordKey(password, salt, ITERATIONS), userId) };
  return { update, key: await deviceCopy(noteKey) };
}

/** A fresh recovery key for an already-open note key (the old recovery key stops working). */
export async function replaceRecoveryKey(
  userId: string,
  row: KeyRow,
  password: string,
): Promise<{ update: Pick<KeyRow, 'recovery_salt' | 'recovery'>; recoveryKey: string }> {
  const noteKey = await openWithPassword(userId, row, password, true);
  const recoveryKey = makeRecoveryKey();
  const salt = random(16);
  const recovery = await wrap(noteKey, await recoveryKeyKey(readRecoveryKey(recoveryKey)!, salt), userId);
  return { update: { recovery_salt: toB64(salt), recovery }, recoveryKey };
}

// ---------------- locking notes ----------------

// The note's id is mixed in, so locked text can't be swapped between notes unnoticed.
const noteLabel = (id: string) => enc.encode(`rooted:entry:${id}`);

export async function seal(key: CryptoKey, id: string, s: Secret): Promise<string> {
  const iv = random(12);
  const body = enc.encode(JSON.stringify({ subject: s.subject, note: s.note, tags: s.tags }));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: noteLabel(id) }, key, body));
  return `v1.${toB64(join(iv, sealed))}`;
}

/** Throws when the note was locked with a different key, or was tampered with. */
export async function unseal(key: CryptoKey, id: string, sealed: string): Promise<Secret> {
  if (!sealed.startsWith('v1.')) throw new Error('Unknown note format');
  const bytes = fromB64(sealed.slice(3));
  const body = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12), additionalData: noteLabel(id) }, key, bytes.slice(12));
  const s = JSON.parse(dec.decode(body)) as Partial<Secret>;
  return { subject: String(s.subject ?? ''), note: String(s.note ?? ''), tags: Array.isArray(s.tags) ? s.tags.map(String) : [] };
}

// ---------------- the note key on this device ----------------

const DB = 'rooted-keys';
const STORE = 'keys';
let unlocked: { userId: string; key: CryptoKey } | null = null;
let freshRecovery: { userId: string; code: string } | null = null;
let inflight: Promise<unknown> = Promise.resolve();

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** The note key for this person, if this device has it. */
export async function deviceKey(userId: string): Promise<CryptoKey | null> {
  if (unlocked?.userId === userId) return unlocked.key;
  try {
    const key = await store<CryptoKey | undefined>('readonly', (s) => s.get(userId));
    if (key) unlocked = { userId, key };
    return key ?? null;
  } catch {
    return null;
  }
}

export async function rememberKey(userId: string, key: CryptoKey) {
  unlocked = { userId, key };
  try {
    await store('readwrite', (s) => s.put(key, userId));
  } catch {
    /* private browsing etc.: it stays unlocked until the app is closed */
  }
}

/** Deletes every note key kept on this device (on sign out). */
export async function forgetKeys() {
  unlocked = null;
  freshRecovery = null;
  try {
    await store('readwrite', (s) => s.clear());
  } catch {
    /* nothing stored */
  }
}

/** A recovery key made during sign-in or sign-up, for the app to show once. */
export function offerRecoveryKey(userId: string, code: string) {
  freshRecovery = { userId, code };
}

export function takeRecoveryKey(userId: string): string | null {
  if (freshRecovery?.userId !== userId) return null;
  const { code } = freshRecovery;
  freshRecovery = null;
  return code;
}

/** Runs a sign-in so that anyone asking for the key meanwhile waits until it's unlocked. */
export function whileUnlocking<T>(run: () => Promise<T>): Promise<T> {
  const p = run();
  inflight = p.catch(() => {});
  return p;
}

export const unlockSettled = () => inflight;
