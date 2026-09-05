import { test as setup, expect } from '@playwright/test';
import { AUTH_STATE, DEMO_LOGIN } from './fixtures';

setup('authenticate as sandbox', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: DEMO_LOGIN.fillCredentials }).click();
  await page.getByRole('button', { name: DEMO_LOGIN.submit }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
  await expect(page.getByText('MoneyPrinter').first()).toBeVisible();
  await page.context().storageState({ path: AUTH_STATE });
});
