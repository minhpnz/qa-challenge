import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../core';
import { NavBar } from '../components';
import type { Category } from '../api/types';

const CATEGORY_LABELS: Record<Category, string> = {
  phone: 'Phones',
  notebook: 'Laptops',
  monitor: 'Monitors',
};

export class HomePage extends BasePage {
  readonly nav: NavBar;
  readonly productCards: Locator;
  readonly categoryList: Locator;
  readonly nextPageButton: Locator;
  readonly previousPageButton: Locator;

  constructor(page: Page) {
    super(page, '/index.html');
    this.nav = new NavBar(page);
    this.productCards = page.locator('#tbodyid .card');
    this.categoryList = page.locator('.list-group');
    this.nextPageButton = page.locator('#next2');
    this.previousPageButton = page.locator('#prev2');
  }

  /**
   * The catalogue is fetched client-side, so `goto` resolving proves nothing.
   * Waiting on the first rendered card is the real "page is usable" signal.
   */
  override async expectLoaded(): Promise<void> {
    await expect(this.productCards.first()).toBeVisible();
  }

  card(title: string): Locator {
    return this.productCards.filter({ has: this.page.getByRole('link', { name: title }) });
  }

  async openProduct(title: string): Promise<void> {
    await this.page.getByRole('link', { name: title, exact: true }).click();
  }

  async productTitles(): Promise<string[]> {
    await this.expectLoaded();
    return this.productCards.locator('.card-title a').allInnerTexts();
  }

  /**
   * The three category links all share `id="itemc"` — duplicate ids in the AUT.
   * Selecting by role+text is not a stylistic preference here; an `#itemc`
   * selector is strict-mode-ambiguous and would fail outright.
   */
  async selectCategory(category: Category): Promise<void> {
    await this.categoryList.getByText(CATEGORY_LABELS[category], { exact: true }).click();
  }

  /** `$360` → `360`. */
  async priceOf(title: string): Promise<number> {
    const text = (await this.card(title).locator('h5').innerText()).trim();
    return Number(text.replace(/[^\d.]/g, ''));
  }
}
