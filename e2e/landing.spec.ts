// The landing page: someone who isn't signed in opens the link and sees what Rooted is, with
// Try now and Install. Try now / Sign in open the form, and Back returns to the landing page.
// Someone signed in, or the installed app, never sees it.

import { expect, test, type Page } from '@playwright/test';

const SHOTS = 'e2e/screenshots/landing';

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

// (its name, "Main", is translated too)
const nav = (page: Page) => page.locator('nav#landing-links');
const card = (page: Page) => page.locator('.landing-card');

test('a visitor sees the landing page; Try now opens sign-up and Back returns', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Rooted', level: 1 })).toBeVisible();
  await expect(card(page).getByRole('button', { name: 'Try now' })).toBeVisible();
  await expect(card(page).getByRole('button', { name: 'Install' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeAttached();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveCount(0);

  // the tree grows a stage at a time (a busy computer may only catch it a stage or two in)
  const stage = page.locator('.landing-stage');
  await expect(stage).toHaveText(/^Growing · (Sprout|Seedling|Sapling|Young Tree)$/);
  await page.screenshot({ path: `${SHOTS}/desktop-hero-early.png` });
  await expect(stage).toHaveText('Growing · Grown Tree', { timeout: 15000 });
  await page.waitForTimeout(2500); // let it finish easing to full size
  await page.screenshot({ path: `${SHOTS}/desktop-hero.png` });
  await page.screenshot({ path: `${SHOTS}/desktop-full.png`, fullPage: true });

  await card(page).getByRole('button', { name: 'Try now' }).click();
  await expect(page).toHaveURL(/#start$/);
  await expect(page.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: `${SHOTS}/desktop-signup.png` });

  // the browser's Back, then the form's own link
  await page.goBack();
  await expect(card(page).getByRole('button', { name: 'Try now' })).toBeVisible();
  await card(page).getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/#signin$/);
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '← About Rooted' }).click();
  await expect(card(page).getByRole('button', { name: 'Try now' })).toBeVisible();
  await expect(page).not.toHaveURL(/#/);

  // the footer opens the developer page, and Back comes home to the landing page
  await page.locator('.landing-foot').getByRole('button', { name: 'About the developer' }).click();
  await expect(page).toHaveURL(/\/developer$/);
  await expect(page.getByRole('button', { name: 'Try now' })).toHaveCount(0);
  await page.goBack();
  await expect(card(page).getByRole('button', { name: 'Try now' })).toBeVisible();
});

test('the navigation bar: links scroll to their part of the page, and open sign-in and the developer page', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('.landing-bar');
  await expect(nav(page)).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Try now' })).toBeVisible();
  await expect(bar.getByRole('button', { name: 'Tagalog' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Menu/ })).toBeHidden(); // wide screen: no menu
  await bar.screenshot({ path: `${SHOTS}/desktop-nav.png` });

  await nav(page).getByRole('button', { name: 'Why Rooted' }).click();
  await expect(page.getByRole('heading', { name: 'Made for your walk of faith' })).toBeInViewport();
  // the bar stays at the top while scrolling, and doesn't cover the heading it scrolled to
  await expect(nav(page)).toBeInViewport();
  const heading = await page.getByRole('heading', { name: 'Made for your walk of faith' }).boundingBox();
  const barBox = await bar.boundingBox();
  expect(heading!.y).toBeGreaterThan(barBox!.y + barBox!.height);
  await page.screenshot({ path: `${SHOTS}/desktop-nav-scrolled.png` });

  await nav(page).getByRole('button', { name: 'How it works' }).click();
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeInViewport();
  // the screenshots section (src/pages/landing-showcase.tsx)
  await nav(page).getByRole('button', { name: 'Screenshots' }).click();
  await expect(page.locator('#see-it')).toBeInViewport();
  await page.getByRole('button', { name: 'Rooted — back to top' }).click();
  await expect(card(page)).toBeInViewport();

  await nav(page).getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await nav(page).getByRole('button', { name: 'About the developer' }).click();
  await expect(page).toHaveURL(/\/developer$/);
  await page.goBack();
  await bar.getByRole('button', { name: 'Try now' }).click();
  await expect(page.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
});

test('the bar fits on one line just above the menu width, in English and Tagalog', async ({ page }) => {
  await page.setViewportSize({ width: 1261, height: 800 });
  await page.goto('/');
  const bar = page.locator('.landing-bar');
  await expect(page.getByRole('button', { name: /Menu/ })).toBeHidden();
  for (const lang of ['English', 'Tagalog']) {
    await bar.getByRole('button', { name: lang }).click();
    const box = await bar.evaluate((el) => ({ overflow: el.scrollWidth - el.clientWidth, height: el.getBoundingClientRect().height }));
    expect(box.overflow, `${lang}: nothing spills out of the bar`).toBeLessThanOrEqual(0);
    expect(box.height, `${lang}: one line`).toBeLessThan(60);
    await bar.screenshot({ path: `${SHOTS}/nav-1261-${lang.toLowerCase()}.png` });
  }
  // one step narrower, the links are in the menu
  await page.setViewportSize({ width: 1260, height: 800 });
  await expect(page.getByRole('button', { name: /Menu/ })).toBeVisible();
});

test('a shared link shows a picture: the share tags, and the 1200 × 630 picture they name', async ({ page, request }) => {
  await page.goto('/');
  const og = (property: string) => page.locator(`meta[property="${property}"]`);
  await expect(og('og:title')).toHaveAttribute('content', /^Rooted/);
  await expect(og('og:description')).toHaveAttribute('content', /pixel tree/);
  await expect(og('og:image')).toHaveAttribute('content', /\/og-image\.png$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');

  // (here, with no site address set, it's relative; built on the host it's the full address)
  const res = await request.get((await og('og:image').getAttribute('content'))!);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
  const png = await res.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)], 'width and height, from the PNG header').toEqual([1200, 630]);
});

