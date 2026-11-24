// Note folders: make them (a name and a colour), hold a note and drag it onto one (mouse and
// finger), open a folder like a window, move notes without dragging, search across folders,
// rename, recolour and delete folders — and it all stays after a reload.

import { expect, test, type Locator, type Page } from '@playwright/test';
import { seed } from './seed';

const SHOTS = 'e2e/screenshots';

const notes = (page: Page) => page.getByRole('region', { name: 'My notes' });
const noteCard = (page: Page, subject: string) => page.locator('.note', { has: page.getByRole('heading', { name: subject, exact: true }) });
const folder = (page: Page, name: string) => page.locator('.folder-grid').getByRole('button', { name: new RegExp(`^${name} folder, `) });
const status = (page: Page) => page.getByRole('status');

async function makeFolder(page: Page, name: string, color: string, icon?: string) {
  await notes(page).getByRole('button', { name: 'New folder' }).click();
  const form = page.getByRole('form', { name: 'New folder' });
  await form.getByLabel('Folder name').fill(name);
  await form.getByRole('radio', { name: color, exact: true }).check();
  if (icon) await form.getByRole('radio', { name: icon, exact: true }).check();
  await form.getByRole('button', { name: 'Make folder' }).click();
  await expect(form).toBeHidden();
}

/** Waits until the page has stopped scrolling. */
async function settle(page: Page) {
  let last = -1;
  await expect
    .poll(async () => {
      const y = await page.evaluate(() => window.scrollY);
      const same = y === last;
      last = y;
      return same;
    }, { intervals: [150] })
    .toBe(true);
}

const centre = async (l: Locator) => {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};

