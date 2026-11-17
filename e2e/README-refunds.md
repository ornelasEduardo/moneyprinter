# Refund and payment regression tests

These tests use ephemeral users in a disposable database. They must not use a personal MoneyPrinter database. The Playwright configuration starts its own server on localhost:3107 and refuses to reuse an existing server.

Create the disposable database (PostgreSQL 15, matching the application):

```bash
docker run -d --name moneyprinter-refunds-test-db \
  -e POSTGRES_PASSWORD=test-only -e POSTGRES_DB=moneyprinter_refunds_test \
  -p 127.0.0.1:55439:5432 postgres:15-alpine
```

Wait until `docker exec moneyprinter-refunds-test-db pg_isready -U postgres` succeeds, then apply checked-in migrations:

```bash
docker run --rm --network container:moneyprinter-refunds-test-db \
  -v "$PWD:/project:ro" -w /project arigaio/atlas:latest-alpine \
  migrate apply --dir file://migrations \
  --url 'postgres://postgres:test-only@localhost:5432/moneyprinter_refunds_test?sslmode=disable'
npx prisma generate
npx playwright install chromium
```

Run real PostgreSQL integration checks:

```bash
DATABASE_URL=postgresql://postgres:test-only@localhost:55439/moneyprinter_refunds_test npm run test:integration:refunds
```

Run the browser regressions:

```bash
npm run test:e2e:refunds
```

The browser suite verifies manual refund entry and net spending, CSV purpose editing and normalization, account-scoped duplicate detection, payment reconciliation with either statement arriving first, unlinking, and attaching a delayed statement to an existing transfer. Browser traces and failure screenshots are saved in `test-results/`.

Stop the disposable database when finished:

```bash
docker rm -f moneyprinter-refunds-test-db
```

Do not run production builds concurrently with the browser suite: Next.js development and production builds share `.next/` in this worktree.
