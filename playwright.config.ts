import { defineConfig, devices } from '@playwright/test';

// E2E config. Assumes the local dev stack is up (npm run dev:docker) on :3000
// with the sandbox account seeded. `auth.setup.ts` logs in once and saves the
// session; specs reuse it via storageState.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/sandbox.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
