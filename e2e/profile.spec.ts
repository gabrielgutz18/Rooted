// Menu → My profile opens inside the side menu, in place of the links. For an older account that still signs in with an email: it can add a
// username there (any time after "Not now"), then sign in with it.

import { expect, test } from '@playwright/test';
import { seed } from './seed';

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

  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  await expect(profile).toContainText('Grace');
  await expect(profile.locator('.profile-facts')).toContainText('None yet');
  await expect(profile.locator('.profile-facts')).toContainText('Your email, grace@example.com');
  await expect(profile.locator('.profile-facts')).toContainText('Sakura');
  await expect(profile.locator('.stat-grid')).toContainText('20');
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/profile-add-username.png` });

  // someone else's username is refused
  await profile.getByRole('textbox', { name: /Username/ }).fill('admin');
  await profile.getByRole('button', { name: 'Save username' }).click();
  await expect(profile.getByRole('alert')).toHaveText('That username is taken.');

  await profile.getByRole('textbox', { name: /Username/ }).fill('Grace_G');
  await profile.getByRole('button', { name: 'Save username' }).click();
  await expect(page.getByRole('status')).toHaveText('Done — sign in as “grace_g” from now on.');
  await expect(profile.locator('.profile-facts')).toContainText('Your username, “grace_g”');
  await expect(profile.getByRole('heading', { name: 'Add a username' })).toHaveCount(0);
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/profile-with-username.png` });

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
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  await expect(profile.locator('.profile-facts')).toContainText('Your username, “joy”');
  await expect(profile.getByRole('heading', { name: 'Add a username' })).toHaveCount(0);

  await profile.getByRole('button', { name: 'Change', exact: true }).click();
  await expect(profile).toHaveCount(0);
  await expect(page.getByRole('dialog').first()).toBeVisible(); // the tree picker
});

test('a username can be changed like a handle: checked as you type, and only the new one signs in', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [
      { id: 'grace', name: 'Grace', username: 'grace', is_admin: true, created_at: '2026-01-01T09:00:00.000Z', tree: 'oak' },
      // signed up as "joy", so the display name is the username
      { id: 'joy', name: 'joy', username: 'joy', is_admin: false, created_at: '2026-03-01T09:00:00.000Z', tree: 'pine' },
    ];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'joy' }));
  });
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  await page.getByRole('button', { name: 'My profile' }).click();
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  await expect(profile.locator('.profile-facts')).toContainText('@joy');

  await profile.getByRole('button', { name: 'Change username' }).click();
  const field = profile.getByRole('textbox', { name: /New username/ });
  await expect(field).toBeFocused();
  const save = profile.getByRole('button', { name: 'Save username' });

  await field.fill('Grace');
  await expect(profile.locator('#username-status')).toHaveText('That username is taken.');
  await expect(save).toBeDisabled();

  await field.fill('joy');
  await expect(profile.locator('#username-status')).toHaveText("That's your username now.");
  await expect(save).toBeDisabled();

  await field.fill('Joy_Bells');
  await expect(profile.locator('#username-status')).toHaveText('✓ @joy_bells is available');
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/profile-change-username.png` });
  await save.click();

  await expect(page.getByRole('status')).toHaveText('Done — sign in as “joy_bells” from now on.');
  await expect(profile.locator('.profile-facts')).toContainText('@joy_bells');
  await expect(profile.getByRole('heading', { name: 'Change username' })).toHaveCount(0);
  // the display name was just the old username, so it follows (as typed)
  await expect(page.locator('.side-brand')).toContainText('Joy_Bells');

  // the old username no longer signs in; the new one does
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('tab', { name: 'Sign in' }).click();
  await page.getByLabel('Username').fill('joy');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('No account with that username in this browser.');
  await page.getByLabel('Username').fill('joy_bells');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.side-brand')).toContainText('Joy_Bells');
});

test('Cancel leaves the username as it was', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [
      { id: 'admin', name: 'Pastor', email: 'pastor@example.com', is_admin: true, created_at: '2026-01-01T09:00:00.000Z', tree: 'oak' },
      { id: 'joy', name: 'Joy', username: 'joy', is_admin: false, created_at: '2026-03-01T09:00:00.000Z', tree: 'oak' },
    ];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'joy' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'My profile' }).click();
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  await profile.getByRole('button', { name: 'Change username' }).click();
  await profile.getByRole('textbox', { name: /New username/ }).fill('joyful');
  await profile.getByRole('button', { name: 'Cancel' }).click();
  await expect(profile.getByRole('textbox')).toHaveCount(0);
  await expect(profile.locator('.profile-facts')).toContainText('@joy');
});

test('on a phone the profile opens inside the menu drawer, and the menu reopens on its links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const users = [{ id: 'joy', name: 'Joy', username: 'joy', is_admin: false, created_at: '2026-03-01T09:00:00.000Z', tree: 'sakura' }];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'joy' }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.getByRole('button', { name: 'My profile' }).click();
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  await expect(profile).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0); // not a box in the middle of the page
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/profile-phone.png` });

  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

  // closing the drawer from the profile: it reopens on the links
  await page.getByRole('button', { name: 'My profile' }).click();
  await page.locator('.scrim').click({ position: { x: 370, y: 400 } });
  await page.getByRole('button', { name: /Menu/ }).click();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
});

test("a friend's profile opens in the side menu while visiting their tree, without anything private", async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [
    { name: 'Joy', streak: 1, lastNoteDaysAgo: 0 },
    { name: 'Grace', streak: 3, lastNoteDaysAgo: 0, tree: 'sakura', session: false },
  ]);
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();

  await page.locator('.friend', { hasText: 'Grace' }).click();
  await page.getByRole('button', { name: 'View profile' }).click();
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Grace’s profile' });
  await expect(profile).toBeVisible();
  await expect(profile.locator('.profile-facts')).toContainText('@grace');
  await expect(profile.locator('.profile-facts')).toContainText('Sakura');
  await expect(profile.locator('.stat-grid')).toContainText('4860'); // growth
  await expect(profile.locator('.stat').nth(2)).toContainText('3'); // day streak
  await expect(profile).toContainText('Notes are private');
  await expect(profile).not.toContainText('Sign in with');
  await expect(profile.getByRole('button', { name: /Change/ })).toHaveCount(0);
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/profile-friend.png` });

  await profile.getByRole('button', { name: '← Back' }).click();
  await expect(page.locator('.friend', { hasText: 'Grace' })).toBeVisible();

  // going back to your own tree closes a friend's profile
  await page.getByRole('button', { name: 'View profile' }).click();
  await page.getByRole('button', { name: '← My tree' }).click(); // the hero's button
  await expect(page.locator('#side-menu').getByRole('region')).toHaveCount(0);
});

test("on a phone, View profile opens the menu drawer on the friend's profile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, [
    { name: 'Joy', streak: 1, lastNoteDaysAgo: 0 },
    { name: 'Grace', streak: 3, lastNoteDaysAgo: 0, tree: 'sakura', session: false },
  ]);
  await page.goto('/');
  await page.getByRole('button', { name: /Menu/ }).click();
  await page.locator('.friend', { hasText: 'Grace' }).click();
  await page.getByRole('button', { name: 'View profile' }).click();
  await expect(page.locator('#side-menu').getByRole('region', { name: 'Grace’s profile' })).toBeInViewport();
  await page.screenshot({ path: `${SHOTS}/profile-friend-phone.png` });
});
