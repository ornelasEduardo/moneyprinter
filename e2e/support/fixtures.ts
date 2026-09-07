// Per-test isolation: `freshUser` provisions an ephemeral user (and deletes it
// afterward); `freshUserPage` is a browser page already authenticated as that
// user via an injected session cookie — no shared sandbox account, no login UI.
import { test as base, expect, type Page } from '@playwright/test';
import { createEphemeralUser, deleteEphemeralUser, type EphemeralUser } from './users';

const SESSION_COOKIE = 'moneyprinter_session';

export const test = base.extend<{ freshUser: EphemeralUser; freshUserPage: Page }>({
  freshUser: async ({}, use) => {
    const user = await createEphemeralUser();
    await use(user);
    await deleteEphemeralUser(user.id);
  },

  freshUserPage: async ({ browser, freshUser }, use) => {
    // A clean context (no sandbox storageState) with just this user's session.
    const context = await browser.newContext();
    await context.addCookies([
      { name: SESSION_COOKIE, value: freshUser.sessionToken, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
    ]);
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
