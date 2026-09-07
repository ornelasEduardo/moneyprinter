import { test, expect } from '@playwright/test';
import { MortgageCalculatorPage } from './pages/MortgageCalculatorPage';
import { SettingsColPage } from './pages/SettingsColPage';

test.describe('Mortgage planning', () => {
  test('pre-fills from finances, recomputes live, and saves as a goal', async ({ page }) => {
    const mc = new MortgageCalculatorPage(page);
    await mc.open();

    // Deep interop: pre-filled and computing against real data.
    await expect(mc.monthlyPayment).toContainText('$');
    await expect(mc.assessment).toBeVisible();

    // Live recompute: changing the price moves the payment.
    const before = await mc.monthlyPayment.textContent();
    await mc.setHomePrice('650000');
    await expect.poll(async () => mc.monthlyPayment.textContent()).not.toBe(before);

    // Save as goal.
    await mc.saveGoal.click();
    await expect(mc.saved).toBeVisible();

    // NOTE on the reopen loop (Save as goal -> GoalTracker "View plan" ->
    // reopened calculator): saveGoalFromPlan() always creates the goal with
    // is_primary: false (src/app/actions/planning.ts), and GoalTracker only
    // ever renders the user's *primary* goal (getPrimaryGoal() filters
    // is_primary: true). The sandbox seed's primary goal ("House Down
    // Payment") has plan_kind: null, not 'mortgage'. So there is no code
    // path — seeded or produced by this flow — that makes gt-view-plan
    // reachable in this sandbox. The reopen behavior itself is covered by
    // Task 11's MortgageCalculator component test (initialInputs seeding);
    // deliberately NOT forcing a flaky/unreachable e2e here per the brief.
  });

  test('cost-of-living custom caps flow through to the calculator limits', async ({ page }) => {
    // 1) Set VHCOL custom caps in Settings (manual mode; ensureManualMode()
    // guards the flow even if a prior run left the account in BEA mode).
    const settings = new SettingsColPage(page);
    await settings.open();
    await settings.setCustomCaps('0.43', '0.52');
    await settings.saveConfig();

    // 2) Open the mortgage calculator; the note must reflect the COL-adjusted limits.
    const mc = new MortgageCalculatorPage(page);
    await mc.open();
    await expect(mc.colNote).toBeVisible({ timeout: 15_000 });
    await expect(mc.colNote).toContainText('Cost-of-living adjusted');
    await expect(mc.colNote).toContainText('43%');
    await expect(mc.colNote).toContainText('52%');
  });
});
