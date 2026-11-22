// Jesus visiting your tree (src/lib/visit.ts, src/components/Visitor.tsx).
// The schedule is checked directly; the visit itself in the real app (trial mode), where
// ?visit=now brings Him when the page opens. Screenshots go to e2e/screenshots/visit/.

import { expect, test, type Page } from '@playwright/test';
import { seed, type SeedUser } from './seed';
import { analyze } from '../src/lib/analyze';
import { ARRIVE_FROM, ARRIVE_UNTIL, currentVisit, STAY_MINUTES, VISIT_CHANCE, VISIT_MULTIPLIER, visitOn } from '../src/lib/visit';

const SHOTS = 'e2e/screenshots/visit';
const NOTE = {
  subject: 'Cell group tonight',
  note: 'We read Psalm 23 together at cell group and prayed for each other. I am thankful that God is my shepherd and leads me.',
};
const BASE = analyze(NOTE.subject, NOTE.note).points;
const GRACE: SeedUser = { name: 'Grace', streak: 3, lastNoteDaysAgo: 1 }; // 4800 + 3 × 20 = 4860 growth

async function open(page: Page, users: SeedUser[], path: string) {
  page.on('pageerror', (err) => {
    throw err;
  });
  await seed(page, users);
  await page.goto(path);
  // never run these against the real database (on a phone this is in the closed menu)
  await expect(page.getByText(/^Trial mode · (this browser only|sa browser na ito lang)$/)).toBeAttached();
}

const growth = async (page: Page) => Number((await page.locator('.hud-points').textContent())?.match(/\d+/)?.[0]);

/** Where He stands (the left of His frame, CSS px), and the row of the palm He reaches with. */
const spot = (page: Page) =>
  page.locator('.visitor').evaluate((el: HTMLElement) => ({ left: parseFloat(el.style.left), ty: el.style.getPropertyValue('--ty') }));

// no Bible verse in what He shows, and nothing over the middle of the tree
async function noVerse(page: Page) {
  await expect(page.locator('.hero')).not.toContainText(/John|Juan|unto you|sumainyo/);
  await expect(page.locator('.visitor-bubble')).toHaveCount(0);
}

async function fillNote(page: Page) {
  await page.getByLabel('Subject', { exact: true }).fill(NOTE.subject);
  await page.getByLabel('Note', { exact: true }).fill(NOTE.note);
}

test.describe('the schedule', () => {
  test('He comes on about half the days, at a random time, the same on every device', () => {
    const days = 2000;
    let visits = 0;
    for (let i = 0; i < days; i++) {
      const day = new Date(2026, 0, 1 + i);
      const v = visitOn('member-1', day);
      expect(visitOn('member-1', day)).toEqual(v); // worked out the same every time
      if (!v) continue;
      visits++;
      const start = new Date(v.start);
      expect(start.getDate()).toBe(day.getDate());
      expect(start.getHours()).toBeGreaterThanOrEqual(ARRIVE_FROM);
      expect(start.getHours()).toBeLessThan(ARRIVE_UNTIL);
      expect(v.end - v.start).toBe(STAY_MINUTES * 60000);
    }
    expect(visits / days).toBeGreaterThan(VISIT_CHANCE - 0.05);
    expect(visits / days).toBeLessThan(VISIT_CHANCE + 0.05);
    // and not on the same days for everyone
    const a = Array.from({ length: 60 }, (_, i) => !!visitOn('member-1', new Date(2026, 5, 1 + i)));
    const b = Array.from({ length: 60 }, (_, i) => !!visitOn('member-2', new Date(2026, 5, 1 + i)));
    expect(a).not.toEqual(b);
  });

  test('a visit lasts its time, and ends once a note is written during it', () => {
    let day = new Date(2026, 10, 22);
    while (!visitOn('member-1', day)) day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const v = visitOn('member-1', day)!;
    const mid = v.start + 60 * 60000;
    expect(currentVisit('member-1', v.start - 60000, [])).toBeNull(); // not yet
    expect(currentVisit('member-1', mid, [])).toEqual(v);
    expect(currentVisit('member-1', v.end, [])).toBeNull(); // gone
    // a note from before He came doesn't end it; one written while He's there does
    expect(currentVisit('member-1', mid, [{ created_at: new Date(v.start - 3600000).toISOString() }])).toEqual(v);
    expect(currentVisit('member-1', mid, [{ created_at: new Date(v.start + 60000).toISOString() }])).toBeNull();
  });
});

