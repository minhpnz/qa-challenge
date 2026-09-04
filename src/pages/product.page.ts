import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { BasePage } from '../core';
import { NavBar } from '../components';

export class ProductPage extends BasePage {
  readonly nav: NavBar;
  readonly title: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    super(page, '/prod.html');
    this.nav = new NavBar(page);
    this.title = page.locator('h2.name');
    this.price = page.locator('h3.price-container');
    this.description = page.locator('#more-information');
    this.addToCartButton = page.getByRole('link', { name: 'Add to cart', exact: true });
  }

  /** Deep-link by product id — lets a cart test skip the catalogue entirely. */
  async gotoProduct(productId: number): Promise<Response | null> {
    return this.page.goto(`/prod.html?idp_=${productId}`);
  }

  override async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.addToCartButton).toBeVisible();
  }

  async readTitle(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  /** `$360 *includes tax` → `360`. */
  async readPrice(): Promise<number> {
    const text = await this.price.innerText();
    const match = /\$\s*(\d+(?:\.\d+)?)/.exec(text);
    if (!match?.[1]) throw new Error(`Could not parse a price from "${text}".`);
    return Number(match[1]);
  }

  /**
   * Adding to cart pops a native alert. This method deliberately does NOT assert
   * on it — the DialogWatcher fixture owns dialog handling, and the caller asserts
   * on the recorded message. Keeping the assertion out of the page object is what
   * lets the same method serve the happy path and the "add while logged out" case.
   */
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }
}
