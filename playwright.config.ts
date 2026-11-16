import { defineConfig, devices } from '@playwright/test';

// Browser tests run against their own dev server in trial mode: the Supabase keys in
// .env.local are overridden for this one server, so tests never touch the real database.
const PORT = 5178;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // the Chrome already installed on this computer (no browser download)
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    // variables already set win over .env files in Vite; 'your-project-ref' means "not configured"
    env: { VITE_SUPABASE_URL: 'your-project-ref', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
});
