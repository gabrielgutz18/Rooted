// A last-seen copy of your tree, notes and friends list, kept on this device so the app
// opens straight to your tree (and still shows it offline) while fresh data loads.
// Only used with Supabase; trial mode already keeps everything in the browser.
// Cleared when you sign out, so the next person on a shared device can't see it.

import type { Entry, Profile } from './backend';

export interface Snapshot {
  me: Profile | null;
  entries: Entry[];
  people: Profile[];
}

const PREFIX = 'rooted.cache.v1.';

export function readSnapshot(userId: string): Snapshot | null {
  try {
    const s = JSON.parse(localStorage.getItem(PREFIX + userId) ?? 'null') as Snapshot | null;
    return s && Array.isArray(s.entries) && Array.isArray(s.people) ? s : null;
  } catch {
    return null;
  }
}

export function writeSnapshot(userId: string, s: Snapshot) {
  try {
    localStorage.setItem(PREFIX + userId, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the app still works, it just loads from the network */
  }
}

export function clearSnapshots() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* nothing to clear */
  }
}
