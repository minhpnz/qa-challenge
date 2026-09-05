import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { config } from '../../config';
import { BasePage } from '../core';
import { NavBar, OrderModal } from '../components';

export interface CartLine {
  title: string;
  price: number;
}

export class CartPage extends BasePage {
  readonly nav: NavBar;
  readonly orderModal: OrderModal;
  readonly rows: Locator;
  readonly total: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    super(page, '/cart.html');
    this.nav = new NavBar(page);
    this.orderModal = new OrderModal(page);
    this.rows = page.locator('#tbodyid tr.success');
    this.total = page.locator('#totalp');
    this.placeOrderButton = page.getByRole('button', { name: 'Place Order', exact: true });
  }

  /**
   * Navigating to the cart waits for the cart's own data call to come back.
   *
   * Without this, `expectEmpty()` is a false pass waiting to happen: it would
   * assert "zero rows" against a page that simply has not fetched yet, and would
   * pass just as happily for a cart with ten items in it. A test that cannot fail
   * is worse than no test, so the wait is part of navigation rather than
   * something each spec has to remember.
   */
  override async goto(): Promise<Response | null> {
    const cartFetched = this.page.waitForResponse(
      (response) => response.url().includes('/viewcart') && response.request().method() === 'POST',
      // Navigation budget, not the action budget. `waitForResponse` silently
      // inherits the (short) action timeout, but this wait is part of loading the
      // page, not of clicking something — and on WebKit the round trip measured
      // 9.5–13.7s against a 10s action timeout, i.e. flaky by exactly the margin
      // of the wrong budget. Naming the right timeout fixes the cause; bumping
      // the global action timeout would have hidden it everywhere else.
      { timeout: config.timeouts.navigation },
    );
    const navigation = await super.goto();
    await cartFetched;
    return navigation;
  }

  /**
   * An empty cart legitimately has zero rows, so "loaded" cannot mean "a row
   * appeared". The Place Order button is the page's own chrome and is the correct
   * anchor for both the empty and populated states.
   */
  override async expectLoaded(): Promise<void> {
    await expect(this.placeOrderButton).toBeVisible();
  }

  row(title: string): Locator {
    return this.rows.filter({ hasText: title });
  }

  async lineCount(): Promise<number> {
    return this.rows.count();
  }

  async lines(): Promise<CartLine[]> {
    const count = await this.rows.count();
    const lines: CartLine[] = [];
    for (let index = 0; index < count; index += 1) {
      const cells = this.rows.nth(index).locator('td');
      const title = (await cells.nth(1).innerText()).trim();
      const price = Number((await cells.nth(2).innerText()).replace(/[^\d.]/g, ''));
      lines.push({ title, price });
    }
    return lines;
  }

  /** `#totalp` is empty until the app computes it; an empty cart reads as 0. */
  async readTotal(): Promise<number> {
    const text = (await this.total.innerText()).trim();
    return text === '' ? 0 : Number(text);
  }

  /**
   * Deleting re-renders the table asynchronously with no spinner and no URL
   * change, so the only honest signal is the row's own disappearance. Waiting on
   * that here — instead of in each test — is what keeps delete assertions stable.
   */
  async deleteLine(title: string): Promise<void> {
    const target = this.row(title);
    await target.getByRole('link', { name: 'Delete', exact: true }).click();
    await expect(target).toHaveCount(0);
  }

  /**
   * The AUT builds the total by *appending* to `#totalp` as each line renders, so
   * reading it once and comparing is a race: a fast assertion can catch a partial
   * sum and fail intermittently. Web-first `toHaveText` retries until the value
   * settles, which is the difference between a reliable check and a flaky one.
   *
   * An empty cart never populates the element at all, so zero means empty text.
   */
  async expectTotal(expected: number): Promise<void> {
    await expect(this.total).toHaveText(expected === 0 ? '' : String(expected));
  }

  async expectEmpty(): Promise<void> {
    await expect(this.rows).toHaveCount(0);
  }

  async expectContains(title: string, occurrences = 1): Promise<void> {
    await expect(this.row(title)).toHaveCount(occurrences);
  }

  async openOrderModal(): Promise<OrderModal> {
    await this.placeOrderButton.click();
    await this.orderModal.expectOpen();
    return this.orderModal;
  }

  /** Sum of the visible line prices — the invariant the displayed total must match. */
  async sumOfLines(): Promise<number> {
    const lines = await this.lines();
    return lines.reduce((sum, line) => sum + line.price, 0);
  }
}
