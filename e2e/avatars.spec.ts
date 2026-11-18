// Profile icons: pick a pixel picture and a background colour in My profile; it shows
// beside your name, in your friends' list and on your profile, and it stays after a reload.

import { expect, test } from '@playwright/test';
import { AVATAR_IDS, BACKDROP_IDS } from '../src/lib/avatars';

const SHOTS = 'e2e/screenshots/avatars';

test('pick a profile icon and background; friends see theirs in the list and on their profile', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.addInitScript(() => {
    if (sessionStorage.getItem('e2e.seeded')) return;
    sessionStorage.setItem('e2e.seeded', '1');
    const at = '2026-02-14T09:00:00.000Z';
    const users = [
      { id: 'grace', name: 'Grace', username: 'grace', is_admin: true, created_at: at, tree: 'oak' },
      { id: 'ana', name: 'Ana', username: 'ana', is_admin: false, created_at: at, tree: 'sakura', avatar: 'djcat' },
      { id: 'ben', name: 'Ben', username: 'ben', is_admin: false, created_at: at, tree: 'pine' },
      { id: 'cy', name: 'Cy', username: 'cy', is_admin: false, created_at: at, tree: 'maple', avatar: 'coolcat.lemon' },
    ];
    const entries = [{ id: 'n1', user_id: 'grace', subject: 'Prayer', note: 'Prayed for my family.', points: 20, tags: [], created_at: new Date().toISOString() }];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries, session: 'grace' }));
  });
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  const menu = page.locator('#side-menu');
  const mine = menu.locator('.side-me .avatar');

  // no icon yet: the first letter of the name, on the app's own colour
  await expect(mine).toHaveClass(/avatar-letter/);
  await expect(mine).toHaveText('G');
  // Ana chose the DJ cat, Cy the cool cat on lemon; Ben hasn't chosen, so his letter shows
  await expect(menu.locator('.friend', { hasText: 'Ana' }).locator('.avatar')).not.toHaveClass(/avatar-letter/);
  await expect(menu.locator('.friend', { hasText: 'Cy' }).locator('.avatar')).not.toHaveClass(/avatar-letter/);
  await expect(menu.locator('.friend', { hasText: 'Ben' }).locator('.avatar')).toHaveText('B');
  await menu.locator('.friend-list').screenshot({ path: `${SHOTS}/friends.png` });

  await page.getByRole('button', { name: /My profile/ }).click();
  const profile = menu.getByRole('region', { name: 'Your profile' });
  await expect(profile.locator('.profile-row', { hasText: 'No icon' })).toBeVisible();
  await profile.getByRole('button', { name: 'Change your icon' }).click();

  const picker = profile.getByRole('region', { name: 'Choose your icon' });
  const icons = picker.getByRole('group', { name: 'Your icon' });
  const colours = picker.getByRole('group', { name: 'Background' });
  await expect(icons.getByRole('button')).toHaveCount(AVATAR_IDS.length + 1);
  await expect(colours.getByRole('button')).toHaveCount(BACKDROP_IDS.length + 1);
  await expect(icons.getByRole('button', { name: 'Show the first letter of your name instead' })).toBeFocused();

  // an icon on its own colour
  await icons.getByRole('button', { name: 'Icon: DJ cat' }).click();
  await expect(icons.getByRole('button', { name: 'Icon: DJ cat' })).toHaveAttribute('aria-pressed', 'true');
  await expect(profile.getByRole('img', { name: 'Grace’s icon' })).not.toHaveClass(/avatar-letter/);
  await expect(profile.locator('.profile-facts')).toContainText('DJ cat · Navy');
  await page.waitForTimeout(200);
  await menu.screenshot({ path: `${SHOTS}/picker.png` });

  // then another colour
  await colours.getByRole('button', { name: 'Background: Rose' }).click();
  await expect(profile.locator('.profile-facts')).toContainText('DJ cat · Rose');
  await profile.getByRole('button', { name: 'Done' }).click();
  await expect(picker).toHaveCount(0);
  await expect(mine).not.toHaveClass(/avatar-letter/);
  await menu.screenshot({ path: `${SHOTS}/profile.png` });

  // kept after a reload, and marked as chosen in the picker
  await page.reload();
  await expect(mine).not.toHaveClass(/avatar-letter/);
  await page.getByRole('button', { name: /My profile/ }).click();
  await expect(profile.locator('.profile-facts')).toContainText('DJ cat · Rose');
  await profile.getByRole('button', { name: 'Change your icon' }).click();
  await expect(icons.getByRole('button', { name: 'Icon: DJ cat' })).toHaveAttribute('aria-pressed', 'true');
  await expect(colours.getByRole('button', { name: 'Background: Rose' })).toHaveAttribute('aria-pressed', 'true');

  // the first letter on a colour, then back to nothing at all
  await icons.getByRole('button', { name: 'Show the first letter of your name instead' }).click();
  await colours.getByRole('button', { name: 'Background: Mint' }).click();
  await expect(mine).toHaveText('G');
  await expect(mine).not.toHaveClass(/avatar-plain/);
  await colours.getByRole('button', { name: 'Background: the icon’s own colour' }).click();
  await expect(mine).toHaveClass(/avatar-plain/);
  await expect(profile.locator('.profile-row', { hasText: 'No icon' })).toBeVisible();
  await page.keyboard.press('Escape');

  // a friend's profile shows their icon, without a picker
  await menu.locator('.friend', { hasText: 'Ana' }).click();
  await page.getByRole('button', { name: 'View profile' }).click();
  const theirs = menu.getByRole('region', { name: 'Ana’s profile' });
  await expect(theirs.getByRole('img', { name: 'Ana’s icon' })).not.toHaveClass(/avatar-letter/);
  await expect(theirs.getByRole('button', { name: 'Change your icon' })).toHaveCount(0);
});
