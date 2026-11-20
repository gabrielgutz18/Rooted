// Pinning a note to your profile to share it: it shows under your tree (never over it) and
// under your tree when friends visit, follows edits, and goes when unpinned or deleted.

import { expect, test, type Page } from '@playwright/test';
import { seed } from './seed';

const SHOTS = 'e2e/screenshots';

const pinned = (page: Page) => page.getByRole('region', { name: /pinned note/ });
const noteCard = (page: Page, subject: string) => page.locator('.note', { has: page.getByRole('heading', { name: subject, exact: true }) });

test('pin a note, see it under the tree, change it from the profile, and friends read it under yours', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [
    { name: 'Grace', streak: 3, lastNoteDaysAgo: 0, headStart: 2000 },
    { name: 'Ben', streak: 1, lastNoteDaysAgo: 0, session: false },
  ]);
  await page.goto('/?hour=10');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
  await expect(pinned(page)).toHaveCount(0);

  // from My notes: asked first, since every member will be able to read it
  await noteCard(page, 'Day 0').getByRole('button', { name: 'Pin “Day 0” to your profile' }).click();
  const ask = page.getByRole('group', { name: 'Pin “Day 0” to your profile' });
  await expect(ask).toContainText('Share it with every member, under your tree?');
  await ask.getByRole('button', { name: 'Keep private' }).click();
  await expect(ask).toBeHidden();
  await expect(pinned(page)).toHaveCount(0);

  await noteCard(page, 'Day 0').getByRole('button', { name: 'Pin “Day 0” to your profile' }).click();
  await ask.getByRole('button', { name: 'Yes, pin it' }).click();
  await expect(page.getByRole('status')).toHaveText('Pinned — it shows under your tree.');

  const card = pinned(page);
  await expect(card.getByRole('heading', { name: 'Your pinned note' })).toBeVisible();
  await expect(card).toContainText('Day 0');
  await expect(card).toContainText('Prayed and read the Bible.');
  await expect(card).toContainText('Every member can read it');
  await expect(noteCard(page, 'Day 0')).toContainText('Pinned');

  // under the tree, not on it
  await expect(page.locator('.hero .pinned')).toHaveCount(0);
  const hero = (await page.locator('.hero').boundingBox())!;
  const box = (await card.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(hero.y + hero.height);
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `${SHOTS}/pinned-note.png` });

  // editing the note updates the pin
  await noteCard(page, 'Day 0').getByRole('button', { name: 'Edit “Day 0”' }).click();
  const form = page.getByRole('form', { name: 'Edit “Day 0”' });
  await form.getByLabel('Subject').fill('Psalm 23 this morning');
  await form.getByLabel('Note').fill('Read Psalm 23 before work.\nThe Lord is my shepherd; I shall not want. Prayed for my family and for the cell group tonight.');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(card).toContainText('Psalm 23 this morning');
  await expect(card).toContainText('The Lord is my shepherd');

  // Change → My profile, at the shared note: pick another one
  await card.getByRole('button', { name: 'Change' }).click();
  const profile = page.locator('#side-menu').getByRole('region', { name: 'Your profile' });
  const share = profile.getByRole('region', { name: 'Shared note' });
  await expect(share).toContainText('Psalm 23 this morning');
  await share.getByRole('button', { name: 'Change' }).click();
  await share.getByRole('button', { name: 'Pin “Day 1”' }).click();
  await expect(share).toContainText('every member can read this note');
  await page.locator('#side-menu').screenshot({ path: `${SHOTS}/pinned-note-profile.png` });
  await share.getByRole('button', { name: 'Yes, pin it' }).click();
  await expect(card).toContainText('Day 1');
  await expect(card).not.toContainText('Psalm 23');
  await expect(noteCard(page, 'Psalm 23 this morning')).not.toContainText('Pinned');
  await page.keyboard.press('Escape');

  // still pinned after a reload
  await page.reload();
  await expect(pinned(page)).toContainText('Day 1');

  // Ben signs in and visits Grace's tree: her pinned note is under it
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('rooted.v2')!);
    db.session = 'e2e-user-1';
    localStorage.setItem('rooted.v2', JSON.stringify(db));
  });
  await page.reload();
  await expect(pinned(page)).toHaveCount(0); // Ben hasn't pinned one
  await page.locator('.friend', { hasText: 'Grace' }).click();
  const hers = pinned(page);
  await expect(hers.getByRole('heading', { name: 'Grace’s pinned note' })).toBeVisible();
  await expect(hers).toContainText('Day 1');
  await expect(hers.getByRole('button', { name: 'Unpin' })).toHaveCount(0);
  await expect(page.getByText('Their other notes are private')).toBeVisible();
  await hers.screenshot({ path: `${SHOTS}/pinned-note-friend.png` });

  await page.getByRole('button', { name: 'View profile' }).click();
  const theirs = page.locator('#side-menu').getByRole('region', { name: 'Grace’s profile' });
  await expect(theirs.getByRole('region', { name: 'Shared note' })).toContainText('Day 1');
  await page.keyboard.press('Escape');

  // back as Grace: deleting the pinned note unpins it; pinning again, then Unpin, removes it
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('rooted.v2')!);
    db.session = 'e2e-user-0';
    localStorage.setItem('rooted.v2', JSON.stringify(db));
  });
  await page.reload();
  await noteCard(page, 'Day 1').getByRole('button', { name: 'Delete' }).click();
  await noteCard(page, 'Day 1').getByRole('button', { name: 'Yes, delete' }).click();
  await expect(pinned(page)).toHaveCount(0);

  await noteCard(page, 'Day 2').getByRole('button', { name: 'Pin “Day 2” to your profile' }).click();
  await page.getByRole('group', { name: 'Pin “Day 2” to your profile' }).getByRole('button', { name: 'Yes, pin it' }).click();
  await expect(pinned(page)).toContainText('Day 2');
  await pinned(page).getByRole('button', { name: 'Unpin' }).click();
  await expect(pinned(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Unpinned. That note is private again.');
  await page.reload();
  await expect(pinned(page)).toHaveCount(0);
});
