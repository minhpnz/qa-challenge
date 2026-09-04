import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';

export interface PurchaseReceipt {
  id: string;
  amount: number;
  cardNumber: string;
  name: string;
  date: string;
}

/**
 * The SweetAlert receipt shown after a successful purchase.
 *
 * Its body is a single free-text blob:
 *   Id: 1234567
 *   Amount: 1140 USD
 *   Card Number: 4111111111111111
 *   Name: Jane Tester
 *   Date: 4/9/2026
 *
 * Parsing it here — once, into a typed object — is what lets the order test read
 * as `expect(receipt.amount).toBe(expectedTotal)` instead of a regex in a spec.
 * When the AUT changes this wording, exactly one file needs editing.
 */
export class PurchaseConfirmation extends BaseComponent {
  readonly heading: Locator;
  readonly details: Locator;
  readonly okButton: Locator;

  constructor(page: Page) {
    super(page, page.locator('.sweet-alert'));
    this.heading = this.root.locator('h2');
    this.details = this.root.locator('p.lead');
    this.okButton = this.root.getByRole('button', { name: 'OK', exact: true });
  }

  /**
   * Waits for the widget to be *interactive*, not merely painted.
   *
   * SweetAlert adds a `visible` class 500ms after opening, and its own click
   * handler tests for that class: a click on OK that lands earlier is swallowed —
   * the dialog closes and the confirm callback never runs, so the app never
   * redirects. That produced a failure that looked like "the OK button does not
   * work" and would have been 'fixed' by a `waitForTimeout(500)`.
   *
   * Waiting on the widget's own readiness signal instead is the difference
   * between a test that is correct and a test that merely passes today: the class
   * is exactly what the library's handler checks, so this cannot be too short on
   * a slow machine or wastefully long on a fast one.
   */
  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible();
    await expect(this.root).toHaveClass(/visible/);
    await expect(this.heading).toHaveText('Thank you for your purchase!');
  }

  async readReceipt(): Promise<PurchaseReceipt> {
    await this.expectVisible();
    const raw = (await this.details.innerText()).trim();
    return {
      id: field(raw, 'Id'),
      amount: Number(field(raw, 'Amount').replace(/[^\d.]/g, '')),
      cardNumber: field(raw, 'Card Number'),
      name: field(raw, 'Name'),
      date: field(raw, 'Date'),
    };
  }

  /** Confirming navigates back to the catalogue — that redirect is the assertion. */
  async confirm(): Promise<void> {
    await this.expectVisible();
    await this.okButton.click();
    await expect(this.page).toHaveURL(/index\.html/);
  }
}

function field(receipt: string, label: string): string {
  const match = new RegExp(`${label}:\\s*(.+)`).exec(receipt);
  if (!match?.[1]) {
    throw new Error(`Receipt is missing "${label}". Raw receipt:\n${receipt}`);
  }
  return match[1].trim();
}
