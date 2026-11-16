// Menu → Choose tree: every kind of tree is offered, each with the land it comes from,
// and picking one changes the tree you grow. Screenshots land in e2e/screenshots/picker/.

import { expect, test } from '@playwright/test';
import { seed } from './seed';
import { SPECIES } from '../src/scene/species';
import { LANDS } from '../src/scene/lands';

const SHOTS = 'e2e/screenshots/picker';

test('the tree picker offers every tree in its native land', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [{ name: 'Grace', streak: 12, lastNoteDaysAgo: 0 }]);
  await page.goto('/?hour=12');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();

  await page.getByRole('button', { name: /^Choose tree/ }).click();
  const picker = page.getByRole('dialog', { name: 'Choose your tree' });
  await expect(picker).toBeVisible();

  const cards = picker.locator('.tree-card');
  await expect(cards).toHaveCount(SPECIES.length);
  await expect(cards.locator('.tree-card-name')).toContainText(SPECIES.map((s) => s.name));
  await expect(cards.locator('.tree-card-land')).toHaveText(SPECIES.map((s) => `Native to ${LANDS[s.id].name}`));
  await page.waitForTimeout(1500);
  await picker.screenshot({ path: `${SHOTS}/1-top.png` });

  const baobab = cards.filter({ hasText: 'Baobab' });
  await baobab.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800); // cards scrolled into view start drawing again
  await picker.screenshot({ path: `${SHOTS}/2-scrolled.png` });

  await baobab.click();
  await expect(picker).toBeHidden();
  await expect(page.getByRole('button', { name: /^Choose tree/ })).toContainText('Baobab');
});
