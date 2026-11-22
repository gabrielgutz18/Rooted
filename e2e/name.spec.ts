// Menu → My profile → Your name: put your real name, the one friends see beside your tree.
// You still sign in with your username. (src/lib/names.ts, src/components/ProfilePanel.tsx)

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

const SHOTS = 'e2e/screenshots/name';

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

/** Grace is signed in; Mark is a friend in the same browser. */
async function open(page: Page) {
  await seed(page, [
    { name: 'Grace', streak: 3, lastNoteDaysAgo: 0 },
    { name: 'Mark', streak: 5, lastNoteDaysAgo: 0, session: false, tree: 'sakura' },
  ]);
  await page.goto('/');
  await expect(page.getByText(/^Trial mode · (this browser only|sa browser na ito lang)$/)).toBeAttached();
}

const profile = (page: Page, name = 'Your profile') => page.locator('#side-menu').getByRole('region', { name });

test('put your real name: it shows in the menu and your profile, and friends see it', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'My profile' }).click();
  const p = profile(page);
  // a new account's name is just its username
  const row = p.locator('.profile-facts > div', { hasText: 'Your name' });
  await expect(row.locator('dd')).toContainText('Grace · same as your username');

  await p.getByRole('button', { name: 'Change your name' }).click();
  await expect(p.getByText('Put your real name so your friends know it’s you. You still sign in with @grace.')).toBeVisible();
  const field = p.getByRole('textbox', { name: 'Name' });
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(''); // not the username: a real name starts fresh
  await expect(field).toHaveAttribute('placeholder', 'e.g. Juan Dela Cruz');
  await field.fill('  Grace   Santos ');
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/1-typing-your-name.png` });
  await p.getByRole('button', { name: 'Save name' }).click();

  // spaces tidied, and it shows everywhere straight away
  await expect(page.getByRole('status')).toHaveText('Saved — your friends now see you as “Grace Santos”.');
  await expect(p.locator('#name-form')).toHaveCount(0);
  await expect(row.locator('dd')).toContainText('Grace Santos');
  await expect(row.locator('dd')).not.toContainText('same as your username');
  await expect(p.locator('.profile-name')).toHaveText('Grace Santos');
  await expect(page.locator('.side-brand')).toContainText('Grace Santos');
  await expect(p.locator('.profile-facts')).toContainText('@grace'); // the username stays
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/2-name-saved.png` });

  // kept after a reload
  await page.reload();
  await expect(page.locator('.side-brand')).toContainText('Grace Santos');

  // a friend sees the new name in their list; Grace still signs in with her username
  // (trial mode signs in with just the username)
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill('mark');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.friend', { hasText: 'Grace Santos' })).toBeVisible();
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/3-friend-sees-it.png` });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill('grace');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.side-brand')).toContainText('Grace Santos');
});

test('an empty name asks for one; Cancel leaves it as it was', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'My profile' }).click();
  const p = profile(page);
  await p.getByRole('button', { name: 'Change your name' }).click();
  const field = p.getByRole('textbox', { name: 'Name' });
  await field.fill('   ');
  await p.getByRole('button', { name: 'Save name' }).click();
  await expect(p.getByRole('alert')).toHaveText('Write your name, up to 40 letters.');
  // at most 40 letters can be typed
  await field.fill('x'.repeat(60));
  await expect(field).toHaveValue('x'.repeat(40));

  await p.getByRole('button', { name: 'Cancel' }).click();
  await expect(p.locator('#name-form')).toHaveCount(0);
  await expect(page.locator('.side-brand')).toContainText('Grace');
  await expect(page.locator('.side-brand')).not.toContainText('xxxx');
});

test('changing the username afterwards keeps your real name', async ({ page }) => {
  // a member (not the admin, who keeps the email) can change the username too
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [
      { id: 'admin', name: 'Pastor', email: 'pastor@example.com', is_admin: true, created_at: '2026-01-01T09:00:00.000Z', tree: 'oak' },
      { id: 'joy', name: 'Joy Reyes', username: 'joy', is_admin: false, created_at: '2026-03-01T09:00:00.000Z', tree: 'oak' },
    ];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'joy' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'My profile' }).click();
  const p = profile(page);
  await expect(p.locator('.profile-facts > div', { hasText: 'Your name' }).locator('dd')).toContainText('Joy Reyes');
  await p.getByRole('button', { name: 'Change username' }).click();
  await p.getByRole('textbox', { name: /New username/ }).fill('joy_bells');
  await expect(p.locator('#username-status')).toHaveText('✓ @joy_bells is available');
  await p.getByRole('button', { name: 'Save username' }).click();
  await expect(p.locator('.profile-facts')).toContainText('@joy_bells');
  await expect(page.locator('.side-brand')).toContainText('Joy Reyes'); // not swapped for the username
});

test('in Tagalog, on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('rooted.lang', 'tl'));
  await open(page);
  await page.locator('.menu-btn').click();
  await page.getByRole('button', { name: 'Aking profile' }).click();
  const p = profile(page, 'Iyong profile');
  await expect(p.locator('.profile-facts > div', { hasText: 'Iyong pangalan' }).locator('dd')).toContainText('kapareho ng iyong username');
  await p.getByRole('button', { name: 'Palitan ang iyong pangalan' }).click();
  await expect(p.getByText(/@grace pa rin ang gamit mo sa pag-sign in/)).toBeVisible();
  await p.getByRole('textbox', { name: 'Pangalan' }).fill('Grace Santos');
  await page.screenshot({ path: `${SHOTS}/4-phone-tagalog.png` });
  await p.getByRole('button', { name: 'I-save ang pangalan' }).click();
  await expect(page.getByRole('status')).toHaveText('Na-save — “Grace Santos” na ang nakikita ng iyong mga kaibigan.');
  // nothing wider than the screen
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
