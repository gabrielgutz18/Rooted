// Fills trial mode's browser storage (src/lib/backend.ts, key 'rooted.v2') with made-up
// accounts and notes, so a test can start from "9 days in a row" or "8 days without a note".

import type { Page } from '@playwright/test';

export interface SeedUser {
  name: string;
  /** Days in a row with a note, ending `lastNoteDaysAgo` days ago. */
  streak: number;
  lastNoteDaysAgo: number;
  tree?: string;
  /** false: an account that exists but isn't the one signed in (a friend). */
  session?: boolean;
  /** Points from one older note, before the streak. Default 4800 (a full tree); 0 for none. */
  headStart?: number;
  /** Points for each streak note, the newest day first. Default 20 each. */
  notePoints?: number[];
}

// Runs in the browser, so "days ago" uses the browser's own time zone, like the app.
// It must not use anything from outside itself: Playwright sends its source to the page.
function build({ users, once }: { users: SeedUser[]; once: boolean }) {
  if (once) {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
  }
  const now = new Date();
  const at = (daysAgo: number) =>
    // past days at noon; today just after midnight, so it's never in the future
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, daysAgo ? 12 : 0, daysAgo ? 0 : 1).toISOString();
  const db = { users: [] as unknown[], entries: [] as unknown[], session: null as string | null };
  users.forEach((u, k) => {
    const id = `e2e-user-${k}`;
    db.users.push({ id, name: u.name, username: u.name.toLowerCase(), is_admin: k === 0, created_at: at(400), tree: u.tree ?? 'oak' });
    if (u.session !== false && !db.session) db.session = id;
    // one big old note grows the tree, well before the streak (so it doesn't join it)
    const headStart = u.headStart ?? 4800;
    if (headStart > 0)
      db.entries.push({ id: `${id}-old`, user_id: id, subject: 'Planted', note: 'An older note.', points: headStart, tags: [], created_at: at(u.lastNoteDaysAgo + u.streak + 30) });
    for (let i = 0; i < u.streak; i++)
      db.entries.push({ id: `${id}-${i}`, user_id: id, subject: `Day ${i}`, note: 'Prayed and read the Bible.', points: u.notePoints?.[i] ?? 20, tags: [], created_at: at(u.lastNoteDaysAgo + i) });
  });
  localStorage.setItem('rooted.v2', JSON.stringify(db));
}

/**
 * Seed before the app loads (once per test, so a reload keeps what the test did), or
 * right now on the open page with `now`.
 */
export async function seed(page: Page, users: SeedUser[], now = false) {
  if (now) return page.evaluate(build, { users, once: false });
  await page.addInitScript(build, { users, once: true });
}
