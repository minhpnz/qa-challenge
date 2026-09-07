import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '../core';

export interface OrderDetails {
  name: string;
  country: string;
  city: string;
  creditCard: string;
  month: string;
  year: string;
}

export class OrderModal extends BaseComponent {
  readonly total: Locator;
  readonly name: Locator;
  readonly country: Locator;
  readonly city: Locator;
  readonly creditCard: Locator;
  readonly month: Locator;
  readonly year: Locator;
  readonly purchaseButton: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page, page.locator('#orderModal'));
    this.total = this.root.locator('#totalm');
    this.name = this.root.locator('#name');
    this.country = this.root.locator('#country');
    this.city = this.root.locator('#city');
    this.creditCard = this.root.locator('#card');
    this.month = this.root.locator('#month');
    this.year = this.root.locator('#year');
    this.purchaseButton = this.root.getByRole('button', { name: 'Purchase', exact: true });
    this.closeButton = this.footerButton('Close');
  }

  async expectOpen(): Promise<void> {
    await this.expectModalReady();
    await expect(this.purchaseButton).toBeEnabled();
  }

  async expectClosed(): Promise<void> {
    await expect(this.root).toBeHidden();
  }

  /** Web-first, for the same append-as-you-render reason as the cart total. */
  async expectTotal(expected: number): Promise<void> {
    await expect(this.total).toHaveText(expected === 0 ? 'Total:' : `Total: ${expected}`);
  }

  /** `Total: 1140` → `1140`. Returns null before the app has populated it. */
  async readTotal(): Promise<number | null> {
    const text = (await this.total.textContent()) ?? '';
    const match = /(\d+(?:\.\d+)?)/.exec(text);
    return match?.[1] ? Number(match[1]) : null;
  }

  /**
   * Partial by design: the negative cases need to submit an *incomplete* form,
   * so every field is optional and only what is supplied gets filled.
   */
  async fill(details: Partial<OrderDetails>): Promise<void> {
    const fields: ReadonlyArray<readonly [Locator, string | undefined]> = [
      [this.name, details.name],
      [this.country, details.country],
      [this.city, details.city],
      [this.creditCard, details.creditCard],
      [this.month, details.month],
      [this.year, details.year],
    ];
    for (const [locator, value] of fields) {
      if (value !== undefined) await locator.fill(value);
    }
  }

  /**
   * The AUT validates only Name and Credit card, and reports failure through a
   * native alert rather than the `#errors` label that exists in the markup — so
   * the assertion for an invalid order lives on the DialogWatcher, not here.
   */
  async purchase(): Promise<void> {
    await this.purchaseButton.click();
  }

  async placeOrder(details: Partial<OrderDetails>): Promise<void> {
    await this.expectOpen();
    await this.fill(details);
    await this.purchase();
  }
}
