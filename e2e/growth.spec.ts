// A random user with no head start keeps a streak of 10, 20, 30, 50, 100 and 200 days,
// so you can watch the tree grow from the notes alone.
//
//   npm run test:e2e:growth                       watch it in a browser window
//   GROWTH_SEED=1234 npm run test:e2e:growth      the same "random" user again
//
// The seed data (as a table in the terminal, and the exact JSON saved in the browser)
// and a screenshot per streak land in e2e/screenshots/growth/ and the HTML report.

import { expect, test } from '@playwright/test';
import { seed, type SeedUser } from './seed';
import { stageFor } from '../src/lib/growth';
import { SPECIES } from '../src/scene/species';

const SHOTS = 'e2e/screenshots/growth';
const STREAKS = [10, 20, 30, 50, 100, 200];
const NAMES = ['Grace', 'Paul', 'Ruth', 'Mark', 'Joy', 'Esther', 'Caleb', 'Hannah', 'Luke', 'Miriam', 'Joel', 'Lydia'];
const TREES = SPECIES.map((s) => s.id);

// a small seeded random, so a run can be repeated with GROWTH_SEED
function rng(n: number) {
  return () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('a random user keeps a streak and the tree grows', async ({ page }, info) => {
  test.slow(); // reloads the app once per streak, and pauses so you can watch

  const runSeed = Number(process.env.GROWTH_SEED ?? Math.floor(Math.random() * 1e6));
  const rand = rng(runSeed);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const name = pick(NAMES);
  const tree = pick(TREES);
  // a realistic note scores about 10–40 points; one per day for the longest streak
  const daily = Array.from({ length: Math.max(...STREAKS) }, () => 10 + Math.floor(rand() * 31));

  console.log(`\nRandom user: ${name} · ${tree} tree · GROWTH_SEED=${runSeed}\n`);
  page.on('pageerror', (err) => {
    throw err;
  });

  const rows: Record<string, string | number>[] = [];
  let first = true;
  for (const streak of STREAKS) {
    const user: SeedUser = { name, tree, streak, lastNoteDaysAgo: 0, headStart: 0, notePoints: daily.slice(0, streak) };
    const points = user.notePoints!.reduce((a, b) => a + b, 0);
    const expected = stageFor(points);

    if (first) {
      await seed(page, [user]);
      await page.goto('/');
      await expect(page.getByText('Trial mode · this browser only')).toBeVisible();
      first = false;
    } else {
      await seed(page, [user], true);
      await page.reload();
    }

    // the lamp, the stage and the growth points all match the seed
    await expect(page.locator('.lamp-count')).toHaveText(`${streak} days`);
    await expect(page.locator('.hud-stage')).toHaveText(expected.stage.name);
    await expect(page.locator('.hud-points')).toHaveText(`${points} growth`);

    // the exact data the app is reading
    const saved = await page.evaluate(() => localStorage.getItem('rooted.v2'));
    await info.attach(`seed-streak-${streak}.json`, { body: JSON.stringify(JSON.parse(saved!), null, 2), contentType: 'application/json' });

    await page.waitForTimeout(1500); // let the tree settle, and give you a look
    const shot = `${SHOTS}/streak-${String(streak).padStart(3, '0')}.png`;
    await page.locator('.hero').screenshot({ path: shot });
    await info.attach(`tree at ${streak} days`, { path: shot, contentType: 'image/png' });

    rows.push({
      streak: `${streak} days`,
      notes: streak,
      'avg pts/note': Math.round(points / streak),
      'growth points': points,
      stage: expected.stage.name,
      'to next': expected.next ? `${expected.toNext} to ${expected.next.name}` : 'fully grown',
    });
  }

  console.table(rows);
  await info.attach('summary.json', { body: JSON.stringify({ seed: runSeed, name, tree, daily, rows }, null, 2), contentType: 'application/json' });

  // more days in a row never shrinks the tree
  const stages = rows.map((r) => stageFor(Number(r['growth points'])).index);
  expect(stages).toEqual([...stages].sort((a, b) => a - b));
});