test('signing up from the landing page opens the tree, and signing out shows the form', async ({ page }) => {
  await page.goto('/');
  await card(page).getByRole('button', { name: 'Try now' }).click();
  await page.getByLabel('Username').fill('newbie');
  await page.getByRole('button', { name: 'Plant my tree' }).click();
  await expect(page.locator('.side-brand')).toContainText('newbie');
  await expect(page).not.toHaveURL(/#/);
  // (the first-visit tree picker is open; Escape keeps the oak)
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try now' })).toHaveCount(0);
});

test('someone signed in opens straight to their tree', async ({ page }) => {
  await page.addInitScript(() => {
    const users = [{ id: 'grace', name: 'Grace', username: 'grace', is_admin: false, created_at: '2026-02-14T09:00:00.000Z', tree: 'oak' }];
    localStorage.setItem('rooted.v2', JSON.stringify({ users, entries: [], session: 'grace' }));
  });
  await page.goto('/');
  await expect(page.locator('.side-brand')).toContainText('Grace');
  await expect(page.getByRole('button', { name: 'Try now' })).toHaveCount(0);
});

test('in Tagalog', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tagalog' }).click();
  await expect(card(page).getByRole('button', { name: 'Subukan ngayon' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: 'Bakit Rooted' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paano ito gumagana' })).toBeAttached();
  await page.screenshot({ path: `${SHOTS}/desktop-tagalog.png`, fullPage: true });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the card sits above the tree, and the links are in the menu', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.landing-stage')).toHaveText('Growing · Grown Tree', { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/phone-hero.png` });
    await page.screenshot({ path: `${SHOTS}/phone-full.png`, fullPage: true });
    // nothing wider than the screen
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    // the language switch stays on the bar; the links fold into the menu
    const menu = page.getByRole('button', { name: /Menu/ });
    await expect(page.locator('.landing-bar').getByRole('button', { name: 'Tagalog' })).toBeVisible();
    await expect(nav(page)).toBeHidden();
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(nav(page).getByRole('button', { name: 'How it works' })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/phone-menu.png` });
    await page.keyboard.press('Escape');
    await expect(nav(page)).toBeHidden();

    // a link closes the menu and goes there
    await menu.click();
    await nav(page).getByRole('button', { name: 'Why Rooted' }).click();
    await expect(nav(page)).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Made for your walk of faith' })).toBeInViewport();

    // a tap outside closes it too
    await menu.click();
    await page.locator('.landing-scrim').click({ position: { x: 20, y: 600 } });
    await expect(nav(page)).toBeHidden();
  });
});
