import { type Page, type Locator, expect } from '@playwright/test';
import { SANDBOX } from '../fixtures';

export interface SavingsCard {
  earned: number;
  spent: number;
  net: number;
}

// "$1,234" / "-$1,234" -> 1234 / -1234.
function money(text: string): number {
  const negative = text.trim().startsWith('-');
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return negative ? -value : value;
}

// "saved $2,000" -> 2000; "overspent $2,000" -> -2000.
function signedNet(text: string): number {
  return (text.trim().startsWith('overspent') ? -1 : 1) * money(text);
}

/**
 * Page Object for Analytics → Overview. Encapsulates the screen's locators
 * (including doom-internal chart selectors, so a doom upgrade is a one-file
 * change) and its interactions, so specs read as behaviour, not selectors.
 */
export class AnalyticsOverviewPage {
  readonly loadingPlaceholder: Locator;
  readonly earned: Locator;
  readonly spent: Locator;
  readonly net: Locator;
  readonly spendingTotal: Locator;
  readonly netWorthSeries: Locator;
  readonly incomeBars: Locator;
  readonly expenseBars: Locator;

  private readonly rangePicker: Locator;

  constructor(private readonly page: Page) {
    this.loadingPlaceholder = page.getByText('Loading your overview…');
    this.earned = page.getByTestId('sc-earned');
    this.spent = page.getByTestId('sc-spent');
    this.net = page.getByTestId('sc-net');
    this.spendingTotal = page.getByTestId('spending-total');
    this.netWorthSeries = page.locator('path[data-chart-type="line"]');
    this.incomeBars = page.locator('rect.bar-income');
    this.expenseBars = page.locator('rect.bar-expenses');
    this.rangePicker = page.getByRole('combobox');
  }

  async open(): Promise<void> {
    await this.page.goto('/?tab=analytics');
  }

  /** Pin the range to the seeded data window so tests don't depend on "today". */
  async showSeededData(): Promise<void> {
    await this.rangePicker.click();
    await this.page.getByRole('option', { name: 'Custom range' }).click();
    const dateInputs = this.page.locator('input[type="date"]');
    await dateInputs.first().fill(SANDBOX.dataWindow.start);
    await dateInputs.nth(1).fill(SANDBOX.dataWindow.end);
    await this.waitUntilLoaded();
  }

  async waitUntilLoaded(): Promise<void> {
    await expect(this.earned).not.toHaveText('$0', { timeout: 15_000 });
  }

  async readSavingsCard(): Promise<SavingsCard> {
    return {
      earned: money(await this.earned.innerText()),
      spent: money(await this.spent.innerText()),
      net: signedNet(await this.net.innerText()),
    };
  }

  async readSpendingTotal(): Promise<number> {
    return money(await this.spendingTotal.innerText());
  }

  /** Scope the spending breakdown to a single account. */
  async filterToAccount(name: string = SANDBOX.accountWithFewExpenses): Promise<void> {
    await this.page.getByText('All accounts').click();
    await this.page.getByText(name, { exact: true }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
