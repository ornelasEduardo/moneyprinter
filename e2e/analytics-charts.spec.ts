import { test, expect } from '@playwright/test';
import { AnalyticsOverviewPage } from './pages/AnalyticsOverviewPage';

test.describe('Analytics charts render', () => {
  test('Net Worth draws history + projection series and Cash Flow draws bars', async ({ page }) => {
    const overview = new AnalyticsOverviewPage(page);
    await overview.open();
    await overview.showSeededData();

    // Net Worth: history + projection line series both drawn.
    await expect(overview.netWorthSeries).toHaveCount(2);
    // Cash Flow: grouped income/expense bars drawn.
    await expect(overview.incomeBars.first()).toBeAttached();
    await expect(overview.expenseBars.first()).toBeAttached();
  });
});
