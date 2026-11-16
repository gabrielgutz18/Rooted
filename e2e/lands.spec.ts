// Every tree grows in its own native land: one screenshot of each backdrop, at noon,
// with the streak card tucked away so the land shows. They land in e2e/screenshots/lands/
// (the update notice's pictures in src/assets/updates/land-*.png are copies of these).

import { expect, test } from '@playwright/test';
import { seed } from './seed';
import { SPECIES } from '../src/scene/species';

const SHOTS = 'e2e/screenshots/lands';
const TREES = SPECIES.map((s) => s.id);

for (const tree of TREES)
  test(`the ${tree} grows in its native land`, async ({ page }) => {
    page.on('pageerror', (err) => {
      throw err;
    });
    await page.addInitScript(() => localStorage.setItem('rooted.streakCard', 'hidden'));
    await seed(page, [{ name: 'Grace', streak: 12, lastNoteDaysAgo: 0, tree }]);
    await page.goto('/?hour=12');
    await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
    await expect(page.locator('.streak-show')).toBeVisible();
    await page.waitForTimeout(7000); // the tree grows in and the camera follows; let both settle
    await page.locator('.hero').screenshot({ path: `${SHOTS}/${tree}.png` });
  });
