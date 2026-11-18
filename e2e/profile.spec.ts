// Menu → My profile, for an older account that still signs in with an email: it can add a
// username there (any time after "Not now"), then sign in with it.

import { expect, test } from '@playwright/test';

const SHOTS = 'e2e/screenshots';

test('an older email account adds a username from its profile, then signs in with it', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [
      { id: 'admin', name: 'Pastor', username: 'admin', is_admin: true, created_at: '2026-01-01T09:00:00.000Z', tree: 'oak' },
      // made before usernames existed: an email, no username
      { id: 'grace', name: 'Grace', email: 'grace@example.com', is_admin: false, created_at: '2026-02-14T09:00:00.000Z', tree: 'sakura' },
    ];
    const entries = [{ id: 'n1', user_id: 'grace', subject: 'Prayer', note: 'Prayed for my family.', points: 20, tags: [], created_at: new Date().toISOString() }];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries, session: 'grace' }));
  });
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();

  // asked once after signing in; "Not now" leaves it for the profile
  await expect(page.getByRole('dialog', { name: 'Pick a username' })).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();

  const menuLink = page.getByRole('button', { name: /My profile/ });
  await expect(menuLink).toContainText('Add username');
  await menuLink.click();

  const profile = page.getByRole('dialog', { name: 'Your profile' });
  await expect(profile).toContainText('Grace');
  await expect(profile.locator('.profile-facts')).toContainText('None yet');
  await expect(profile.locator('.profile-facts')).toContainText('Your email, grace@example.com');
  await expect(profile.locator('.profile-facts')).toContainText('Sakura');
  await expect(profile.locator('.stat-grid')).toContainText('20');
  await profile.screenshot({ path: `${SHOTS}/profile-add-username.png` });

  // someone else's username is refused
  await profile.getByRole('textbox', { name: /Username/ }).fill('admin');
  await profile.getByRole('button', { name: 'Save username' }).click();
  await expect(profile.getByRole('alert')).toHaveText('That username is taken.');

  await profile.getByRole('textbox', { name: /Username/ }).fill('Grace_G');
  await profile.getByRole('button', { name: 'Save username' }).click();
  await expect(page.getByRole('status')).toHaveText('Done — sign in as “grace_g” from now on.');
  await expect(profile.locator('.profile-facts')).toContainText('Your username, “grace_g”');
  await expect(profile.getByRole('heading', { name: 'Add a username' })).toHaveCount(0);
  await profile.screenshot({ path: `${SHOTS}/profile-with-username.png` });

  await page.keyboard.press('Escape');
  await expect(profile).toHaveCount(0);
  await expect(menuLink).not.toContainText('Add username');

  // and the username signs in
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill('grace_g');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.side-brand')).toContainText('Grace');
  await expect(page.getByRole('dialog', { name: 'Pick a username' })).toHaveCount(0);
});

test('the profile opens from the menu for a username account and can change the tree', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [{ id: 'joy', name: 'Joy', username: 'joy', is_admin: false, created_at: '2026-03-01T09:00:00.000Z', tree: 'oak' }];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'joy' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'My profile' }).click();
  const profile = page.getByRole('dialog', { name: 'Your profile' });
  await expect(profile.locator('.profile-facts')).toContainText('Your username, “joy”');
  await expect(profile.getByRole('heading', { name: 'Add a username' })).toHaveCount(0);

  await profile.getByRole('button', { name: 'Change' }).click();
  await expect(profile).toHaveCount(0);
  await expect(page.getByRole('dialog').first()).toBeVisible(); // the tree picker
});
