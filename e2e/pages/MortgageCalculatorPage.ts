import { type Page, type Locator, expect } from '@playwright/test';

export class MortgageCalculatorPage {
  readonly homePrice: Locator;
  readonly monthlyPayment: Locator;
  readonly assessment: Locator;
  readonly colNote: Locator;
  readonly saveGoal: Locator;
  readonly saved: Locator;
  readonly openPlansButton: Locator;
  readonly planGoalsList: Locator;
  readonly viewPlanButtons: Locator;

  constructor(private readonly page: Page) {
    this.homePrice = page.getByTestId('mc-home-price');
    this.monthlyPayment = page.getByTestId('mc-monthly-payment');
    this.assessment = page.getByTestId('mc-assessment');
    this.colNote = page.getByTestId('mc-col-note');
    this.saveGoal = page.getByTestId('mc-save-goal');
    this.saved = page.getByTestId('mc-saved');
    // Saved plans now live in a drawer, opened from this header button.
    this.openPlansButton = page.getByTestId('mc-open-plans');
    this.planGoalsList = page.getByTestId('plan-goals-list');
    this.viewPlanButtons = page.getByTestId('pg-view-plan');
  }

  async open() {
    await this.page.goto('/?tab=mortgage');
    await expect(this.homePrice).not.toHaveValue('', { timeout: 15_000 });
  }

  async setHomePrice(v: string) {
    await this.homePrice.fill(v);
  }

  async openPlans() {
    await this.openPlansButton.click();
    await expect(this.planGoalsList).toBeVisible({ timeout: 15_000 });
  }
}
