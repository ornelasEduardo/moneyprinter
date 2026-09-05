import { test, expect } from '@playwright/test';
import { AnalyticsOverviewPage, type SavingsCard } from './pages/AnalyticsOverviewPage';

// The card describes the whole period: income − expenses must equal net
// (within $1–2 of independent whole-dollar rounding of each figure).
function expectReconciles(card: SavingsCard) {
  expect(Math.abs(card.earned - card.spent - card.net)).toBeLessThanOrEqual(2);
}

test.describe('Savings-rate headline card', () => {
  test('stays whole-period-consistent when a filter scopes only the breakdown', async ({ page }) => {
    const overview = new AnalyticsOverviewPage(page);
    await overview.open();
    await overview.showSeededData();

    const before = await overview.readSavingsCard();
    const breakdownBefore = await overview.readSpendingTotal();
    expectReconciles(before);

    await overview.filterToAccount();

    // Positive evidence the filter scoped the breakdown — retry until the
    // refetch lands in the DOM (avoids reading before React flushes).
    await expect.poll(() => overview.readSpendingTotal()).not.toBe(breakdownBefore);

    // The whole-period headline is unaffected by scoping the breakdown and
    // still reconciles.
    const after = await overview.readSavingsCard();
    expect(after).toEqual(before);
    expectReconciles(after);
  });

  test('withholds figures while loading, then reveals them once data resolves', async ({ page }) => {
    // Delay the analytics server actions so the first-load window is observable.
    await page.route('**', async (route) => {
      if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    const overview = new AnalyticsOverviewPage(page);
    await overview.open();

    // While pending: placeholder shown, no misleading 0% / $0 figures.
    await expect(overview.loadingPlaceholder).toBeVisible();
    await expect(overview.earned).toHaveCount(0);

    // After data resolves: placeholder gone, figures present (transition proven).
    await expect(overview.loadingPlaceholder).toBeHidden({ timeout: 15_000 });
    await expect(overview.earned).toBeVisible();
  });
});
