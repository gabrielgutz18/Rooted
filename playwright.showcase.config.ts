import { defineConfig, devices } from '@playwright/test';

// The landing page and its pictures, on a dev server of their own (trial mode, like
// playwright.config.ts), so they can run while the main suite is running:
//
//   npx playwright test -c playwright.showcase.config.ts            the landing page tests
//   SHOWCASE=1 npx playwright test -c playwright.showcase.config.ts  also retake the pictures in
//                                                                   src/assets/landing/ (e2e/showcase.shots.ts)
//   (PowerShell: $env:SHOWCASE=1; npx playwright test -c playwright.showcase.config.ts)
const PORT = 5198;

export default defineConfig({
  testDir: 'e2e',
  testMatch: ['landing.spec.ts', 'landing-showcase.spec.ts', 'showcase.shots.ts'],
  outputDir: 'test-results/showcase',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'your-project-ref', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
});
