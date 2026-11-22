// Menu → Updates: the update notice, a letter on a scroll with screenshots.

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

const SHOTS = 'e2e/screenshots/updates';

async function open(page: Page, trial = 'Trial mode · this browser only') {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [{ name: 'Grace', streak: 12, lastNoteDaysAgo: 0 }]);
  await page.goto('/');
  await expect(page.getByText(trial)).toBeVisible();
}

test('the update notice opens as a scroll, with pictures, and stops saying New once read', async ({ page }) => {
  await open(page);
  // Updates is in the menu's More folder, which says New while it's shut
  const folder = page.getByRole('button', { name: /^More/ });
  await expect(folder.locator('.new-tag')).toHaveText('New');
  await folder.click();
  const link = page.getByRole('button', { name: /^Updates/ });
  await expect(link.locator('.new-tag')).toHaveText('New');

  await link.click();
  const scroll = page.getByRole('dialog', { name: 'What’s new in Rooted' });
  await expect(scroll).toBeVisible();
  // the newest: Jesus visiting your tree, and the coconut palm
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
  await expect(link.locator('.new-tag')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Updates/ }).locator('.new-tag')).toHaveCount(0);
});

test('on a phone the scroll fits and the menu shows a dot for new updates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator('.menu-btn .new-dot')).toBeVisible();
  await page.locator('.menu-btn').click();
  await page.getByRole('button', { name: /^More/ }).click();
  await page.getByRole('button', { name: /^Updates/ }).click();
  const scroll = page.getByRole('dialog', { name: 'What’s new in Rooted' });
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
  await page.getByRole('button', { name: /^Iba pa/ }).click();
  await page.getByRole('button', { name: /^Mga update/ }).click();
  const scroll = page.getByRole('dialog', { name: 'Ano ang bago sa Rooted' });
  await expect(scroll.getByRole('heading', { name: 'Dinadalaw ni Hesus ang iyong puno', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Bagong puno: ang niyog' })).toBeVisible();
  await expect(scroll).not.toContainText(/Juan 14|sumainyo/); // no Bible verse in the notice
  await expect(scroll.getByRole('heading', { name: 'Mga poste ng ilawan', exact: true })).toBeVisible();
  await expect(scroll.getByRole('heading', { name: 'Pindutin ang ilawan' })).toBeVisible();
});