test('Jesus visits: He walks about, rests His hand on the tree, and the note written then grows 3×', async ({ page }) => {
  await open(page, [GRACE], '/?visit=now');
  const jesus = page.locator('.visitor');
  await expect(jesus).toBeVisible();
  await expect(jesus).toHaveAccessibleName('Jesus is visiting your tree');
  // what's happening shows in the corner, in place of the greeting
  const chip = page.locator('.hero-top .visit-chip');
  await expect(chip).toHaveText('Jesus is visiting · notes grow 3×');
  await noVerse(page);

  // after the light He walks over to the tree…
  await expect(jesus).toHaveClass(/is-here/);
  const start = await spot(page);
  await page.waitForTimeout(700);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/1-walking-to-the-tree.png` });
  // …and rests His hand on it
  await expect(jesus).toHaveClass(/is-touching/, { timeout: 12000 });
  const touching = await spot(page);
  expect(touching.left).not.toBe(start.left); // He walked there
  expect(touching.ty).toBe('18'); // a grown tree: His hand at its trunk
  await expect(page.locator('.visitor-palm')).toBeVisible();
  const box = (await jesus.boundingBox())!;
  const hud = (await page.locator('.hero-hud').boundingBox())!;
  expect(box.x).toBeGreaterThan(hud.x + hud.width); // clear of the stage card
  await page.waitForTimeout(1300); // light rising from His palm
  await page.locator('.hero').screenshot({ path: `${SHOTS}/2-hand-on-the-tree.png` });
  await page.screenshot({
    path: `${SHOTS}/3-hand-on-the-tree-close.png`,
    clip: { x: box.x - 90, y: box.y - 70, width: box.width + 180, height: box.height + 110 },
  });

  // the note form says so, and counts 3×
  const before = await growth(page);
  expect(before).toBe(4860);
  await fillNote(page);
  await expect(page.locator('.blessed-tag')).toContainText('Jesus is visiting · 3× growth');
  await expect(page.locator('.blessed-tag')).toContainText(`+${BASE} × 3`);
  await expect(page.locator('.analysis-points')).toHaveText(`+${BASE * VISIT_MULTIPLIER} growth`);
  await page.locator('.composer').screenshot({ path: `${SHOTS}/4-note-grows-3x.png` });

  // saved: He blesses it, the tree grows 3×, then He goes
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(jesus).toHaveClass(/is-bless/);
  await expect(chip).toHaveText('Note blessed: 3× growth!');
  await noVerse(page);
  await expect(page.locator('.float-points')).toContainText(`+${BASE * VISIT_MULTIPLIER}×3`);
  await expect.poll(() => growth(page)).toBe(before + BASE * VISIT_MULTIPLIER);
  await page.waitForTimeout(500);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/5-blessing-the-note.png` });

  await expect(jesus).toHaveCount(0, { timeout: 9000 });
  await expect(page.locator('.hero-top .hero-chip')).not.toHaveClass(/visit-chip/); // the greeting is back
  await page.locator('.hero').screenshot({ path: `${SHOTS}/6-after-he-left.png` });

  // the next note grows as usual
  await expect(page.locator('.blessed-tag')).toHaveCount(0);
  await fillNote(page);
  await expect(page.locator('.analysis-points')).toHaveText(`+${BASE} growth`);

  // and coming back doesn't bring Him again: a note was written during this visit
  await page.reload();
  await expect(page.locator('.hud-points')).toHaveText(`${before + BASE * VISIT_MULTIPLIER} growth`);
  await page.waitForTimeout(800);
  await expect(page.locator('.visitor')).toHaveCount(0);
});

test('after touching the tree a while He walks about on the grass', async ({ page }) => {
  await open(page, [GRACE], '/?visit=now');
  const jesus = page.locator('.visitor');
  await expect(jesus).toHaveClass(/is-touching/, { timeout: 12000 });
  const atTree = await spot(page);
  // the hand comes off the tree after 7–11 s and He walks away
  await expect(jesus).not.toHaveClass(/is-touching/, { timeout: 14000 });
  await page.waitForTimeout(900);
  const away = await spot(page);
  expect(Math.abs(away.left - atTree.left)).toBeGreaterThan(10);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/7-walking-about.png` });
  // He stays on the grass, clear of the stage card and the lamp post
  const box = (await jesus.boundingBox())!;
  const hud = (await page.locator('.hero-hud').boundingBox())!;
  const post = (await page.locator('.lamp-post').boundingBox())!;
  expect(box.x + box.width * 0.2).toBeGreaterThan(hud.x + hud.width);
  expect(box.x + box.width * 0.8).toBeLessThan(post.x);
  // pressing Him: He turns to you and raises His hand (and nothing opens over the tree)
  await jesus.click();
  await page.waitForTimeout(300);
  await noVerse(page);
});

test('He visits a small tree too: He bends down to a seed just planted, and touches a sprout', async ({ page }) => {
  // a new account: the seed is still in the ground
  await open(page, [{ name: 'Joy', streak: 0, lastNoteDaysAgo: 0, headStart: 0 }], '/?visit=now');
  const jesus = page.locator('.visitor');
  await expect(jesus).toBeVisible();
  await expect(page.locator('.hud-points')).toHaveText('0 growth');
  await expect(jesus).toHaveClass(/is-touching/, { timeout: 12000 });
  expect((await spot(page)).ty).toBe('23'); // the low reach
  await page.waitForTimeout(1300);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/8-seed-just-planted.png` });
  const box = (await jesus.boundingBox())!;
  await page.screenshot({
    path: `${SHOTS}/9-seed-close.png`,
    clip: { x: box.x - 90, y: box.y - 70, width: box.width + 180, height: box.height + 110 },
  });
});

