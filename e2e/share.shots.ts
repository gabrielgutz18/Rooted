// The picture shown when someone shares Rooted's link (Facebook, Messenger, WhatsApp, X...):
// public/og-image.png, 1200 × 630, named by the og:image tag in index.html. It's the landing
// page itself, with a sakura at sunset, the navigation bar and small print left out, and the
// card's words made bigger so they can be read in a small preview. Retake it when the landing
// page's look changes:
//
//   SHOWCASE=1 npx playwright test -c playwright.showcase.config.ts share
//   (PowerShell: $env:SHOWCASE=1; npx playwright test -c playwright.showcase.config.ts share)
//
// Named .shots.ts, not .spec.ts, so the main suite (playwright.config.ts) leaves it out.

import { expect, test } from '@playwright/test';

const OUT = 'public/og-image.png';
const RETAKE = !!process.env.SHOWCASE;

const SHARE_STYLE = `
  .landing-nav, .landing-stage, .upd-pill, .landing-signin { display: none !important; }
  .landing-hero { padding: 0 64px !important; }
  .landing-card { width: 520px !important; padding: 32px 36px !important; gap: 16px !important; }
  .landing-title { font-size: 96px !important; }
  .landing-tagline { font-size: 30px !important; }
  .landing-card > p.muted { font-size: 21px !important; }
  .landing-actions .btn { font-size: 22px !important; padding: 14px 30px !important; }
`;

// reduced motion: the tree starts fully grown, and holds still for the picture
test.use({ viewport: { width: 1200, height: 630 }, reducedMotion: 'reduce' });

test('the picture for shared links', async ({ page }) => {
  await page.goto('/?tree=sakura&hour=18');
  await page.addStyleTag({ content: SHARE_STYLE });
  await expect(page.locator('.landing-stage')).toHaveText('Growing · Grown Tree'); // (hidden, but there)
  await expect(page.getByRole('heading', { name: 'Rooted', level: 1 })).toBeVisible();
  await expect(page.locator('.landing-card').getByRole('button', { name: 'Try now' })).toBeVisible();
  await page.waitForTimeout(2500); // the tree settles beside the card, birds fly in
  if (RETAKE) await page.screenshot({ path: OUT });
});
