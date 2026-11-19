// The landing page: someone who isn't signed in opens the link and sees what Rooted is, with
// Try now and Install. Try now / Sign in open the form, and Back returns to the landing page.
// Someone signed in, or the installed app, never sees it.

import { expect, test } from '@playwright/test';

const SHOTS = 'e2e/screenshots/landing';

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

test('a visitor sees the landing page; Try now opens sign-up and Back returns', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Rooted', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try now' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install' }).first()).toBeVisible();
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

  await page.getByRole('button', { name: 'Try now' }).first().click();
  await expect(page).toHaveURL(/#start$/);
  await expect(page.getByRole('tab', { name: 'Create account' })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: `${SHOTS}/desktop-signup.png` });

  // the browser's Back, then the form's own link
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Try now' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/#signin$/);
  await expect(page.getByRole('tab', { name: 'Sign in' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: '← About Rooted' }).click();
  await expect(page.getByRole('button', { name: 'Try now' }).first()).toBeVisible();
  await expect(page).not.toHaveURL(/#/);

  // the footer opens the developer page, and Back comes home to the landing page
  await page.getByRole('button', { name: 'About the developer' }).click();
  await expect(page).toHaveURL(/\/developer$/);
  await expect(page.getByRole('button', { name: 'Try now' })).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Try now' }).first()).toBeVisible();
});

test('signing up from the landing page opens the tree, and signing out shows the form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try now' }).first().click();
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
  await expect(page.getByRole('button', { name: 'Subukan ngayon' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paano ito gumagana' })).toBeAttached();
  await page.screenshot({ path: `${SHOTS}/desktop-tagalog.png`, fullPage: true });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the card sits above the tree', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.landing-stage')).toHaveText('Growing · Grown Tree', { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${SHOTS}/phone-hero.png` });
    await page.screenshot({ path: `${SHOTS}/phone-full.png`, fullPage: true });
    // nothing wider than the screen
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
