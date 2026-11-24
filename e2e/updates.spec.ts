// The update notice, a letter on a scroll with screenshots: it opens by itself, once, when
// there's a new update (signing in, or opening the app), and from Menu → Updates any time.

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';
import { LATEST_UPDATE, freshBrowser } from './storage';

const SHOTS = 'e2e/screenshots/updates';

// a browser that hasn't read the newest update yet (the other tests start with it read)
test.use({ storageState: freshBrowser });

async function open(page: Page, trial = 'Trial mode · this browser only', path = '/') {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [{ name: 'Grace', streak: 12, lastNoteDaysAgo: 0 }]);
  await page.goto(path);
  if (path === '/') await expect(page.getByText(trial)).toBeVisible();
}

const scrollOf = (page: Page, name = 'What’s new in Rooted') => page.getByRole('dialog', { name });
const seen = (page: Page) => page.evaluate(() => localStorage.getItem('rooted.updatesSeen'));

test('a new update opens by itself, with pictures, once', async ({ page }) => {
  await open(page);
  const scroll = scrollOf(page);
  await expect(scroll).toBeVisible(); // nothing clicked
  await expect(scroll.locator('.scroll-update').first().locator('.scroll-new')).toHaveText('New');
  expect(await seen(page)).toBe(LATEST_UPDATE);
  // the newest: the bombax; before it, folders for notes, Jesus visiting your tree, and the coconut palm
  await expect(scroll.getByRole('heading', { name: 'A new tree: the bombax', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Red flowers over the rice fields of Vietnam' })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Folders for your notes', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: '18 colors and 19 icons' })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Jesus visits your tree', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Your next note grows 3×' })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'A new tree: the coconut palm' })).toBeVisible();
  const visits = scroll.locator('.scroll-section', { has: page.getByRole('heading', { name: 'He walks about and touches your tree' }) });
  await expect(visits.locator('figcaption')).toHaveText(['At an oak', 'Beside a seed', 'At a coconut palm']);
  await expect(scroll.getByRole('heading', { name: 'Twelve new trees', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Lamp posts', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Hide the streak card' })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'The streak lamp' })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Tap the lamp' })).toBeVisible();

  // every screenshot actually loads
  const imgs = scroll.locator('img');
  expect(await imgs.count()).toBeGreaterThanOrEqual(38);
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
  await scroll.locator('.scroll-paper').evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/1-scroll-top.png` });
  await visits.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/1b-scroll-jesus-visits.png` });
  await scroll.getByRole('img', { name: /^A grown coconut palm on a sandy beach/ }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/1c-scroll-coconut-palm.png` });
  await scroll.getByRole('heading', { name: 'Seven flames to reach' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/2-scroll-flames.png` });

  // the twelve new trees' lands, each with its name under it
  const newLands = scroll.locator('.scroll-section', { has: page.getByRole('heading', { name: 'Twelve new trees, twelve new lands' }) });
  await expect(newLands.locator('figcaption')).toHaveText([
    'Argentina', 'Mindanao', 'Socotra, Yemen', 'Madagascar', 'India', 'The southern United States',
    'Colorado', 'Iran', 'Tanzania', 'Eastern China', 'Brazil', 'Chile',
  ]);
  await newLands.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/5-scroll-new-trees.png` });

  // the seven native lands, each with its name under it
  const lands = scroll.locator('.scroll-section', { has: page.getByRole('heading', { name: 'Each tree in its own land' }) });
  await expect(lands.locator('figcaption')).toHaveText(['England', 'Japan', 'Canada', 'Kazakhstan', 'Russia and Finland', 'China', 'The Philippines']);
  await lands.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/4-scroll-lands.png` });

  await page.keyboard.press('Escape');
  await expect(scroll).toBeHidden();
  // read: neither the menu's More folder nor Updates in it says New
  const more = page.getByRole('button', { name: /^More/ });
  await expect(more.locator('.new-tag')).toHaveCount(0);
  await more.click();
  const link = page.getByRole('button', { name: /^Updates/ });
  await expect(link).toBeVisible();
  await expect(link.locator('.new-tag')).toHaveCount(0);

  // opening the app again doesn't open it again (the More folder stays open)
  await page.reload();
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(scroll).toHaveCount(0);
  await expect(link).toBeVisible();
  await expect(link.locator('.new-tag')).toHaveCount(0);

  // it still opens from the menu
  await link.click();
  await expect(scroll).toBeVisible();
});

test('on a phone the scroll that opens by itself fits, and rolls up', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const scroll = scrollOf(page);
  await expect(scroll).toBeVisible();
  await page.waitForTimeout(1000);
  const box = await scroll.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: `${SHOTS}/3-phone.png` });
  await scroll.getByRole('button', { name: 'Roll up the scroll' }).click();
  await expect(scroll).toBeHidden();
  await expect(page.locator('.menu-btn .new-dot')).toHaveCount(0);
});

test('the notice reads in Tagalog too', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rooted.lang', 'tl'));
  await open(page, 'Trial mode · sa browser na ito lang');
  const scroll = scrollOf(page, 'Ano ang bago sa Rooted');
  await expect(scroll.getByRole('heading', { name: 'Mga folder para sa iyong mga tala', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Dinadalaw ni Hesus ang iyong puno', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Bagong puno: ang niyog' })).toBeVisible();
  await expect(scroll).not.toContainText(/Juan 14|sumainyo/); // no Bible verse in the notice
  await expect(scroll.getByRole('heading', { name: 'Mga poste ng ilawan', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Pindutin ang ilawan' })).toBeVisible();
});

test('opened on another page, it waits until the tree is showing', async ({ page }) => {
  await open(page, undefined, '/developer');
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(scrollOf(page)).toHaveCount(0);
  expect(await seen(page)).toBeNull();

  await page.getByRole('button', { name: /Back to Rooted/ }).click();
  await expect(scrollOf(page)).toBeVisible();
});

test('a brand-new account picks its tree and isn’t shown the notice', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await page.goto('/');
  await page.locator('.landing-card').getByRole('button', { name: 'Try now' }).click();
  await page.getByLabel('Username').fill('newbie');
  await page.getByRole('button', { name: 'Plant my tree' }).click();
  await expect(page.locator('.side-brand')).toContainText('newbie');
  await expect(page.getByRole('dialog')).toHaveCount(1); // the first-visit tree picker, alone
  await expect(scrollOf(page)).toHaveCount(0);
  await page.keyboard.press('Escape'); // keeps the oak
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(scrollOf(page)).toHaveCount(0);
  expect(await seen(page)).toBe(LATEST_UPDATE); // the next update is the first one shown

  await page.reload();
  await expect(page.locator('.side-brand')).toContainText('newbie');
  await page.waitForTimeout(800);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
