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

    // NOTE on the GoalTracker reopen loop specifically (Save as goal ->
    // GoalTracker "View plan" -> reopened calculator): saveGoalFromPlan()
    // always creates the goal with is_primary: false (src/app/actions/planning.ts),
    // and GoalTracker only ever renders the user's *primary* goal
    // (getPrimaryGoal() filters is_primary: true). The sandbox seed's primary
    // goal ("House Down Payment") has plan_kind: null, not 'mortgage'. So
    // there is no code path — seeded or produced by this flow — that makes
    // gt-view-plan reachable in this sandbox; deliberately not forcing a
    // flaky/unreachable e2e for that specific button. The plan IS reachable
    // via the saved-plans list (PlanGoalsList, "pg-view-plan") below, which
    // surfaces every plan-carrying goal regardless of primary status.
  });

  test('a saved plan reopens with its inputs restored via the saved-plans list', async ({ page }) => {
    const mc = new MortgageCalculatorPage(page);
    await mc.open();

    // A distinctive home price makes the reopen assertion precise without
    // relying on an exact plan count — robust to a shared sandbox DB that
    // may already carry saved plans from other runs.
    const distinctivePrice = '654321';
    await mc.setHomePrice(distinctivePrice);
    await mc.saveGoal.click();
    await expect(mc.saved).toBeVisible();

    // The drawer's list only fetches on mount, so reload to pick up the goal we
    // just saved. Wait for the calculator to hydrate + prefill before clicking
    // the header button, or the click lands before React attaches its handler.
    await page.reload();
    await expect(mc.homePrice).not.toHaveValue('', { timeout: 15_000 });
    await mc.openPlans();
    await expect.poll(async () => mc.viewPlanButtons.count()).toBeGreaterThan(0);

    // List is newest-first, so the plan we just saved is first — reopening
    // it must restore the exact home price we set before saving.
    await mc.viewPlanButtons.first().click();
    await expect(mc.homePrice).toHaveValue(distinctivePrice, { timeout: 15_000 });
  });

  test('cost-of-living custom caps flow through to the calculator limits', async ({ page }) => {
    const settings = new SettingsColPage(page);
    await settings.open();
    // This runs against the shared sandbox, so restore whatever mode it was in
    // (e.g. a real BEA setup) rather than leaving it stuck in manual.
    const originalMode = await settings.currentMode();
    try {
      await settings.setCustomCaps('0.43', '0.52');
      await settings.saveConfig();

      // The note must reflect the loosened limits and name their source.
      const mc = new MortgageCalculatorPage(page);
      await mc.open();
      await expect(mc.colNote).toBeVisible({ timeout: 15_000 });
      await expect(mc.colNote).toContainText('custom');
      await expect(mc.colNote).toContainText('43%');
      await expect(mc.colNote).toContainText('52%');
    } finally {
      await settings.open();
      await settings.setMode(originalMode);
      await settings.saveConfig();
    }
  });
});
