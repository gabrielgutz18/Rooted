// The landing page's update notices (src/pages/landing-updates.tsx): the newest update on the
// hero card, and the latest few further down. Each opens the scroll from Menu → Updates at
// that notice. The titles are read from the page, so adding an update doesn't break this.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { freshBrowser } from './storage';

const SHOTS = 'e2e/screenshots/landing-updates';

test.use({ storageState: freshBrowser }); // a visitor who hasn't read the newest update yet

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

const section = (page: Page) => page.locator('section#updates');
const scroll = (page: Page) => page.getByRole('dialog', { name: 'What’s new in Rooted' });

/** The scroll has unrolled with this update's title in view on the paper. */
async function expectOpenAt(page: Page, title: string) {
  const heading = scroll(page).getByRole('heading', { name: title, exact: true, level: 3 });
  await expect(heading).toBeVisible();
  await page.waitForTimeout(1000); // the paper unrolls
  const paper = await scroll(page).locator('.scroll-paper').boundingBox();
  const box = await heading.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(paper!.y);
  expect(box!.y + box!.height).toBeLessThanOrEqual(paper!.y + paper!.height);
}

const titles = (s: Locator) => s.locator('.upd-title').allTextContents();

test('the newest update is on the hero card, and opens the scroll at it', async ({ page }) => {
  await page.goto('/');
  const pill = page.locator('.landing-card .upd-pill');
  await expect(pill).toBeVisible();
  await expect(pill.locator('.upd-pill-tag')).toHaveText(/^(New|Latest)$/);
  const newest = (await titles(section(page)))[0];
  await expect(pill.locator('.upd-pill-title')).toHaveText(newest);
  await page.waitForTimeout(1200);
  await page.locator('.landing-card').screenshot({ path: `${SHOTS}/desktop-card.png` });

  await pill.click();
  await expectOpenAt(page, newest);
  // read here, it isn't "New" in the app's menu later either
  expect(await page.evaluate(() => localStorage.getItem('rooted.updatesSeen'))).toBeTruthy();
  await page.screenshot({ path: `${SHOTS}/desktop-scroll-newest.png` });

  await page.keyboard.press('Escape');
  await expect(scroll(page)).toHaveCount(0);
  await expect(pill).toBeFocused();
});

test('the latest notices further down: each opens the scroll at itself, or all of them from the top', async ({ page }) => {
  await page.goto('/');
  const s = section(page);
  await expect(s.getByRole('heading', { name: 'What’s new in Rooted', level: 2 })).toBeAttached();
  await expect(s.locator('.upd-item')).toHaveCount(3);
  for (const date of await s.locator('time').all()) await expect(date).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  await s.scrollIntoViewIfNeeded();
  for (const img of await s.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  }
  await s.screenshot({ path: `${SHOTS}/desktop-section.png` });

  // the third notice: the scroll opens rolled on to it
  const third = (await titles(s))[2];
  const more = s.getByRole('button', { name: `Read the notice: ${third}` });
  await more.click();
  await expectOpenAt(page, third);
  await page.screenshot({ path: `${SHOTS}/desktop-scroll-third.png` });
  await scroll(page).getByRole('button', { name: 'Close' }).click();
  await expect(scroll(page)).toHaveCount(0);
  await expect(more).toBeFocused();

  // all of them, from the top of the letter
  await s.getByRole('button', { name: /^Unroll all \d+ updates$/ }).click();
  await expect(scroll(page).locator('.scroll-greeting')).toBeInViewport();
  expect(await scroll(page).locator('.scroll-paper').evaluate((el) => el.scrollTop)).toBe(0);
  await scroll(page).getByRole('button', { name: 'Roll up the scroll' }).click();
  await expect(scroll(page)).toHaveCount(0);

  // and from the footer
  await page.locator('.landing-foot').getByRole('button', { name: 'Updates' }).click();
  await expect(scroll(page)).toBeVisible();
});

test('in Tagalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tagalog' }).click();
  const s = section(page);
  await expect(s.getByRole('heading', { name: 'Ano ang bago sa Rooted', level: 2 })).toBeAttached();
  await expect(page.locator('.upd-pill-tag')).toHaveText(/^(Bago|Pinakabago)$/);
  await expect(s.getByRole('button', { name: /^Buksan ang lahat ng \d+ update$/ })).toBeVisible();
  await s.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await s.screenshot({ path: `${SHOTS}/desktop-section-tl.png` });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the notices fit the screen, with each picture above its notice', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.upd-pill')).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/phone-hero.png` });

    const s = section(page);
    await s.scrollIntoViewIfNeeded();
    for (const img of await s.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const item = s.locator('.upd-item.has-pic').first();
    const pic = await item.locator('.upd-photo').boundingBox();
    const title = await item.locator('.upd-title').boundingBox();
    expect(pic!.y + pic!.height).toBeLessThan(title!.y);
    await s.screenshot({ path: `${SHOTS}/phone-section.png` });

    await s.locator('.upd-more').nth(1).tap();
    await expect(scroll(page)).toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/phone-scroll.png` });
  });
});
