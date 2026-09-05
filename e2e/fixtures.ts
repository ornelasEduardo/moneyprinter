// Single source of truth for the e2e suite's coupling to the local sandbox seed
// (src/lib/schema.sql + the dev database). If the sandbox seed, account naming,
// or demo-login flow changes, update it here — specs and page objects reference
// these constants rather than hard-coding values inline.

export const SANDBOX = {
  // Sandbox transactions span 2025-10 .. 2026-04. Pin an explicit window that
  // always contains them so the suite is independent of the current date.
  dataWindow: { start: '2025-10-01', end: '2026-04-30' },
  // An account that owns only a few expenses, so filtering to it visibly scopes
  // the spending breakdown (proving the filter did something).
  accountWithFewExpenses: 'Chase Checking',
} as const;

export const DEMO_LOGIN = {
  fillCredentials: 'DEMO MODE',
  submit: 'ACCESS TERMINAL',
} as const;

export const AUTH_STATE = 'e2e/.auth/sandbox.json';