test('He touches a sprout', async ({ page }) => {
  await open(page, [{ name: 'Joy', streak: 1, lastNoteDaysAgo: 0, headStart: 0, notePoints: [30] }], '/?visit=now');
  await expect(page.locator('.hud-stage')).toHaveText('Seed');
  await expect(page.locator('.visitor')).toHaveClass(/is-touching/, { timeout: 12000 });
  await page.waitForTimeout(1300);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/9b-sprout.png` });
});

test('He visits a sapling, about His own height', async ({ page }) => {
  await open(page, [{ name: 'Joy', streak: 6, lastNoteDaysAgo: 0, headStart: 600, notePoints: [20, 20, 20, 20, 20, 20] }], '/?visit=now');
  await expect(page.locator('.hud-stage')).toHaveText('Sapling');
  await expect(page.locator('.visitor')).toHaveClass(/is-touching/, { timeout: 12000 });
  await page.waitForTimeout(1300);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/10-sapling.png` });
});

test('He visits a coconut palm on its beach too', async ({ page }) => {
  await open(page, [{ ...GRACE, tree: 'coconut' }], '/?visit=now&hour=12');
  const jesus = page.locator('.visitor');
  await expect(page.locator('.hero-top .visit-chip')).toHaveText('Jesus is visiting · notes grow 3×');
  await expect(jesus).toHaveClass(/is-touching/, { timeout: 12000 });
  expect((await spot(page)).ty).toBe('18'); // a grown palm: standing, His hand at its trunk
  const box = (await jesus.boundingBox())!;
  const hud = (await page.locator('.hero-hud').boundingBox())!;
  expect(box.x).toBeGreaterThan(hud.x + hud.width);
  await noVerse(page);
  await page.waitForTimeout(1300);
  await page.locator('.hero').screenshot({ path: `${SHOTS}/13-coconut-palm.png` });
  await page.screenshot({
    path: `${SHOTS}/14-coconut-palm-close.png`,
    clip: { x: box.x - 90, y: box.y - 70, width: box.width + 180, height: box.height + 110 },
  });
});

test('without a visit nothing changes: no Jesus, and notes grow as usual', async ({ page }) => {
  await open(page, [GRACE], '/');
  await expect(page.locator('.lamp-card')).toBeVisible();
  await expect(page.locator('.visitor')).toHaveCount(0);
  await expect(page.locator('.visit-chip')).toHaveCount(0);
  await fillNote(page);
  await expect(page.locator('.blessed-tag')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect.poll(() => growth(page)).toBe(4860 + BASE);
});

test('He visits only your own tree, not a friend’s', async ({ page }) => {
  await open(page, [GRACE, { name: 'Mark', streak: 4, lastNoteDaysAgo: 0, session: false, tree: 'sakura' }], '/?visit=now');
  await expect(page.locator('.visitor')).toBeVisible();
  await page.locator('.friend', { hasText: 'Mark' }).click();
  await expect(page.locator('.hero-chip')).toContainText('Mark');
  await expect(page.locator('.visitor')).toHaveCount(0, { timeout: 4000 });
  await page.getByRole('button', { name: 'My tree' }).first().click();
  await expect(page.locator('.visitor')).toBeVisible();
  await expect(page.locator('.visit-chip')).toBeVisible();
});

test('at night, on a phone, and in Tagalog', async ({ browser }) => {
  // at night He keeps His light
  const night = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await open(night, [GRACE], '/?visit=now&hour=21');
  await expect(night.locator('.visitor')).toHaveClass(/is-touching/, { timeout: 12000 });
  await night.waitForTimeout(1300);
  await night.locator('.hero').screenshot({ path: `${SHOTS}/11-night.png` });
  await night.close();

  // a phone, in Tagalog
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.addInitScript(() => localStorage.setItem('rooted.lang', 'tl'));
  await open(phone, [{ ...GRACE, tree: 'sakura' }], '/?visit=now');
  const chip = phone.locator('.hero-top .visit-chip');
  await expect(chip).toHaveText('Narito si Hesus · 3× ang paglago');
  await noVerse(phone);
  // the chip fits on the screen, above the stage card
  const c = (await chip.boundingBox())!;
  const hud = (await phone.locator('.hero-hud').boundingBox())!;
  const menu = (await phone.locator('.menu-btn').boundingBox())!;
  expect(c.x + c.width).toBeLessThan(menu.x - 4); // clear of the Menu button
  expect(c.y + c.height).toBeLessThanOrEqual(hud.y);
  await expect(phone.locator('.visitor')).toHaveClass(/is-touching/, { timeout: 12000 });
  const box = (await phone.locator('.visitor').boundingBox())!;
  expect(box.x).toBeGreaterThan(0);
  expect(box.x + box.width).toBeLessThan(390);
  await phone.waitForTimeout(1300);
  await phone.locator('.hero').screenshot({ path: `${SHOTS}/12-phone-tagalog.png` });
  await phone.close();
});
