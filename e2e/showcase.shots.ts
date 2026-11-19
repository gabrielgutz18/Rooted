// The pictures of the app on the landing page (src/assets/landing/), taken from the real app
// in trial mode with a made-up church family's notes. Every run checks that each scene
// shows what its picture is meant to show; with SHOWCASE=1 the pictures are retaken too:
//
//   SHOWCASE=1 npx playwright test -c playwright.showcase.config.ts showcase
//   (PowerShell: $env:SHOWCASE=1; npx playwright test -c playwright.showcase.config.ts showcase)
//
// Named .shots.ts, not .spec.ts, so the main suite (playwright.config.ts) leaves it out.
//
// Each scene sets its hour (?hour=), so they look the same whenever they're taken.

import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';

const OUT = 'src/assets/landing';
const RETAKE = !!process.env.SHOWCASE;

// The newest update's id, so Menu → Updates has no "New" badge in the pictures. (Read from
// the source: src/lib/updates.ts imports pictures, which the test runner can't load.)
const LATEST_UPDATE = /export const UPDATES[^=]*=\s*\[\s*\{\s*id:\s*'([^']+)'/.exec(readFileSync('src/lib/updates.ts', 'utf8'))?.[1] ?? '';

async function shoot(target: Page | Locator, name: string, style?: string) {
  if (RETAKE) await target.screenshot({ path: `${OUT}/${name}.png`, animations: 'allow', style });
}

// Pictures cropped to the tree on the landing page: just the scene, without the stage card,
// the streak card and the greeting, which would poke into the crop's corners.
const SCENE_ONLY = '.hero > :not(.hero-canvas) { visibility: hidden !important; }';

interface Person {
  name: string;
  tree: string;
  /** Days in a row with a note, ending today. */
  streak: number;
  /** Most days before the streak have a note too, for this many days. */
  history: number;
  /** One note's points from over a year ago (before the progress squares), so the tree starts grown. */
  headStart: number;
  session?: boolean;
}

// Runs in the browser before the app loads (once, so a reload keeps what the test did).
// It must not use anything from outside itself: Playwright sends its source to the page.
function build({ people, seen }: { people: Person[]; seen: string }) {
  if (sessionStorage.getItem('e2e.seeded')) return;
  sessionStorage.setItem('e2e.seeded', '1');
  const NOTES: [string, string, number][] = [
    ['Sunday service', 'Pastor preached on Psalm 23. “The Lord is my shepherd, I shall not want.” I want to trust Him more with work this week.', 58],
    ['Cell group', 'We prayed for Ana’s mother in the hospital and read James 1. Grateful for this family.', 46],
    ['Morning prayer', 'Thanked God for a new day and prayed for my family and friends.', 32],
    ['Bible study', 'Read John 15 — abide in the vine. Without Him I can do nothing.', 54],
    ['Panalangin', 'Nagpasalamat ako sa Diyos para sa aking pamilya at nagdasal para sa aking mga kaibigan.', 38],
    ['Quiet time', 'Read Philippians 4:6–7 and gave my worries to God. Peace after a long day.', 44],
    ['Gratitude', 'Thankful for answered prayer — Dad’s test results came back clear. Praise God!', 40],
    ['SUNYL study', 'Lesson on grace: saved by faith, not by works. Ephesians 2:8.', 52],
  ];
  const now = new Date();
  // past days at noon; today just after midnight, so it's never in the future
  const at = (daysAgo: number, hour = 12) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, daysAgo ? hour : 0, daysAgo ? 0 : 1).toISOString();
  const db = { users: [] as unknown[], entries: [] as unknown[], session: null as string | null };
  people.forEach((p, k) => {
    const id = `show-${k}`;
    db.users.push({ id, name: p.name, username: p.name.toLowerCase(), is_admin: false, created_at: at(400), tree: p.tree });
    if (p.session !== false && !db.session) db.session = id;
    db.entries.push({ id: `${id}-old`, user_id: id, subject: 'Planted', note: 'My first note.', points: p.headStart, tags: [], created_at: at(390) });
    for (let d = 0; d < p.history; d++) {
      // the streak, then most days (a steady made-up pattern, not random, so the pictures match)
      if (d >= p.streak && ((d * 7 + k * 3) % 10 < 3 || d === p.streak)) continue;
      const [subject, note, points] = NOTES[(d + k) % NOTES.length];
      const less = (d * 13 + k) % 4; // some days write a little, some a lot
      db.entries.push({ id: `${id}-${d}`, user_id: id, subject, note, points: Math.max(8, points - less * 12), tags: [], created_at: at(d, 7 + (d % 12)) });
    }
  });
  localStorage.setItem('rooted.v2', JSON.stringify(db));
  localStorage.setItem('rooted.updatesSeen', seen); // no "New" badge
}

