// Menu → About the developer opens its own address, /developer, which also works on its own
// (a shared link, a refresh). Going there and back keeps the tree and a note being written.

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

// by role: getByLabel would read the typed words as part of the wrapping label
const noteBox = (page: Page) => page.getByRole('textbox', { name: 'Note', exact: true });

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

test('the menu opens the developer page, and Back returns with the note still written', async ({ page }) => {
  await seed(page, [{ name: 'Grace', streak: 3, lastNoteDaysAgo: 0 }]);
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  await noteBox(page).fill('Half a thought about Sunday…');

  await page.getByRole('button', { name: 'About the developer' }).click();
  await expect(page).toHaveURL(/\/developer$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
  await expect(page.getByText(/The idea came when I joined SUYNL/)).toBeVisible();
  await expect(page.getByRole('img', { name: 'Gabriel’s icon' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View my portfolio' })).toHaveAttribute('href', 'https://gabriel-port-zeta.vercel.app/');
  await expect(page.locator('.dev-tool')).toHaveText(['Claude Code', 'React', 'TypeScript', 'Vite', 'Supabase', 'Vercel', 'Playwright']);
  await expect(page).toHaveTitle('About the developer · Rooted');
  await expect(page.getByText('Trial mode · this browser only')).toBeHidden(); // the garden is out of sight

  await page.getByRole('button', { name: '← Back to Rooted' }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(noteBox(page)).toHaveValue('Half a thought about Sunday…');
  await expect(page).toHaveTitle('Rooted');

  // the browser's own Forward and Back buttons follow along
  await page.goForward();
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
  await page.goBack();
  await expect(noteBox(page)).toHaveValue('Half a thought about Sunday…');
});

test('a shared link opens the page signed out, in Tagalog too, and Back goes into Rooted', async ({ page }) => {
  await page.goto('/developer');
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();

  await page.getByRole('button', { name: 'Tagalog' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, ako si Gabriel' })).toBeVisible();
  await expect(page.getByText(/Naisip ko ito noong sumali ako sa SUYNL/)).toBeVisible();

  // opened straight from a link: Back stays on the site instead of leaving it
  await page.getByRole('button', { name: '← Bumalik sa Rooted' }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.locator('.dev')).toHaveCount(0);
});

test('a refresh on /developer stays on the page, with or without a slash', async ({ page }) => {
  await page.goto('/developer/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
});

test('on a phone the page fits the screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto('/developer');
  await expect(page.getByRole('heading', { level: 1, name: 'Hi, I’m Gabriel' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'test-results/developer-phone.png', fullPage: true });
});
