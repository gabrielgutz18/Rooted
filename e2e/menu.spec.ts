// The side menu (src/App.tsx, src/components/MenuFolder.tsx): three big links for you and your
// tree, and the rest tucked into a More folder that opens and shuts and is remembered.

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

const SHOTS = 'e2e/screenshots/menu';

async function open(page: Page, trial = /^Trial mode · (this browser only|sa browser na ito lang)$/) {
  page.on('pageerror', (err) => {
    throw err;
  });
  // Grace is the admin (the first account), so Admin · users is in the folder too
  await seed(page, [{ name: 'Grace', streak: 3, lastNoteDaysAgo: 0 }]);
  await page.goto('/');
  await expect(page.getByText(trial)).toBeAttached();
}

const side = (page: Page) => page.locator('#side-menu');
const nav = (page: Page) => side(page).getByRole('navigation');
const folder = (page: Page) => nav(page).getByRole('button', { name: /^More/ });
const inside = (page: Page) => page.locator('#side-more .side-sub');

test('the menu shows three links and a More folder; the folder opens, shuts, and is remembered', async ({ page }) => {
  await open(page);
  // shut: just the three big links and the folder
  await expect(nav(page).locator('.side-link')).toHaveText([/^My tree/, /^My profile/, /^Choose tree · Oak/, /^More/]);
  await expect(folder(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(folder(page).locator('.new-tag')).toHaveText('New'); // an update inside hasn't been read
  await expect(page.getByRole('button', { name: 'About the developer' })).toHaveCount(0);
  await page.waitForTimeout(400);
  await side(page).screenshot({ path: `${SHOTS}/1-folder-shut.png` });

  // open: the rest, as a light list under it
  await folder(page).click();
  await expect(folder(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(inside(page)).toHaveText([/^Updates\s*New$/, 'Install app', 'Admin · users', 'About the developer']);
  await expect(folder(page).locator('.new-tag')).toHaveCount(0); // it's on Updates now
  // the folder's links are lighter than the big ones: no box around them until hovered
  const shadow = await inside(page).first().evaluate((el) => getComputedStyle(el).boxShadow);
  expect(shadow).toBe('none');
  await page.waitForTimeout(400);
  await side(page).screenshot({ path: `${SHOTS}/2-folder-open.png` });

  // remembered after a reload
  await page.reload();
  await expect(folder(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(inside(page)).toHaveCount(4);

  // and shut again
  await folder(page).click();
  await expect(inside(page)).toHaveCount(0);
  await page.reload();
  await expect(folder(page)).toHaveAttribute('aria-expanded', 'false');
});

test('a link in the folder still works, and shows it is the page you are on', async ({ page }) => {
  await open(page);
  await folder(page).click();
  await page.getByRole('button', { name: 'Admin · users' }).click();
  await expect(page.getByRole('button', { name: 'Admin · users' })).toHaveClass(/is-on/);
  await expect(nav(page).getByRole('button', { name: /^My tree/ })).not.toHaveClass(/is-on/);
  await page.waitForTimeout(300);
  await side(page).screenshot({ path: `${SHOTS}/2b-admin-page.png` });
  await nav(page).getByRole('button', { name: /^My tree/ }).click();
  await expect(nav(page).getByRole('button', { name: /^My tree/ })).toHaveClass(/is-on/);
});

test('in the phone menu, and in Tagalog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('rooted.lang', 'tl'));
  await open(page);
  await page.locator('.menu-btn').click();
  const more = nav(page).getByRole('button', { name: /^Iba pa/ });
  await expect(more).toBeVisible();
  await more.click();
  await expect(inside(page)).toHaveText([/^Mga update/, 'I-install ang app', 'Admin · mga user', 'Tungkol sa developer']);
  // everything fits the drawer
  const drawer = (await side(page).boundingBox())!;
  for (const b of await inside(page).all()) {
    const box = (await b.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(drawer.x + drawer.width);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/3-phone-tagalog.png` });
});
