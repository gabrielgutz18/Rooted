// Opening the app with no connection (cloud mode, against a made-up Supabase project that
// is cut off from the network — see playwright.config.ts).
//
// The sign-in kept on the device has expired, as it does an hour after the last visit.
// Supabase can't refresh it offline, but the app must still open straight to your tree
// from last time: not hang on "Planting…", not ask you to sign in, not forget the sign-in.

import { expect, test, type Page } from '@playwright/test';

const SESSION_KEY = 'sb-e2e-offline-auth-token'; // supabase-js: sb-<project ref>-auth-token
const USER = 'e2e-offline-user';

function restore({ sessionKey, userId }: { sessionKey: string; userId: string }) {
  const now = Math.floor(Date.now() / 1000);
  localStorage.setItem(
    sessionKey,
    JSON.stringify({
      access_token: 'expired-access-token',
      refresh_token: 'kept-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now - 7200, // expired two hours ago
      user: { id: userId, email: 'grace@rooted.invalid', aud: 'authenticated', role: 'authenticated' },
    }),
  );
  const me = {
    id: userId, display_name: 'Grace', username: 'grace', is_admin: false, tree: 'oak',
    points: 120, entry_count: 3, last_entry_at: new Date().toISOString(), created_at: '2026-01-05T10:00:00.000Z',
  };
  localStorage.setItem(`rooted.cache.v1.${userId}`, JSON.stringify({ me, entries: [], people: [me] }));
}

async function open(page: Page, { online }: { online: boolean }) {
  page.on('pageerror', (err) => {
    throw err;
  });
  // the made-up Supabase project never answers, like a phone with no signal
  await page.route('https://e2e-offline.supabase.co/**', (route) => route.abort('internetdisconnected'));
  if (!online) await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false }));
  await page.addInitScript(restore, { sessionKey: SESSION_KEY, userId: USER });
  await page.goto('/');
}

async function expectGarden(page: Page, within: number) {
  // (desktop width: the side menu is always open)
  await expect(page.locator('.side-brand')).toContainText('Grace', { timeout: within });
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveCount(0);
  await expect(page.locator('.splash')).toHaveCount(0);
}

test('offline: opens straight to the tree from last time', async ({ page }) => {
  await open(page, { online: false });
  await expectGarden(page, 3000);
  await expect(page.getByRole('alert')).toContainText("Couldn't reach the server — showing your tree from last time.", { timeout: 15000 });
  // the sign-in is still kept, so the app signs straight back in when the connection returns
  expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY)).toContain('kept-refresh-token');
});

test('a connection that hangs: still opens to the tree within a few seconds', async ({ page }) => {
  await open(page, { online: true });
  await expectGarden(page, 9000);
  expect(await page.evaluate((k) => localStorage.getItem(k), SESSION_KEY)).toContain('kept-refresh-token');
});

test('offline after a reload: still signed in', async ({ page }) => {
  await open(page, { online: false });
  await expectGarden(page, 3000);
  await page.reload();
  await expectGarden(page, 3000);
});
