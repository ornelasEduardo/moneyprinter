import { defineConfig, devices } from '@playwright/test';

// This suite must never fall back to the user's personal database or server.
process.env.DATABASE_URL = process.env.REFUNDS_TEST_DATABASE_URL ?? 'postgresql://postgres:test-only@127.0.0.1:55439/moneyprinter_refunds_test';
const db = new URL(process.env.DATABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(db.hostname) || !db.pathname.endsWith('_test')) {
  throw new Error('Refund E2E requires a local disposable database with a name ending in _test');
}
process.env.E2E_BASE_URL = 'http://localhost:3107';
export default defineConfig({
  testDir: './e2e',
  testMatch: /(?:refund-payments|refund-imports|refund-restore)\.spec\.ts/,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_BASE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev -- --hostname localhost --port 3107',
    url: 'http://localhost:3107/login',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: process.env.DATABASE_URL, NEXT_TELEMETRY_DISABLED: '1' },
  },
});
