// The streak lamp and the falling leaves, in the real app (trial mode).
// Each test starts from a made-up history saved in the browser, then takes screenshots
// into e2e/screenshots/ so the look can be checked by eye.

import { expect, test, type Page } from '@playwright/test';
import { seed, type SeedUser } from './seed';

const SHOTS = 'e2e/screenshots';
const NOTE = {
  subject: 'Cell group tonight',
  note: 'We read Psalm 23 together at cell group and prayed for each other. I am thankful that God is my shepherd and leads me.',
};

async function open(page: Page, users: SeedUser[]) {
  // any error in the page fails the test, with its message
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, users);
  await page.goto('/');
  // never run these against the real database
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  await expect(page.locator('.lamp-card')).toBeVisible();
}

async function writeNote(page: Page) {
  await page.getByLabel('Subject', { exact: true }).fill(NOTE.subject);
  await page.getByLabel('Note', { exact: true }).fill(NOTE.note);
  await page.getByRole('button', { name: 'Save note' }).click();
}

const lamp = (page: Page) => page.locator('.lamp-card');

test('the lamp fires and turns gold on the 10th day in a row', async ({ page }) => {
  await open(page, [{ name: 'Grace', streak: 9, lastNoteDaysAgo: 1 }]);
  await expect(lamp(page).locator('.lamp-count')).toHaveText('9 days');
  await expect(lamp(page)).toContainText('Write today to keep it burning');
  await page.locator('.hero').screenshot({ path: `${SHOTS}/1-before-note.png` });

  await writeNote(page);
  await expect(lamp(page).locator('.lamp-count')).toHaveText('10 days');
  await expect(lamp(page)).toHaveClass(/is-firing/);
  await expect(page.locator('.lamp-pop')).toHaveText('New flame: Gold!');
  await page.waitForTimeout(700); // mid-flare: tall flame, sparks, the bubble
  await page.locator('.hero').screenshot({ path: `${SHOTS}/2-lamp-fires-gold.png` });

  await expect(lamp(page)).toContainText('Gold flame · new color at 20');
  await expect(lamp(page)).not.toHaveClass(/is-firing/, { timeout: 6000 });
});

test('a tree left for 8 days loses its leaves, and one note brings them back', async ({ page }) => {
  await open(page, [{ name: 'Mark', streak: 5, lastNoteDaysAgo: 8 }]);
  await expect(lamp(page).locator('.lamp-count')).toHaveText('0 days');
  await expect(lamp(page)).toContainText('Write a note to light the lamp');
  await expect(page.locator('.hud-wilt')).toContainText('No notes for 8 days');
  await page.waitForTimeout(1500);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/3-losing-leaves-8-days.png` });

  await writeNote(page);
  await expect(page.locator('.lamp-pop')).toHaveText('Your lamp is lit!');
  await expect(lamp(page).locator('.lamp-count')).toHaveText('1 day');
  await expect(page.locator('.hud-wilt')).toHaveCount(0);
  await page.waitForTimeout(4000); // the leaves grow back
  await page.locator('.hero').screenshot({ path: `${SHOTS}/4-leaves-back.png` });
});

test('after 16 days the branches are bare', async ({ page }) => {
  await open(page, [{ name: 'Ruth', streak: 30, lastNoteDaysAgo: 16 }]);
  await expect(page.locator('.hud-wilt')).toContainText('the leaves have fallen');
  await page.waitForTimeout(1500);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/5-bare-16-days.png` });
});

test("a friend's tree shows their lamp and their leaves", async ({ page }) => {
  await open(page, [
    { name: 'Grace', streak: 3, lastNoteDaysAgo: 0 },
    { name: 'Paul', streak: 52, lastNoteDaysAgo: 0, tree: 'sakura', session: false },
  ]);
  await page.locator('.friend', { hasText: 'Paul' }).click();
  await expect(lamp(page)).toContainText('Paul’s daily streak');
  await expect(lamp(page).locator('.lamp-count')).toHaveText('52 days');
  await expect(lamp(page)).toContainText('Sapphire flame · new color at 100');
  await page.waitForTimeout(1000);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/6-friend-sapphire.png` });
});

test('on a phone the lamp sits beside the status card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, [{ name: 'Joy', streak: 34, lastNoteDaysAgo: 0, tree: 'maple' }]);
  const box = await lamp(page).boundingBox();
  expect(box && box.x + box.width).toBeLessThanOrEqual(390);
  const hud = await page.locator('.hero-hud').boundingBox();
  expect(hud && box && hud.x + hud.width).toBeLessThanOrEqual(box!.x); // no overlap
  await page.waitForTimeout(1000);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/7-phone.png` });
});

test('every flame colour', async ({ page }) => {
  await open(page, [{ name: 'Lamp', streak: 1, lastNoteDaysAgo: 0 }]);
  // swap the streak by reseeding, one colour at a time
  for (const n of [1, 10, 20, 30, 50, 100, 200]) {
    await seed(page, [{ name: 'Lamp', streak: n, lastNoteDaysAgo: 0 }], true);
    await page.reload();
    await expect(lamp(page).locator('.lamp-count')).toHaveText(`${n} ${n === 1 ? 'day' : 'days'}`);
    await page.waitForTimeout(300);
    await lamp(page).screenshot({ path: `${SHOTS}/flame-${String(n).padStart(3, '0')}.png` });
  }
});

test('pressing the lamp swings it and stokes the fire', async ({ page }) => {
  await open(page, [{ name: 'Ruth', streak: 12, lastNoteDaysAgo: 0 }]);
  const art = lamp(page).getByRole('button', { name: 'Stoke the flame' });
  await expect(art).toBeVisible();
  const before = await art.locator('canvas').screenshot();

  await art.click();
  await art.click(); // quick presses stack up
  expect(await art.evaluate((el) => el.getAnimations().length)).toBeGreaterThan(0); // swinging
  await page.waitForTimeout(250); // the fire at its tallest, light bursting out
  await page.locator('.hero').screenshot({ path: `${SHOTS}/8-lamp-stoked.png` });
  expect(Buffer.compare(before, await art.locator('canvas').screenshot())).not.toBe(0);

  // it settles back down on its own
  await expect.poll(() => art.evaluate((el) => el.getAnimations().length), { timeout: 4000 }).toBe(0);
});