/** Press on the note's title, hold, then drag to the target (found after the note lifts). */
async function holdAndDrag(page: Page, subject: string, target: () => Locator, hold = 400) {
  const title = noteCard(page, subject).getByRole('heading', { name: subject, exact: true });
  await title.scrollIntoViewIfNeeded();
  const from = await centre(title);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(hold);
  const to = await centre(target());
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

test('make folders, drag notes into them, open, move, search, rename and delete', async ({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, [{ name: 'Grace', streak: 4, lastNoteDaysAgo: 0 }]);
  await page.goto('/?hour=10');
  await expect(page.getByText('Trial mode · this browser only')).toBeVisible();

  // a folder: a name and a colour; no name, no folder
  await notes(page).getByRole('button', { name: 'New folder' }).click();
  const form = page.getByRole('form', { name: 'New folder' });
  await form.getByRole('button', { name: 'Make folder' }).click();
  await expect(form.getByRole('alert')).toHaveText('Give the folder a name.');
  await form.getByLabel('Folder name').fill('Evangelism');
  await expect(form.getByRole('radio', { name: 'No icon' })).toBeChecked(); // a plain folder unless you pick one
  await expect(form.getByRole('group', { name: 'Color' }).getByRole('radio')).toHaveCount(18);
  await expect(form.getByRole('group', { name: 'Icon' }).getByRole('radio')).toHaveCount(20);
  await form.getByRole('radio', { name: 'Blue', exact: true }).check();
  await form.getByRole('radio', { name: 'Fish', exact: true }).check();
  await form.scrollIntoViewIfNeeded();
  await form.screenshot({ path: `${SHOTS}/folder-new.png` });
  await form.getByRole('button', { name: 'Make folder' }).click();
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 0 notes');
  await expect(notes(page).getByText('Hold a note, then drag it onto a folder.')).toBeVisible();

  // a quick drag doesn't pick the note up (it would select text instead)
  const title = noteCard(page, 'Day 0').getByRole('heading', { name: 'Day 0' });
  const from = await centre(title);
  const to = await centre(folder(page, 'Evangelism'));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 0 notes');

  // hold, then drag: it goes in
  await holdAndDrag(page, 'Day 0', () => folder(page, 'Evangelism'));
  await expect(status(page)).toHaveText('Moved to Evangelism.');
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 1 note');
  await expect(noteCard(page, 'Day 0')).toHaveCount(0); // off the desktop

  // Escape while dragging puts it back
  const day1 = noteCard(page, 'Day 1').getByRole('heading', { name: 'Day 1' });
  await day1.scrollIntoViewIfNeeded();
  const d1 = await centre(day1);
  await page.mouse.move(d1.x, d1.y);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await expect(page.locator('.note-ghost')).toHaveText('Day 1');
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.note-ghost')).toHaveCount(0);
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 1 note');

  // open it: a window with its notes
  await folder(page, 'Evangelism').click();
  const win = page.getByRole('region', { name: 'Folder “Evangelism”' });
  await expect(win.getByRole('heading', { name: 'Evangelism' })).toBeVisible();
  await expect(win).toContainText('1 note');
  await expect(noteCard(page, 'Day 0')).toBeVisible();
  await expect(noteCard(page, 'Day 1')).toHaveCount(0);

  // drag it back out: a Desktop tile shows up while dragging
  await holdAndDrag(page, 'Day 0', () => page.locator('.folder-desk'));
  await expect(status(page)).toHaveText('Moved to the desktop.');
  await expect(win).toContainText('This folder is empty.');
  await win.getByRole('button', { name: 'Close folder' }).click();
  await expect(win).toHaveCount(0);

  // Move, without dragging
  await makeFolder(page, 'Prayer', 'Lavender', 'Dove');
  await noteCard(page, 'Day 1').getByRole('button', { name: 'Move “Day 1” to a folder' }).click();
  await page.getByRole('group', { name: 'Move “Day 1” to a folder' }).getByRole('button', { name: 'Evangelism' }).click();
  await expect(status(page)).toHaveText('Moved to Evangelism.');
  await holdAndDrag(page, 'Day 2', () => folder(page, 'Prayer'));
  await expect(folder(page, 'Prayer')).toHaveAccessibleName('Prayer folder, 1 note');
  await holdAndDrag(page, 'Day 3', () => folder(page, 'Evangelism'));
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 2 notes');
  await notes(page).scrollIntoViewIfNeeded();
  await notes(page).screenshot({ path: `${SHOTS}/folders-desktop.png` });

  // search looks in every folder and says where each note is
  await notes(page).getByRole('searchbox').fill('day');
  await expect(noteCard(page, 'Day 1').locator('.folder-chip')).toHaveText('Evangelism');
  await expect(noteCard(page, 'Day 2').locator('.folder-chip')).toHaveText('Prayer');
  await expect(noteCard(page, 'Day 0').locator('.folder-chip')).toHaveCount(0);
  await notes(page).getByRole('searchbox').fill('');

  // still there after a reload
  await page.reload();
  await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 2 notes');
  await expect(folder(page, 'Prayer')).toHaveAccessibleName('Prayer folder, 1 note');
  await folder(page, 'Evangelism').click();
  await win.scrollIntoViewIfNeeded();
  await notes(page).screenshot({ path: `${SHOTS}/folder-open.png` });

  // rename, recolour, new icon: Edit brings the whole form into view, icons first
  await win.getByRole('button', { name: 'Edit' }).first().click();
  const edit = page.getByRole('form', { name: 'Edit folder “Evangelism”' });
  await expect(edit).toBeFocused(); // not the name, which would open a phone's keyboard over the icons
  await expect(edit.getByRole('group', { name: 'Icon' })).toBeInViewport({ ratio: 1 });
  await expect(edit.getByRole('group', { name: 'Color' })).toBeInViewport({ ratio: 1 });
  await expect(edit.getByRole('button', { name: 'Save changes' })).toBeInViewport({ ratio: 1 });
  await edit.getByLabel('Folder name').fill('Outreach');
  await expect(edit.getByRole('radio', { name: 'Fish', exact: true })).toBeChecked(); // kept after the reload
  await expect(edit.getByRole('radio', { name: 'Blue', exact: true })).toBeChecked();
  await edit.getByRole('radio', { name: 'Maroon', exact: true }).check();
  await edit.getByRole('radio', { name: 'World', exact: true }).check();
  await edit.screenshot({ path: `${SHOTS}/folder-edit.png` });
  await edit.getByRole('button', { name: 'Save changes' }).click();
  const renamed = page.getByRole('region', { name: 'Folder “Outreach”' });
  await expect(renamed.getByRole('heading', { name: 'Outreach' })).toBeVisible();
  await expect(folder(page, 'Outreach')).toHaveAccessibleName('Outreach folder, 2 notes');

  // deleting a note takes it out of its folder
  await noteCard(page, 'Day 3').getByRole('button', { name: 'Delete' }).click();
  await noteCard(page, 'Day 3').getByRole('button', { name: 'Yes, delete' }).click();
  await expect(folder(page, 'Outreach')).toHaveAccessibleName('Outreach folder, 1 note');

  // deleting a folder puts its notes back on the desktop
  await renamed.getByRole('button', { name: 'Edit' }).first().click();
  const del = page.getByRole('form', { name: 'Edit folder “Outreach”' });
  await del.getByRole('button', { name: 'Delete folder' }).click();
  await expect(del).toContainText('Its 1 note goes back to the desktop');
  await del.getByRole('button', { name: 'Yes, delete folder' }).click();
  await expect(status(page)).toHaveText('Folder “Outreach” deleted. Its notes are back on the desktop.');
  await expect(folder(page, 'Outreach')).toHaveCount(0);
  await expect(noteCard(page, 'Day 1')).toBeVisible();

  await page.reload();
  await expect(folder(page, 'Outreach')).toHaveCount(0);
  await expect(folder(page, 'Prayer')).toHaveAccessibleName('Prayer folder, 1 note');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('hold a note with a finger and drag it onto a folder; a quick swipe still scrolls', async ({ page }) => {
    page.on('pageerror', (err) => {
      throw err;
    });
    await seed(page, [{ name: 'Grace', streak: 6, lastNoteDaysAgo: 0 }]);
    await page.goto('/?hour=10');
    await expect(page.getByText('Trial mode · this browser only')).toBeAttached();
    await makeFolder(page, 'Evangelism', 'Teal', 'Cross');

    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

    // put the folders near the top of the screen, with the notes under them
    await folder(page, 'Evangelism').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -80));
    const title = noteCard(page, 'Day 1').getByRole('heading', { name: 'Day 1' });

    // a quick swipe scrolls the page and moves nothing
    const a = await centre(title);
    const before = await page.evaluate(() => window.scrollY);
    await touch('touchStart', a.x, a.y);
    for (let i = 1; i <= 8; i++) await touch('touchMove', a.x, a.y - i * 25);
    await touch('touchEnd');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 50);
    await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 0 notes');
    await settle(page); // let the swipe's glide finish

    // hold still, then drag: the note lifts and the page stays put under the finger
    await folder(page, 'Evangelism').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -80));
    await settle(page);
    const b = await centre(title);
    const to = await centre(folder(page, 'Evangelism'));
    const still = await page.evaluate(() => window.scrollY);
    await touch('touchStart', b.x, b.y);
    await page.waitForTimeout(500);
    await expect(page.locator('.note-ghost')).toHaveText('Day 1');
    for (let i = 1; i <= 10; i++) await touch('touchMove', b.x + ((to.x - b.x) * i) / 10, b.y + ((to.y - b.y) * i) / 10);
    expect(await page.evaluate(() => window.scrollY)).toBe(still);
    await expect(folder(page, 'Evangelism')).toHaveClass(/is-target/);
    await page.screenshot({ path: `${SHOTS}/folder-drag-phone.png` });
    await touch('touchEnd');
    await expect(status(page)).toHaveText('Moved to Evangelism.');
    await expect(folder(page, 'Evangelism')).toHaveAccessibleName('Evangelism folder, 1 note');
    await expect(noteCard(page, 'Day 1')).toHaveCount(0);

    // a new look: Edit shows the icons on screen, with no keyboard popping up over them
    await folder(page, 'Evangelism').click();
    await page.getByRole('region', { name: 'Folder “Evangelism”' }).getByRole('button', { name: 'Edit' }).first().click();
    const edit = page.getByRole('form', { name: 'Edit folder “Evangelism”' });
    await expect(edit).toBeFocused();
    await expect(edit.getByRole('group', { name: 'Icon' })).toBeInViewport({ ratio: 1 });
    await edit.getByRole('radio', { name: 'Dove', exact: true }).check();
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect(edit).toBeHidden();
    await page.getByRole('region', { name: 'Folder “Evangelism”' }).getByRole('button', { name: 'Edit' }).first().click();
    await expect(edit.getByRole('radio', { name: 'Dove', exact: true })).toBeChecked();
  });
});
