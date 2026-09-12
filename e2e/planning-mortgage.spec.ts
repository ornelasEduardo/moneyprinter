import { test, expect } from './support/fixtures';
import { MortgageCalculatorPage } from './pages/MortgageCalculatorPage';
import { SettingsColPage } from './pages/SettingsColPage';

test.describe('Mortgage planning', () => {
  test('pre-fills from finances, recomputes live, and saves as a goal', async ({ freshUserPage }) => {
    const mc = new MortgageCalculatorPage(freshUserPage);
    await mc.open();

    await expect(mc.monthlyPayment).toContainText('$');
    await expect(mc.assessment).toBeVisible();

    const before = await mc.monthlyPayment.textContent();
    await mc.setHomePrice('650000');
    await expect.poll(async () => mc.monthlyPayment.textContent()).not.toBe(before);

    await mc.saveGoal.click();
    await expect(mc.saved).toBeVisible();
    // Reopening is covered via the saved-plans list below; GoalTracker's
    // "View plan" isn't, because saveGoalFromPlan writes non-primary goals and
    // GoalTracker only shows the primary one.
  });

  test('a saved plan reopens with its inputs restored via the saved-plans list', async ({ freshUserPage }) => {
    const mc = new MortgageCalculatorPage(freshUserPage);
    await mc.open();

    const distinctivePrice = '654321';
    await mc.setHomePrice(distinctivePrice);
    await mc.saveGoal.click();
    await expect(mc.saved).toBeVisible();

    // The drawer's list only fetches on mount — reload to pick up the new goal,
    // and wait for hydration before clicking so the handler is attached.
    await freshUserPage.reload();
    await expect(mc.homePrice).not.toHaveValue('', { timeout: 15_000 });
    await mc.openPlans();
    await expect.poll(async () => mc.viewPlanButtons.count()).toBeGreaterThan(0);

    await mc.viewPlanButtons.first().click();
    await expect(mc.homePrice).toHaveValue(distinctivePrice, { timeout: 15_000 });
  });

  test('cost-of-living custom caps flow through to the calculator limits', async ({ freshUserPage }) => {
    const settings = new SettingsColPage(freshUserPage);
    await settings.open();
    await settings.setCustomCaps('0.43', '0.52');
    await settings.saveConfig();

    const mc = new MortgageCalculatorPage(freshUserPage);
    await mc.open();
    await expect(mc.colNote).toBeVisible({ timeout: 15_000 });
    await expect(mc.colNote).toContainText('custom');
    await expect(mc.colNote).toContainText('43%');
    await expect(mc.colNote).toContainText('52%');
  });
});
