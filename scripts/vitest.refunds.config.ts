import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Real Prisma requires Node; no browser/ThemeProvider setup is used here.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  test: { environment: 'node', fileParallelism: false, include: ['src/app/actions/payments.integration.test.ts', 'src/lib/restore.integration.test.ts', 'src/lib/export-history.integration.test.ts'] },
});
