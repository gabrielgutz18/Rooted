// Notes written while offline wait here, on this device, until they can be uploaded.
// Each keeps the id it was given and the time it was written, so uploading it later
// (even twice, after a dropped connection) saves exactly one note with the right date.

import type { Entry, EntryInput } from './backend';

export interface PendingNote extends EntryInput {
  id: string;
  created_at: string;
}

const PREFIX = 'rooted.outbox.v1.';

export function readOutbox(userId: string): PendingNote[] {
  try {
    const list = JSON.parse(localStorage.getItem(PREFIX + userId) ?? '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeOutbox(userId: string, list: PendingNote[]) {
  if (list.length) localStorage.setItem(PREFIX + userId, JSON.stringify(list));
  else localStorage.removeItem(PREFIX + userId);
}

/** Throws if this browser can't store it — then the note must not be reported as saved. */
export function addToOutbox(userId: string, input: EntryInput, id: string): PendingNote {
  const note: PendingNote = { ...input, id, created_at: new Date().toISOString() };
  try {
    writeOutbox(userId, [...readOutbox(userId), note]);
  } catch {
    throw new Error("You're offline and this browser couldn't keep the note. Copy it somewhere safe and try again when you're online.");
  }
  return note;
}

export function removeFromOutbox(userId: string, id: string) {
  try {
    writeOutbox(userId, readOutbox(userId).filter((n) => n.id !== id));
  } catch {
    /* it will just be uploaded again, and the server keeps one copy */
  }
}

export function clearOutbox(userId: string) {
  try {
    localStorage.removeItem(PREFIX + userId);
  } catch {
    /* nothing to clear */
  }
}

export const asEntry = (n: PendingNote): Entry => ({ ...n, pending: true });

/** Gives up waiting on a request after `ms` (a connection that hangs counts as offline). */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))]);
}

/** Waiting notes plus the saved ones, newest first, without doubles. */
export function withPending(saved: Entry[], pending: PendingNote[]): Entry[] {
  const ids = new Set(saved.map((e) => e.id));
  return [...pending.filter((n) => !ids.has(n.id)).map(asEntry), ...saved].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** True when a request failed because there's no connection (not because it was refused). */
export function isOffline(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const m = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : String(err);
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected|timed out/i.test(m);
}
