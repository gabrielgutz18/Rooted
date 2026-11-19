// The landing page's pictures of the app (src/pages/landing-showcase.tsx): every picture
// loads and says what it shows, the nav bar's Screenshots link goes to them, they speak
// Tagalog, and on a phone nothing is wider than the screen.
// (The pictures themselves are taken by e2e/showcase.shots.ts.)

import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'e2e/screenshots/landing';
// the fixed navigation bar would be drawn over a section's picture
const NO_BAR = '.landing-nav { visibility: hidden; }';

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

/** Scroll each picture into view (they load lazily), then check they all loaded. */
async function expectPicturesLoaded(page: Page) {
  const imgs = page.locator('.show img');
  await expect(imgs).toHaveCount(14); // 2 devices, 8 in the closer look (3 of them the stages), 4 hours
  for (const img of await imgs.all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
  }
  // every picture describes itself, except the three stages (described together)
  expect(await page.locator('.show img:not([alt]), .show img[alt=""]').count()).toBe(3);
  await expect(page.getByRole('img', { name: 'The same sakura tree as a sprout, a sapling and a grown tree.' })).toBeAttached();
}

test('the pictures of the app load, and Screenshots in the nav bar goes to them', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: /main/i }).getByRole('button', { name: 'Screenshots' }).click();
  await expect(page.getByRole('heading', { name: 'See it grow' })).toBeInViewport();
  // not hidden under the fixed bar
  const top = await page.locator('#see-it').evaluate((el) => el.getBoundingClientRect().top);
  const bar = await page.locator('.landing-nav').evaluate((el) => el.getBoundingClientRect().bottom);
  expect(top).toBeGreaterThanOrEqual(bar);

  await expect(page.getByRole('img', { name: /^Rooted on a computer/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Rooted on a phone/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A closer look' })).toBeAttached();
  await expect(page.getByRole('heading', { name: /trees from around the world$/ })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Morning to night' })).toBeAttached();
  await expectPicturesLoaded(page);

  await page.locator('#see-it').screenshot({ path: `${SHOTS}/showcase-devices.png`, style: NO_BAR });
  await page.locator('.show').nth(1).screenshot({ path: `${SHOTS}/showcase-tour.png`, style: NO_BAR });
});

test('the pictures in Tagalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tagalog' }).first().click();
  await expect(page.getByRole('heading', { name: 'Panoorin itong lumago' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Mas malapitang tingin' })).toBeAttached();
  await expect(page.getByRole('img', { name: /^Ang Rooted sa computer/ })).toBeAttached();
  // the stage names come from the app's own words
  await expect(page.locator('.show-stage .tag')).toHaveText(['Usbong', 'Batang Puno', 'Ganap na Puno']);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the pictures fit the screen', async ({ page }) => {
    await page.goto('/');
    await page.locator('#see-it').scrollIntoViewIfNeeded();
    await expectPicturesLoaded(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.locator('#see-it').screenshot({ path: `${SHOTS}/showcase-phone-devices.png`, style: NO_BAR });
    await page.locator('.show').nth(1).screenshot({ path: `${SHOTS}/showcase-phone-tour.png`, style: NO_BAR });
  });
});
