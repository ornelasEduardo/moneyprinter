# moneyprinter

**Local-first personal finance software. Your data, your choices.**

Every feature, every decision should serve that core value — data stays local, no third-party sync, no telemetry, user is always in control. AI/agentic features are supported via local LLM plugins only — no data leaves the machine.

## Stack

- **Framework**: Next.js 15 (App Router, `src/app/`)
- **UI**: `doom-design-system@0.5.1` — neubrutalist component library
- **Styling**: SASS modules (emotion was removed, see git history)
- **DB**: Prisma + PostgreSQL (`pg`)
- **Tables**: TanStack Table v8 + TanStack Virtual
- **Charts**: D3
- **State**: Zustand
- **Tests**: Vitest + Testing Library (`npm test`)

## Dev

```bash
npm run dev:docker   # local dev with Docker (postgres included)
npm run dev          # requires external postgres
npm test             # vitest (runs once, exits)
npm run test:watch   # vitest in watch mode
npx tsc --noEmit     # type check
```

## Running tests

`npm test` runs vitest with `--run` flag (single run, no watch). This is important — vitest defaults to watch mode which holds the terminal and spawns zombie processes. Always use `npm test` or `npx vitest --run`, never bare `vitest` or `npx vitest` without `--run`.

## Database

- **Schema source of truth**: `src/lib/schema.sql`
- **Migrations**: Atlas (`migrations/` dir). `dev.sh` runs `prisma db push` as a shortcut for local dev, but Atlas is the real migration tool.
- **Local DB**: Docker on port `5433` (postgres:15-alpine), creds `postgres/password`, db `moneyprinter`
- **Connection**: `DATABASE_URL` env var — set in `.env` (gitignored)
- **Schema changes**: edit `src/lib/schema.sql` → run Atlas to diff + generate migration. No seed data setup.
- **Prisma**: client only — no migrations. Run `npx prisma generate` after schema changes.

## doom-design-system

Version `0.5.1`. `transpilePackages: ['doom-design-system']` is set in `next.config.mjs`.

## Test setup

`src/test-utils.tsx` wraps renders with `ThemeProvider` + `ToastProvider`. Always import `render` from there, not from `@testing-library/react`.

## Project structure

```
src/
  app/            # Next.js pages + server actions
    actions/      # Server actions (DB mutations)
  components/     # Shared client components
  lib/            # Types, store, utilities
```
