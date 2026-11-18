// Editing an older note: the words change, the date and the growth it earned don't.

import { expect, test } from '@playwright/test';
import { seed } from './seed';

test('an older note can be edited, keeps its date and growth, and the change survives a reload', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [{ name: 'Grace', streak: 3, lastNoteDaysAgo: 1, headStart: 0, notePoints: [20, 20, 20] }]);
  await page.goto('/');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();

  const note = page.locator('.note', { has: page.getByRole('heading', { name: 'Day 0', exact: true }) });
  const date = await note.locator('time').textContent();
  await note.getByRole('button', { name: 'Edit “Day 0”' }).click();

  const form = page.getByRole('form', { name: 'Edit “Day 0”' });
  await expect(form.getByLabel('Note')).toBeFocused();
  await expect(form.getByText('The note keeps its date and the growth it earned.')).toBeVisible();

  // random typing is refused, as when writing a new note
  await form.getByLabel('Note').fill('asdfgh qwerty zxcvbn');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form.getByRole('alert')).toContainText('random typing');

  // Cancel (and Escape) leave the note as it was
  await form.getByRole('button', { name: 'Cancel' }).click();
  await expect(note.locator('.note-body')).toHaveText('Prayed and read the Bible.');
  await note.getByRole('button', { name: 'Edit “Day 0”' }).click();
  await page.keyboard.press('Escape');
  await expect(form).toBeHidden();

  await note.getByRole('button', { name: 'Edit “Day 0”' }).click();
  await form.getByLabel('Subject').fill('Morning prayer');
  await form.getByLabel('Note').fill('Prayed for my family and read Psalm 23 before work.');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form).toBeHidden();

  const edited = page.locator('.note', { has: page.getByRole('heading', { name: 'Morning prayer', exact: true }) });
  await expect(edited.locator('.note-body')).toHaveText('Prayed for my family and read Psalm 23 before work.');
  await expect(edited.locator('time')).toHaveText(date!);
  await expect(edited.locator('.note-points')).toHaveText('+20');
  await expect(edited.locator('.tags .tag').first()).toBeVisible(); // tags follow the new words

  await page.reload();
  await expect(page.locator('.note', { has: page.getByRole('heading', { name: 'Morning prayer', exact: true }) })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Day 0', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'e2e/screenshots/edit/edited-note.png', fullPage: true });
});
