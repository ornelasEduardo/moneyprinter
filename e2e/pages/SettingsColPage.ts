import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for Settings → Cost of living. A fresh sandbox account defaults
 * to manual mode (see getPlanningColConfig: `mode === 'bea' ? 'bea' : 'manual'`),
 * so the custom-cap inputs are visible by default — but a prior run (or real
 * usage) could have left the account in BEA mode, where col-front/col-back
 * don't render. ensureManualMode() makes the custom-cap flow deterministic
 * regardless of starting state, per the doom ToggleGroup markup confirmed in
 * task-10b (each ToggleGroupItem is a real <button> with its label as text,
 * inside the col-mode wrapping div).
 */
export class SettingsColPage {
  readonly mode: Locator;
  readonly front: Locator;
  readonly back: Locator;
  readonly save: Locator;
  readonly savedConfirmation: Locator;

  constructor(private readonly page: Page) {
    this.mode = page.getByTestId('col-mode');
    this.front = page.getByTestId('col-front');
    this.back = page.getByTestId('col-back');
    this.save = page.getByTestId('col-save');
    this.savedConfirmation = page.getByText('Saved.', { exact: true });
  }

  async open() {
    await this.page.goto('/?tab=settings');
    await expect(this.mode).toBeVisible({ timeout: 15_000 });
  }

  /** Which mode is active — inferred from whether the manual custom-cap inputs render. */
  async currentMode(): Promise<'manual' | 'bea'> {
    return (await this.front.isVisible().catch(() => false)) ? 'manual' : 'bea';
  }

  async setMode(mode: 'manual' | 'bea') {
    await this.mode.getByText(mode === 'bea' ? 'BEA' : 'Manual', { exact: true }).click();
  }

  /** Custom caps only render in manual mode; switch to it if BEA mode is active. */
  async ensureManualMode() {
    if (await this.front.isVisible().catch(() => false)) return;
    await this.setMode('manual');
    await expect(this.front).toBeVisible({ timeout: 5_000 });
  }

  async setCustomCaps(front: string, back: string) {
    await this.ensureManualMode();
    await this.front.fill(front);
    await this.back.fill(back);
  }

  /** Clicks Save and waits for the async server-action round trip to land. */
  async saveConfig() {
    await this.save.click();
    await expect(this.savedConfirmation).toBeVisible({ timeout: 15_000 });
  }
}