const GRACE: Person = { name: 'Grace', tree: 'sakura', streak: 23, history: 340, headStart: 600 };
const JOY: Person = { name: 'Joy', tree: 'jacaranda', streak: 9, history: 220, headStart: 1500 };
const MARK: Person = { name: 'Mark', tree: 'oak', streak: 41, history: 120, headStart: 5200 };
const ANA: Person = { name: 'Ana', tree: 'poinciana', streak: 4, history: 60, headStart: 2400 };
const friend = (p: Person): Person => ({ ...p, session: false });

/** Signed in as the first of `people`; the rest are friends. */
async function open(page: Page, people: Person[], hour: number) {
  await page.addInitScript(build, { people: people.map((p, i) => (i ? friend(p) : p)), seen: LATEST_UPDATE });
  await page.goto(`/?hour=${hour}`);
  await expect(page.locator('.side-brand, .hero-top').first()).toBeVisible();
}

/** Let the scene settle: the camera eases in and the animals arrive. */
const settle = (page: Page) => page.waitForTimeout(2500);

test.beforeEach(({ page }) => {
  page.on('pageerror', (err) => {
    throw err;
  });
});

test.describe('on a computer', () => {
  test('the app, by day', async ({ page }) => {
    await open(page, [GRACE, MARK, JOY, ANA], 10);
    await expect(page.locator('.side-brand')).toContainText('Grace');
    await expect(page.getByRole('group', { name: /Daily streak: 23 days/ })).toBeVisible();
    await expect(page.locator('.friend')).toHaveCount(3);
    await settle(page);
    await shoot(page, 'app-desktop');
  });

  test("today's note, with what it grows", async ({ page }) => {
    await open(page, [GRACE, MARK, JOY, ANA], 10);
    const composer = page.locator('.composer');
    await composer.getByLabel('Subject').fill('Cell group');
    await composer
      .getByLabel('Note')
      .fill('We read Psalm 23 together and prayed for Ana’s mother. “The Lord is my shepherd; I shall not want.” Grateful for this family of faith.');
    await expect(composer.locator('.analysis-points')).toBeVisible();
    await shoot(composer, 'note');
  });

  test('the progress squares', async ({ page }) => {
    await open(page, [GRACE, MARK, JOY, ANA], 10);
    const track = page.locator('section[aria-labelledby="track-title"]');
    await expect(track.locator('.heat-cell.l4').first()).toBeVisible();
    await shoot(track, 'progress');
  });

  test('the streak lamp, at night', async ({ page }) => {
    await open(page, [MARK, GRACE], 21);
    await expect(page.getByRole('group', { name: /Daily streak: 41 days/ })).toBeVisible();
    await settle(page);
    // the card and the lamp post beside the tree, lit
    const hero = (await page.locator('.hero').boundingBox())!;
    const w = 340;
    if (RETAKE) await page.screenshot({ path: `${OUT}/lamp.png`, clip: { x: hero.x + hero.width - w, y: hero.y, width: w, height: hero.height - 40 } });
  });

  test("visiting a friend's tree", async ({ page }) => {
    await open(page, [GRACE, JOY, MARK, ANA], 16);
    await page.locator('.friend', { hasText: 'Joy' }).click();
    await expect(page.getByRole('button', { name: '← My tree' })).toBeVisible();
    await settle(page);
    await shoot(page, 'friend');
  });

  test('choosing a tree', async ({ page }) => {
    await open(page, [GRACE, MARK], 10);
    await page.getByRole('button', { name: /Choose tree/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await settle(page);
    await shoot(page, 'picker');
  });

  // the headStart, plus today's note (so the leaves are on)
  for (const s of [
    { name: 'sprout', points: 70, stage: 'Sprout' },
    { name: 'sapling', points: 700, stage: 'Sapling' },
    { name: 'grown', points: 5200, stage: 'Grown Tree' },
  ]) {
    test(`a tree at ${s.stage}`, async ({ page }) => {
      await open(page, [{ ...GRACE, streak: 1, history: 1, headStart: s.points }], 10);
      await expect(page.locator('.hud-row').first()).toContainText(s.stage);
      await settle(page);
      await shoot(page.locator('.hero'), `grow-${s.name}`, SCENE_ONLY);
    });
  }

  // the same tree from morning to night
  for (const hour of [7, 13, 18, 22]) {
    test(`the tree at ${hour}:00`, async ({ page }) => {
      await open(page, [GRACE, MARK], hour);
      await settle(page);
      await shoot(page.locator('.hero'), `hour-${String(hour).padStart(2, '0')}`, SCENE_ONLY);
    });
  }
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the app on a phone', async ({ page }) => {
    await open(page, [JOY, GRACE, MARK], 17);
    await expect(page.getByRole('button', { name: /Menu/ })).toBeVisible();
    await settle(page);
    await shoot(page, 'app-phone');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
