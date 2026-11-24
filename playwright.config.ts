import { defineConfig, devices } from '@playwright/test';
import { updatesRead } from './e2e/storage';

// Browser tests run against their own dev servers, never the real database:
//  - trial mode (most tests): the Supabase keys in .env.local are overridden for this server
//  - offline cloud mode (e2e/offline.spec.ts): a made-up Supabase project that the tests cut
//    off from the network, to check that the app still opens without a connection
const PORT = 5178;
const OFFLINE_PORT = 5188;
const FAKE_SUPABASE = 'https://e2e-offline.supabase.co';

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
    storageState: updatesRead(PORT, OFFLINE_PORT), // the newest update already read (see e2e/storage.ts)
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /offline\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'offline',
      testMatch: /offline\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 }, baseURL: `http://localhost:${OFFLINE_PORT}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: false,
      // variables already set win over .env files in Vite; 'your-project-ref' means "not configured"
      env: { VITE_SUPABASE_URL: 'your-project-ref', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    },
    {
      command: `npx vite --port ${OFFLINE_PORT} --strictPort`,
      url: `http://localhost:${OFFLINE_PORT}`,
      reuseExistingServer: false,
      env: { VITE_SUPABASE_URL: FAKE_SUPABASE, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e_offline' },
    },
  ],
});
