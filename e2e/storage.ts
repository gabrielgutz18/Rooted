// What the browser holds when a test starts (Playwright's `storageState`).
//
// The app opens the newest update notice by itself, once per browser (src/App.tsx), and it
// would cover the page in every test that signs in. So tests start with it already read, as
// after anyone's first visit; e2e/updates.spec.ts starts with nothing to test the notice itself.

import { readFileSync } from 'node:fs';

// read from the source, since src/lib/updates.ts imports pictures Playwright can't load
export const LATEST_UPDATE = /export const UPDATES[^=]*=\s*\[\s*\{\s*id:\s*'([^']+)'/.exec(readFileSync('src/lib/updates.ts', 'utf8'))?.[1] ?? '';
if (!LATEST_UPDATE) throw new Error('e2e/storage.ts: no update id found at the top of UPDATES in src/lib/updates.ts');

/** The newest update read, on the dev servers at these ports. */
export const updatesRead = (...ports: number[]) => ({
  cookies: [],
  origins: ports.map((port) => ({ origin: `http://localhost:${port}`, localStorage: [{ name: 'rooted.updatesSeen', value: LATEST_UPDATE }] })),
});

/** A browser that has never opened Rooted. */
export const freshBrowser = { cookies: [], origins: [] };
