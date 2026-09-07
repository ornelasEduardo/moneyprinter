import { test as base, expect, type Page } from '@playwright/test';
import { createEphemeralUser, deleteEphemeralUser, type EphemeralUser } from './users';

const SESSION_COOKIE = 'moneyprinter_session';

export const test = base.extend<{ freshUser: EphemeralUser; freshUserPage: Page }>({
  freshUser: async ({}, run) => {
    const user = await createEphemeralUser();
    await run(user);
    await deleteEphemeralUser(user.id);
  },

  freshUserPage: async ({ browser, freshUser }, run) => {
    const context = await browser.newContext();
    await context.addCookies([
      { name: SESSION_COOKIE, value: freshUser.sessionToken, domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
    ]);
    const page = await context.newPage();
    await run(page);
    await context.close();
  },
});

export { expect };
