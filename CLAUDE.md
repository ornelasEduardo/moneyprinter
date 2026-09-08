# moneyprinter

**Local-first personal finance software. Your data, your choices.**

Every feature, every decision should serve that core value — data stays local, no third-party sync, no telemetry, user is always in control. AI/agentic features are supported via local LLM plugins only — no data leaves the machine.

## Stack

- **Framework**: Next.js 15 (App Router, `src/app/`)
- **UI**: `doom-design-system@0.8.0` — neubrutalist component library
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

Version `0.8.0`. `transpilePackages: ['doom-design-system']` is set in `next.config.mjs`.

## Designing finance dashboards & product UI

Guidance for planning/analytics surfaces (Plan hub, Analytics, calculators). Grounded in dashboard-UX research (NN/g progressive disclosure; Pencil & Paper; fintech "verdict-first" patterns).

- **doom tokens only — never hardcode.** Style through doom's CSS custom properties: colors (`--primary`, `--secondary`, `--success`/`--warning`/`--error`, `--background`, `--card-bg`, `--card-border`, `--muted-foreground`), `--space-*`, `--radius-*`, `--shadow-md`, `--text-*`, `--font-*`. Real values live in `doom-design-system/dist/styles/{palettes.js, globals.css, themes/definitions.js}`; the app uses the `default` theme. Prefer doom components over ad-hoc markup/D3.
- **Verdict first.** Lead each surface with the single "am I okay?" number in the largest type, top-left (F-pattern) — goal timeline on the Plan hub, savings rate / net position on Analytics.
- **Three-tier hierarchy — Summary → Context → Details.** Group cards by the question they answer ("where I stand" / "what I'm planning" / "what I can do"); don't place unrelated metrics adjacent.
- **Every tile is actionable.** One clear next action per card (Continue / Open / Save). No dead data.
- **Progressive disclosure.** Surfaces show summaries; open detail (full tables, a calculator) on drill-in via drawer or route. Don't dump dense tables into an overview.
- **Encode state in form, not just number.** Pill / chip / severity stripe so what needs attention reads at a glance. Semantic color (`--success`/`--warning`/`--error`) is separate from the `--primary` accent; never rely on color alone.
- **Design empty states.** New users have no goal or plans — every list/section needs an inviting empty state carrying the first action.
- **Numerals discipline.** `font-variant-numeric: tabular-nums`; reuse the shared `money()` currency formatters.
- **Match the app and verify visually.** Neubrutalist doom language (bordered cards, hard offset shadows, uppercase heavy headings). Screenshot the result — passing tests ≠ good design.

## Test setup

`src/test-utils.tsx` wraps renders with `ThemeProvider` + `ToastProvider`. Always import `render` from there, not from `@testing-library/react`.

## System types

MoneyPrinter defines a system-level type registry (`SystemType`) for data primitives: `string`, `number`, `currency`, `date`, `boolean`. These are NOT import-specific — they're app-wide. Import column mapping, export serialization, display formatting, and validation all reference the same types. See `src/lib/system-types.ts`. Extend by adding to the `SystemType` union + parser + formatter.

## Project structure

```
src/
  app/            # Next.js pages + server actions
    actions/      # Server actions (DB mutations)
  components/     # Shared client components
  lib/            # Types, store, utilities
```
